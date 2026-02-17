exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { projectSlug, fullName, email } = body;

    if (!projectSlug || !fullName || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing fields" })
      };
    }

    // =========================
    // 1) Salvar no Supabase
    // =========================
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/portal_leads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify({
            project_slug: projectSlug,
            full_name: fullName,
            email: email,
            last_seen: new Date().toISOString()
          })
        });
      } catch (err) {
        console.log("Supabase insert failed:", err.message);
      }
    }

    // =========================
    // 2) Enviar email (Resend)
    // =========================
    const resendKey = process.env.RESEND_API_KEY;
    const emailTo = process.env.LEAD_NOTIFY_TO;
    const emailFrom = process.env.LEAD_NOTIFY_FROM;

    if (resendKey && emailTo && emailFrom) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [emailTo],
            subject: `Portal Access: ${fullName}`,
            html: `
              <div style="font-family:Arial,sans-serif">
                <h2>New Portal Access</h2>
                <p><strong>Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Project:</strong> ${projectSlug}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
            `
          })
        });
      } catch (err) {
        console.log("Email send failed:", err.message);
      }
    }

    // =========================
    // 3) Resposta de sucesso
    // =========================
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal error",
        message: err.message
      })
    };
  }
};
