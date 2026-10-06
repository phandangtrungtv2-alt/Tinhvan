import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'Hệ thống Bóc tách Định mức & Đặt hàng Vật tư Nội thất',
  description: 'Giải pháp tính toán hao hụt và đặt hàng ván MDF, nẹp chỉ, phụ kiện ngành gỗ công nghiệp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-100/60 font-sans text-slate-900 antialiased">
        <div className="flex min-h-screen w-full">
          {/* Cố định Sidebar bên trái */}
          <Sidebar />

          {/* Phần nội dung chính bên phải */}
          <div className="flex flex-1 flex-col min-w-0">
            <Header />
            <main className="flex-1 p-6 md:p-8 bg-slate-50 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
