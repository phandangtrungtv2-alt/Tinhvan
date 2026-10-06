/** @type {import('next').NextConfig} */
// Khi build cho GitHub Pages (chạy trong thư mục con /Tinhvan/), đặt biến môi trường
// NEXT_PUBLIC_BASE_PATH=/Tinhvan trước khi chạy `npm run build`.
// Khi deploy ở nơi khác (Cloudflare Pages, tên miền riêng...), để trống biến này.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  basePath: basePath || undefined,
  trailingSlash: true,
};

export default nextConfig;
