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
    ],
  },
  experimental: {
    cpus: 4,
  },
};

export default nextConfig;
