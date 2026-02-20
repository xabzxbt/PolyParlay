const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.polymarket.com" },
      { protocol: "https", hostname: "polymarket-upload.s3.us-east-2.amazonaws.com" },
    ],
  },

  // ✅ ФІКС: serverComponentsExternalPackages (не serverExternalPackages)
  experimental: {
    serverComponentsExternalPackages: [
      "@lit/reactive-element",
      "lit",
      "lit-element",
      "lit-html",
      "@lit-labs/ssr-dom-shim",
    ],
  },

  transpilePackages: [
    "@reown",
    "@walletconnect",
  ],

  webpack: (config, { isServer }) => {
    // 1. Porto connector — not used
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^porto(\/.*)?$/ })
    );

    // 2. pino-pretty — optional WalletConnect dep
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^pino-pretty$/ })
    );

    // 3. React Native / MetaMask SDK deps — not needed for web
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "react-native": false,
      lokijs: false,
    };

    // 4. For server: also alias these as empty modules
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@react-native-async-storage/async-storage": false,
        "react-native": false,
      };
    }

    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },

  async redirects() {
    return [
      { source: "/dashboard", destination: "/my-parlays", permanent: true },
      { source: "/markets", destination: "/", permanent: true },
    ];
  },

  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  output: "standalone",
};

module.exports = nextConfig;
