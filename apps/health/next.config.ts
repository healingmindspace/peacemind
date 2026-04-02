import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@peacemind/lib", "@peacemind/ui", "@peacemind/theme"],
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "local",
  },
};

export default nextConfig;
