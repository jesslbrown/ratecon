import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The hand-rolled lib/supabase/database.types.ts is a stub that doesn't
  // perfectly satisfy supabase-js's generic schema constraints. Once you
  // apply the migration (`supabase db push`) and run `pnpm db:types`, the
  // generated file will replace it — flip this back to `false` then.
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: {
      // Rate-cons can be large image/PDF uploads handed to a server action
      // before being forwarded to the extraction API route.
      bodySizeLimit: '12mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Supabase storage signed URLs.
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
