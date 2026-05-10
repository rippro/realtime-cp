import type { NextConfig } from "next";

const isProductionBuild = process.env.BUILD_MODE === "production";

let basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH || "";
if (basePathEnv && !basePathEnv.startsWith("/")) {
  basePathEnv = `/${basePathEnv}`;
}
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_IS_PRODUCTION_BUILD: String(isProductionBuild),
    NEXT_PUBLIC_BASE_PATH: basePathEnv,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Firebase signInWithPopup requires allow-popups (not the default same-origin)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

if (basePathEnv) {
  nextConfig.basePath = basePathEnv;
  nextConfig.assetPrefix = basePathEnv;
}

console.log(`Building in ${isProductionBuild ? "PRODUCTION" : "DEVELOPMENT"} mode`);

export default nextConfig;
