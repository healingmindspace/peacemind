import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@peacemind/lib", "@peacemind/ui", "@peacemind/theme"],
};

export default nextConfig;
