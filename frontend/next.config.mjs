// next.config.mjs
import withPWAInit from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ------------------------------
  // 301/308 redirects: old /blog route renamed to /blogs
  // Preserves SEO equity and keeps old inbound links working.
  // ------------------------------
  async redirects() {
    return [
      { source: "/blog", destination: "/blogs", permanent: true },
      { source: "/blog/:slug*", destination: "/blogs/:slug*", permanent: true },
    ];
  },

  // ------------------------------
  // 🔐 FIX: Paddle iframe allowed via CSP
  // (Applied only in PRODUCTION)
  // ------------------------------
  async headers() {
    if (process.env.NODE_ENV === "production") {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              key: "Content-Security-Policy",
              value: `
                default-src * data: blob: 'unsafe-inline' 'unsafe-eval';
                script-src * blob: data: 'unsafe-inline' 'unsafe-eval';
                style-src * 'unsafe-inline';
                img-src * data: blob:;
                connect-src *;
                frame-src https://*.paddle.com https://buy.paddle.com *;
                frame-ancestors 'self' https://*.paddle.com https://buy.paddle.com;
              `.replace(/\s+/g, " "),
            },
          ],
        },
      ];
    }

    // No CSP in development → fixes 403 & frame errors
    return [];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.journalx.app",
        pathname: "/**",
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

// ------------------------------
// 🟩 Initialize next-pwa
// ------------------------------
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

// 🟩 Export merged config
export default withPWA(nextConfig);
