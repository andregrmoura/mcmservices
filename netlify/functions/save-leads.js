
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

    /* 
       USE EXISTING NETLIFY VARIABLES (no need to change Netlify)
    */

    const ADMIN_EMAIL =
      process.env.LEAD_NOTIFY_TO ||
      process.env.LEADS_NOTIFY_TO ||
      process.env.MAIL_TO_ADMIN;

    const FROM_ADMIN =
      process.env.LEAD_NOTIFY_FROM ||
      process.env.LEADS_NOTIFY_FROM ||
      process.env.MAIL_FROM_ADMIN;

    const FROM_CLIENT =
      process.env.MAIL_FROM_CLIENT ||
      process.env.LEAD_NOTIFY_FROM;

    const LOGO =
      process.env.BRAND_LOGO_URL ||
      "https://mcmprosolutions.com/images/transparent-logo-2.png";

    const PORTAL_URL = `https://mcmprosolutions.com/projects/${projectSlug}/`;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return json(500, { error: "Supabase env missing" });
    }

    /*
      INSERT LEAD (ignore duplicate)
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
      ADMIN EMAIL — ALWAYS
    */

    if (RESEND_API_KEY && ADMIN_EMAIL && FROM_ADMIN) {

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: FROM_ADMIN,
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

    if (firstAccess && RESEND_API_KEY && FROM_CLIENT) {

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: FROM_CLIENT,
          to: [email],
          subject: "Your Secure Project Portal Access",
          html: `
            <div style="margin:0;padding:0;background:#f6f6f6;">
              <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
                Your secure access to the project portal is confirmed.
              </div>

              <div style="padding:28px 16px;">
                <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:16px;padding:26px 22px;border:1px solid #ececec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;">

                  <div style="text-align:center;margin-bottom:18px;">
                    <img src="${LOGO}" alt="Moura Consulting &amp; Management"
                      style="display:block;margin:auto;border:0;outline:none;text-decoration:none;height:60px;width:auto;object-fit:contain;" />
                  </div>

                  <div style="text-align:center;font-size:20px;line-height:1.3;font-weight:600;color:#111111;margin:0 0 10px 0;">
                    Secure Access Confirmed
                  </div>

                  <div style="text-align:center;font-size:14.5px;line-height:1.6;font-weight:400;color:#444444;margin:0 0 18px 0;">
                    Hello ${fullName}, your access to the private project portal has been successfully confirmed.
                  </div>

                  <div style="text-align:center;margin:26px 0;">
                    <a href="${PORTAL_URL}"
                      style="display:inline-block;padding:14px 26px;background:#C6A46C;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;line-height:15px;font-weight:500;letter-spacing:0.2px;-webkit-text-size-adjust:none;">
                      Access Your Project Portal
                    </a>
                  </div>
<div style="font-size:12px;line-height:1.6;color:#8a8a8a;text-align:center;margin-top:18px;">
                    © ${new Date().getFullYear()} Moura Consulting &amp; Management
                  </div>

                </div>
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
