import type { NextConfig } from "next";

// NEXT_PUBLIC_BASE_PATH is set in CI to "/<repo-name>" for GitHub Pages.
// Leave empty for local dev (served at /).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const nextConfig: NextConfig = {
  output: 'export',       // generates static files in /out — no Node server needed
  trailingSlash: true,    // /project/abc → /project/abc/index.html (required for GH Pages)
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,    // next/image optimisation requires a server; disable for static
  },
}

export default nextConfig;
