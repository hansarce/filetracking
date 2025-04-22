import type { NextConfig } from "next";
const nextConfig = {
  // Force Node.js runtime (disable Edge)
  experimental: {
    runtime: 'nodejs', // Default is 'experimental-edge'
  },
  // If using static export (for fully static sites)
  output: 'export', // Optional: Only if you don't need server-side features
};

export default nextConfig;