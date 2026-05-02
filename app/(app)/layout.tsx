import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { AppHeader } from '@/components/shared/app-header';
import { OnboardingGate } from '@/components/shared/onboarding-gate';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppHeader email={user.email ?? ''} />
        <main className="flex-1 p-6">
          <OnboardingGate profile={profile ?? null} />
          {children}
        </main>
      </div>
    </div>
  );
}
