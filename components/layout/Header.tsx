'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Database, ShieldCheck, ShoppingCart, HardDriveDownload } from 'lucide-react';
import Link from 'next/link';
import { getLastBackupTime } from '@/lib/backup-restore';
import { stripBasePath } from '@/lib/utils';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Bàn làm việc', subtitle: 'Tổng quan hệ thống bóc tách định mức' },
  '/materials': { title: 'Danh mục Vật tư', subtitle: 'Quản lý ván, nẹp, phụ kiện, quy cách & trọng lượng' },
  '/products': { title: 'Danh mục Sản phẩm', subtitle: 'Danh sách thành phẩm & module nội thất' },
  '/bom': { title: 'BOM - Định mức Vật tư', subtitle: 'Bóc tách chi tiết định mức tiêu hao cho từng sản phẩm' },
  '/projects': { title: 'Công trình & Dự án', subtitle: 'Khối lượng sản phẩm theo từng công trình/đơn hàng' },
  '/furniture': { title: 'Thư Viện Đồ Nội Thất', subtitle: 'Kho tra cứu đồ nội thất, xem định mức BOM và nạp vào công trình' },
  '/procurement': { title: 'Đặt hàng & Báo cáo PO', subtitle: 'Gộp lô đặt hàng nhiều công trình và xuất phiếu PO' },
  '/reports': { title: 'Đặt hàng & Báo cáo PO', subtitle: 'Gộp lô đặt hàng nhiều công trình, in phiếu PO Hoàng Nam và xuất Excel' },
  '/settings': { title: 'Cấu Hình & Sao Lưu', subtitle: 'Sao lưu hệ thống, nạp/xuất Excel và quản lý phiên bản' },
  '/templates': { title: 'Thư Viện Định Mức Mẫu', subtitle: 'Kho mẫu đồ nội thất chuẩn & định mức vật tư để tái sử dụng' },
};

export function Header() {
  const pathname = stripBasePath(usePathname());
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    setLastBackup(getLastBackupTime());
  }, [pathname]);

  // Xử lý các dynamic route như /projects/[id]
  let currentMeta = pageTitles[pathname];
  if (!currentMeta && pathname.startsWith('/projects/')) {
    currentMeta = {
      title: 'Chi tiết Công trình',
      subtitle: 'Quản lý khối lượng sản phẩm và bóc tách định mức',
    };
  }

  const title = currentMeta?.title || 'Hệ thống Định mức & Đặt hàng';
  const subtitle = currentMeta?.subtitle || 'Sản xuất nội thất gỗ công nghiệp';

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-800 tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Nút truy cập nhanh chức năng Sao lưu & Nạp cấu hình */}
        <Link
          href="/settings"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
          title="Bấm để sao lưu dữ liệu hoặc nạp cấu hình định mức từ Excel"
        >
          <HardDriveDownload className="w-3.5 h-3.5 text-blue-600" />
          <span>
            {lastBackup
              ? `Sao lưu: ${new Date(lastBackup).toLocaleDateString('vi-VN')}`
              : 'Sao lưu & Nạp'}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Quy cách Tấm / Cuộn / Bịch</span>
        </div>

        {pathname !== '/procurement' && (
          <Link
            href="/procurement"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Tính Đặt Hàng</span>
          </Link>
        )}
      </div>
    </header>
  );
}
