// /netlify/functions/notify-access.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Admin destination (set in Netlify env vars)
const ADMIN_EMAIL = process.env.MAIL_TO_ADMIN || "commercial@mcmprosolutions.com";

// Sender (must be a verified sender/domain in Resend)
const FROM_EMAIL =
  process.env.MAIL_FROM_ADMIN ||
  "Moura Consulting & Management <leads@mcmprosolutions.com>";

function getClientIp(headers = {}) {
  const xf = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  if (!xf) return "";
  return String(xf).split(",")[0].trim();
}

async function sendResendEmail({ to, subject, html }) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Resend error: ${resp.status} ${txt}`);
  }
  return resp.json();
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const projectSlug = (body.projectSlug || "").toString().trim();
    const fullName = body.fullName ? String(body.fullName) : null;
    const email = body.email ? String(body.email) : null;

    if (!projectSlug) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing projectSlug" }) };
    }

    // Basic metadata (optional)
    const path = body.path ? String(body.path) : "";
    const referrer = body.referrer ? String(body.referrer) : "";
    const ua = body.ua ? String(body.ua) : "";
    const source = body.source ? String(body.source) : "";
    const ip = getClientIp(event.headers || {});
    const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

    // 1) Save log to Supabase
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: insertErr } = await supabase.from("portal_access_logs").insert([
      {
        project_slug: projectSlug,
        full_name: fullName,
        email: email,
      },
    ]);

    if (insertErr) throw new Error(`Supabase insert error: ${insertErr.message}`);

    // 2) Email admin
    if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

    await sendResendEmail({
      to: ADMIN_EMAIL,
      subject: `Portal Access: ${projectSlug}`,
      html: `
        <div style="margin:0;padding:0;background:#f6f6f6;">
          <div style="padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;">
            <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:16px;padding:22px 20px;border:1px solid #ececec;">

              <div style="font-size:16px;line-height:1.4;font-weight:600;color:#111;margin:0 0 12px 0;">
                Client accessed the portal
              </div>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size:13.5px;line-height:1.6;color:#333;">
                <tr>
                  <td style="padding:6px 0;color:#666;width:120px;">Project</td>
                  <td style="padding:6px 0;color:#111;">${projectSlug}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Name</td>
                  <td style="padding:6px 0;color:#111;">${fullName || "-"}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Email</td>
                  <td style="padding:6px 0;color:#111;">${email || "-"}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Path</td>
                  <td style="padding:6px 0;color:#111;">${path || "-"}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Referrer</td>
                  <td style="padding:6px 0;color:#111;">${referrer || "-"}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">IP</td>
                  <td style="padding:6px 0;color:#111;">${ip || "-"}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#666;">Time</td>
                  <td style="padding:6px 0;color:#111;">${now} (ET)</td>
                </tr>
              </table>

              <div style="font-size:12px;line-height:1.6;color:#8a8a8a;margin-top:14px;">
                © ${new Date().getFullYear()} Moura Consulting &amp; Management
              </div>

            </div>
          </div>
        </div>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unhandled error", message: String(err.message || err) }),
    };
  }
};
