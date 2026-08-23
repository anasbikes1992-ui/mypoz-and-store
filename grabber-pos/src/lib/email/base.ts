/**
 * Branded MyPoz email layout — header, body slot, footer.
 * All transactional templates should use emailBase() or emailLayout().
 */

export interface EmailLayoutOpts {
  title: string;
  preheader?: string;
  body: string;
  /** Override default footer HTML */
  footer?: string;
  accentColor?: string;
  businessName?: string;
  /** Optional logo URL (HTTPS) shown above business name */
  logoUrl?: string;
  tagline?: string;
  supportEmail?: string;
  appUrl?: string;
}

const DEFAULT_ACCENT = "#2563eb";
const DEFAULT_NAME = "MyPoz";
const DEFAULT_APP = "https://mypoz-and-store-ui.vercel.app";
const DEFAULT_SUPPORT = "support@mypoz.lk";

/** Escape text for safe HTML interpolation (user-provided fields). */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function defaultEmailFooter(opts: {
  businessName: string;
  supportEmail: string;
  appUrl: string;
}): string {
  const name = escapeHtml(opts.businessName);
  const support = escapeHtml(opts.supportEmail);
  const app = escapeHtml(opts.appUrl.replace(/\/$/, ""));
  return `
<p style="margin:0 0 8px"><strong>${name}</strong> · Commerce Cloud</p>
<p style="margin:0 0 8px">
  <a href="mailto:${support}">${support}</a>
  · <a href="${app}">Open app</a>
  · <a href="https://mypoz.lk/privacy-policy">Privacy</a>
</p>
<p style="margin:0;color:#a1a1aa">Powered by Grabber Mobility Solutions (Pvt) Ltd</p>`;
}

export function emailBase(opts: EmailLayoutOpts): string {
  const accent = opts.accentColor ?? DEFAULT_ACCENT;
  const businessName = opts.businessName ?? DEFAULT_NAME;
  const appUrl = opts.appUrl ?? DEFAULT_APP;
  const supportEmail = opts.supportEmail ?? DEFAULT_SUPPORT;
  const tagline = opts.tagline ?? "Commerce Cloud · POS · Store · WhatsApp";
  const footer =
    opts.footer ??
    defaultEmailFooter({ businessName, supportEmail, appUrl });

  const logoBlock = opts.logoUrl
    ? `<img src="${escapeHtml(opts.logoUrl)}" alt="" width="120" height="auto" style="max-height:48px;margin-bottom:12px;border-radius:6px" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(opts.title)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;font-size:15px;line-height:1.6}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 4px 24px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,${accent} 0%,color-mix(in srgb,${accent} 82%,#000) 100%);padding:28px 32px;text-align:center}
  .header h1{color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;margin:0}
  .header p.tag{color:rgba(255,255,255,.88);font-size:12px;margin-top:6px;letter-spacing:.02em}
  .body{padding:32px}
  .body p{margin-bottom:16px;color:#3f3f46}
  .body h2{font-size:17px;font-weight:600;color:#18181b;margin-bottom:10px;margin-top:24px}
  .body h2:first-child{margin-top:0}
  .btn{display:inline-block;background:${accent};color:#fff!important;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;margin:16px 0}
  .divider{border:none;border-top:1px solid #e4e4e7;margin:24px 0}
  .table{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px}
  .table th{background:#f4f4f5;padding:8px 12px;text-align:left;font-weight:600;color:#52525b;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
  .table td{padding:10px 12px;border-bottom:1px solid #f4f4f5;color:#3f3f46}
  .table tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .badge-green{background:#dcfce7;color:#16a34a}
  .badge-blue{background:#dbeafe;color:#1d4ed8}
  .badge-yellow{background:#fef9c3;color:#a16207}
  .badge-red{background:#fee2e2;color:#dc2626}
  .info-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:16px;font-size:14px;color:#0c4a6e}
  .warn-box{background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:16px;margin-bottom:16px;font-size:14px;color:#713f12}
  .footer{background:#f9f9fb;padding:20px 32px;text-align:center;font-size:12px;color:#71717a;border-top:1px solid #e4e4e7;line-height:1.7}
  .footer a{color:#52525b;text-decoration:underline}
  @media(max-width:640px){.wrap{margin:0;border-radius:0;border-left:none;border-right:none}.body{padding:20px}.header{padding:20px}}
</style>
</head>
<body>
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f4f5">${escapeHtml(opts.preheader)}</div>` : ""}
<div class="wrap">
  <div class="header">
    ${logoBlock}
    <h1>${escapeHtml(businessName)}</h1>
    <p class="tag">${escapeHtml(tagline)}</p>
  </div>
  <div class="body">
    ${opts.body}
  </div>
  <div class="footer">
    ${footer}
  </div>
</div>
</body>
</html>`;
}

export function row(label: string, value: string): string {
  return `<tr><td style="color:#71717a;width:40%">${escapeHtml(label)}</td><td style="font-weight:500">${value}</td></tr>`;
}

export function itemRow(name: string, qty: number, price: string): string {
  return `<tr><td>${escapeHtml(name)}</td><td style="text-align:center">${qty}</td><td style="text-align:right">${escapeHtml(price)}</td></tr>`;
}
