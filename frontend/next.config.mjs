/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google OAuth avatars
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
