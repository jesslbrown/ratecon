import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractRateCon } from '@/lib/anthropic/extraction';
import { buildObjectPath, uploadDocument } from '@/lib/storage/documents';

// Extraction is intentionally an API route, not a server action: server
// actions are RPC-shaped and don't expose ergonomic streaming/progress
// hooks, and the client benefits from a clear request/response contract here.
export const runtime = 'nodejs';
export const maxDuration = 60;

const SUPPORTED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, reason: 'unauthorized', message: 'Sign in required.' },
      { status: 401 },
    );
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, reason: 'no_file', message: 'No file uploaded.' },
      { status: 400 },
    );
  }

  if (!SUPPORTED.has(file.type)) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'unsupported_content_type',
        message: `Unsupported file type: ${file.type}`,
      },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 1. Stash the original in Supabase Storage. Path encodes user + a temp
  //    "inbox" load id so the file is reachable even if extraction fails.
  const inboxLoadId = crypto.randomUUID();
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = buildObjectPath({
    userId: user.id,
    loadId: inboxLoadId,
    kind: 'rate-con',
    ext,
  });
  const { error: uploadError } = await uploadDocument(supabase, {
    path,
    body: buffer,
    contentType: file.type,
  });
  if (uploadError) {
    return NextResponse.json(
      { ok: false, reason: 'storage_failure', message: uploadError.message },
      { status: 500 },
    );
  }

  // 2. Hand the buffer to Claude. Validation + retries live inside.
  const result = await extractRateCon({
    buffer,
    contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf',
    userId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({ ok: true, data: result.data, storagePath: path });
}
