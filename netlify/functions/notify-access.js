// /netlify/functions/notify-access.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Email identities (Netlify env vars)
// - MAIL_FROM_ADMIN  -> internal/admin notifications (recommended: "Project Access <leads@mcmprosolutions.com>")
// - MAIL_FROM_CLIENT -> client-facing emails (recommended: "Moura Consulting & Management <leads@mcmprosolutions.com>")
// Backward compatibility: MAIL_FROM still supported as admin fallback.
const FROM_ADMIN =
  process.env.MAIL_FROM_ADMIN ||
  process.env.MAIL_FROM ||
  "Project Access <leads@mcmprosolutions.com>";

const FROM_CLIENT =
  process.env.MAIL_FROM_CLIENT ||
  "Moura Consulting & Management <leads@mcmprosolutions.com>";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "andre@mcmprosolutions.com";

async function sendResendEmail({ to, subject, html, from }) {
  if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from || FROM_ADMIN,
      to,
      subject,
      html,
    }),
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

    const { projectSlug, fullName, email } = JSON.parse(event.body || "{}");

    if (!projectSlug) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing projectSlug" }) };
    }

    // 1) Save access log in Supabase
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: insertErr } = await supabase.from("portal_access_logs").insert([
      {
        project_slug: String(projectSlug),
        full_name: fullName ? String(fullName) : null,
        email: email ? String(email) : null,
      },
    ]);

    if (insertErr) throw new Error(`Supabase insert error: ${insertErr.message}`);

    // 2) Email admin notification
    const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

    await sendResendEmail({
      from: FROM_ADMIN,
      to: ADMIN_EMAIL,
      subject: `Project Access: ${projectSlug}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 12px 0">Portal access detected</h2>
          <p style="margin:0 0 6px 0"><b>Project:</b> ${projectSlug}</p>
          <p style="margin:0 0 6px 0"><b>Name:</b> ${fullName || "-"}</p>
          <p style="margin:0 0 6px 0"><b>Email:</b> ${email || "-"}</p>
          <p style="margin:12px 0 0 0;color:#666"><b>Time:</b> ${now} (ET)</p>
        </div>
      `,
    });

    // NOTE: Client-facing emails (if you ever add them in this function) should use:
    // await sendResendEmail({ from: FROM_CLIENT, to: clientEmail, subject: "...", html: "..." });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unhandled error", message: String(err.message || err) }),
    };
  }
};
