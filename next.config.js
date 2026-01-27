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
  // Add this to skip problematic optimizations
  swcMinify: false,
  compiler: {
    removeConsole: false,
  },
}

module.exports = nextConfig