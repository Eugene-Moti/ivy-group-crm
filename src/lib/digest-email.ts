import "server-only";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** `**bold**` → `<strong>`, the only markdown the model is likely to reach for in a short briefing. */
function inlineFormat(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/**
 * Turns the assistant's plain-text/lightly-markdown briefing into a simple,
 * inline-styled HTML email — email clients don't run stylesheets, so
 * everything here is deliberately basic rather than trying to reuse the
 * app's own Tailwind classes. Blank-line-separated blocks become
 * paragraphs; a block where every line starts with "-" or "*" becomes a
 * bulleted list.
 */
function bodyToHtml(text: string): string {
  const blocks = text.trim().split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) return "";

      const isList = lines.every((l) => /^[-*]\s+/.test(l));
      if (isList) {
        const items = lines
          .map((l) => `<li style="margin-bottom:6px;">${inlineFormat(l.replace(/^[-*]\s+/, ""))}</li>`)
          .join("");
        return `<ul style="margin:0 0 16px;padding-left:20px;color:#2c3038;">${items}</ul>`;
      }
      return `<p style="margin:0 0 16px;line-height:1.6;color:#2c3038;">${lines
        .map(inlineFormat)
        .join("<br/>")}</p>`;
    })
    .join("");
}

export function renderDigestEmail({
  title,
  subtitle,
  body,
}: {
  title: string;
  subtitle: string;
  body: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#eceef1;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eceef1;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#14161c;padding:20px 28px;">
                <span style="color:#c9a54a;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Ivy Group CRM</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 4px;font-size:20px;color:#14161c;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 24px;font-size:13px;color:#767c87;">${escapeHtml(subtitle)}</p>
                ${bodyToHtml(body)}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #eef0f2;">
                <p style="margin:0;font-size:11px;color:#9aa0a9;">
                  Automated daily briefing from Ivy Group CRM. Open the app for the full picture and to act on anything here.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
