import "server-only";
import type { OrionBriefing } from "@/lib/orion";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SEVERITY_COLOR: Record<OrionBriefing["items"][number]["severity"], string> = {
  critical: "#d44437",
  warning: "#c98c22",
  positive: "#3a8c5c",
  info: "#2c3038",
};

const SEVERITY_LABEL: Record<OrionBriefing["items"][number]["severity"], string> = {
  critical: "Needs attention",
  warning: "Worth reviewing",
  positive: "Going well",
  info: "For your information",
};

function itemsToHtml(items: OrionBriefing["items"]): string {
  return items
    .map((item) => {
      const color = SEVERITY_COLOR[item.severity];
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
        <tr>
          <td width="3" style="background-color:${color};"></td>
          <td style="padding:2px 0 2px 12px;">
            <p style="margin:0 0 2px;font-size:10px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${color};">${escapeHtml(SEVERITY_LABEL[item.severity])}</p>
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#14161c;">${escapeHtml(item.title)}</p>
            ${item.detail ? `<p style="margin:0;font-size:13px;line-height:1.55;color:#4a4f58;">${escapeHtml(item.detail)}</p>` : ""}
          </td>
        </tr>
      </table>`;
    })
    .join("");
}

function recommendationsToHtml(recommendations: string[]): string {
  if (recommendations.length === 0) return "";
  const items = recommendations
    .map(
      (r) =>
        `<li style="margin-bottom:8px;line-height:1.5;color:#2c3038;">${escapeHtml(r)}</li>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;background-color:#fbf7ee;border:1px solid #e8dcb8;border-radius:10px;">
    <tr>
      <td style="padding:16px 18px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#c9a54a;">Recommendations</p>
        <ul style="margin:0;padding-left:18px;">${items}</ul>
      </td>
    </tr>
  </table>`;
}

/**
 * Orion's daily briefing email — one shared body built from the structured
 * briefing (same shape the on-demand Portfolio Briefing and its PDF export
 * use), personalized per recipient with just a greeting swap so admins get
 * their own name without a separate Claude call per person.
 */
export function renderDigestEmail({
  greetingName,
  subtitle,
  briefing,
  hasAttachment,
}: {
  greetingName: string;
  subtitle: string;
  briefing: OrionBriefing;
  hasAttachment: boolean;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#eceef1;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eceef1;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#14161c;padding:20px 28px;">
                <span style="color:#c9a54a;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Orion — Ivy Group CRM</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 4px;font-size:20px;color:#14161c;">Good morning, ${escapeHtml(greetingName)}</h1>
                <p style="margin:0 0 20px;font-size:13px;color:#767c87;">${escapeHtml(subtitle)}</p>
                ${briefing.headline ? `<p style="margin:0 0 22px;font-size:14px;font-style:italic;line-height:1.6;color:#2c3038;">${escapeHtml(briefing.headline)}</p>` : ""}
                ${briefing.raw && briefing.items.length === 0 ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#2c3038;white-space:pre-wrap;">${escapeHtml(briefing.raw)}</p>` : itemsToHtml(briefing.items)}
                ${recommendationsToHtml(briefing.recommendations)}
                <p style="margin:24px 0 0;font-size:13px;color:#2c3038;">
                  ${hasAttachment ? "A PDF copy of this briefing is attached. " : ""}Have a great day —<br/>
                  <strong>Orion</strong>
                </p>
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
