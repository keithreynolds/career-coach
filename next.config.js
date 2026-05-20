/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse and mammoth must run on the server only
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
};

module.exports = nextConfig;
