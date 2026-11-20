import crypto from "crypto";
import { Pool } from "pg";
import { parseInternationalPhone } from "./_phone-utils.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const ALLOWED_CATEGORIES = new Set([
  "telemarketing",
  "recuperare",
  "banca",
  "asigurari",
  "spam",
  "neutru",
]);

function getVoterKey(req, bodyVoterId) {
  const rawId = String(bodyVoterId || "").trim().slice(0, 80);
  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const salt = process.env.VOTE_SALT || "verificapel-salt";
  return crypto
    .createHash("sha256")
    .update(`${rawId}|${ip}|${salt}`)
    .digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const parsed = parseInternationalPhone(body.phone || "");
  const category = String(body.category || "").trim().toLowerCase();

  if (!parsed || !ALLOWED_CATEGORIES.has(category)) {
    return res.status(400).json({ error: "Date de vot invalide" });
  }

  const voterKey = getVoterKey(req, body.voterId);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO phone_numbers (phone, country_code, country_name, views, updated_at)
       VALUES ($1, $2, $3, 0, NOW())
       ON CONFLICT (phone) DO NOTHING`,
      [parsed.phone, parsed.countryCode, parsed.countryName]
    );

    const { rows: existing } = await client.query(
      `SELECT id, category FROM phone_votes WHERE phone = $1 AND voter_key = $2`,
      [parsed.phone, voterKey]
    );

    let activeCategory = category;

    if (existing.length > 0 && existing[0].category === category) {
      await client.query(`DELETE FROM phone_votes WHERE id = $1`, [existing[0].id]);
      activeCategory = null;
    } else if (existing.length > 0) {
      await client.query(
        `UPDATE phone_votes SET category = $1, created_at = NOW() WHERE id = $2`,
        [category, existing[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO phone_votes (phone, category, voter_key) VALUES ($1, $2, $3)`,
        [parsed.phone, category, voterKey]
      );
    }

    const { rows: voteRows } = await client.query(
      `SELECT category, COUNT(*)::int AS count
       FROM phone_votes
       WHERE phone = $1
       GROUP BY category`,
      [parsed.phone]
    );

    await client.query("COMMIT");

    const votes = {};
    for (const row of voteRows) {
      votes[row.category] = row.count;
    }

    return res.status(200).json({
      phone: parsed.phone,
      votes,
      activeCategory,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/vote error:", err);
    return res.status(500).json({ error: "Eroare la salvarea votului" });
  } finally {
    client.release();
  }
}
