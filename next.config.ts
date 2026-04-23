import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},
  // react-simple-maps uses d3 which needs transpilation
  transpilePackages: ["react-simple-maps"],
};

export default nextConfig;
