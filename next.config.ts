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
};

export default nextConfig;
