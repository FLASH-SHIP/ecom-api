import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isTurbopack = process.env.TURBOPACK !== "0";

const nextConfig: NextConfig = {
  // Disable strict mode to avoid double-mount issues
  reactStrictMode: false,

  turbopack: {
    root: path.join(__dirname, "../.."),
  },

  // Don't bundle optional server-only dependencies
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "sharp",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "@ecom/prisma",
  ],

  // Transpile workspace packages
  transpilePackages: [
    "@ecom/lib",
    "@ecom/config",
    "@ecom/types",
    "@ecom/trpc",
    "@ecom/features",
    "@ecom/i18n",
    "@ecom/shared",
  ],

  // Webpack config only when NOT using Turbopack
  ...(!isTurbopack && {
    webpack: (config) => {
      if (config.module?.rules) {
        config.module.rules.push({
          test: /\.(json|js|ts|tsx|jsx)$/,
          resourceQuery: /raw/,
          use: "raw-loader",
        });
      }
      return config;
    },
  }),

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
