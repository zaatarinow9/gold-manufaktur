import "server-only";

import { companyInfo } from "@/lib/site";

type AdminSystemAccessEmailInput = {
  expiresAt?: string;
  link: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatExpiry(value?: string) {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return "";
  }

  const parsed = Date.parse(normalized);

  if (Number.isNaN(parsed)) {
    return "";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(parsed));
}

export function buildAdminSystemAccessEmail(
  input: AdminSystemAccessEmailInput
) {
  const subject = "Systemzugriff aktualisiert – Gold Helwah";
  const expiresAtLabel = formatExpiry(input.expiresAt);
  const expiryLine = expiresAtLabel
    ? `Der Link ist bis ${expiresAtLabel} gueltig.`
    : "Der Link bleibt gueltig, bis er erneut aktualisiert oder deaktiviert wird.";
  const text = [
    "Guten Tag,",
    "",
    "der direkte Zugriffslink wurde aktualisiert.",
    expiryLine,
    "",
    "Neuer Zugriffslink:",
    input.link,
    "",
    "Falls die Schaltflaeche in Ihrer Mail-App nicht angezeigt wird, koennen Sie den Link direkt in den Browser kopieren.",
    "",
    "Rueckfragen:",
    companyInfo.emailDisplay,
    companyInfo.phoneDisplay,
  ].join("\n");

  const html = `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:0;background:#060606;color:#f7f1e3;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060606;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:separate;border-spacing:0;background:linear-gradient(180deg,#17120d,#090909);border:1px solid rgba(196,154,82,0.24);border-radius:28px;overflow:hidden;">
            <tr>
              <td style="padding:34px 30px 18px 30px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="color:#e8c987;font-size:12px;letter-spacing:0.26em;text-transform:uppercase;margin-bottom:10px;">Gold Helwah</div>
                <h1 style="margin:0;color:#f7f1e3;font-size:30px;line-height:1.15;">Systemzugriff aktualisiert</h1>
                <p style="margin:16px auto 0 auto;max-width:520px;color:#c7b99e;font-size:15px;line-height:1.7;">
                  Guten Tag,<br />
                  der direkte Zugriffslink wurde aktualisiert.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 0 30px;">
                <div style="border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:rgba(255,255,255,0.03);padding:22px;">
                  <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px;">Hinweis</div>
                  <p style="margin:0;color:#f7f1e3;font-size:14px;line-height:1.7;">${escapeHtml(expiryLine)}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 0 30px;text-align:center;">
                <a href="${escapeHtml(input.link)}" style="display:inline-block;padding:15px 28px;border-radius:999px;background:linear-gradient(135deg,#e8c987,#c49a52);color:#16120d;font-size:15px;font-weight:700;text-decoration:none;">Zugriff aufrufen</a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 0 30px;">
                <div style="border:1px solid rgba(196,154,82,0.2);border-radius:24px;background:rgba(196,154,82,0.08);padding:20px;">
                  <div style="color:#e8c987;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px;">Fallback-URL</div>
                  <p style="margin:0;color:#f7f1e3;font-size:14px;line-height:1.8;word-break:break-word;">
                    <a href="${escapeHtml(input.link)}" style="color:#f7f1e3;text-decoration:none;">${escapeHtml(input.link)}</a>
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 30px 30px;">
                <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:18px;">
                  <p style="margin:0;color:#c7b99e;font-size:13px;line-height:1.8;">
                    Rueckfragen an ${escapeHtml(companyInfo.emailDisplay)} oder ${escapeHtml(companyInfo.phoneDisplay)}.
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    html,
    subject,
    text,
  };
}
