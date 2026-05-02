import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { addDays } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { brokerInputSchema, loadInputSchema } from '@/lib/validators/load';
import { calculateTax, applyTax } from '@/lib/tax/canadian-tax';
import type { ProvinceCode } from '@/lib/tax/canadian-tax';
import { nextInvoiceNumber } from '@/lib/invoices/numbering';

export const runtime = 'nodejs';

const bodySchema = z.object({
  load: loadInputSchema,
  broker: brokerInputSchema,
  rateConPath: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  const { load, broker, rateConPath } = parsed.data;

  // 1. Find or create the broker record by case-insensitive name.
  const { data: existingBroker } = await supabase
    .from('brokers')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', broker.name)
    .maybeSingle();

  let brokerId = existingBroker?.id ?? null;
  if (!brokerId) {
    const { data: created, error } = await supabase
      .from('brokers')
      .insert({ ...broker, user_id: user.id })
      .select('id')
      .single();
    if (error || !created) {
      return NextResponse.json({ ok: false, message: error?.message ?? 'broker insert failed' }, { status: 500 });
    }
    brokerId = created.id;
  }

  // 2. Compute totals + tax. The UI already shows these but we recompute
  //    server-side as the source of truth.
  const accessorialTotal = (load.accessorials ?? []).reduce((a, x) => a + Number(x.amount || 0), 0);
  const subtotal = Number(load.line_haul_rate) + Number(load.fuel_surcharge) + accessorialTotal;
  const tax = calculateTax({
    pickupProvince: (load.pickup_province as ProvinceCode) ?? null,
    deliveryProvince: (load.delivery_province as ProvinceCode) ?? null,
    isInternational:
      load.pickup_country !== 'CA' || load.delivery_country !== 'CA',
    carrierIsGstRegistered: true,
  });
  const { taxAmount, total } = applyTax(subtotal, tax);

  // 3. Insert the load row.
  const { data: loadRow, error: loadErr } = await supabase
    .from('loads')
    .insert({
      user_id: user.id,
      broker_id: brokerId,
      ...load,
      total_rate: total,
      rate_con_url: rateConPath,
      status: 'invoiced',
      invoiced_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (loadErr || !loadRow) {
    return NextResponse.json({ ok: false, message: loadErr?.message ?? 'load insert failed' }, { status: 500 });
  }

  // 4. Insert the invoice row with a fresh per-user sequential number.
  const invoiceNumber = await nextInvoiceNumber(supabase, user.id);
  const issueDate = new Date();
  const dueDate = addDays(issueDate, load.payment_terms_days);

  const { data: invoiceRow, error: invErr } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      load_id: loadRow.id,
      invoice_number: invoiceNumber,
      issue_date: issueDate.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
      subtotal,
      gst_hst_rate: tax.rate,
      gst_hst_amount: taxAmount,
      total,
      currency: load.currency,
      sent_to_email: broker.ap_email,
      status: 'draft',
    })
    .select('id')
    .single();

  if (invErr || !invoiceRow) {
    return NextResponse.json({ ok: false, message: invErr?.message ?? 'invoice insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, invoiceId: invoiceRow.id });
}
