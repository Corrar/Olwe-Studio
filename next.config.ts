import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Migrações SQL lidas em tempo de execução por src/db/index.ts.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" }],
  },
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
