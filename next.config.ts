import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
