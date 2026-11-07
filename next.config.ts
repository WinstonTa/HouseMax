import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer runs server-side only (added in P3).
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
