import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ai-qa/shared-types', '@ai-qa/validation', '@ai-qa/api-client', '@ai-qa/ui'],
};

export default nextConfig;
