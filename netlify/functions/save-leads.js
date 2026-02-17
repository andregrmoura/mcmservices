// netlify/functions/save-leads.js
import { createClient } from "@supabase/supabase-js";

// Se você preferir outro provedor (SendGrid/Mailgun), dá pra adaptar.
// Aqui vai com Resend por ser bem simples.
async function sendEmailResend({ to, subject, html }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL; // ex: "MCM Services <no-reply@mcmprosolutions.com>"

  if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
  if (!FROM_EMAIL) throw new Error("Missing FROM_EMAIL");

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend failed: ${resp.status} ${text}`);
  }

  return resp.json();
}

function json(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      // CORS (se seu portal roda em outro domínio/subdomínio)
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(bodyObj),
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL) return json(500, { error: "Missing SUPABASE_URL" });
    if (!SUPABASE_SERVICE_ROLE_KEY)
      return json(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = JSON.parse(event.body || "{}");

    const full_name = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    // Identifica qual portal/projeto o cliente quer acessar
    // Você pode mandar do front: project_slug e project_url
    const project_slug = String(body.project_slug || "").trim();
    const project_url = String(body.project_url || "").trim();

    if (!full_name || full_name.length < 2) {
      return json(400, { error: "Full name is required" });
    }
    if (!email || !email.includes("@")) {
      return json(400, { error: "Valid email is required" });
    }
    if (!project_slug) {
      return json(400, { error: "project_slug is required" });
    }
    if (!project_url) {
      return json(400, { error: "project_url is required" });
    }

    // Metadados úteis
    const ip =
      event.headers["x-nf-client-connection-ip"] ||
      event.headers["x-forwarded-for"] ||
      "";
    const user_agent = event.headers["user-agent"] || "";
    const nowIso = new Date().toISOString();

    // UPSERT: se já existe (email + project_slug), atualiza last_seen e nome
    // IMPORTANTE: isso exige o unique index em (email, project_slug).
    const payload = {
      full_name,
      email,
      project_slug,
      project_url,
      ip,
      user_agent,
      last_seen: nowIso,
    };

    const { data, error } = await supabase
      .from("portal_leads")
      .upsert(payload, {
        onConflict: "email,project_slug",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      return json(500, {
        error: "Supabase insert failed",
        status: error.code ? 400 : 500,
        details: error,
      });
    }

    // Emails
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // ex: "andre@mcmprosolutions.com"
    if (!ADMIN_EMAIL) return json(500, { error: "Missing ADMIN_EMAIL" });

    const subjectAdmin = `Portal access: ${full_name} (${email})`;
    const htmlAdmin = `
      <div style="font-family:Arial,sans-serif;line-height:1.4">
        <h2>New Portal Access</h2>
        <p><b>Name:</b> ${full_name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Project:</b> ${project_slug}</p>
        <p><b>Time:</b> ${new Date(nowIso).toLocaleString()}</p>
        <p><b>IP:</b> ${ip || "N/A"}</p>
        <p><b>User-Agent:</b> ${user_agent || "N/A"}</p>
        <p><b>Portal link:</b> <a href="${project_url}">${project_url}</a></p>
      </div>
    `;

    const subjectClient = `Access confirmed — ${project_slug}`;
    const htmlClient = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Access Confirmed</h2>
        <p>Hi ${full_name},</p>
        <p>Your access to the private project portal has been confirmed.</p>
        <p><b>Project:</b> ${project_slug}</p>
        <p><b>Access link:</b> <a href="${project_url}">${project_url}</a></p>
        <p>If you did not request this access, please reply to this email.</p>
        <br />
        <p>— MCM Services PRO Solutions</p>
      </div>
    `;

    // Envia (falhar email não deve quebrar o acesso; mas aqui eu vou manter “strict”.
    // Se você preferir, eu deixo try/catch separando e retornando sucesso mesmo se email falhar.)
    await sendEmailResend({ to: ADMIN_EMAIL, subject: subjectAdmin, html: htmlAdmin });
    await sendEmailResend({ to: email, subject: subjectClient, html: htmlClient });

    // Resposta para o front salvar em “Leads session” e redirecionar
    return json(200, {
      ok: true,
      lead: {
        id: data?.id || null,
        full_name,
        email,
        project_slug,
        last_seen: nowIso,
      },
      redirect_to: project_url,
    });
  } catch (e) {
    return json(500, { error: "Server error", message: e?.message || String(e) });
  }
}
