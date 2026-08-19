/**
 * Base HTML wrapper for all MyPoz transactional emails.
 * Clean, minimal, mobile-friendly. No external fonts or images required.
 */

export function emailBase({
  title,
  preheader,
  body,
  footer,
  accentColor = "#2563eb",
  businessName = "MyPoz",
}: {
  title: string;
  preheader?: string;
  body: string;
  footer?: string;
  accentColor?: string;
  businessName?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;font-size:15px;line-height:1.6}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7}
  .header{background:${accentColor};padding:28px 32px;text-align:center}
  .header h1{color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px}
  .body{padding:32px}
  .body p{margin-bottom:16px;color:#3f3f46}
  .body h2{font-size:17px;font-weight:600;color:#18181b;margin-bottom:10px;margin-top:24px}
  .body h2:first-child{margin-top:0}
  .btn{display:inline-block;background:${accentColor};color:#fff!important;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;margin:16px 0}
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
  .info-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:16px;font-size:14px}
  .warn-box{background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:16px;margin-bottom:16px;font-size:14px}
  .footer{background:#f9f9fb;padding:20px 32px;text-align:center;font-size:12px;color:#a1a1aa;border-top:1px solid #e4e4e7}
  .footer a{color:#71717a;text-decoration:underline}
  @media(max-width:640px){.wrap{margin:0;border-radius:0}.body{padding:20px}.header{padding:20px}}
</style>
</head>
<body>
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f4f5">${preheader}</div>` : ""}
<div class="wrap">
  <div class="header">
    <h1>${businessName}</h1>
  </div>
  <div class="body">
    ${body}
  </div>
  <div class="footer">
    ${footer ?? `${businessName} &mdash; <a href="https://mypoz.lk">mypoz.lk</a> &mdash; <a href="{{unsubscribe}}">Unsubscribe</a>`}
  </div>
</div>
</body>
</html>`;
}

export function row(label: string, value: string): string {
  return `<tr><td style="color:#71717a;width:40%">${label}</td><td style="font-weight:500">${value}</td></tr>`;
}

export function itemRow(name: string, qty: number, price: string): string {
  return `<tr><td>${name}</td><td style="text-align:center">${qty}</td><td style="text-align:right">${price}</td></tr>`;
}
