/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/Vote',
  assetPrefix: '/Vote/',
  images: { unoptimized: true },
};

module.exports = nextConfig;
