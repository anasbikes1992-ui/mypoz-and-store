import { emailBase, row } from "../base";

export interface StaffInviteData {
  businessName: string;
  accentColor?: string;
  staffName: string;
  email: string;
  role: string;
  inviteUrl: string;
  invitedBy: string;
  expiresHours?: number;
}

export function staffInviteEmail(d: StaffInviteData): { html: string; subject: string; text: string } {
  const subject = `You've been invited to join ${d.businessName} on MyPoz`;

  const body = `
<h2>You're invited!</h2>
<p>Hi ${d.staffName}, <strong>${d.invitedBy}</strong> has invited you to join <strong>${d.businessName}</strong> as a <strong>${d.role}</strong> on MyPoz POS.</p>

<table class="table"><tbody>
  ${row("Business", d.businessName)}
  ${row("Your role", d.role)}
  ${row("Email", d.email)}
</tbody></table>

<a class="btn" href="${d.inviteUrl}">Accept invitation</a>

<p style="font-size:13px;color:#71717a">This invitation expires in ${d.expiresHours ?? 48} hours. If you did not expect this invitation, you can safely ignore this email.</p>
`;

  const text = `${d.invitedBy} has invited you to join ${d.businessName} on MyPoz as ${d.role}. Accept: ${d.inviteUrl}`;

  return { html: emailBase({ title: subject, preheader: `Join ${d.businessName} on MyPoz`, body, businessName: d.businessName, accentColor: d.accentColor }), subject, text };
}
