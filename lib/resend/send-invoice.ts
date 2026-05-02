import { getFromAddress, getResend } from './client';

export interface SendInvoiceArgs {
  to: string;
  fromName: string;
  invoiceNumber: string;
  loadNumber: string | null;
  total: string; // formatted, e.g. "$1,395.05 CAD"
  dueDate: string; // formatted, e.g. "May 15, 2026"
  pdfBuffer: Buffer;
  replyTo: string | null;
}

export async function sendInvoiceEmail(args: SendInvoiceArgs) {
  const resend = getResend();
  const subject = `Invoice ${args.invoiceNumber}${args.loadNumber ? ` — Load ${args.loadNumber}` : ''}`;

  // Plain HTML — keep it simple, brokers' AP inboxes are spam-allergic.
  const html = `
    <p>Hi,</p>
    <p>Please find attached invoice <strong>${args.invoiceNumber}</strong>${
      args.loadNumber ? ` for load <strong>${args.loadNumber}</strong>` : ''
    } in the amount of <strong>${args.total}</strong>, due <strong>${args.dueDate}</strong>.</p>
    <p>Thanks,<br/>${args.fromName}</p>
    <p style="color:#888;font-size:12px;">Sent via RateCon — ratecon.app</p>
  `;

  return resend.emails.send({
    from: `${args.fromName} <${getFromAddress()}>`,
    to: args.to,
    replyTo: args.replyTo ?? undefined,
    subject,
    html,
    attachments: [
      {
        filename: `${args.invoiceNumber}.pdf`,
        content: args.pdfBuffer,
      },
    ],
  });
}
