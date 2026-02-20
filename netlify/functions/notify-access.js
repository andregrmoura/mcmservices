// /netlify/functions/notify-access.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const ADMIN_EMAIL = process.env.MAIL_TO_ADMIN; // ex: commercial@mcmprosolutions.com
const FROM_ADMIN =
  process.env.MAIL_FROM_ADMIN || "Project Access <leads@mcmprosolutions.com>";

async function sendResendEmail({ from, to, subject, html }) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
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

    if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
    if (!ADMIN_EMAIL) throw new Error("Missing MAIL_TO_ADMIN");

    const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

    await sendResendEmail({
      from: FROM_ADMIN,
      to: ADMIN_EMAIL,
      subject: `Portal Access: ${projectSlug}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 12px 0">Client accessed the portal</h2>
          <p style="margin:0 0 6px 0"><b>Project:</b> ${projectSlug}</p>
          <p style="margin:0 0 6px 0"><b>Name:</b> ${fullName || "-"}</p>
          <p style="margin:0 0 6px 0"><b>Email:</b> ${email || "-"}</p>
          <p style="margin:12px 0 0 0;color:#666"><b>Time:</b> ${now} (ET)</p>
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
