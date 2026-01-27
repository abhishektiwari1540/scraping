// next.config.js (in project root)
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporarily disable strict mode to debug
  reactStrictMode: false,
  
  // Allow build even with TypeScript errors
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Allow build even with ESLint errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable SWC minify for debugging
  swcMinify: false,
};

module.exports = nextConfig;