export default async (req) => {
  const json = (status, data, extraHeaders = {}) =>
    new Response(JSON.stringify(data), {
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

  try {
    // Parse body (robusto)
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

    // ---------- 1) Try insert lead (unique email+project) ----------
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

    // leadCreated = true apenas quando inseriu com sucesso
    const leadCreated = res.ok;
    const duplicate = (!res.ok && (res.status === 409 || looksLikeDuplicate(text)));

    // Se deu erro diferente de duplicado, aborta
    if (!res.ok && !duplicate) {
      return json(500, {
        error: "Supabase insert failed",
        status: res.status,
        details: text,
        supabase_url_used: SUPABASE_URL,
      });
    }

    // ---------- 2) Emails via Resend ----------
    // Env no Netlify:
    // RESEND_API_KEY=...
    // LEADS_NOTIFY_TO=andre@mcmprosolutions.com              (ADMIN - você)
    // LEADS_NOTIFY_FROM="MCM Leads <leads@mcmprosolutions.com>" (sender verificado)
    // (Opcional) BRAND_LOGO_URL=...
    let emailAdmin = { sent: false };
    let emailClient = { sent: false, skipped: true, reason: "Not first access" };

    const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
    const TO_ADMIN = (process.env.LEADS_NOTIFY_TO || "").trim();
    const FROM = (process.env.LEADS_NOTIFY_FROM || "").trim();
    const BRAND_LOGO_URL = (process.env.BRAND_LOGO_URL || "https://mcmprosolutions.com/images/mcmbrand-removebg-preview.png").trim();

    const PORTAL_URL = `https://mcmprosolutions.com/projects/${projectSlug}/`;
    const ACCESS_URL = `https://mcmprosolutions.com/access/${projectSlug}/`;

    const safe = (v) =>
      String(v || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

    // ✅ Admin: SEMPRE (todo acesso)
    if (RESEND_API_KEY && TO_ADMIN && FROM) {
      try {
        const subject = `Portal Access: ${safe(fullName)} (${safe(projectSlug)})`;
        const html = `
          <div style="font-family:-apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.5; color:#111;">
            <div style="max-width:640px;margin:0 auto;padding:16px;">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <img src="${BRAND_LOGO_URL}" alt="MCM" style="height:44px;width:auto;object-fit:contain;" />
                <div>
                  <div style="font-weight:800;font-size:15px;">MCM Project Portal</div>
                  <div style="font-size:13px;color:#666;">Client access activity</div>
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
                  Access Link: ${safe(ACCESS_URL)}<br/>
                  Time: ${new Date().toISOString()}
                </p>
              </div>
            </div>
          </div>
        `;

        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({ from: FROM, to: [TO_ADMIN], subject, html, reply_to: email }),
        });

        const t = await r.text();
        emailAdmin = r.ok ? { sent: true, response: t ? JSON.parse(t) : null } : { sent: false, status: r.status, details: t };
      } catch (e) {
        emailAdmin = { sent: false, error: String(e?.message || e) };
      }
    } else {
      emailAdmin = { sent: false, skipped: true, reason: "Missing RESEND_API_KEY / LEADS_NOTIFY_TO / LEADS_NOTIFY_FROM" };
    }

    // ✅ Client: SÓ NO PRIMEIRO ACESSO (leadCreated)
    if (leadCreated && RESEND_API_KEY && FROM) {
      try {
        const subject = `Access Confirmed | MCM Project Portal`;
        const html = `
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

        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({ from: FROM, to: [email], subject, html }),
        });

        const t = await r.text();
        emailClient = r.ok ? { sent: true, response: t ? JSON.parse(t) : null } : { sent: false, status: r.status, details: t };
      } catch (e) {
        emailClient = { sent: false, error: String(e?.message || e) };
      }
    }

    // ✅ Retorna 200 tanto para novo quanto para retorno
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
