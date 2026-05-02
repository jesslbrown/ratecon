import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

// Per-user sequential invoice numbering. Format: INV-YYYY-NNNN.
// Rolls over each calendar year. Race-safe via a SQL function (see migration).
export async function nextInvoiceNumber(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const { data, error } = await client
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', userId)
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  const last = data?.[0]?.invoice_number;
  const lastNum = last ? Number(last.slice(prefix.length)) : 0;
  const next = (lastNum + 1).toString().padStart(4, '0');
  return `${prefix}${next}`;
}
