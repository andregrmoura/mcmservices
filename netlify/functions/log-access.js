// netlify/functions/log-access.js
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  try {
    // Segurança: só aceita chamadas que tenham o token
    const token = event.headers["x-log-token"];
    if (!token || token !== process.env.SITE_LOG_TOKEN) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const payload = JSON.parse(event.body || "{}");

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase.from("site_access_logs").insert([{
      country_code: payload.country_code || null,
      country_name: payload.country_name || null,
      city: payload.city || null,
      timezone: payload.timezone || null,
      path: payload.path || null,
      referrer: payload.referrer || null,
      user_agent: payload.user_agent || null,
      request_id: payload.request_id || null,
      // created_at fica default now()
    }]);

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
};