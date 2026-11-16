import "server-only";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type DigestRow = { title: string; detail: string; when: string };

const INK = "#1c1c19";
const MUTED = "#5f5c53";
const LINE = "#e6e2d8";
const EVERGREEN = "#1a6a40";
const GOLD = "#a07424";
const DANGER = "#b23a28";

function section(title: string, color: string, rows: DigestRow[], more: number): string {
  if (rows.length === 0) return "";
  const items = rows
    .map(
      (r) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};">
          <p style="margin:0;font-size:14px;font-weight:600;color:${INK};">${esc(r.title)}</p>
          ${r.detail ? `<p style="margin:2px 0 0;font-size:13px;color:${MUTED};">${esc(r.detail)}</p>` : ""}
        </td>
        <td align="right" valign="top" style="padding:10px 0 10px 12px;border-bottom:1px solid ${LINE};font-size:12px;color:${MUTED};white-space:nowrap;">${esc(r.when)}</td>
      </tr>`
    )
    .join("");
  return `<p style="margin:26px 0 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${color};">${esc(title)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
    ${more > 0 ? `<p style="margin:8px 0 0;font-size:12px;color:${MUTED};">and ${more} more in the app</p>` : ""}`;
}

/**
 * The plain (no-AI) morning email: what's due today, what's overdue, and
 * what's coming up. Team-wide content; lead contact details are never
 * included, so it's safe for viewers as well as admins.
 */
export function renderReminderEmail({
  greetingName,
  dateLabel,
  appUrl,
  remindersDue,
  followUpsOverdue,
  followUpsToday,
  comingUp,
  limit,
  workspaceName = "Ivy Group",
}: {
  greetingName: string;
  dateLabel: string;
  appUrl: string;
  remindersDue: DigestRow[];
  followUpsOverdue: DigestRow[];
  followUpsToday: DigestRow[];
  comingUp: DigestRow[];
  limit: number;
  workspaceName?: string;
}): string {
  const take = (rows: DigestRow[]) => rows.slice(0, limit);
  const more = (rows: DigestRow[]) => Math.max(0, rows.length - limit);
  const stat = (n: number, label: string, color: string) =>
    `<td style="padding:12px 14px;background-color:#f6f4ee;border-radius:10px;">
      <p style="margin:0;font-size:22px;font-weight:700;color:${color};">${n}</p>
      <p style="margin:2px 0 0;font-size:12px;color:${MUTED};">${label}</p>
    </td>`;

  return `<!doctype html><html><body style="margin:0;padding:0;background-color:#efebe2;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#efebe2;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background-color:#0d0f0d;padding:20px 28px;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.18em;color:#f6f4ee;">ORION</p>
          <p style="margin:2px 0 0;font-size:12px;color:#a29d90;">${esc(workspaceName)} workspace · Morning summary</p>
        </td></tr>
        <tr><td style="padding:26px 28px 30px;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${INK};">Good morning, ${esc(greetingName)}</p>
          <p style="margin:4px 0 20px;font-size:13px;color:${MUTED};">${esc(dateLabel)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>
            ${stat(remindersDue.length, "reminders due", GOLD)}
            ${stat(followUpsOverdue.length, "follow-ups overdue", followUpsOverdue.length ? DANGER : EVERGREEN)}
            ${stat(followUpsToday.length, "follow-ups today", EVERGREEN)}
          </tr></table>
          ${section("Reminders due", GOLD, take(remindersDue), more(remindersDue))}
          ${section("Follow-ups overdue", DANGER, take(followUpsOverdue), more(followUpsOverdue))}
          ${section("Follow-ups due today", EVERGREEN, take(followUpsToday), more(followUpsToday))}
          ${section("Coming up this week", MUTED, take(comingUp), more(comingUp))}
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr>
            <td style="background-color:${EVERGREEN};border-radius:10px;">
              <a href="${esc(appUrl)}/follow-ups" style="display:inline-block;padding:11px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Open follow-ups</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid ${LINE};font-size:11px;line-height:1.6;color:${MUTED};">
          You're getting this because you turned on the morning email in your profile.
          To stop it, open Team &amp; Users, choose your profile, and switch off "Morning email".
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
