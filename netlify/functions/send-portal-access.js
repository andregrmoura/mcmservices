/**
 * Netlify Function: send-portal-access.js
 * Sends the "Project Portal Access" email using Resend API (via fetch).
 *
 * Uses ONLY your existing Netlify environment variables:
 * - RESEND_API_KEY     ✅ (you already have)
 * - MAIL_FROM_CLIENT   ✅ (you already have)
 * - BRAND_LOGO_URL     ✅ (you already have)
 *
 * Request (POST JSON):
 * {
 *   "to": "client@email.com",
 *   "fullName": "Gustavo",
 *   "portalUrl": "https://mcmprosolutions.com/projects/sousa-coral-gables/"
 * }
 */

const { renderPortalAccessEmail, renderPortalAccessText } = require("./portal-access-email-template");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM_CLIENT || "Moura Consulting & Management <portal@mcmprosolutions.com>";
const BRAND_LOGO_URL = process.env.BRAND_LOGO_URL || "";

/** Extract display name from: "Name <email@domain>" */
function getDisplayName(fromValue) {
  const s = String(fromValue || "").trim();
  const m = s.match(/^(.*?)\s*<[^>]+>\s*$/);
  const name = (m ? m[1] : s).trim();
  return name || "Moura Consulting & Management";
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });
    if (!RESEND_API_KEY) return json(500, { ok: false, error: "Missing RESEND_API_KEY env var" });

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { ok: false, error: "Invalid JSON body" });
    }

    const to = String(payload.to || "").trim();
    const fullName = String(payload.fullName || "").trim();
    const portalUrl = String(payload.portalUrl || "").trim();

    if (!to || !portalUrl) {
      return json(400, { ok: false, error: "Missing required fields: to, portalUrl" });
    }

    const brandName = getDisplayName(FROM);
    const subject = "Your Secure Project Portal Access";

    const html = renderPortalAccessEmail({
      fullName,
      portalUrl,
      brandLogoUrl: BRAND_LOGO_URL,
      brandName,
      // keep premium gold (no env needed)
      accentColor: "#C8A86B",
      year: "2026",
      logoHeight: 60
    });

    const text = renderPortalAccessText({
      fullName,
      portalUrl,
      brandName,
      year: "2026"
    });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html,
        text
      })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return json(resp.status, { ok: false, error: "Resend error", details: data });
    }

    return json(200, { ok: true, id: data.id || null });
  } catch (err) {
    return json(500, { ok: false, error: err?.message || String(err) });
  }
};
