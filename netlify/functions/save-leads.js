export default async (req) => {
  const json = (status, data, extraHeaders = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", ...extraHeaders },
    });

  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, { "Access-Control-Allow-Origin": "*" });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const projectSlug = (body.projectSlug || "").trim();
    const fullName = (body.fullName || "").trim();
    const email = (body.email || "").trim();

    if (!projectSlug || !fullName || !email) {
      return json(
        400,
        { error: "Missing fields", required: ["projectSlug", "fullName", "email"] },
        { "Access-Control-Allow-Origin": "*" }
      );
    }

    // ========= Supabase =========
    const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
    const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(
        500,
        { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { "Access-Control-Allow-Origin": "*" }
      );
    }

    const insertPayload = {
      project_slug: projectSlug,
      full_name: fullName,
      email,
      last_seen: new Date().toISOString(),
    };

    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/portal_leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(insertPayload),
    });

    const supaText = await supaRes.text();

    if (!supaRes.ok) {
      return json(
        500,
        { error: "Supabase insert failed", status: supaRes.status, details: supaText },
        { "Access-Control-Allow-Origin": "*" }
      );
    }

    // ========= Resend =========
    const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
    const FROM = (process.env.LEADS_NOTIFY_FROM || process.env.LEAD_NOTIFY_FROM || "").trim();
    const ADMIN_TO_RAW = (process.env.LEADS_NOTIFY_TO || process.env.LEAD_NOTIFY_TO || "").trim();

    // base URL do site (Netlify seta URL / DEPLOY_PRIME_URL)
    const SITE_URL = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://mcmprosolutions.com").trim();
    const portalUrl = `${SITE_URL}/projects/${projectSlug}/`;
    const accessUrl = `${SITE_URL}/access/${projectSlug}/`;

    let adminEmail = { sent: false };
    let clientEmail = { sent: false };

    if (RESEND_API_KEY && FROM && ADMIN_TO_RAW) {
      const ADMIN_TO = ADMIN_TO_RAW.split(",").map(s => s.trim()).filter(Boolean);

      // 1) Email pra você
      try {
        const subject = `New Portal Lead: ${fullName} (${projectSlug})`;
        const html = `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
            <h2 style="margin:0 0 12px">New Portal Lead</h2>
            <p style="margin:0 0 6px"><b>Project:</b> ${projectSlug}</p>
            <p style="margin:0 0 6px"><b>Name:</b> ${fullName}</p>
            <p style="margin:0 0 10px"><b>Email:</b> ${email}</p>
            <p style="margin:10px 0 0"><a href="${portalUrl}">Open Portal</a></p>
          </div>
        `;

        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM,
            to: ADMIN_TO,
            subject,
            html,
            reply_to: [email],
          }),
        });

        const t = await r.text();
        adminEmail = r.ok ? { sent: true } : { sent: false, status: r.status, details: t };
      } catch (e) {
        adminEmail = { sent: false, error: String(e?.message || e) };
      }

      // 2) Email pro cliente (CONFIRMAÇÃO)
      try {
        const subject = `Your Project Portal Access`;
        const html = `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
            <h2 style="margin:0 0 12px">Access confirmed</h2>
            <p style="margin:0 0 10px">Hi ${fullName},</p>
            <p style="margin:0 0 14px">
              Your access to your private project portal is confirmed.
            </p>
            <p style="margin:0 0 14px">
              <a href="${portalUrl}" style="display:inline-block;padding:10px 14px;background:#c7a96b;color:#111;text-decoration:none;border-radius:10px;font-weight:700">
                Open Project Portal
              </a>
            </p>
            <p style="margin:0 0 10px;color:#666;font-size:13px">
              If needed, you can confirm access again here: <a href="${accessUrl}">${accessUrl}</a>
            </p>
            <p style="margin:14px 0 0;color:#666;font-size:12px">
              MCM Services — Moura Consulting & Management
            </p>
          </div>
        `;

        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM,
            to: [email],
            subject,
            html,
          }),
        });

        const t = await r.text();
        clientEmail = r.ok ? { sent: true } : { sent: false, status: r.status, details: t };
      } catch (e) {
        clientEmail = { sent: false, error: String(e?.message || e) };
      }
    }

    return json(
      200,
      { ok: true, adminEmail, clientEmail },
      { "Access-Control-Allow-Origin": "*" }
    );
  } catch (err) {
    return json(
      500,
      { error: "Unhandled error", message: String(err?.message || err) },
      { "Access-Control-Allow-Origin": "*" }
    );
  }
};
