'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes,
  Armchair,
  FileSpreadsheet,
  Building2,
  ShoppingCart,
  BarChart3,
  RotateCcw,
  Hammer,
  HardDriveDownload,
} from 'lucide-react';
import { cn, stripBasePath } from '@/lib/utils';
import { useMaterialStore } from '@/lib/stores/useMaterialStore';
import { useProductStore } from '@/lib/stores/useProductStore';
import { useBomStore } from '@/lib/stores/useBomStore';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import { useProcurementStore } from '@/lib/stores/useProcurementStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isPrimary?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Công trình & Dự án', href: '/projects', icon: Building2, isPrimary: true },
  { name: 'Thư viện đồ nội thất', href: '/furniture', icon: Armchair, isPrimary: true },
  { name: 'Danh mục Vật tư', href: '/materials', icon: Boxes },
  { name: 'Đặt hàng & Báo cáo PO', href: '/reports', icon: FileSpreadsheet },
  { name: 'Cấu hình & Sao lưu', href: '/settings', icon: HardDriveDownload },
];

export function Sidebar() {
  const pathname = stripBasePath(usePathname());

  const handleResetData = () => {
    if (confirm('Bạn có chắc muốn khôi phục toàn bộ dữ liệu mẫu (Mock data)?')) {
      useMaterialStore.getState().resetToDefault();
      useProductStore.getState().resetToDefault();
      useBomStore.getState().resetToDefault();
      useProjectStore.getState().resetToDefault();
      useProcurementStore.getState().setSelectedProjectIds(['proj-1', 'proj-2']);
      alert('Đã khôi phục dữ liệu mẫu thành công!');
      window.location.reload();
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/60">
        <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
          <Hammer className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-white uppercase">Mộc ERP Pro</h1>
          <p className="text-[11px] text-slate-400">Bóc tách & Đặt hàng vật tư</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Quản trị & Tính toán
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? item.isPrimary
                    ? "bg-amber-500 text-slate-950 shadow-md font-semibold"
                    : "bg-slate-800 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? item.isPrimary
                        ? "text-slate-950"
                        : "text-amber-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.isPrimary && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold",
                    isActive ? "bg-slate-950/20 text-slate-950" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  )}
                >
                  Trọng tâm
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Reset Data */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <button
          onClick={handleResetData}
          type="button"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-md transition-colors border border-slate-800"
          title="Tải lại 6 vật tư, 3 sản phẩm và 2 công trình mẫu"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Khôi phục dữ liệu mẫu</span>
        </button>
        <div className="mt-3 text-center text-[10px] text-slate-500">
          Chuyên biệt Gỗ Công Nghiệp v1.0
        </div>
      </div>
    </aside>
  );
}
