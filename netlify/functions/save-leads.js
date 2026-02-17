export default async (req) => {
  // Helpers
  const json = (status, data, extraHeaders = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
    });

  // CORS preflight (não atrapalha e evita dor de cabeça)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  // Só POST
  if (req.method !== "POST") {
    return json(405, { error: "Method Not Allowed. Use POST." }, { Allow: "POST, OPTIONS" });
  }

  try {
    // Parse body (robusto)
    let body = {};
    try {
      body = await req.json();
    } catch {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }

    // Aceitar camelCase e snake_case
    const projectSlug = body.projectSlug ?? body.project_slug ?? "";
    const fullName = body.fullName ?? body.full_name ?? "";
    const email = body.email ?? "";
    const phone = body.phone ?? null;

    if (!projectSlug || !fullName || !email) {
      return json(400, {
        error: "Missing fields",
        expected_any_of: {
          projectSlug_or_project_slug: true,
          fullName_or_full_name: true,
          email: true,
        },
        received: Object.keys(body || {}),
      });
    }

    const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, {
        error: "Missing environment variables",
        missing: {
          SUPABASE_URL: !SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !SUPABASE_SERVICE_ROLE_KEY,
        },
      });
    }

    const payload = {
      project_slug: projectSlug,
      full_name: fullName,
      email,
      ...(phone ? { phone } : {}),
    };

    // Timeout para não “morrer” em silêncio
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/portal_leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const text = await res.text();

    if (!res.ok) {
      return json(500, {
        error: "Supabase insert failed",
        status: res.status,
        details: text,
        supabase_url_used: SUPABASE_URL,
      });
    }

    return json(200, { ok: true, inserted: text ? JSON.parse(text) : null });
  } catch (err) {
    return json(500, { error: "Unhandled error", message: String(err) });
  }
};
