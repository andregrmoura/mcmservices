function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  let data = {};
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const projectSlug = (data.projectSlug || "").trim();
  const fullName = (data.fullName || "").trim();
  const email = (data.email || "").trim();
  const pageUrl = (data.pageUrl || "").trim();

  if (!projectSlug) return json(400, { ok: false, error: "Missing projectSlug" });

  const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
  const to =
    (process.env.LEADS_NOTIFY_TO || process.env.LEAD_NOTIFY_TO || "").trim();
  const from =
    (process.env.LEADS_NOTIFY_FROM || process.env.LEAD_NOTIFY_FROM || "").trim();

  if (!RESEND_API_KEY) return json(500, { ok: false, error: "Missing RESEND_API_KEY" });
  if (!to) return json(500, { ok: false, error: "Missing LEAD(S)_NOTIFY_TO" });
  if (!from) return json(500, { ok: false, error: "Missing LEAD(S)_NOTIFY_FROM" });

  // (Opcional, mas recomendado) salvar em tabela de visitas no Supabase
  // Se você quiser registrar tudo em banco, me diga e eu te passo o SQL + insert aqui.

  // Enviar email
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
      from,
      to: Array.isArray(to) ? to : to.split(",").map(s => s.trim()).filter(Boolean),
      subject,
      html,
      reply_to: email ? [email] : undefined,
    }),
  });

  const text = await r.text();
  if (!r.ok) {
    console.log("RESEND_VISIT_FAILED", r.status, text);
    return json(502, { ok: false, error: "Resend failed", status: r.status, details: text });
  }

  return json(200, { ok: true });
}
