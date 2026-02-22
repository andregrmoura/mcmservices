/**
 * Portal Access Email Template (CommonJS)
 * - Smaller logo (premium look)
 * - No fallback "copy/paste this link" block
 * - Works well across Gmail/Apple Mail/Outlook with table layout + inline CSS
 */

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPortalAccessEmail({
  fullName,
  portalUrl,
  brandLogoUrl,
  brandName = "Moura Consulting & Management",
  accentColor = "#C8A86B",
  year = "2026",
  logoHeight = 60
}) {
  const safeName = escapeHtml(fullName || "there");
  const safeUrl = escapeHtml(portalUrl);
  const safeBrand = escapeHtml(brandName);
  const safeLogo = escapeHtml(brandLogoUrl || "");

  const preheader = "Your secure project portal access is confirmed.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${safeBrand} • Project Portal Access</title>
  </head>
  <body style="margin:0;padding:0;background:#f2f2f2;">
    <!-- Preheader (hidden) -->
    <div style="display:none;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
      ${preheader}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f2f2;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;">
            <tr>
              <td align="center" style="padding:0 0 16px 0;">
                <!-- Outer Card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                  style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid rgba(0,0,0,0.06);">
                  <tr>
                    <td align="center" style="padding:26px 22px 8px 22px;">
                      <!-- Logo -->
                      ${safeLogo ? `
                        <img src="${safeLogo}" alt="${safeBrand}" height="${logoHeight}" style="height:${logoHeight}px;width:auto;display:block;object-fit:contain;border:0;outline:none;text-decoration:none;" />
                      ` : ""}

                      <!-- Brand Name (small, optional) -->
                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
                                  font-size:13px;letter-spacing:0.12em;text-transform:uppercase;
                                  color:#111;margin-top:10px;opacity:0.85;">
                        ${safeBrand}
                      </div>

                      <!-- Title -->
                      <div style="font-family:Georgia,'Times New Roman',Times,serif;
                                  font-size:34px;line-height:1.15;
                                  color:${accentColor};margin-top:18px;">
                        Project Portal Access
                      </div>

                      <!-- Message -->
                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
                                  font-size:16px;line-height:1.55;color:#3a3a3a;
                                  margin-top:14px;max-width:520px;">
                        Hello <strong style="color:#111;">${safeName}</strong>, your access to the private
                        project portal has been successfully confirmed.
                      </div>

                      <!-- Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;">
                        <tr>
                          <td align="center" bgcolor="${accentColor}" style="border-radius:12px;">
                            <a href="${safeUrl}"
                               style="display:inline-block;padding:14px 22px;
                                      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
                                      font-size:16px;font-weight:600;color:#111;text-decoration:none;
                                      border-radius:12px;">
                              Access Your Project Portal
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- Footer -->
                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
                                  font-size:12px;line-height:1.4;color:#8a8a8a;
                                  margin:22px 0 8px 0;">
                        © ${year} ${safeBrand}
                      </div>
                    </td>
                  </tr>
                </table>
                <!-- /Outer Card -->
              </td>
            </tr>

            <!-- Small spacer -->
            <tr><td style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderPortalAccessText({
  fullName,
  portalUrl,
  brandName = "Moura Consulting & Management",
  year = "2026"
}) {
  const name = fullName || "there";
  return [
    `${brandName}`,
    ``,
    `Hello ${name}, your access to the private project portal has been successfully confirmed.`,
    ``,
    `Access your project portal: ${portalUrl}`,
    ``,
    `© ${year} ${brandName}`
  ].join("\n");
}

module.exports = {
  renderPortalAccessEmail,
  renderPortalAccessText
};
