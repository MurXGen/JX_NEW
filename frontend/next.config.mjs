// next.config.mjs
import withPWAInit from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.journalx.app",
        pathname: "/**", // Allow all images from your CDN
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

// ✅ Initialize next-pwa
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable in dev
});

// ✅ Export merged config
export default withPWA(nextConfig);
