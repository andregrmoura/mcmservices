export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL =
      process.env.SUPABASE_URL ||
      process.env.SUPABASE_PROJECT_URL ||
      process.env.SUPABASE_API_URL;

    const SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_KEY;

    if (!SUPABASE_URL) {
      return new Response(
        JSON.stringify({
          error: "Missing env var",
          message:
            "SUPABASE_URL is not set in Netlify Environment Variables (Site settings → Environment variables).",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error: "Missing env var",
          message:
            "SUPABASE_SERVICE_ROLE_KEY is not set in Netlify Environment Variables (Site settings → Environment variables).",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Accept both camelCase and snake_case payloads
    const body = await req.json().catch(() => ({}));

    const projectSlug = body.projectSlug ?? body.project_slug ?? "";
    const fullName = body.fullName ?? body.full_name ?? "";
    const email = body.email ?? "";
    const phone = body.phone ?? null;

    if (!projectSlug || !fullName || !email) {
      return new Response(
        JSON.stringify({
          error: "Missing fields",
          expected: ["projectSlug (or project_slug)", "fullName (or full_name)", "email"],
          received: Object.keys(body || {}),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = `${SUPABASE_URL}/rest/v1/portal_leads`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        project_slug: projectSlug,
        full_name: fullName,
        email,
        phone,
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: "Supabase insert failed",
          status: res.status,
          details: text,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, inserted: text ? JSON.parse(text) : [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Unhandled error",
        message: String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
