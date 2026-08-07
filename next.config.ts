import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), browsing-topics=()",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
];

if (process.env.VERCEL_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

if (supabaseUrl) {
  remotePatterns.push(
    new URL("/storage/v1/object/public/**", supabaseUrl),
    new URL("/storage/v1/render/image/public/**", supabaseUrl)
  );
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        headers: securityHeaders,
        source: "/:path*",
      },
    ];
  },
  images: {
    remotePatterns,
  },
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
