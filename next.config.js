/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  serverExternalPackages: ['@supabase/supabase-js'],
}

let exportConfig = nextConfig

try {
  const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === 'development',
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true,
    },
  })
  exportConfig = withPWA(nextConfig)
} catch {
  // Continuar sin PWA si el paquete no está instalado aún
}

module.exports = exportConfig
