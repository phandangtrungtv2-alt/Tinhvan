'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProductStore } from '@/lib/stores/useProductStore';
import { useMaterialStore } from '@/lib/stores/useMaterialStore';
import { useBomStore } from '@/lib/stores/useBomStore';
import { calcMaterial, calcProductWeight } from '@/lib/calc';
import { formatNumber, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/format';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  AlertTriangle,
  Scale,
  Boxes,
  HelpCircle,
  Package,
} from 'lucide-react';

function BomBuilderContent() {
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('productId') || '';

  const products = useProductStore((s) => s.products);
  const materials = useMaterialStore((s) => s.materials);
  const bomItems = useBomStore((s) => s.bomItems);
  const addBomItem = useBomStore((s) => s.addBomItem);
  const updateBomItem = useBomStore((s) => s.updateBomItem);
  const deleteBomItem = useBomStore((s) => s.deleteBomItem);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || (products.length > 0 ? products[0].id : '')
  );

  // Form thêm vật tư vào BOM
  const [newMaterialId, setNewMaterialId] = useState<string>('');
  const [newNetQty, setNewNetQty] = useState<number>(1);
  const [newWasteOverride, setNewWasteOverride] = useState<string>(''); // chuỗi rỗng = null

  useEffect(() => {
    if (initialProductId && products.some((p) => p.id === initialProductId)) {
      setSelectedProductId(initialProductId);
    } else if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [initialProductId, products, selectedProductId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentBoms = bomItems.filter((b) => b.product_id === selectedProductId);

  // Yêu cầu 3 & 4: Tính Trọng lượng NVL cho 1 sản phẩm (Không cần tính giá tiền)
  const previewRows = currentBoms.map((bom) => {
    const mat = materials.find((m) => m.id === bom.material_id);
    if (!mat) return null;

    const calc = calcMaterial(mat, bom.net_quantity_per_unit, bom.waste_rate_override);
    const weightPerUnit = mat.weight_per_unit || 0;
    const itemWeight = Number((bom.net_quantity_per_unit * weightPerUnit).toFixed(2));

    return {
      bomId: bom.id,
      material: mat,
      netQty: bom.net_quantity_per_unit,
      wasteRateOverride: bom.waste_rate_override,
      effectiveWasteRate: calc.wasteRate,
      grossQty: calc.grossQty,
      weightPerUnit,
      itemWeight,
    };
  }).filter(Boolean);

  const totalWeight1Unit = Number(previewRows.reduce((acc, row) => acc + (row?.itemWeight || 0), 0).toFixed(2));

  const handleAddMaterialToBom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('Vui lòng chọn sản phẩm');
      return;
    }
    if (!newMaterialId) {
      alert('Vui lòng chọn vật tư cần thêm');
      return;
    }
    if (newNetQty <= 0) {
      alert('Định mức tiêu hao tinh (Net) phải lớn hơn 0');
      return;
    }

    // Kiểm tra nếu vật tư đã có trong BOM của sản phẩm này
    const exists = currentBoms.some((b) => b.material_id === newMaterialId);
    if (exists) {
      alert('Vật tư này đã có trong BOM của sản phẩm. Bạn có thể sửa trực tiếp số lượng ở bảng bên dưới.');
      return;
    }

    const overrideVal = newWasteOverride.trim() !== '' ? Number(newWasteOverride) : null;
    if (overrideVal !== null && overrideVal < 0) {
      alert('Tỷ lệ hao hụt không được âm');
      return;
    }

    addBomItem({
      product_id: selectedProductId,
      material_id: newMaterialId,
      net_quantity_per_unit: newNetQty,
      waste_rate_override: overrideVal,
    });

    // Reset input
    setNewMaterialId('');
    setNewNetQty(1);
    setNewWasteOverride('');
  };

  const handleUpdateNet = (bomId: string, value: string) => {
    const num = Math.max(0, Number(value) || 0);
    updateBomItem(bomId, { net_quantity_per_unit: num });
  };

  const handleUpdateOverride = (bomId: string, value: string) => {
    if (value.trim() === '') {
      updateBomItem(bomId, { waste_rate_override: null });
    } else {
      const num = Math.max(0, Math.min(100, Number(value) || 0));
      updateBomItem(bomId, { waste_rate_override: num });
    }
  };

  const handleDeleteBom = (bomId: string, matName: string) => {
    if (confirm(`Xóa vật tư "${matName}" khỏi định mức sản phẩm này?`)) {
      deleteBomItem(bomId);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cấu hình Định mức BOM (Bill of Materials)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bóc tách định mức vật tư tiêu chuẩn trên 1 đơn vị sản phẩm & tự động tính tổng trọng lượng thành phẩm
          </p>
        </div>

        {/* Bộ chọn sản phẩm & Nút Nhập/Xuất Excel */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
            title="Soạn thảo, nạp hoặc xuất toàn bộ bảng định mức BOM qua Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nhập / Xuất Excel</span>
          </Link>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Chọn SP:</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="px-3 py-2 text-xs font-bold text-slate-800 bg-amber-50 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.product_code} — {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Thông báo hợp nhất sang Thư viện Định mức Mẫu */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-700 rounded-lg shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>Đã có giao diện hợp nhất: Thư viện Định mức Mẫu</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-slate-950 font-bold rounded">Mới</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Xem toàn bộ danh mục sản phẩm kèm bảng BOM trực tiếp, nhân bản mẫu và áp dụng tức thì vào công trình đang thi công.
            </p>
          </div>
        </div>
        <Link
          href="/templates"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-xs shrink-0"
        >
          <span>Mở Thư viện Định mức Mẫu</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {selectedProduct ? (
        <div className="space-y-6">
          {/* Thông tin sản phẩm được chọn & Thẻ Preview Trọng Lượng Sản Phẩm (Yêu cầu 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                    {selectedProduct.product_code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{selectedProduct.name}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">{selectedProduct.description || 'Chưa có ghi chú quy cách'}</p>
                <div className="mt-2 text-xs text-slate-600">
                  Phân loại: <strong className="text-slate-800">{selectedProduct.category}</strong> • Định mức hiện tại: <strong className="text-slate-800">{currentBoms.length}</strong> loại vật tư
                </div>
              </div>
            </div>

            {/* Yêu cầu 3: Trọng lượng ước tính cho 1 sản phẩm */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-5 rounded-xl border-2 border-amber-500/40 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Trọng Lượng / 1 Sản Phẩm
                </span>
                <Scale className="w-5 h-5 text-amber-600" />
              </div>
              <div className="my-2">
                <div className="text-3xl font-black text-amber-600">
                  {formatNumber(totalWeight1Unit, 2)} <span className="text-base font-bold text-slate-600">kg</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tự động tính từ định mức Net × trọng lượng vật tư
                </div>
              </div>
            </div>
          </div>

          {/* Form thêm vật tư vào BOM */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Thêm Vật tư vào định mức sản phẩm {selectedProduct.product_code}</span>
            </h4>

            <form onSubmit={handleAddMaterialToBom} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn vật tư *
                </label>
                <select
                  required
                  value={newMaterialId}
                  onChange={(e) => setNewMaterialId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Chọn loại vật tư --</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.material_code}] {m.name} ({m.base_unit}{m.weight_per_unit ? ` - ${m.weight_per_unit}kg/${m.base_unit}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Định mức tinh (Net) / 1 SP *
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={newNetQty}
                  onChange={(e) => setNewNetQty(Number(e.target.value) || 0)}
                  placeholder="VD: 1.8"
                  className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1" title="Để trống nếu lấy theo % hao hụt mặc định của vật tư">
                  Ghi đè % hao hụt
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={newWasteOverride}
                  onChange={(e) => setNewWasteOverride(e.target.value)}
                  placeholder="Mặc định"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-xs"
                >
                  + Thêm Vào BOM
                </button>
              </div>
            </form>
          </div>

          {/* Bảng chi tiết định mức BOM & Trọng lượng */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h4 className="font-bold text-slate-800 text-sm">
                Bảng Bóc Tách Định Mức Tiêu Hao Vật Tư ({currentBoms.length} vật tư)
              </h4>
              <span className="text-xs text-slate-500">
                Cho 1 sản phẩm: <strong className="text-slate-800">{selectedProduct.name}</strong>
              </span>
            </div>

            {currentBoms.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">Sản phẩm này chưa có định mức BOM</p>
                <p className="text-xs text-slate-400 mt-1">
                  Vui lòng thêm vật tư vào bảng định mức ở phía trên để hệ thống có thể tính toán bóc tách công trình.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">STT</th>
                      <th className="py-3 px-4 w-32">Mã VT</th>
                      <th className="py-3 px-4 min-w-[220px]">Tên Vật Tư</th>
                      <th className="py-3 px-3 w-32">Nhóm</th>
                      <th className="py-3 px-3 w-20 text-center">ĐVT</th>
                      <th className="py-3 px-4 w-36 text-right">Net Định Mức / 1 SP</th>
                      <th className="py-3 px-4 w-36 text-center">% Hao Hụt</th>
                      <th className="py-3 px-4 w-32 text-right">Gross (Thô)</th>
                      <th className="py-3 px-4 w-36 text-right">Khối Lượng ĐV (Kg/ĐVT)</th>
                      <th className="py-3 px-4 w-36 text-right font-bold text-slate-800">Trọng Lượng (Kg) / 1 SP</th>
                      <th className="py-3 px-4 w-16 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, idx) => {
                      if (!row) return null;
                      const { bomId, material, netQty, wasteRateOverride, grossQty, weightPerUnit, itemWeight } = row;
                      const colorConfig = CATEGORY_COLORS[material.category] || CATEGORY_COLORS.consumable;

                      return (
                        <tr key={bomId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {material.material_code}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {material.name}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${colorConfig.badge}`}>
                              {CATEGORY_LABELS[material.category] || material.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-600">
                            {material.base_unit}
                          </td>

                          {/* Sửa Net */}
                          <td className="py-2 px-4 text-right">
                            <div className="inline-flex items-center justify-end bg-white border border-slate-300 rounded px-2 py-1 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500">
                              <input
                                type="number"
                                min="0.001"
                                step="any"
                                defaultValue={netQty}
                                onBlur={(e) => handleUpdateNet(bomId, e.target.value)}
                                className="w-20 text-right text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                              />
                            </div>
                          </td>

                          {/* Sửa % Hao Hụt Override */}
                          <td className="py-2 px-4 text-center">
                            <div className="inline-flex items-center justify-center bg-white border border-slate-300 rounded px-2 py-1 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500" title={wasteRateOverride !== null ? 'Đang dùng tỷ lệ ghi đè' : `Mặc định của vật tư: ${material.default_waste_rate}%`}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                placeholder={`${material.default_waste_rate}%`}
                                defaultValue={wasteRateOverride !== null ? wasteRateOverride : ''}
                                onBlur={(e) => handleUpdateOverride(bomId, e.target.value)}
                                className="w-14 text-center text-xs font-bold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                              />
                              <span className="text-slate-400 text-xs">%</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {formatNumber(grossQty, 3)}
                          </td>

                          <td className="py-3 px-4 text-right text-slate-500 font-mono">
                            {weightPerUnit > 0 ? `${formatNumber(weightPerUnit, 3)} kg` : '-'}
                          </td>

                          {/* Trọng lượng cho 1 SP */}
                          <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                            {itemWeight > 0 ? `${formatNumber(itemWeight, 2)} kg` : '-'}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteBom(bomId, material.name)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Xóa vật tư này khỏi định mức"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50/70 border-t-2 border-amber-200 font-bold">
                      <td colSpan={9} className="py-3 px-4 text-right text-slate-800">
                        TỔNG TRỌNG LƯỢNG ƯỚC TÍNH CHO 1 {selectedProduct.name.toUpperCase()}:
                      </td>
                      <td className="py-3 px-4 text-right text-amber-700 text-sm font-black font-mono">
                        {formatNumber(totalWeight1Unit, 2)} kg
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
          Chưa có sản phẩm nào. Vui lòng thêm sản phẩm trước.
        </div>
      )}
    </div>
  );
}

export default function BomPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải cấu hình BOM...</div>}>
      <BomBuilderContent />
    </Suspense>
  );
}
