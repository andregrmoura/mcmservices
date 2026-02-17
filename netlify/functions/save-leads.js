import fetch from "node-fetch";

export async function handler(event) {
  try {
    const data = JSON.parse(event.body || "{}");

    const name = data.name || "Client";
    const email = data.email;
    const project = data.project || "MCM Project";

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM =
      process.env.LEADS_NOTIFY_FROM ||
      process.env.LEAD_NOTIFY_FROM ||
      "MCM Leads <leads@mcmprosolutions.com>";

    const TO =
      process.env.LEADS_NOTIFY_TO ||
      process.env.LEAD_NOTIFY_TO ||
      "commercial@mcmprosolutions.com";

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing email" }),
      };
    }

    // =========================
    // 1) EMAIL PARA A EMPRESA
    // =========================
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject: `New Portal Lead: ${name} (${project})`,
        html: `
          <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.5;">
            <h2>New Portal Lead</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Project:</strong> ${project}</p>
          </div>
        `,
        reply_to: [email],
      }),
    });

    // =========================
    // 2) AUTO-RESPOSTA PARA O CLIENTE
    // =========================
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Access confirmed – MCM Project Portal",
        html: `
          <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.6; color:#222;">
            <p>Hi ${name},</p>

            <p>Your access to the <strong>${project}</strong> portal has been confirmed.</p>

            <p>You can return anytime using the same link to:</p>
            <ul>
              <li>Track project updates</li>
              <li>View photos and progress</li>
              <li>Access invoices and documents</li>
            </ul>

            <p>If you have any questions, just reply to this email.</p>

            <p style="margin-top:24px;">
              Best regards,<br>
              <strong>MCM Services</strong><br>
              High-End Residential Projects
            </p>
          </div>
        `,
      }),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
