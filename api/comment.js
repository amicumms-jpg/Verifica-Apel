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

function hasSpamOrPersonalData(text) {
  const clean = text.trim();
  if (clean.length < 5 || clean.length > 400) return true;
  if (/https?:\/\/|www\./i.test(clean)) return true;
  if (/(.)\1{6,}/.test(clean)) return true;
  if (/\b0[237]\d{8}\b|\b\d{13}\b/.test(clean.replace(/\s+/g, ""))) return true;
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const parsed = parseInternationalPhone(body.phone || "");
  const category = String(body.category || "neutru").trim().toLowerCase();
  const text = String(body.text || "").replace(/\s+/g, " ").trim();

  if (!parsed) {
    return res.status(400).json({ error: "Număr de telefon invalid" });
  }
  if (!ALLOWED_CATEGORIES.has(category)) {
    return res.status(400).json({ error: "Categorie invalidă" });
  }
  if (hasSpamOrPersonalData(text)) {
    return res.status(400).json({
      error: "Comentariul este prea scurt/lung, conține linkuri sau date sensibile.",
    });
  }

  try {
    await pool.query(
      `INSERT INTO phone_numbers (phone, country_code, country_name, views, updated_at)
       VALUES ($1, $2, $3, 0, NOW())
       ON CONFLICT (phone) DO NOTHING`,
      [parsed.phone, parsed.countryCode, parsed.countryName]
    );

    const { rows } = await pool.query(
      `INSERT INTO phone_comments (phone, category, text)
       VALUES ($1, $2, $3)
       RETURNING id, category, text, created_at`,
      [parsed.phone, category, text]
    );

    return res.status(201).json({ comment: rows[0] });
  } catch (err) {
    console.error("POST /api/comment error:", err);
    return res.status(500).json({ error: "Eroare la salvarea comentariului" });
  }
}
