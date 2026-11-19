import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // gallery photos are served through next/image in these formats, sized per device
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
