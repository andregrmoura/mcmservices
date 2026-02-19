// /netlify/functions/get-access-logs.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use o mesmo admin key que você já usa em outras functions (ou crie um novo)
const ADMIN_KEY = process.env.ADMIN_KEY || "mcm2026";

exports.handler = async (event) => {
  try {
    // Proteção simples (igual seu padrão)
    const key = event.headers["x-admin-key"] || event.headers["X-Admin-Key"];
    if (key !== ADMIN_KEY) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const limit = Math.max(1, Math.min(50, Number(event.queryStringParameters?.limit || 10)));

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase
      .from("portal_access_logs")
      .select("id, project_slug, full_name, email, accessed_at")
      .order("accessed_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, data }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unhandled error", message: String(err.message || err) }),
    };
  }
};
