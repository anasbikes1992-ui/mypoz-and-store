import { emailBase, row } from "../base";

export interface DataRequestData {
  businessName: string;
  accentColor?: string;
  customerName: string;
  email: string;
  requestType: "export" | "deletion" | "correction";
  ticketId: string;
  processingDays?: number;
}

const LABELS: Record<DataRequestData["requestType"], string> = {
  export: "Data Export (GDPR / right of access)",
  deletion: "Account Deletion (right to erasure)",
  correction: "Data Correction (right to rectification)",
};

export function complianceDataRequestEmail(d: DataRequestData): { html: string; subject: string; text: string } {
  const subject = `Data request received — ${d.businessName}`;

  const body = `
<h2>Data Request Received</h2>
<p>Hi ${d.customerName}, we have received your data request and will process it within the required timeframe.</p>

<table class="table"><tbody>
  ${row("Request type", LABELS[d.requestType])}
  ${row("Email", d.email)}
  ${row("Reference", d.ticketId)}
  ${row("Expected completion", `Within ${d.processingDays ?? 30} days`)}
</tbody></table>

<div class="info-box">
  We are required by applicable data protection laws to respond to your request within <strong>${d.processingDays ?? 30} calendar days</strong>. You will receive a follow-up email once your request has been completed.
</div>

<p style="font-size:13px;color:#71717a">If you have further questions about your data or this request, please reply to this email. Our privacy policy is available at <a href="https://mypoz.lk/privacy-policy">mypoz.lk/privacy-policy</a>.</p>
`;

  const text = `Data request received (${LABELS[d.requestType]}). Reference: ${d.ticketId}. We will respond within ${d.processingDays ?? 30} days.`;

  return { html: emailBase({ title: subject, preheader: `Your data request has been received — ref ${d.ticketId}`, body, businessName: d.businessName, accentColor: d.accentColor }), subject, text };
}
