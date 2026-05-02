'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LayoutDashboard, FileText, Users, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
  const t = useTranslations('app.nav');
  const pathname = usePathname();

  const items = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/invoices', label: t('invoices'), icon: FileText },
    { href: '/brokers', label: t('brokers'), icon: Users },
    { href: '/settings', label: t('settings'), icon: Settings },
  ];

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-muted/20 p-4 md:block">
      <Link href="/dashboard" className="px-2 text-lg font-semibold tracking-tight">
        RateCon
      </Link>
      <Button asChild className="mt-6 w-full">
        <Link href="/invoices/new">
          <Plus className="h-4 w-4" />
          {t('newInvoice')}
        </Link>
      </Button>
      <nav className="mt-6 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
