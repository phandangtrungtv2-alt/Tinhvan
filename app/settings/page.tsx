'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  HardDriveDownload,
  Upload,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Boxes,
  Armchair,
  Building2,
  Undo2,
  FileCheck,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import {
  createAppBackup,
  downloadJsonBackup,
  exportBomConfigToExcel,
  downloadExcelTemplate,
  parseBomConfigExcel,
  parseJsonBackup,
  applyConfigImport,
  hasUndoSnapshot,
  restoreUndoSnapshot,
  getLastBackupTime,
} from '@/lib/backup-restore';
import { useMaterialStore } from '@/lib/stores/useMaterialStore';
import { useProductStore } from '@/lib/stores/useProductStore';
import { useBomStore } from '@/lib/stores/useBomStore';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import { ParsedConfigPreview, ImportMode } from '@/lib/types';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);

  // Thống kê hiện tại
  const materials = useMaterialStore((s) => s.materials);
  const products = useProductStore((s) => s.products);
  const bomItems = useBomStore((s) => s.bomItems);
  const projects = useProjectStore((s) => s.projects);

  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  // State cho việc nạp file
  const [preview, setPreview] = useState<ParsedConfigPreview | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'excel' | 'json' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setLastBackup(getLastBackupTime());
    setCanUndo(hasUndoSnapshot());
  }, []);

  if (!mounted) {
    return <div className="p-8 text-center text-slate-500">Đang tải trang thiết lập...</div>;
  }

  // Xử lý nạp file Excel
  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setNotification(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseBomConfigExcel(buffer);
      setPreview(result);
      setFileName(file.name);
      setFileType('excel');
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Lỗi đọc file Excel: ${(err as Error).message}`,
      });
    } finally {
      setIsProcessing(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  // Xử lý nạp file JSON
  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setNotification(null);
    try {
      const text = await file.text();
      const result = parseJsonBackup(text);
      if (!result.valid || !result.preview) {
        setNotification({
          type: 'error',
          message: result.error || 'File JSON không hợp lệ!',
        });
      } else {
        setPreview(result.preview);
        setFileName(file.name);
        setFileType('json');
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Lỗi đọc file JSON: ${(err as Error).message}`,
      });
    } finally {
      setIsProcessing(false);
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  // Áp dụng nạp dữ liệu
  const handleConfirmImport = () => {
    if (!preview) return;

    if (importMode === 'overwrite') {
      if (
        !confirm(
          'CẢNH BÁO GHI ĐÈ TOÀN BỘ:\n\nToàn bộ danh mục vật tư, sản phẩm và định mức BOM hiện tại sẽ bị thay thế bằng dữ liệu trong file.\n\nBạn có chắc chắn muốn tiếp tục?'
        )
      ) {
        return;
      }
    }

    const res = applyConfigImport(preview.data, importMode);
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
      setPreview(null);
      setCanUndo(true);
      setLastBackup(getLastBackupTime());
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  // Hoàn tác lần nạp gần nhất
  const handleUndo = () => {
    if (confirm('Khôi phục lại toàn bộ dữ liệu trước lần nạp gần nhất?')) {
      const success = restoreUndoSnapshot();
      if (success) {
        setCanUndo(false);
        setNotification({
          type: 'success',
          message: 'Đã hoàn tác thành công về trạng thái trước đó!',
        });
      } else {
        setNotification({
          type: 'error',
          message: 'Không thể khôi phục bản sao lưu hoàn tác.',
        });
      }
    }
  };

  // Khôi phục dữ liệu mẫu
  const handleResetToDefault = () => {
    if (confirm('Khôi phục toàn bộ hệ thống về dữ liệu mẫu mặc định ban đầu?')) {
      useMaterialStore.getState().resetToDefault();
      useProductStore.getState().resetToDefault();
      useBomStore.getState().resetToDefault();
      useProjectStore.getState().resetToDefault();
      setNotification({
        type: 'success',
        message: 'Đã khôi phục toàn bộ hệ thống về dữ liệu mẫu mặc định!',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. HEADER & THỐNG KÊ HIỆN TRẠNG */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <HardDriveDownload className="w-7 h-7 text-amber-500" />
            <span>Lưu & Nạp Cấu Hình Định Mức</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sao lưu toàn bộ hệ thống, xuất/nạp định mức BOM bằng Excel và quản lý phiên bản dữ liệu an toàn.
          </p>
        </div>

        {/* Trạng thái sao lưu */}
        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <span className="text-slate-400 block">Sao lưu lần cuối:</span>
            <span className="font-bold text-slate-800">
              {lastBackup ? new Date(lastBackup).toLocaleString('vi-VN') : 'Chưa có bản sao lưu'}
            </span>
          </div>

          {canUndo && (
            <button
              onClick={handleUndo}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors"
              title="Quay lại trạng thái trước lần nạp gần nhất"
            >
              <Undo2 className="w-4 h-4 text-amber-600" />
              <span>Hoàn tác lần nạp</span>
            </button>
          )}
        </div>
      </div>

      {/* Thẻ đếm dữ liệu hiện tại */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{materials.length}</div>
            <div className="text-xs text-slate-500">Vật tư trong kho</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Armchair className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{products.length}</div>
            <div className="text-xs text-slate-500">Sản phẩm mẫu</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{bomItems.length}</div>
            <div className="text-xs text-slate-500">Dòng định mức BOM</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{projects.length}</div>
            <div className="text-xs text-slate-500">Công trình dự án</div>
          </div>
        </div>
      </div>

      {/* Thông báo kết quả */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL / KHU VỰC XEM TRƯỚC FILE CHUẨN BỊ NẠP (PREVIEW DIFF)             */}
      {/* ========================================================================= */}
      {preview && (
        <div className="bg-white rounded-xl border-2 border-amber-400 shadow-md p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                Xem trước cấu hình trước khi nạp
              </span>
              <h3 className="font-black text-slate-900 text-lg mt-1 flex items-center gap-2">
                <span>File: {fileName}</span>
                <span className="text-xs font-normal text-slate-500 uppercase">({fileType})</span>
              </h3>
            </div>
            <button
              onClick={() => setPreview(null)}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold px-2 py-1 rounded"
            >
              Hủy nạp
            </button>
          </div>

          {/* Số liệu đối chiếu */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Vật tư trong file:</span>
              <strong className="text-slate-900 text-sm">{preview.materialsCount} loại</strong>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                +{preview.newMaterialsCount} mới • {preview.updatedMaterialsCount} cập nhật
              </div>
            </div>

            <div>
              <span className="text-slate-500 block">Sản phẩm mẫu:</span>
              <strong className="text-slate-900 text-sm">{preview.productsCount} loại</strong>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                +{preview.newProductsCount} mới • {preview.updatedProductsCount} cập nhật
              </div>
            </div>

            <div>
              <span className="text-slate-500 block">Định mức BOM:</span>
              <strong className="text-slate-900 text-sm">{preview.bomCount} dòng</strong>
              <div className="text-[11px] text-slate-500 mt-0.5">Liên kết theo mã SP & VT</div>
            </div>

            {preview.projectsCount !== undefined && (
              <div>
                <span className="text-slate-500 block">Công trình kèm theo:</span>
                <strong className="text-slate-900 text-sm">{preview.projectsCount} công trình</strong>
                <div className="text-[11px] text-purple-700 mt-0.5">Kèm sản phẩm & BOM riêng</div>
              </div>
            )}
          </div>

          {/* Cảnh báo / Lỗi nếu có */}
          {preview.issues.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1 max-h-40 overflow-y-auto">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Phát hiện {preview.issues.length} lưu ý / cảnh báo:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                {preview.issues.map((iss, i) => (
                  <li key={i}>
                    {iss.sheet && <strong>[{iss.sheet}] </strong>}
                    {iss.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Chọn chế độ nạp */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">Chọn Chế Độ Nạp:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  importMode === 'merge'
                    ? 'bg-amber-50 border-amber-400 font-bold text-amber-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>1. Gộp theo mã (Khuyến nghị)</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal mt-1 pl-5">
                  Cập nhật các mã đã có, thêm các mã mới. Không làm mất dữ liệu hiện tại.
                </p>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  importMode === 'add_only'
                    ? 'bg-amber-50 border-amber-400 font-bold text-amber-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="importMode"
                    value="add_only"
                    checked={importMode === 'add_only'}
                    onChange={() => setImportMode('add_only')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>2. Chỉ thêm mới</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal mt-1 pl-5">
                  Chỉ nạp những mã chưa tồn tại. Bỏ qua các mã đã có trong hệ thống.
                </p>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  importMode === 'overwrite'
                    ? 'bg-red-50 border-red-400 font-bold text-red-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="importMode"
                    value="overwrite"
                    checked={importMode === 'overwrite'}
                    onChange={() => setImportMode('overwrite')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>3. Ghi đè toàn bộ</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal mt-1 pl-5">
                  Xóa toàn bộ danh mục cũ và thay thế hoàn toàn bằng file này.
                </p>
              </label>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              * Hệ thống luôn tự động chụp 1 bản snapshot để bạn có thể hoàn tác ngay nếu cần.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
              >
                Xác Nhận Nạp Cấu Hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. HAI KHU VỰC THAO TÁC: EXCEL ĐỊNH MỨC & FULL JSON BACKUP                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KHU VỰC 1: QUẢN LÝ ĐỊNH MỨC BẰNG EXCEL (CHO PHÒNG KỸ THUẬT) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <FileSpreadsheet className="w-6 h-6" />
                <h3 className="font-black text-slate-900 text-base">Soạn & Nạp Định Mức Excel (.xlsx)</h3>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[11px] font-bold border border-emerald-200">
                Chuẩn 3 Sheet
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Dành cho phòng kỹ thuật: có thể soạn định mức hàng loạt trên Excel, xuất file hiện tại để chỉnh sửa hoặc nạp file BOM từ dự án khác.
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 mb-5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                <span>Cấu trúc file Excel gồm 3 sheet:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                <li><strong>Sheet 1 (VatTu):</strong> Mã, Tên, Nhóm, ĐVT, % Hao hụt, Quy cách, Trọng lượng.</li>
                <li><strong>Sheet 2 (SanPham):</strong> Mã SP, Tên sản phẩm, Phân loại, Mô tả.</li>
                <li><strong>Sheet 3 (DinhMucBOM):</strong> Mã SP, Mã VT, Định mức cho 1 SP, % Hao hụt riêng.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Tải File Excel Mẫu Trống</span>
              </button>

              <button
                type="button"
                onClick={exportBomConfigToExcel}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Xuất Định Mức Ra Excel</span>
              </button>
            </div>

            <div>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelFileChange}
                className="hidden"
                id="excel-file-upload"
              />
              <label
                htmlFor="excel-file-upload"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Nạp Cấu Hình Định Mức Từ File Excel</span>
              </label>
            </div>
          </div>
        </div>

        {/* KHU VỰC 2: SAO LƯU & KHÔI PHỤC TOÀN BỘ (JSON) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-blue-700">
                <HardDriveDownload className="w-6 h-6" />
                <h3 className="font-black text-slate-900 text-base">Sao Lưu Toàn Bộ Hệ Thống (.json)</h3>
              </div>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded text-[11px] font-bold border border-blue-200">
                Full Backup
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Dùng khi muốn chuyển máy tính, đổi trình duyệt hoặc tạo bản sao lưu định kỳ để không bao giờ bị mất dữ liệu khi xóa cache.
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 mb-5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Gói sao lưu JSON bao gồm:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                <li>Toàn bộ danh mục Vật tư và Quy cách đóng gói.</li>
                <li>Thư viện Sản phẩm mẫu và toàn bộ định mức BOM.</li>
                <li>Danh sách Công trình, các sản phẩm theo ký hiệu riêng và BOM đóng băng.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const backup = createAppBackup(false);
                  downloadJsonBackup(backup, `DinhMuc_Chuan_${new Date().toISOString().slice(0, 10)}.json`);
                  setLastBackup(getLastBackupTime());
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                title="Chỉ xuất Vật tư, Sản phẩm và BOM (không kèm công trình)"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Xuất JSON (Chỉ Định Mức)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const backup = createAppBackup(true);
                  downloadJsonBackup(backup);
                  setLastBackup(getLastBackupTime());
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                title="Xuất toàn bộ hệ thống gồm cả công trình và BOM riêng"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất JSON (Toàn Bộ App)</span>
              </button>
            </div>

            <div>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json"
                onChange={handleJsonFileChange}
                className="hidden"
                id="json-file-upload"
              />
              <label
                htmlFor="json-file-upload"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Khôi Phục Hệ Thống Từ File JSON</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. KHU VỰC QUẢN LÝ DỮ LIỆU NGUY CƠ CAO (RESET)                            */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
            Khôi Phục Dữ Liệu Mẫu Mặc Định
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Xóa toàn bộ các tùy chỉnh và nạp lại 6 vật tư, 3 sản phẩm và 2 công trình mẫu ban đầu của hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetToDefault}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-red-500" />
          <span>Khôi Phục Dữ Liệu Mẫu</span>
        </button>
      </div>
    </div>
  );
}
