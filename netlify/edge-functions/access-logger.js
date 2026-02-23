// netlify/edge-functions/access-logger.js
import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  // Não logar arquivos estáticos pesados (ajuste se quiser)
  const url = new URL(request.url);
  const path = url.pathname;

  // Evita loop: não loga a própria function
  if (path.startsWith("/.netlify/functions/log-access")) {
    return context.next();
  }

  // Opcional: ignore assets
  if (
    path.startsWith("/images/") ||
    path.startsWith("/css/") ||
    path.startsWith("/js/") ||
    path.endsWith(".png") ||
    path.endsWith(".jpg") ||
    path.endsWith(".jpeg") ||
    path.endsWith(".webp") ||
    path.endsWith(".svg") ||
    path.endsWith(".css") ||
    path.endsWith(".js")
  ) {
    return context.next();
  }

  // GEO vem do context.geo (Netlify)
  const geo = context.geo || {};
  const countryCode = geo?.country?.code || "UNKNOWN";
  const countryName = geo?.country?.name || null;
  const city = geo?.city || null;
  const timezone = geo?.timezone || null;

  // request id (se disponível)
  const requestId =
    request.headers.get("x-nf-request-id") ||
    request.headers.get("x-request-id") ||
    null;

  // Envia o log sem bloquear a resposta (fire-and-forget)
  context.waitUntil(
    fetch(new URL("/.netlify/functions/log-access", request.url).toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-log-token": Netlify.env.get("SITE_LOG_TOKEN") || "",
      },
      body: JSON.stringify({
        country_code: countryCode,
        country_name: countryName,
        city,
        timezone,
        path,
        referrer: request.headers.get("referer") || null,
        user_agent: request.headers.get("user-agent") || null,
        request_id: requestId,
      }),
    }).catch(() => {})
  );

  return context.next();
};

// Middleware no site inteiro
export const config = { path: "/*" };