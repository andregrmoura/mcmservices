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
    const phone = (body.phone || "").trim();

    if (!projectSlug || !fullName || !email) {
      return json(
        400,
        { error: "Missing fields", required: ["projectSlug", "fullName", "email"] },
        { "Access-Control-Allow-Origin": "*" }
      );
    }

    // ===== Supabase insert =====
    const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
    const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(
        500,
        {
          error: "Missing environment variables",
          missing: {
            SUPABASE_URL: !SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: !SUPABASE_SERVICE_ROLE_KEY,
          },
        },
        { "Access-Control-Allow-Origin": "*" }
      );
    }

    const payload = {
      project_slug: projectSlug,
      full_name: fullName,
      email,
      ...(phone ? { phone } : {}),
      last_seen: new Date().toISOString(),
    };

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
      return json(
        500,
        { error: "Supabase insert failed", status: res.status, details: text },
        { "Access-Control-Allow-Origin": "*" }
      );
    }

    const inserted = text ? JSON.parse(text) : null;

    // ===== Resend emails =====
    const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
    const ADMIN_TO = (process.env.LEADS_NOTIFY_TO || "").trim();
    const FROM = (process.env.LEADS_NOTIFY_FROM || "").trim();

    // base URL do seu site (pra link do portal)
    const SITE_URL =
      (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://mcmprosolutions.com").trim();

    const portalUrl = `${SITE_URL}/projects/${projectSlug}/`;
    const accessUrl = `${SITE_URL}/access/${projectSlug}/`;

    let emailAdmin = { sent: false };
    let emailClient = { sent: false };

    if (RESEND_API_KEY && FROM && ADMIN_TO) {
      // 1) Email pra você (admin) - lead novo / acesso
      try {
        const subject = `New Portal Lead: ${fullName} (${projectSlug})`;
        const html = `
          <div style="font-family:-apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.5;">
            <h2 style="margin:0 0 12px;">New Portal Lead</h2>
            <p style="margin:0 0 8px;"><b>Project:</b> ${projectSlug}</p>
            <p style="margin:0 0 8px;"><b>Name:</b> ${fullName}</p>
            <p style="margin:0 0 8px;"><b>Email:</b> ${email}</p>
            ${phone ? `<p style="margin:0 0 8px;"><b>Phone:</b> ${phone}</p>` : ""}
            <p style="margin:12px 0 0;"><a href="${portalUrl}">Open Portal</a></p>
            <p style="margin:10px 0 0;color:#666;font-size:12px;">Saved via access page.</p>
          </div>
        `;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM,
            to: [ADMIN_TO],
            subject,
            html,
            reply_to: email,
          }),
        });

        const emailText = await emailRes.text();
        emailAdmin = emailRes.ok
          ? { sent: true, response: emailText ? JSON.parse(emailText) : null }
          : { sent: false, status: emailRes.status, details: emailText };
      } catch (e) {
        emailAdmin = { sent: false, error: String(e?.message || e) };
      }

      // 2) Email pro CLIENTE (confirmação + link)
      try {
        const subject = `Your Project Portal Access (${projectSlug})`;
        const html = `
          <div style="font-family:-apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.5;">
            <h2 style="margin:0 0 12px;">Access Confirmed</h2>
            <p style="margin:0 0 10px;">Hi ${fullName},</p>
            <p style="margin:0 0 10px;">
              Your access to the private project portal has been confirmed.
            </p>
            <p style="margin:0 0 12px;">
              <a href="${portalUrl}" style="display:inline-block;padding:10px 14px;background:#c7a96b;color:#111;text-decoration:none;border-radius:10px;font-weight:700;">
                Open Project Portal
              </a>
            </p>
            <p style="margin:0 0 10px;color:#666;font-size:13px;">
              If you ever need to confirm your access again, use this link: <a href="${accessUrl}">${accessUrl}</a>
            </p>
            <p style="margin:14px 0 0;color:#666;font-size:12px;">
              MCM Services — Moura Consulting & Management
            </p>
          </div>
        `;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM,
            to: [email],
            subject,
            html,
          }),
        });

        const emailText = await emailRes.text();
        emailClient = emailRes.ok
          ? { sent: true, response: emailText ? JSON.parse(emailText) : null }
          : { sent: false, status: emailRes.status, details: emailText };
      } catch (e) {
        emailClient = { sent: false, error: String(e?.message || e) };
      }
    } else {
      // se faltar config, não quebra o login
      emailAdmin = { sent: false, skipped: true, reason: "Missing RESEND_API_KEY / LEADS_NOTIFY_FROM / LEADS_NOTIFY_TO" };
      emailClient = { sent: false, skipped: true, reason: "Missing RESEND settings" };
    }

    return json(
      200,
      { ok: true, inserted, emailAdmin, emailClient },
      { "Access-Control-Allow-Origin": "*" }
    );
  } catch (err) {
    return json(500, { error: "Unhandled error", message: String(err?.message || err) }, { "Access-Control-Allow-Origin": "*" });
  }
};
