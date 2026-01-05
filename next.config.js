import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Explicitly set the output file tracing root to this directory
  // This fixes the multiple lockfiles warning by telling Next.js this is the project root
  outputFileTracingRoot: __dirname,
  
  // Enable experimental features if needed
  experimental: {
    // Enable app directory (already default in Next.js 15)
  },
  
  // Include pdf-parse in the standalone build (it uses require() internally)
  serverExternalPackages: ['pdf-parse'],
  
  // Handle CSS and static files
  webpack: (config) => {
    // Handle any webpack customization if needed for existing dependencies
    return config;
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: 'my-value',
  },
  
  // Image optimization (for company logos)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'img.logo.dev',
      },
      {
        protocol: 'https',
        hostname: 'cdn.brandfolder.io',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com', // Temporary - for migrating old data
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Redirect old Vite paths if needed
  async redirects() {
    return [];
  },
};

export default nextConfig;