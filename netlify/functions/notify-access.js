// /netlify/functions/notify-access.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const ADMIN_EMAIL = process.env.MAIL_TO_ADMIN || "commercial@mcmprosolutions.com";

const FROM_EMAIL =
  process.env.MAIL_FROM_ADMIN ||
  "Moura Consulting & Management <leads@mcmprosolutions.com>";

async function sendResendEmail({ to, subject, html }) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
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
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { projectSlug, fullName, email } = JSON.parse(event.body || "{}");

    if (!projectSlug) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing projectSlug" }),
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // salva log
    await supabase.from("portal_access_logs").insert([
      {
        project_slug: projectSlug,
        full_name: fullName || null,
        email: email || null,
      },
    ]);

    const now = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    });

    await sendResendEmail({
      to: ADMIN_EMAIL,
      subject: `Portal Access: ${projectSlug}`,
      html: `
        <div style="font-family:Arial,sans-serif">
          <h3>Client accessed the portal</h3>

          <p><b>Project:</b> ${projectSlug}</p>
          <p><b>Name:</b> ${fullName || "-"}</p>
          <p><b>Email:</b> ${email || "-"}</p>
          <p><b>Time:</b> ${now} (ET)</p>

          <hr>

          <small>Moura Consulting & Management</small>
        </div>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Unhandled error",
        message: String(err.message || err),
      }),
    };
  }
};