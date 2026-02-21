
export default async (req) => {

  const json = (status, data) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return json(405, { error: "POST required" });
  }

  try {

    const body = await req.json();

    const projectSlug = body.projectSlug || body.project_slug || "";
    const fullName = body.fullName || body.full_name || "";
    const email = (body.email || "").trim();
    const phone = body.phone || null;

    if (!projectSlug || !fullName || !email) {
      return json(400, { error: "Missing required fields" });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    const ADMIN_EMAIL = process.env.MAIL_TO_ADMIN;
    const FROM_EMAIL = process.env.MAIL_FROM_ADMIN;

    const LOGO =
      process.env.BRAND_LOGO_URL ||
      "https://mcmprosolutions.com/images/transparent-logo-2.png";

    const PORTAL_URL = `https://mcmprosolutions.com/projects/${projectSlug}/`;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return json(500, { error: "Supabase env missing" });
    }

    /*
      INSERT LEAD
      If duplicate → returning client
    */

    let firstAccess = false;

    const insert = await fetch(`${SUPABASE_URL}/rest/v1/portal_leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        project_slug: projectSlug,
        full_name: fullName,
        email,
        ...(phone ? { phone } : {})
      })
    });

    if (insert.status === 201 || insert.status === 200) {
      firstAccess = true;
    }

    /*
      ADMIN EMAIL — ALWAYS SEND
    */

    if (RESEND_API_KEY && ADMIN_EMAIL && FROM_EMAIL) {

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          subject: `Portal Access: ${fullName} (${projectSlug})`,
          html: `
            <div style="font-family:Arial;padding:20px;">
              <h3>Client Activity</h3>
              <p><b>Project:</b> ${projectSlug}</p>
              <p><b>Name:</b> ${fullName}</p>
              <p><b>Email:</b> ${email}</p>
              <p>Status: ${firstAccess ? "FIRST ACCESS" : "RETURN ACCESS"}</p>
            </div>
          `,
          reply_to: email
        })
      });

    }

    /*
      CLIENT EMAIL — ONLY FIRST ACCESS
    */

    if (firstAccess && RESEND_API_KEY && FROM_EMAIL) {

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: "Your Secure Project Portal Access",
          html: `
            <div style="font-family:Arial;background:#f7f7f7;padding:20px;">
              <div style="max-width:640px;margin:auto;background:white;border-radius:14px;padding:24px;">

                <div style="text-align:center;margin-bottom:20px;">
                  <img src="${LOGO}" style="height:110px"/>
                </div>

                <h2 style="text-align:center;color:#b9965e;font-weight:400;">
                  Access Confirmed
                </h2>

                <p style="text-align:center;">
                  Hello ${fullName}, your access to your private project portal has been confirmed.
                </p>

                <div style="text-align:center;margin:30px 0;">
                  <a href="${PORTAL_URL}"
                     style="padding:14px 20px;border-radius:10px;background:#b9965e;color:#111;font-weight:700;text-decoration:none;">
                    Open Project Portal
                  </a>
                </div>

                <p style="font-size:12px;color:#777;text-align:center;">
                  © ${new Date().getFullYear()} Moura Consulting & Management
                </p>

              </div>
            </div>
          `
        })
      });

    }

    return json(200, {
      ok: true,
      firstAccess
    });

  } catch (err) {

    return json(500, {
      error: "Unhandled error",
      message: String(err?.message || err)
    });

  }

};
