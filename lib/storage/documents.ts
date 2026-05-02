import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export const DOCUMENTS_BUCKET = 'documents';

// Signed URL TTL. 1-hour matches the spec; rate-cons and PDFs are sensitive.
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type DocumentKind = 'rate-con' | 'bol' | 'pod' | 'invoice';

export function buildObjectPath(args: {
  userId: string;
  loadId: string;
  kind: DocumentKind;
  ext: string;
}): string {
  const stamp = Date.now();
  return `${args.userId}/${args.loadId}/${args.kind}-${stamp}.${args.ext.replace(/^\./, '')}`;
}

export async function uploadDocument(
  client: SupabaseClient<Database>,
  args: { path: string; body: Buffer | Blob; contentType: string },
) {
  return client.storage.from(DOCUMENTS_BUCKET).upload(args.path, args.body, {
    contentType: args.contentType,
    upsert: false,
  });
}

export async function getSignedUrl(
  client: SupabaseClient<Database>,
  path: string,
  ttl = SIGNED_URL_TTL_SECONDS,
) {
  return client.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, ttl);
}
