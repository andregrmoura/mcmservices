export default async (req) => {
  const json = (status, data, extraHeaders = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
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
    const email = (body.email ?? "").trim();
    const phone = body.phone ?? null;

    if (!projectSlug || !fullName || !email) {
      return json(400, { error: "Missing required fields" });
    }

    const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { error: "Missing Supabase environment variables" });
    }

    const payload = {
      project_slug: projectSlug,
      full_name: fullName,
      email,
      ...(phone ? { phone } : {}),
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

    const looksLikeDuplicate = (t) => {
      const s = String(t || "").toLowerCase();
      return (
        s.includes("duplicate") ||
        s.includes("already exists") ||
        s.includes("23505") ||
        s.includes("unique constraint")
      );
    };

    const leadCreated = res.ok;
    const duplicate = !res.ok && looksLikeDuplicate(text);

    if (!res.ok && !duplicate) {
      return json(500, { error: "Supabase insert failed", details: text });
    }

    // EMAIL CONFIG
    const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
    const TO_ADMIN = (process.env.LEADS_NOTIFY_TO || "").trim();
    const FROM = (process.env.LEADS_NOTIFY_FROM || "").trim();
    const BRAND_LOGO_URL =
      (process.env.BRAND_LOGO_URL ||
        "https://mcmprosolutions.com/images/transparent-logo-2.png").trim();

    const PORTAL_URL = `https://mcmprosolutions.com/projects/${projectSlug}/`;

    let emailAdmin = { sent: false };
    let emailClient = { sent: false };

    // ADMIN EMAIL (sempre)
    try {
      if (RESEND_API_KEY && TO_ADMIN && FROM) {
        const subject = `Portal Access: ${fullName} (${projectSlug})`;

        const htmlBody = `
          <div style="font-family:Arial,sans-serif;padding:16px;">
            <h3>Client Activity</h3>
            <p><strong>Project:</strong> ${projectSlug}</p>
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p>Status: ${leadCreated ? "FIRST ACCESS" : "RETURN ACCESS"}</p>
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
            to: [TO_ADMIN],
            subject,
            html: htmlBody,
            reply_to: email,
          }),
        });

        emailAdmin = { sent: emailRes.ok };
      }
    } catch (e) {
      emailAdmin = { sent: false };
    }

    // CLIENT EMAIL (somente primeiro acesso)
    try {
      if (leadCreated && RESEND_API_KEY && FROM) {
        const subject = "Access Confirmed – Private Project Portal";

        const htmlBody = `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.55;background:#f7f7f7;padding:22px;">
            <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:18px;overflow:hidden;">
              
              <div style="padding:22px 18px 8px;text-align:center;">
                <img src="${BRAND_LOGO_URL}" alt="MCM Services" style="height:120px;width:auto;object-fit:contain;" />
              </div>

              <div style="padding:10px 22px 22px;">
                <h2 style="margin:8px 0 6px;font-family:Georgia,serif;font-weight:400;color:#b9965e;text-align:center;">
                  Access Confirmed
                </h2>

                <p style="margin:0 0 12px;color:#555;text-align:center;">
                  Hi ${fullName}, your access to your private project portal has been confirmed.
                </p>

                <div style="margin:14px 0 16px;border:1px solid #f0f0f0;border-radius:14px;padding:14px;background:#fff;">
                  <p style="margin:0 0 8px;"><strong>Project:</strong> ${projectSlug}</p>
                  <p style="margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
                </div>

                <div style="text-align:center;margin:18px 0 8px;">
                  <a href="${PORTAL_URL}"
                     style="display:inline-block;padding:12px 18px;border-radius:14px;background:linear-gradient(180deg,#C7A96B,#b9965e);color:#111;text-decoration:none;font-weight:800;">
                    Open Project Portal
                  </a>
                </div>

                <p style="margin:14px 0 0;color:#777;font-size:12px;text-align:center;">
                  If you have any questions, just reply to this email.
                </p>

                <p style="margin:10px 0 0;color:#999;font-size:11px;text-align:center;">
                  © ${new Date().getFullYear()} MCM Services USA Corporation
                </p>
              </div>
            </div>
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
            html: htmlBody,
          }),
        });

        emailClient = { sent: emailRes.ok };
      }
    } catch (e) {
      emailClient = { sent: false };
    }

    return json(200, {
      ok: true,
      leadCreated,
      duplicate,
      emails: {
        admin: emailAdmin,
        client: emailClient,
      },
    });
  } catch (err) {
    return json(500, { error: "Unhandled error", message: String(err) });
  }
};
