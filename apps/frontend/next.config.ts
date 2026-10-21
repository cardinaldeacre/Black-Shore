import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@black-shore/shared'],
    output: 'export',
    images: {
        unoptimized: true,
    },
};

export default nextConfig;