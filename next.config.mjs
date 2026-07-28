/** @type {import('next').NextConfig} */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
]

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // El panel nunca debe indexarse.
      {
        source: "/admin/:path*",
        headers: [...SECURITY_HEADERS, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ]
  },
}

export default nextConfig
