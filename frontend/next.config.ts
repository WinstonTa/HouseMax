import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Backend PDF rendering (app/api/packet/pdf) runs @react-pdf/renderer in Node, unbundled.
  serverExternalPackages: ["@react-pdf/renderer"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
