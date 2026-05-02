'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { profileSchema, type ProfileInput } from '@/lib/validators/profile';

export async function saveProfile(input: ProfileInput): Promise<{ ok: boolean; message?: string }> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join('; ') };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Unauthorized' };

  // First save marks onboarding complete. Subsequent saves leave it true.
  const { error } = await supabase
    .from('profiles')
    .update({ ...parsed.data, onboarding_completed: true })
    .eq('id', user.id);

  if (error) return { ok: false, message: error.message };
  revalidatePath('/settings');
  return { ok: true };
}
