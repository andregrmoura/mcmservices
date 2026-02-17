export default async (req) => {
  const json = (status, data, extraHeaders = {}) =>
    new Response(JSON.stringify(data, null, 2), {
      status,
      headers: { "Content-Type": "application/json", ...extraHeaders },
    });

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

  if (req.method !== "POST") {
    return json(405, { error: "Method Not Allowed. Use POST." }, { Allow: "POST, OPTIONS" });
  }

  // Helpers para pegar detalhes do erro de fetch (DNS/TLS/timeout)
  const serializeError = (err) => {
    const cause = err?.cause;
    return {
      name: err?.name,
      message: String(err?.message ?? err),
      stack: err?.stack,
      cause: cause
        ? {
            name: cause?.name,
            message: String(cause?.message ?? cause),
            code: cause?.code,
            errno: cause?.errno,
            syscall: cause?.syscall,
            address: cause?.address,
            port: cause?.port,
          }
        : null,
    };
  };

  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }

    const projectSlug = body.projectSlug ?? body.project_slug ?? "";
    const fullName = body.fullName ?? body.full_name ?? "";
    const email = body.email ?? "";
    const phone = body.phone ?? null;

    if (!projectSlug || !fullName || !email) {
      return json(400, {
        error: "Missing fields",
        expected: ["projectSlug/fullName/email"],
        receivedKeys: Object.keys(body || {}),
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

    // 1) TESTE DE CONECTIVIDADE (host do Supabase)
    // Se isso falhar, é DNS/TLS/rede.
    try {
      const ping = await fetch(SUPABASE_URL, { method: "HEAD" });
      // Mesmo 404/401 é OK aqui — o importante é NÃO dar "fetch failed"
      // Só registramos o status pra debug.
      if (!ping) throw new Error("No response from HEAD ping");
    } catch (e) {
      return json(500, {
        error: "Supabase host not reachable from Netlify function",
        supabase_url_used: SUPABASE_URL,
        fetch_error: serializeError(e),
      });
    }

    const payload = {
      project_slug: projectSlug,
      full_name: fullName,
      email,
      ...(phone ? { phone } : {}),
    };

    // 2) INSERT
    try {
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
          error: "Supabase insert failed (HTTP response received)",
          status: res.status,
          details: text,
          supabase_url_used: SUPABASE_URL,
        });
      }

      return json(200, { ok: true, inserted: text ? JSON.parse(text) : null });
    } catch (e) {
      return json(500, {
        error: "Supabase insert fetch threw (network/DNS/TLS/timeout)",
        supabase_url_used: SUPABASE_URL,
        fetch_error: serializeError(e),
      });
    }
  } catch (err) {
    return json(500, { error: "Unhandled error", details: serializeError(err) });
  }
};
