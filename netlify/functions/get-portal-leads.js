export default async (req) => {
  const json = (status, data) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "GET") return json(405, { error: "Method Not Allowed" });

  // Reutiliza o mesmo esquema do dashboard (x-admin-key)
  const incomingKey = (req.headers.get("x-admin-key") || "").trim();
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
        SUPABASE_SERVICE_ROLE_KEY: !SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  }

  try {
    const url = new URL(req.url);
    const projectSlug = (url.searchParams.get("projectSlug") || "").trim();
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 200);

    // Base query
    let query = `${SUPABASE_URL}/rest/v1/portal_leads?select=id,project_slug,full_name,email,phone,created_at&order=created_at.desc&limit=${limit}`;

    // filtro por projeto
    if (projectSlug) query += `&project_slug=eq.${encodeURIComponent(projectSlug)}`;

    // (Opcional) busca simples: filtra no servidor usando ilike
    // Se preferir, dá pra filtrar no front-end. Aqui fica mais “limpo”.
    if (q) {
      const qq = `%${q}%`;
      query += `&or=(full_name.ilike.${encodeURIComponent(qq)},email.ilike.${encodeURIComponent(qq)},project_slug.ilike.${encodeURIComponent(qq)})`;
    }

    const res = await fetch(query, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    const text = await res.text();
    if (!res.ok) return json(res.status, { error: "Supabase error", details: text });

    return json(200, { ok: true, data: text ? JSON.parse(text) : [] });
  } catch (e) {
    return json(500, { error: "Unhandled", message: String(e?.message || e) });
  }
};
