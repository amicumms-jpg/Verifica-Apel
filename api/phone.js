import { Pool } from "pg";
import { parseInternationalPhone } from "./_phone-utils.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = parseInternationalPhone(req.query.phone || "");
  if (!parsed) {
    return res.status(400).json({ error: "Număr de telefon invalid" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: phoneRows } = await client.query(
      `INSERT INTO phone_numbers (phone, country_code, country_name, views, updated_at)
       VALUES ($1, $2, $3, 1, NOW())
       ON CONFLICT (phone)
       DO UPDATE SET
         country_code = EXCLUDED.country_code,
         country_name = EXCLUDED.country_name,
         views = phone_numbers.views + 1,
         updated_at = NOW()
       RETURNING phone, country_code, country_name, views`,
      [parsed.phone, parsed.countryCode, parsed.countryName]
    );

    const { rows: voteRows } = await client.query(
      `SELECT category, COUNT(*)::int AS count
       FROM phone_votes
       WHERE phone = $1
       GROUP BY category`,
      [parsed.phone]
    );

    const { rows: commentRows } = await client.query(
      `SELECT id, category, text, created_at
       FROM phone_comments
       WHERE phone = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [parsed.phone]
    );

    await client.query("COMMIT");

    const votes = {};
    for (const row of voteRows) {
      votes[row.category] = row.count;
    }

    return res.status(200).json({
      phone: phoneRows[0].phone,
      displayPhone: parsed.display,
      countryCode: phoneRows[0].country_code,
      countryName: phoneRows[0].country_name,
      flag: parsed.flag,
      views: Number(phoneRows[0].views),
      votes,
      comments: commentRows,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("GET /api/phone error:", err);
    return res.status(500).json({ error: "Eroare la citirea datelor" });
  } finally {
    client.release();
  }
}
