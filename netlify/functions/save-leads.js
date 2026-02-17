export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await req.json().catch(() => ({}));

    // Aceita camelCase e snake_case
    const fullName =
      body.fullName || body.full_name || body.name || body.full_name_client;

    const email =
      body.email || body.clientEmail || body.client_email;

    const projectSlug =
      body.projectSlug || body.project_slug || body.slug || body.project;

    const phone =
      body.phone || body.phoneNumber || body.phone_number || null;

    if (!fullName || !email || !projectSlug) {
      return new Response(
        JSON.stringify({
          error: "Missing fields",
          required: ["fullName (or full_name)", "email", "projectSlug (or project_slug)"],
          receivedKeys: Object.keys(body || {}),
          receivedSample: body || {},
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server not configured (missing env vars)" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const payload = {
      project_slug: projectSlug,
      full_name: fullName,
      email,
      phone,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/portal_leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ error: "DB insert failed", details: text }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
