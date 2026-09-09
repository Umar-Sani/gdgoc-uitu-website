/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google OAuth avatars
    ],
    // AVIF dropped: at Next's default quality it visibly degraded photographic
    // content in the mission carousel even after the aspect-ratio fix. WebP
    // alone still gives most of the size win with no visible quality loss.
    formats: ['image/webp'],
    minimumCacheTTL: 31536000, // 1 year — optimized variants are immutable per source URL
  },
};

export default nextConfig;
