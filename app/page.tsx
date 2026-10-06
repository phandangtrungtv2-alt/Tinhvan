'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMaterialStore } from '@/lib/stores/useMaterialStore';
import { useProductStore } from '@/lib/stores/useProductStore';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import { useProcurementStore } from '@/lib/stores/useProcurementStore';
import { formatVND, formatNumber } from '@/lib/format';
import {
  Boxes,
  Armchair,
  Building2,
  ShoppingCart,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  Calendar,
  AlertCircle,
  Layers,
  Sparkles,
  TrendingUp,
  Scale,
} from 'lucide-react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  const materials = useMaterialStore((s) => s.materials);
  const projectProducts = useProjectStore((s) => s.projectProducts);
  const projects = useProjectStore((s) => s.projects);
  const selectSummary = useProcurementStore((s) => s.selectSummary);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-8 text-center text-slate-500">
        Đang khởi tạo tổng quan hệ thống...
      </div>
    );
  }

  const summary = selectSummary();

  // Top 5 công trình gần deadline nhất
  const sortedProjects = [...projects]
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner Chào Mừng */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ERP Chuyên Biệt Cho Ngành Sản Xuất Nội Thất Gỗ Công Nghiệp</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Bóc Tách Định Mức & Tính Toán Đặt Hàng Vật Tư
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Tự động bóc tách định mức BOM từ khối lượng sản phẩm, gộp đơn hàng lớn nhiều công trình, tự động tính hao hụt và làm tròn chuẩn quy cách đóng gói (Tấm ván nguyên khổ 1220x2440, Cuộn nẹp, Hộp phụ kiện).
          </p>
        </div>
      </div>

      {/* 1. KPI Cards: Tổng số vật tư / sản phẩm / công trình */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/materials"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vật Tư Trong Kho</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">{materials.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Ván, nẹp, phụ kiện kim khí</div>
          </div>
        </Link>

        <Link
          href="/furniture"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Thư Viện Đồ Nội Thất</span>
            <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Armchair className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">{projectProducts.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Món đồ kèm định mức BOM</div>
          </div>
        </Link>

        <Link
          href="/projects"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Công Trình / Dự Án</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">{projects.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Đơn hàng văn phòng & dự án</div>
          </div>
        </Link>

        <Link
          href="/reports"
          className="bg-white p-5 rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-50/50 to-white hover:border-amber-500 hover:shadow-sm transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Tổng Trọng Lượng Vật Tư</span>
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700 font-mono">
              {formatNumber(summary.totalWeightKg, 1)} <span className="text-sm font-semibold text-slate-600">kg</span>
            </div>
            <div className="text-xs text-slate-600 font-medium mt-0.5">
              ≈ {(summary.totalWeightKg / 1000).toFixed(2)} Tấn • {summary.totalBoardSheets} tấm ván
            </div>
          </div>
        </Link>
      </div>

      {/* 2. 3 SHORTCUTS THAO TÁC NHANH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Shortcut 1 */}
        <Link
          href="/projects"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Bước 1</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">Tạo Công Trình & Nhập SP</h3>
            <p className="text-xs text-slate-500 mt-1">
              Thêm công trình mới và nhập số lượng các loại tủ, bàn, hộc kéo cần sản xuất.
            </p>
          </div>
        </Link>

        {/* Shortcut 2 */}
        <Link
          href="/reports"
          className="p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-xl border-2 border-amber-500/50 hover:border-amber-500 hover:shadow-md transition-all group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <span>Bước 2 (Trọng tâm)</span>
            </div>
            <h3 className="text-base font-black text-slate-900 mt-0.5">Đặt Hàng Vật Tư & Báo Cáo PO</h3>
            <p className="text-xs text-slate-600 mt-1">
              Gộp nhiều công trình, tự động bù hao hụt, làm tròn theo quy cách và in phiếu PO chuẩn Cty Hoàng Nam.
            </p>
          </div>
        </Link>

        {/* Shortcut 3 */}
        <Link
          href="/furniture"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Armchair className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Kho Thiết Kế</div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">Thư Viện Đồ Nội Thất</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tra cứu mọi món đồ xưởng & công trình, xem định mức BOM và nạp 1-click vào công trình đang làm.
            </p>
          </div>
        </Link>
      </div>

      {/* 3. TOP 5 CÔNG TRÌNH GẦN DEADLINE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-sm">Top 5 Công Trình Gần Deadline Nhất</h3>
          </div>
          <Link
            href="/projects"
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>Xem tất cả công trình</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4 w-28">Mã DA</th>
                <th className="py-3 px-4 min-w-[200px]">Tên Công Trình</th>
                <th className="py-3 px-4 min-w-[180px]">Khách Hàng</th>
                <th className="py-3 px-4 w-32">Hạn Bàn Giao</th>
                <th className="py-3 px-3 w-32 text-center">Trạng Thái</th>
                <th className="py-3 px-4 w-36 text-center">Khối Lượng SP</th>
                <th className="py-3 px-4 w-36 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedProjects.map((p, idx) => {
                const items = projectProducts.filter((it) => it.project_id === p.id);
                const totalQty = items.reduce((acc, it) => acc + (it.quantity || 0), 0);

                let badgeClass = 'bg-slate-100 text-slate-700';
                let statusLabel = 'Đang lập KH';
                if (p.status === 'in_production') {
                  badgeClass = 'bg-amber-100 text-amber-800 font-bold border-amber-200';
                  statusLabel = 'Đang sản xuất';
                } else if (p.status === 'completed') {
                  badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  statusLabel = 'Đã hoàn thành';
                }

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.project_code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {p.client_name || 'Khách vãng lai'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {new Date(p.deadline).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${badgeClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {totalQty > 0 ? (
                        <span className="text-amber-700">{totalQty} sản phẩm</span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">Chưa nhập</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href={`/projects/${p.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <span>Nhập SP / Bóc tách</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
