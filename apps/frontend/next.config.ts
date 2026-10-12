import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@black-shore/shared'],
}

export default nextConfig