import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { renderInvoicePdf } from '@/lib/pdf/render';
import { sendInvoiceEmail } from '@/lib/resend/send-invoice';
import {
  buildObjectPath,
  uploadDocument,
  getSignedUrl,
} from '@/lib/storage/documents';
import { formatCurrency, formatDate } from '@/lib/utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({ invoiceId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Invalid request' }, { status: 400 });
  }

  // Fetch the invoice + load + broker + profile in one shot via FKs.
  const [invoiceQuery, profileQuery] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, loads(*, brokers(*))')
      .eq('id', parsed.data.invoiceId)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ]);

  const invoice = invoiceQuery.data;
  const profile = profileQuery.data;
  if (!invoice || !profile) {
    return NextResponse.json({ ok: false, message: 'Invoice or profile not found' }, { status: 404 });
  }

  const load = (invoice as unknown as { loads: { brokers: Record<string, string | null> } & Record<string, unknown> }).loads;
  const broker = load.brokers;

  const pdfBuffer = await renderInvoicePdf({
    carrier: {
      company_name: profile.company_name ?? 'My Trucking Co.',
      mc_number: profile.mc_number,
      gst_hst_number: profile.gst_hst_number,
      address_line1: profile.address_line1 ?? '',
      address_line2: profile.address_line2,
      city: profile.city ?? '',
      province: profile.province ?? '',
      postal_code: profile.postal_code ?? '',
      country: profile.country ?? 'CA',
      phone: profile.phone ?? '',
    },
    broker: {
      name: (broker.name as string) ?? 'Unknown',
      address_line1: (broker.address_line1 as string) ?? null,
      city: (broker.city as string) ?? null,
      province: (broker.province as string) ?? null,
      postal_code: (broker.postal_code as string) ?? null,
      country: (broker.country as string) ?? null,
    },
    invoice: {
      number: invoice.invoice_number,
      issue_date: formatDate(invoice.issue_date),
      due_date: formatDate(invoice.due_date),
      load_number: (load.load_number as string) ?? null,
    },
    lineItems: [
      { description: 'Line haul', amount: Number(load.line_haul_rate) },
      ...(Number(load.fuel_surcharge) > 0
        ? [{ description: 'Fuel surcharge', amount: Number(load.fuel_surcharge) }]
        : []),
      ...((load.accessorials as { description: string; amount: number }[]) ?? []),
    ],
    totals: {
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.gst_hst_rate),
      taxAmount: Number(invoice.gst_hst_amount),
      total: Number(invoice.total),
      currency: invoice.currency,
    },
  });

  const path = buildObjectPath({
    userId: user.id,
    loadId: load.id as string,
    kind: 'invoice',
    ext: 'pdf',
  });
  await uploadDocument(supabase, { path, body: pdfBuffer, contentType: 'application/pdf' });
  const { data: signed } = await getSignedUrl(supabase, path);

  if (!invoice.sent_to_email) {
    return NextResponse.json(
      { ok: false, message: 'No broker AP email on file.' },
      { status: 400 },
    );
  }

  await sendInvoiceEmail({
    to: invoice.sent_to_email,
    fromName: profile.company_name ?? 'RateCon Invoice',
    invoiceNumber: invoice.invoice_number,
    loadNumber: (load.load_number as string) ?? null,
    total: formatCurrency(Number(invoice.total), invoice.currency),
    dueDate: formatDate(invoice.due_date),
    pdfBuffer,
    replyTo: null,
  });

  await supabase
    .from('invoices')
    .update({ status: 'sent', pdf_url: path, sent_at: new Date().toISOString() })
    .eq('id', invoice.id);

  return NextResponse.json({ ok: true, signedUrl: signed?.signedUrl ?? null });
}
