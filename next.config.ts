// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Remove 'swcMinify' as it's no longer needed
  // Fix images configuration warning
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allows all HTTPS domains
      },
    ],
  },
  // Add this to set NODE_ENV properly
  env: {
    NODE_ENV: 'production',
  },
};

module.exports = nextConfig;