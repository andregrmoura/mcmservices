export default async (req) => {
  const json = (status, data, extraHeaders = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
    });

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" }, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const projectSlug = (body.projectSlug || "").trim();
    const fullName = (body.fullName || "").trim();
    const email = (body.email || "").trim();
    const pageUrl = (body.pageUrl || "").trim();

    if (!projectSlug) {
      return json(400, { ok: false, error: "Missing projectSlug" }, {
        "Access-Control-Allow-Origin": "*",
      });
    }

    const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
    const FROM =
      (process.env.LEADS_NOTIFY_FROM ||
        process.env.LEAD_NOTIFY_FROM ||
        "").trim();

    const TO_RAW =
      (process.env.LEADS_NOTIFY_TO ||
        process.env.LEAD_NOTIFY_TO ||
        "").trim();

    if (!RESEND_API_KEY) {
      return json(500, { ok: false, error: "Missing RESEND_API_KEY" }, {
        "Access-Control-Allow-Origin": "*",
      });
    }

    if (!FROM) {
      return json(500, { ok: false, error: "Missing LEAD(S)_NOTIFY_FROM" }, {
        "Access-Control-Allow-Origin": "*",
      });
    }

    if (!TO_RAW) {
      return json(500, { ok: false, error: "Missing LEAD(S)_NOTIFY_TO" }, {
        "Access-Control-Allow-Origin": "*",
      });
    }

    const TO = TO_RAW.split(",").map(s => s.trim()).filter(Boolean);

    const subject = `Portal Access: ${projectSlug} — ${fullName || email || "Visitor"}`;
    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 12px;">Client accessed the portal</h2>
        <p style="margin:0 0 6px;"><b>Project:</b> ${projectSlug}</p>
        <p style="margin:0 0 6px;"><b>Name:</b> ${fullName || "-"}</p>
        <p style="margin:0 0 6px;"><b>Email:</b> ${email || "-"}</p>
        <p style="margin:0 0 6px;"><b>Page:</b> ${pageUrl || "-"}</p>
        <p style="margin:14px 0 0;color:#666;font-size:12px;">Time: ${new Date().toLocaleString()}</p>
      </div>
    `;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: TO,
        subject,
        html,
        ...(email ? { reply_to: [email] } : {}),
      }),
    });

    const text = await r.text();
    if (!r.ok) {
      console.log("RESEND_VISIT_FAILED", r.status, text);
      return json(502, { ok: false, error: "Resend failed", status: r.status, details: text }, {
        "Access-Control-Allow-Origin": "*",
      });
    }

    return json(200, { ok: true }, {
      "Access-Control-Allow-Origin": "*",
    });
  } catch (err) {
    console.log("LOG_PORTAL_VISIT_ERROR", err);
    return json(500, { ok: false, error: err.message }, {
      "Access-Control-Allow-Origin": "*",
    });
  }
};
