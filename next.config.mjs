/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Optimize barrel file imports for faster dev boot and smaller bundles
    // See: https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', 'react-number-format'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // เปิด Image Optimization
    unoptimized: false,
    // รองรับ Supabase Storage URLs
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // คุณภาพสูงสุด 80% เพื่อลดขนาดไฟล์
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp', 'image/avif'],
  },
}

export default nextConfig
