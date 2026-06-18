import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

if (supabaseUrl) {
  remotePatterns.push(
    new URL("/storage/v1/object/public/**", supabaseUrl),
    new URL("/storage/v1/render/image/public/**", supabaseUrl)
  );
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default withNextIntl(nextConfig);
