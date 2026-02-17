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

  // CORS preflight
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
    const email = (body.email ?? "").trim();
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

    // ---------------- 1) INSERT lead (único) ----------------
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
        s.includes("duplicate key") ||
        s.includes("already exists") ||
        s.includes("23505") ||
        s.includes("unique constraint") ||
        s.includes("portal_leads_email_project_unique")
      );
    };

    const leadCreated = res.ok; // ✅ primeiro acesso
    const duplicate = !res.ok && (res.status === 409 || looksLikeDuplicate(text)); // ✅ retorno

    // Se deu erro diferente de duplicado, aborta
    if (!res.ok && !duplicate) {
      return json(500, {
        error: "Supabase insert failed",
        status: res.status,
        details: text,
        supabase_url_used: SUPABASE_URL,
      });
    }

    // ---------------- 2) EMAILS ----------------
    // Netlify env:
    //   RESEND_API_KEY=...
    //   LEADS_NOTIFY_TO=commercial@mcmprosolutions.com         (ADMIN)
    //   LEADS_NOTIFY_FROM="MCM Leads <leads@mcmprosolutions.com>" (sender verificado)
    //   BRAND_LOGO_URL=https://mcmprosolutions.com/images/mcmbrand-removebg-preview.png (opcional)
    let emailAdmin = { sent: false };
    let emailClient = { sent: false, skipped: true, reason: "Not first access" };

    const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
    const TO_ADMIN = (process.env.LEADS_NOTIFY_TO || "").trim();
    const FROM = (process.env.LEADS_NOTIFY_FROM || "").trim();
    const BRAND_LOGO_URL = (process.env.BRAND_LOGO_URL || "https://mcmprosolutions.com/images/mcmbrand-removebg-preview.png").trim();

    const PORTAL_URL = `https://mcmprosolutions.com/projects/${projectSlug}/`;

    const safe = (v) =>
      String(v || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

    // ✅ ADMIN: SEMPRE (cada acesso)
    try {
      if (RESEND_API_KEY && TO_ADMIN && FROM) {
        const subject = `Portal Access: ${safe(fullName)} (${safe(projectSlug)})`;

        const htmlBody = `
          <div style="font-family:-apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.5;">
            <div style="max-width:640px;margin:0 auto;padding:18px;">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <img src="${BRAND_LOGO_URL}" alt="MCM" style="height:44px;width:auto;object-fit:contain;" />
                <div>
                  <div style="font-weight:800;font-size:15px;">MCM Project Portal</div>
                  <div style="font-size:13px;color:#666;">Client activity</div>
                </div>
              </div>

              <div style="border:1px solid #eee;border-radius:14px;padding:14px;background:#fff;">
                <p style="margin:0 0 8px;"><strong>Project:</strong> ${safe(projectSlug)}</p>
                <p style="margin:0 0 8px;"><strong>Name:</strong> ${safe(fullName)}</p>
                <p style="margin:0 0 8px;"><strong>Email:</strong> ${safe(email)}</p>
                ${phone ? `<p style="margin:0 0 8px;"><strong>Phone:</strong> ${safe(phone)}</p>` : ""}

                <p style="margin:12px 0 0;font-size:13px;color:#666;">
                  Status: ${leadCreated ? "FIRST ACCESS (lead created)" : "RETURN ACCESS"}
                </p>

                <p style="margin:10px 0 0;font-size:12px;color:#888;">
                  Portal: ${safe(PORTAL_URL)}<br/>
                  Time: ${new Date().toISOString()}
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
            to: [TO_ADMIN],
            subject,
            html: htmlBody,
            reply_to: email,
          }),
        });

        const emailText = await emailRes.text();
        emailAdmin = emailRes.ok
          ? { sent: true, response: emailText ? JSON.parse(emailText) : null }
          : { sent: false, status: emailRes.status, details: emailText };
      } else {
        emailAdmin = { sent: false, skipped: true, reason: "Missing RESEND_API_KEY / LEADS_NOTIFY_TO / LEADS_NOTIFY_FROM" };
      }
    } catch (e) {
      emailAdmin = { sent: false, error: "Admin email error", message: String(e?.message || e) };
    }

    // ✅ CLIENTE: SOMENTE NO PRIMEIRO ACESSO (leadCreated)
    try {
      if (leadCreated && RESEND_API_KEY && FROM) {
        const subject = "Access Confirmed | MCM Project Portal";

        const htmlBody = `
          <div style="font-family:-apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.55; background:#f7f7f7; padding:22px;">
            <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #eee;border-radius:18px;overflow:hidden;">
              <div style="padding:18px 18px 8px;text-align:center;">
                <img src="${BRAND_LOGO_URL}" alt="MCM" style="height:64px;width:auto;object-fit:contain;" />
              </div>

              <div style="padding:6px 22px 22px;">
                <h2 style="margin:8px 0 6px;font-family:Georgia,'Times New Roman',serif;font-weight:400;color:#b9965e;text-align:center;">
                  Access Confirmed
                </h2>

                <p style="margin:0 0 10px;color:#555;text-align:center;">
                  Hi ${safe(fullName)}, your access to your private project portal has been confirmed.
                </p>

                <div style="margin:14px 0 16px;border:1px solid #f0f0f0;border-radius:14px;padding:14px;background:#fff;">
                  <p style="margin:0 0 8px;"><strong>Project:</strong> ${safe(projectSlug)}</p>
                  <p style="margin:0 0 8px;"><strong>Email:</strong> ${safe(email)}</p>
                  <p style="margin:0;color:#666;font-size:13px;">
                    Use the button below to access your portal anytime.
                  </p>
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
            to: [email], // ✅ email digitado pelo cliente
            subject,
            html: htmlBody,
          }),
        });

        const emailText = await emailRes.text();
        emailClient = emailRes.ok
          ? { sent: true, response: emailText ? JSON.parse(emailText) : null }
          : { sent: false, status: emailRes.status, details: emailText };
      } else if (!leadCreated) {
        emailClient = { sent: false, skipped: true, reason: "Not first access" };
      } else {
        emailClient = { sent: false, skipped: true, reason: "Missing RESEND_API_KEY / LEADS_NOTIFY_FROM" };
      }
    } catch (e) {
      emailClient = { sent: false, error: "Client email error", message: String(e?.message || e) };
    }

    // ✅ Retorna 200 sempre para novo e retorno
    return json(200, {
      ok: true,
      leadCreated,
      duplicate,
      inserted: leadCreated && text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null,
      emails: { admin: emailAdmin, client: emailClient },
    });
  } catch (err) {
    return json(500, { error: "Unhandled error", message: String(err) });
  }
};
