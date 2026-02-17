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


    // -------- Email notification (optional) --------
    // Recommended provider: Resend (https://resend.com)
    // Set in Netlify env:
    //   RESEND_API_KEY=...
    //   LEADS_NOTIFY_TO=andre@mcmprosolutions.com   (or your preferred email)
    //   LEADS_NOTIFY_FROM=Leads <no-reply@mcmprosolutions.com> (must be a verified sender/domain in Resend)
    let emailNotification = { sent: false };
    try {
      const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
      const TO = (process.env.LEADS_NOTIFY_TO || "").trim();
      const FROM = ((process.env.LEAD_NOTIFY_FROM || process.env.LEADS_NOTIFY_FROM) || "").trim();

      if (RESEND_API_KEY && TO && FROM) {
        const insertedRow = text ? (JSON.parse(text)?.[0] || JSON.parse(text)) : null;

        const subject = `New Portal Lead: ${fullName} (${projectSlug})`;
        const htmlBody = `
          <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.45;">
            <h2 style="margin:0 0 12px;">New Portal Lead</h2>
            <p style="margin:0 0 10px;"><strong>Project:</strong> ${projectSlug}</p>
            <p style="margin:0 0 10px;"><strong>Name:</strong> ${fullName}</p>
            <p style="margin:0 0 10px;"><strong>Email:</strong> ${email}</p>
            ${phone ? `<p style="margin:0 0 10px;"><strong>Phone:</strong> ${phone}</p>` : ``}
            <p style="margin:14px 0 0; color:#666; font-size:13px;">Saved via mcmprosolutions.com portal.</p>
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
            to: [TO],
            subject,
            html: htmlBody,
            // Optional: reply-to the lead
            reply_to: email,
          }),
        });

        const emailText = await emailRes.text();
        if (!emailRes.ok) {
          emailNotification = { sent: false, error: "Resend send failed", status: emailRes.status, details: emailText };
        } else {
          emailNotification = { sent: true, response: emailText ? JSON.parse(emailText) : null };
        }

        // ===== Client confirmation email (professional + branded) =====
        try {
          const portalLink = projectUrl || `https://mcmprosolutions.com/projects/${projectSlug}/`;
          const clientSubject = `Project Portal Access Confirmed`;
          const clientHtml = `
            <div style="background:#f6f3ee;padding:26px 14px;">
              <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e8dfd2;">
                <div style="background:linear-gradient(135deg,#0d0d0d,#1a1a1a);padding:22px 22px 18px;">
                  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#c8a76a;font-weight:700;letter-spacing:.14em;font-size:12px;">
                    <img src="https://mcmprosolutions.com/images/mcmbrand-removebg-preview.png" alt="MCM" style="height:38px;display:block;">
                  </div>
                  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#ffffff;font-weight:700;font-size:20px;margin-top:6px;">
                    Private Project Portal
                  </div>
                  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#bdbdbd;font-size:13px;margin-top:6px;">
                    A Division of MCM Services USA Corporation
                  </div>
                </div>

                <div style="padding:22px 22px 10px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;line-height:1.6;">
                  <p style="margin:0 0 12px;">Dear ${fullName},</p>

                  <p style="margin:0 0 12px;">
                    Your access to the private project portal has been successfully confirmed.
                  </p>

                  <p style="margin:0 0 14px;">
                    Through this portal, you can follow the progress of your project, review photos, documents, and important updates at any time.
                  </p>

                  <div style="margin:18px 0 18px;">
                    <a href="${portalLink}"
                       style="display:inline-block;background:#c8a76a;color:#111;text-decoration:none;font-weight:700;padding:12px 16px;border-radius:12px;">
                      Open Project Portal
                    </a>
                  </div>

                  <div style="background:#faf7f2;border:1px solid #eee4d6;border-radius:14px;padding:12px 14px;margin:0 0 16px;">
                    <div style="font-size:12px;color:#6a5a43;letter-spacing:.08em;font-weight:700;">PROJECT</div>
                    <div style="font-size:14px;color:#111;margin-top:4px;font-weight:600;">${projectSlug}</div>
                  </div>

                  <p style="margin:0 0 14px;">
                    If you have any questions or need assistance, please reply to this email.
                  </p>

                  <p style="margin:0 0 6px;">We appreciate the opportunity to work on your project.</p>
                </div>

                <div style="padding:14px 22px 22px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#666;font-size:12.5px;line-height:1.5;">
                  <div style="height:1px;background:#efe6d8;margin:0 0 14px;"></div>
                  <div style="font-weight:700;color:#111;">Moura Consulting &amp; Management</div>
                  <div>A Division of MCM Services USA Corporation</div>
                  <div>High-End Residential Projects • Miami, Florida</div>
                  <div style="margin-top:8px;">
                    <a href="mailto:commercial@mcmprosolutions.com" style="color:#111;text-decoration:none;">commercial@mcmprosolutions.com</a>
                    &nbsp;•&nbsp;
                    <a href="https://mcmprosolutions.com" style="color:#111;text-decoration:none;">mcmprosolutions.com</a>
                  </div>
                  <div style="margin-top:10px;color:#888;font-size:11.5px;">
                    If you did not request this access, you may ignore this message.
                  </div>
                </div>
              </div>
            </div>
          `;

          const clientRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: FROM,
              to: [email],
              subject: clientSubject,
              html: clientHtml,
              reply_to: TO,
            }),
          });

          const clientText = await clientRes.text();
          if (!clientRes.ok) {
            // Don't block access
            emailNotification.client = {
              sent: false,
              error: "Resend send failed (client)",
              status: clientRes.status,
              details: clientText,
            };
          } else {
            emailNotification.client = {
              sent: true,
              response: clientText ? JSON.parse(clientText) : null,
            };
          }
        } catch (e) {
          // Don't block access
          emailNotification.client = { sent: false, error: "Client email error", message: String(e?.message || e) };
        }
      } else {
        emailNotification = { sent: false, skipped: true, reason: "Missing RESEND_API_KEY / LEADS_NOTIFY_TO / (LEAD_NOTIFY_FROM or LEADS_NOTIFY_FROM)" };
      }
    } catch (e) {
      emailNotification = { sent: false, error: "Email notification error", message: String(e?.message || e) };
    }

    return json(200, { ok: true, inserted: text ? JSON.parse(text) : null, emailNotification });
  } catch (err) {
    return json(500, { error: "Unhandled error", message: String(err) });
  }
};
