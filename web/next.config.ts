import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["remotion", "@remotion/cli", "@remotion/player"],
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  webpack: (config) => {
    // Force all remotion imports to resolve from web/node_modules
    // so root src/ components use the same Remotion instance as the Player
    config.resolve.alias = {
      ...config.resolve.alias,
      remotion: path.resolve(__dirname, "node_modules/remotion"),
      "@remotion/player": path.resolve(__dirname, "node_modules/@remotion/player"),
      "@remotion/cli": path.resolve(__dirname, "node_modules/@remotion/cli"),
    };
    return config;
  },
};

export default nextConfig;
