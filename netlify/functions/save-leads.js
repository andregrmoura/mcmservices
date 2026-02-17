import { createClient } from "@supabase/supabase-js";

/**
 * Helpers
 */
function json(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(bodyObj),
  };
}

function parseBody(event) {
  const contentType = String(event.headers?.["content-type"] || "").toLowerCase();
  const raw = event.body || "";

  // JSON
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw || "{}");
    } catch {
      return {};
    }
  }

  // x-www-form-urlencoded (form padrão)
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    return Object.fromEntries(params.entries());
  }

  // Se vier multipart/form-data (FormData), aqui não tem parser.
  // A solução correta é o front enviar JSON.
  // Mesmo assim, retornamos {} para erro controlado (400 com debug fields).
  return {};
}

async function sendEmailResend({ to, subject, html }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.LEAD_NOTIFY_FROM;

  if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
  if (!FROM) throw new Error("Missing LEAD_NOTIFY_FROM");

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
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

function pickFullName(body) {
  return String(
    body.full_name ?? body.fullName ?? body.name ?? body.fullname ?? ""
  ).trim();
}

function pickEmail(body) {
  return String(body.email ?? "").trim().toLowerCase();
}

/**
 * Netlify Function
 */
export async function handler(event) {
  // Preflight
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
    // Env checks
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ADMIN_EMAIL = process.env.LEADS_NOTIFY_TO; // já existe no Netlify

    if (!SUPABASE_URL) return json(500, { error: "Missing SUPABASE_URL" });
    if (!SUPABASE_SERVICE_ROLE_KEY)
      return json(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
    if (!ADMIN_EMAIL) return json(500, { error: "Missing LEADS_NOTIFY_TO" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Body
    const body = parseBody(event);

    const full_name = pickFullName(body);
    const email = pickEmail(body);

    const project_slug = String(body.project_slug || "").trim();
    const project_url = String(body.project_url || "").trim();

    // Debug rápido: se vier vazio, te mostra quais chaves chegaram
    if (!full_name || full_name.length < 2) {
      return json(400, {
        error: "Full name is required",
        received_fields: Object.keys(body || {}),
        hint: "Make sure the front sends JSON with full_name (or name/fullName).",
      });
    }

    if (!email || !email.includes("@")) {
      return json(400, {
        error: "Valid email is required",
        received_fields: Object.keys(body || {}),
      });
    }

    if (!project_slug) {
      return json(400, { error: "project_slug is required" });
    }

    if (!project_url) {
      return json(400, { error: "project_url is required" });
    }

    // Metadata
    const nowIso = new Date().toISOString();
    const ip =
      event.headers?.["x-nf-client-connection-ip"] ||
      event.headers?.["x-forwarded-for"] ||
      "";
    const user_agent = event.headers?.["user-agent"] || "";

    // Save lead (upsert)
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
        details: error,
        tip:
          "Check if portal_leads has columns: full_name, email, project_slug, project_url, last_seen (timestamptz). Also ensure unique index on (email, project_slug).",
      });
    }

    // Emails
    const subjectAdmin = `Portal access: ${full_name}`;
    const htmlAdmin = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>New Portal Access</h2>
        <p><b>Name:</b> ${full_name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Project:</b> ${project_slug}</p>
        <p><b>Time:</b> ${new Date(nowIso).toLocaleString()}</p>
        <p><b>IP:</b> ${ip || "N/A"}</p>
        <p><b>Portal:</b> <a href="${project_url}">${project_url}</a></p>
      </div>
    `;

    const subjectClient = `Access confirmed — ${project_slug}`;
    const htmlClient = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Access Confirmed</h2>
        <p>Hi ${full_name},</p>
        <p>Your access to the private project portal has been confirmed.</p>
        <p><b>Project:</b> ${project_slug}</p>
        <p><a href="${project_url}">Open your project portal</a></p>
        <br/>
        <p>— MCM Services PRO Solutions</p>
      </div>
    `;

    // Se o e-mail falhar, você pode preferir não bloquear o acesso.
    // Aqui eu envio e, se falhar, eu retorno 200 com warning (pra não travar cliente).
    let emailWarnings = [];
    try {
      await sendEmailResend({ to: ADMIN_EMAIL, subject: subjectAdmin, html: htmlAdmin });
    } catch (e) {
      emailWarnings.push(`Admin email failed: ${e?.message || e}`);
    }
    try {
      await sendEmailResend({ to: email, subject: subjectClient, html: htmlClient });
    } catch (e) {
      emailWarnings.push(`Client email failed: ${e?.message || e}`);
    }

    return json(200, {
      ok: true,
      lead: {
        id: data?.id ?? null,
        full_name,
        email,
        project_slug,
        last_seen: nowIso,
      },
      redirect_to: project_url,
      warnings: emailWarnings,
    });
  } catch (err) {
    return json(500, {
      error: "Server error",
      message: err?.message || String(err),
    });
  }
}
