import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enabling static export
  trailingSlash: true, // Ensures URLs have trailing slashes
  images: {
    unoptimized: true, // Disable image optimization for GitHub Pages
  },
  // Optionally add any other config options you need here
};

export default nextConfig;
