/** @type {import('next').NextConfig} */
const nextConfig = {
  // ❌ Remove the experimental.turbo line completely
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;