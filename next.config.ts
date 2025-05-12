import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    // NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID: process.env.NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  },
};

export default nextConfig;
