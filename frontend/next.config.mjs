/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.journalx.app",
        pathname: "/**", // allow all paths under this domain
      },
    ],
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
