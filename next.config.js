/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features if needed
  experimental: {
    // Enable app directory (already default in Next.js 15)
  },
  
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
    domains: [
      'ui-avatars.com',
      'logo.clearbit.com',
      'cdn.brandfolder.io'
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