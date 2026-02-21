
exports.handler = async (event) => {

  const json = (status, data) => ({
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204 };
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method Not Allowed" });
  }

  const incomingKey = (event.headers["x-admin-key"] || "").trim();
  const expectedKey =
    (process.env.DASH_ADMIN_KEY || process.env.ADMIN_KEY || "").trim();

  if (!expectedKey) {
    return json(500, { error: "Missing server env: DASH_ADMIN_KEY (or ADMIN_KEY)" });
  }

  if (!incomingKey || incomingKey !== expectedKey) {
    return json(401, { error: "Unauthorized" });
  }

  const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, {
      error: "Missing env vars",
      missing: {
        SUPABASE_URL: !SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !SUPABASE_SERVICE_ROLE_KEY
      }
    });
  }

  try {

    const params = event.queryStringParameters || {};

    const projectSlug = (params.projectSlug || "").trim();
    const q = (params.q || "").trim();
    const limit = Math.min(parseInt(params.limit || "100", 10), 200);

    let query =
      `${SUPABASE_URL}/rest/v1/portal_leads?select=id,project_slug,full_name,email,phone,created_at&order=created_at.desc&limit=${limit}`;

    if (projectSlug) {
      query += `&project_slug=eq.${encodeURIComponent(projectSlug)}`;
    }

    if (q) {
      const qq = `%${q}%`;
      query += `&or=(full_name.ilike.${encodeURIComponent(qq)},email.ilike.${encodeURIComponent(qq)},project_slug.ilike.${encodeURIComponent(qq)})`;
    }

    const res = await fetch(query, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const text = await res.text();

    if (!res.ok) {
      return json(res.status, { error: "Supabase error", details: text });
    }

    const data = text ? JSON.parse(text) : [];

    return json(200, { ok: true, data });

  } catch (err) {

    return json(500, {
      error: "Unhandled",
      message: String(err?.message || err)
    });

  }

};
