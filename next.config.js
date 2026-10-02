/** @type {import('next').NextConfig} */
const isGhPages =
  process.env.GITHUB_PAGES === "true" || process.env.GITHUB_PAGES === "1"
const repo = "souzana"
const basePath = isGhPages ? `/${repo}` : ""

const nextConfig = {
  devIndicators: false,
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

module.exports = nextConfig
