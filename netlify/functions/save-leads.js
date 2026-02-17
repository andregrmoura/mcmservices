export default async (req) => {
  try {
    // Só POST
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Lê body
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Aceita camelCase OU snake_case
    const fullName =
      body.fullName || body.full_name || body.name || body.fullname || "";
    const email = body.email || "";
    const projectSlug =
      body.projectSlug || body.project_slug || body.slug || "";

    const phone = body.phone || body.phone_number || null;

    // Validação
    if (!fullName || !email || !projectSlug) {
      return new Response(
        JSON.stringify({
          error: "Missing fields",
          expected: ["fullName/email/projectSlug (or full_name/email/project_slug)"],
          received: Object.keys(body),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ENV
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error: "Missing server env vars",
          required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Insert via PostgREST (sem depender de lib)
    const url = `${SUPABASE_URL}/rest/v1/portal_leads`;

    const insertPayload = {
      project_slug: projectSlug,
      full_name: fullName,
      email,
      phone,
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(insertPayload),
    });

    const text = await resp.text();

    if (!resp.ok) {
      return new Response(
        JSON.stringify({
          error: "Supabase insert failed",
          status: resp.status,
          details: text,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        saved: insertPayload,
        supabase: text ? JSON.parse(text) : null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unhandled error", message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
