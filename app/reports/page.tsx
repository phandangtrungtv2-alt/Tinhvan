'use client';

import React, { useState, useEffect } from 'react';
import { useProcurementStore } from '@/lib/stores/useProcurementStore';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import {
  formatVND,
  formatNumber,
  formatDecimalRaw,
  formatQtyDisplay,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '@/lib/format';
import { exportProcurementToExcel } from '@/lib/export-excel';
import {
  ShoppingCart,
  Printer,
  Download,
  Building2,
  CheckSquare,
  Square,
  Layers,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Scale,
  Sparkles,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  Eye,
} from 'lucide-react';

export default function ProcurementAndReportsPage() {
  const [mounted, setMounted] = useState(false);

  const selectedProjectIds = useProcurementStore((s) => s.selectedProjectIds);
  const toggleProjectId = useProcurementStore((s) => s.toggleProjectId);
  const selectAllProjects = useProcurementStore((s) => s.selectAllProjects);
  const clearSelectedProjects = useProcurementStore((s) => s.clearSelectedProjects);
  const selectInProductionOnly = useProcurementStore((s) => s.selectInProductionOnly);

  const wasteRateOverrides = useProcurementStore((s) => s.wasteRateOverrides);
  const setWasteRateOverride = useProcurementStore((s) => s.setWasteRateOverride);
  const resetWasteRateOverrides = useProcurementStore((s) => s.resetWasteRateOverrides);

  const selectBatchBreakdown = useProcurementStore((s) => s.selectBatchBreakdown);
  const selectSummary = useProcurementStore((s) => s.selectSummary);

  const projects = useProjectStore((s) => s.projects);

  // Accordion breakdown mở rộng
  const [expandedMaterialIds, setExpandedMaterialIds] = useState<Record<string, boolean>>({});

  // Chế độ xem: 'table' (bảng làm việc & phân tích gộp) hoặc 'preview_print' (xem trước phiếu in PO)
  const [viewMode, setViewMode] = useState<'table' | 'preview_print'>('table');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-8 text-center text-slate-500">
        Đang khởi tạo số liệu đặt hàng & báo cáo...
      </div>
    );
  }

  const batch = selectBatchBreakdown();
  const summary = selectSummary();
  const hasOverrides = Object.keys(wasteRateOverrides).length > 0;

  const selectedProjects = projects.filter((p) => selectedProjectIds.includes(p.id));

  const toggleExpand = (materialId: string) => {
    setExpandedMaterialIds((prev) => ({
      ...prev,
      [materialId]: !prev[materialId],
    }));
  };

  const handleInlineWasteChange = (materialId: string, valStr: string) => {
    const rate = Math.max(0, Math.min(100, Number(valStr) || 0));
    setWasteRateOverride(materialId, rate);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportProcurementToExcel(batch, projects);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* 1. THANH ĐIỀU KHIỂN & CHỌN CÔNG TRÌNH GỘP (ẨN KHI IN)                     */}
      {/* ========================================================================= */}
      <div className="no-print bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wide">
                Phân Hệ Mua Hàng & Cung Ứng
              </span>
              <span className="text-xs text-slate-500">Gộp đơn hàng & Báo cáo PO chuẩn xưởng</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">
              Đặt Hàng Vật Tư & Báo Cáo PO Gộp Nhiều Công Trình
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động bù % hao hụt, làm tròn theo khổ ván nguyên / cuộn nẹp / hộp phụ kiện và xuất phiếu PO chuẩn công ty Hoàng Nam.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Nút chuyển chế độ xem */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bảng Phân Tích
              </button>
              <button
                onClick={() => setViewMode('preview_print')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'preview_print'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Xem Phiếu In PO</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>In Biểu Mẫu / PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel Đơn Hàng (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Bộ chọn công trình */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Công trình gộp:</span>
            </span>

            {projects.map((proj) => {
              const isSelected = selectedProjectIds.includes(proj.id);
              return (
                <button
                  key={proj.id}
                  onClick={() => toggleProjectId(proj.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{proj.name}</span>
                  {proj.status === 'in_production' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={selectAllProjects}
              className="text-amber-700 hover:text-amber-800 font-bold hover:underline"
            >
              Chọn tất cả ({projects.length})
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={selectInProductionOnly}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
            >
              Chỉ đang sản xuất
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={clearSelectedProjects}
              className="text-slate-500 hover:text-red-600 font-medium hover:underline"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BỘ 4 SUMMARY CARDS: TỔNG QUAN KHỐI LƯỢNG ĐẶT HÀNG (ẨN KHI IN)           */}
      {/* ========================================================================= */}
      <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng tấm ván */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tổng Ván Cần Đặt</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {summary.totalBoardSheets} <span className="text-sm font-semibold text-slate-600">Tấm</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
              • Đã làm tròn nguyên tấm 1220x2440
            </div>
          </div>
        </div>

        {/* Card 2: Tổng mét nẹp chỉ */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tổng Mét Nẹp Chỉ</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {formatNumber(summary.totalEdgeMeters)} <span className="text-sm font-semibold text-slate-600">Mét</span>
            </div>
            <div className="text-[11px] text-blue-700 font-medium mt-0.5">
              • Quy đổi chẵn theo cuộn tiêu chuẩn
            </div>
          </div>
        </div>

        {/* Card 3: Tổng kiện / hộp / cuộn */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tổng Kiện / Hộp / Cuộn</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {summary.totalPackages} <span className="text-sm font-semibold text-slate-600">Kiện/Hộp</span>
            </div>
            <div className="text-[11px] text-purple-700 font-medium mt-0.5">
              • Đóng gói chuẩn theo nhà sản xuất
            </div>
          </div>
        </div>

        {/* Card 4: Tổng trọng lượng */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border-2 border-amber-300 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 uppercase tracking-wide">Tổng Trọng Lượng Vật Tư</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-800 font-mono">
              {formatNumber(summary.totalWeightKg, 1)} <span className="text-sm font-semibold text-slate-700">kg</span>
            </div>
            <div className="text-xs text-slate-600 font-bold mt-0.5">
              ≈ {(summary.totalWeightKg / 1000).toFixed(2)} Tấn (Khối lượng xe tải cần chở)
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CHẾ ĐỘ 1: BẢNG PHÂN TÍCH ĐẶT HÀNG GỘP (KÈM ACCORDION & SỬA INLINE %HH) */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="no-print bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
                <span>Bảng Tổng Hợp Khối Lượng Đặt Hàng Vật Tư Gộp ({batch.items.length} loại vật tư)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bấm vào từng dòng để xem chi tiết công trình đóng góp • Sửa trực tiếp % hao hụt để cập nhật realtime.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {hasOverrides && (
                <button
                  onClick={resetWasteRateOverrides}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset % về mặc định</span>
                </button>
              )}

              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg">
                Số công trình gộp: <strong>{selectedProjects.length}</strong>
              </span>
            </div>
          </div>

          {batch.items.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h4 className="font-bold text-slate-700 text-base">Không có dữ liệu đặt hàng</h4>
              <p className="text-xs text-slate-400 mt-1">
                Vui lòng chọn ít nhất 1 công trình có nhập sản phẩm và định mức BOM ở phía trên.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-2 w-8 text-center"></th>
                    <th className="py-3 px-3 w-28">Mã VT</th>
                    <th className="py-3 px-4 min-w-[200px]">Tên Vật Tư</th>
                    <th className="py-3 px-3 w-28">Nhóm</th>
                    <th className="py-3 px-2 w-16 text-center">ĐVT</th>
                    <th className="py-3 px-3 w-24 text-right">Tổng Net</th>
                    <th className="py-3 px-2 w-24 text-center">% Hao Hụt</th>
                    <th className="py-3 px-3 w-24 text-right">Gross (Thô)</th>
                    <th className="py-3 px-3 w-32">Quy Cách</th>
                    <th className="py-3 px-4 min-w-[200px] font-black">Khối Lượng Đặt Hàng (Order Qty)</th>
                    <th className="py-3 px-3 w-24 text-right">Dư Kho</th>
                    <th className="py-3 px-3 w-28 text-right font-bold">Trọng Lượng (Kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batch.items.map((item) => {
                    const mat = item.material;
                    const isExpanded = !!expandedMaterialIds[mat.id];
                    const colorConfig = CATEGORY_COLORS[mat.category] || CATEGORY_COLORS.consumable;
                    const isCustomWaste = wasteRateOverrides[mat.id] !== undefined;

                    let packSpecText = 'Nguyên tấm';
                    if (mat.rounding_mode === 'package') {
                      packSpecText = `${mat.package_spec?.pack_size} ${mat.base_unit}/${mat.package_spec?.pack_unit_name}`;
                    } else if (mat.rounding_mode === 'exact') {
                      packSpecText = 'Chính xác lẻ';
                    }

                    const itemWeight = Number((item.orderQty * (mat.weight_per_unit || 0)).toFixed(1));

                    return (
                      <React.Fragment key={mat.id}>
                        <tr
                          className={`${colorConfig.bg} hover:bg-amber-50/40 transition-colors border-b border-slate-100 cursor-pointer`}
                          onClick={() => toggleExpand(mat.id)}
                        >
                          <td className="py-3 px-2 text-center text-slate-400">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-amber-600 mx-auto" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{mat.material_code}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{mat.name}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${colorConfig.badge}`}>
                              {CATEGORY_LABELS[mat.category] || mat.category}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-semibold text-slate-600">{mat.base_unit}</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-700">{formatNumber(item.netQty, 2)}</td>

                          {/* Sửa inline % hao hụt */}
                          <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={item.wasteRate}
                                onChange={(e) => handleInlineWasteChange(mat.id, e.target.value)}
                                className={`w-14 text-center text-xs font-bold py-1 px-1 border-2 rounded-lg transition-all ${
                                  isCustomWaste
                                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                                    : 'border-slate-300 bg-white text-slate-800 focus:border-amber-500'
                                }`}
                              />
                              <span className="ml-1 text-[11px] font-bold text-slate-500">%</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-medium text-slate-800">{formatNumber(item.grossQty, 2)}</td>
                          <td className="py-3 px-3 text-[11px] text-slate-600">{packSpecText}</td>
                          <td className="py-3 px-4 font-black text-amber-800 text-xs">
                            {formatQtyDisplay(mat, item.orderQty, item.grossQty)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-600">
                            {item.surplus > 0 ? `+${formatDecimalRaw(item.surplus, 2)}` : '0'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {itemWeight > 0 ? `${formatNumber(itemWeight, 1)} kg` : '-'}
                          </td>
                        </tr>

                        {/* Accordion breakdown chi tiết từng công trình */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={12} className="py-3 px-8">
                              <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                ↳ Đóng góp theo từng công trình:
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {item.projectContributions.map((contrib) => (
                                  <div
                                    key={contrib.projectId}
                                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1"
                                  >
                                    <div className="font-bold text-slate-800 flex items-center justify-between">
                                      <span>{contrib.projectName}</span>
                                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                        {contrib.projectCode}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 flex justify-between">
                                      <span>Khối lượng tinh (Net):</span>
                                      <strong className="font-mono">{formatNumber(contrib.netQty, 2)} {mat.base_unit}</strong>
                                    </div>
                                    <div className="text-[11px] text-slate-600 flex justify-between">
                                      <span>Khối lượng thô (Gross):</span>
                                      <strong className="font-mono text-amber-700">{formatNumber(contrib.grossQty, 2)} {mat.base_unit}</strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50/80 font-black border-t-2 border-amber-300 text-slate-900">
                    <td colSpan={11} className="py-3.5 px-4 text-right uppercase text-xs">
                      TỔNG TRỌNG LƯỢNG VẬT TƯ CẦN ĐẶT HÀNG:
                    </td>
                    <td className="py-3.5 px-3 text-right text-amber-800 font-mono font-black text-sm">
                      {formatNumber(summary.totalWeightKg, 1)} kg
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CHẾ ĐỘ 2: BIỂU MẪU ĐƠN ĐẶT HÀNG IN ẤN PO HOÀNG NAM (HIỂN THỊ KHI IN)    */}
      {/* ========================================================================= */}
      <div
        className={`bg-white p-8 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 ${
          viewMode === 'table' ? 'hidden print:block' : 'block'
        }`}
      >
        {/* Header phiếu in Cty Hoàng Nam */}
        <div className="border-b-2 border-slate-900 pb-5 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900">
                CÔNG TY CỔ PHẦN TƯ VẤN XÂY DỰNG HOÀNG NAM
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Nhà máy sản xuất: Việt Trì – Phú Thọ
              </p>
              <p className="text-xs text-slate-600 font-medium">
                Email: cthoangnampt@gmail.com
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Mẫu số: <strong>PO-2026/FURNITURE</strong></p>
              <p className="mt-0.5">Ngày lập: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
              ĐƠN TỔNG HỢP ĐẶT HÀNG VẬT TƯ (PURCHASE ORDER)
            </h1>
            <p className="text-xs text-slate-600 mt-1 italic">
              (Bóc tách định mức gộp và làm tròn theo quy cách đóng gói thương phẩm)
            </p>
          </div>

          {/* Công trình áp dụng: Nếu 1 công trình thì ghi trên 1 dòng, nếu từ 2 công trình trở lên thì xuống dòng từng công trình */}
          <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              {selectedProjects.length === 0 ? (
                <div>
                  Công trình áp dụng: <span className="text-slate-400 italic">Chưa chọn công trình nào</span>
                </div>
              ) : selectedProjects.length === 1 ? (
                <div>
                  Công trình áp dụng:{' '}
                  <strong className="text-slate-900 font-bold">
                    {selectedProjects[0].project_code} – {selectedProjects[0].name}
                    {selectedProjects[0].client_name && ` (${selectedProjects[0].client_name})`}
                  </strong>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800">
                    Công trình áp dụng ({selectedProjects.length} công trình):
                  </div>
                  <div className="pl-2 space-y-1 border-l-2 border-slate-400">
                    {selectedProjects.map((p, pIdx) => (
                      <div key={p.id} className="text-slate-900 font-medium">
                        <span className="font-bold text-slate-600 mr-1">{pIdx + 1}.</span>
                        <span className="font-mono font-bold text-slate-800 mr-1.5">{p.project_code}</span>
                        <span className="font-bold text-slate-900">– {p.name}</span>
                        {p.client_name && (
                          <span className="text-slate-500 font-normal ml-1.5">
                            (Khách hàng: {p.client_name})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sm:text-right shrink-0">
              Số loại vật tư đặt hàng: <strong className="text-slate-900 font-bold">{summary.materialTypesCount} loại</strong>
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu in PO */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px] border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-2 border-r border-slate-300 text-center w-10">STT</th>
                <th className="py-2.5 px-3 border-r border-slate-300 w-24">Mã VT</th>
                <th className="py-2.5 px-3 border-r border-slate-300 min-w-[200px]">Tên Vật Tư</th>
                <th className="py-2.5 px-2 border-r border-slate-300 text-center w-14">ĐVT</th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-20">Net</th>
                <th className="py-2.5 px-2 border-r border-slate-300 text-center w-14">%HH</th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-20">Gross</th>
                <th className="py-2.5 px-3 border-r border-slate-300 w-32">Quy Cách</th>
                <th className="py-2.5 px-3 border-r border-slate-300 min-w-[190px] font-black">
                  Số Lượng Cần Mua (Order Qty)
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-20">Dư Kho</th>
                <th className="py-2.5 px-3 text-right w-28 font-bold">Trọng Lượng (Kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {batch.items.map((item, idx) => {
                const mat = item.material;
                let packSpecText = 'Nguyên tấm';
                if (mat.rounding_mode === 'package') {
                  packSpecText = `${mat.package_spec?.pack_size} ${mat.base_unit}/${mat.package_spec?.pack_unit_name}`;
                } else if (mat.rounding_mode === 'exact') {
                  packSpecText = 'Lẻ chính xác';
                }

                const itemWeight = Number((item.orderQty * (mat.weight_per_unit || 0)).toFixed(1));

                return (
                  <tr key={mat.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold text-slate-900">
                      {mat.material_code}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-900">
                      {mat.name}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-center font-semibold text-slate-700">
                      {mat.base_unit}
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-200 text-right">
                      {formatNumber(item.netQty, 2)}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-center">
                      {item.wasteRate}%
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-200 text-right font-medium">
                      {formatNumber(item.grossQty, 2)}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-[11px] text-slate-600">
                      {packSpecText}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-black text-amber-800">
                      {formatQtyDisplay(mat, item.orderQty, item.grossQty)}
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono text-[11px] text-slate-600">
                      {item.surplus > 0 ? `+${formatDecimalRaw(item.surplus, 2)}` : '0'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {itemWeight > 0 ? `${formatNumber(itemWeight, 1)} kg` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                <td colSpan={10} className="py-3 px-3 text-right uppercase text-xs">
                  TỔNG TRỌNG LƯỢNG VẬT TƯ CẦN MUA:
                </td>
                <td className="py-3 px-3 text-right text-sm font-black text-amber-800 font-mono">
                  {formatNumber(summary.totalWeightKg, 1)} kg
                  <span className="block text-[10px] text-slate-500 font-normal">
                    ≈ {(summary.totalWeightKg / 1000).toFixed(2)} Tấn
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Chữ ký 3 bên khi in */}
        <div className="mt-12 pt-6 grid grid-cols-3 text-center text-xs text-slate-800">
          <div>
            <p className="font-bold uppercase">Người Lập Biểu</p>
            <p className="text-[11px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
            <div className="h-20"></div>
            <p className="font-semibold text-slate-700">Kỹ sư Bóc tách BOM</p>
          </div>

          <div>
            <p className="font-bold uppercase">Phòng Mua Hàng & Cung Ứng</p>
            <p className="text-[11px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
            <div className="h-20"></div>
            <p className="font-semibold text-slate-700">Trưởng phòng Mua hàng</p>
          </div>

          <div>
            <p className="font-bold uppercase">Ban Giám Đốc Nhà Máy</p>
            <p className="text-[11px] text-slate-400 italic mt-0.5">(Ký duyệt, đóng dấu)</p>
            <div className="h-20"></div>
            <p className="font-semibold text-slate-700">Giám đốc Sản xuất</p>
          </div>
        </div>
      </div>
    </div>
  );
}
