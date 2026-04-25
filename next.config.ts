import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Ensures `.env.local` is applied before config is read (helps Proxy / Edge pick up NEXT_PUBLIC_*).
loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  // Proxy runs on Edge; without this, `process.env.NEXT_PUBLIC_*` can be empty there even when `.env.local` exists.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },

  // Allow next/image to load images from Supabase Storage and other trusted origins.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mkilzcqmqawtdfqtglfz.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Security headers as a safety net for static assets served by Vercel CDN.
  // Dynamic responses are also covered by proxy.ts, which applies CSP + full header set.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
