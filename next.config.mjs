/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'sstduefzeufwmltjzknc.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'media.mayar.id',
      },
      {
        protocol: 'https',
        hostname: 'media.mayar.club',
      },
    ],
  },
  experimental: {
    cpus: 4,
    serverActions: {
      allowedOrigins: [
        'cashier.elaparfum.web.id',
        'elaparfum.web.id',
        'localhost:3000',
      ],
    },
  },
};

export default nextConfig;
