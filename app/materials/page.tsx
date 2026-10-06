'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMaterialStore } from '@/lib/stores/useMaterialStore';
import { Material, MaterialCategory, MaterialBaseUnit, MaterialRoundingMode } from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/format';
import {
  Boxes,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Search,
  X,
  Layers,
  Scale,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

const CATEGORY_ORDER: MaterialCategory[] = [
  'board',      // Ván gỗ công nghiệp
  'edge',       // Nẹp chỉ dán cạnh
  'hardware',   // Phụ kiện kim khí
  'accessory',  // Phụ kiện chức năng
  'consumable', // Vật tư tiêu hao
];

const CATEGORY_ICONS: Record<MaterialCategory, string> = {
  board: '🪵',
  edge: '📏',
  hardware: '🔩',
  accessory: '🗄️',
  consumable: '📦',
};

export default function MaterialsPage() {
  const [mounted, setMounted] = useState(false);
  const materials = useMaterialStore((s) => s.materials);
  const addMaterial = useMaterialStore((s) => s.addMaterial);
  const updateMaterial = useMaterialStore((s) => s.updateMaterial);
  const deleteMaterial = useMaterialStore((s) => s.deleteMaterial);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal thêm/sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    material_code: string;
    name: string;
    category: MaterialCategory;
    base_unit: MaterialBaseUnit;
    default_waste_rate: number;
    rounding_mode: MaterialRoundingMode;
    package_spec: {
      has_pack: boolean;
      pack_size: number;
      pack_unit_name: string;
    };
    unit_price: number;
    weight_per_unit: number;
  }>({
    material_code: '',
    name: '',
    category: 'board',
    base_unit: 'Tấm',
    default_waste_rate: 10,
    rounding_mode: 'ceil_integer',
    package_spec: {
      has_pack: false,
      pack_size: 1,
      pack_unit_name: 'Tấm',
    },
    unit_price: 0,
    weight_per_unit: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-8 text-center text-slate-500">
        Đang tải danh mục vật tư...
      </div>
    );
  }

  // Mở modal thêm vật tư mới
  const handleOpenAddModal = (presetCategory?: MaterialCategory) => {
    setEditingMaterial(null);
    const cat = presetCategory || (selectedCategory !== 'all' ? (selectedCategory as MaterialCategory) : 'board');

    let defaultUnit: MaterialBaseUnit = 'Tấm';
    let defaultRounding: MaterialRoundingMode = 'ceil_integer';
    let defaultPackName = 'Tấm';
    let defaultWeight = 31.5;

    if (cat === 'edge') {
      defaultUnit = 'Mét';
      defaultRounding = 'package';
      defaultPackName = 'Cuộn';
      defaultWeight = 0.025;
    } else if (cat === 'hardware') {
      defaultUnit = 'Cái';
      defaultRounding = 'package';
      defaultPackName = 'Hộp';
      defaultWeight = 0.085;
    } else if (cat === 'accessory') {
      defaultUnit = 'Bộ';
      defaultRounding = 'ceil_integer';
      defaultPackName = 'Bộ';
      defaultWeight = 0.75;
    } else if (cat === 'consumable') {
      defaultUnit = 'Kg';
      defaultRounding = 'exact';
      defaultPackName = 'Bình';
      defaultWeight = 1;
    }

    setFormData({
      material_code: `VT-${Date.now().toString().slice(-4)}`,
      name: '',
      category: cat,
      base_unit: defaultUnit,
      default_waste_rate: 10,
      rounding_mode: defaultRounding,
      package_spec: {
        has_pack: defaultRounding === 'package',
        pack_size: defaultRounding === 'package' ? 100 : 1,
        pack_unit_name: defaultPackName,
      },
      unit_price: 0,
      weight_per_unit: defaultWeight,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      material_code: material.material_code,
      name: material.name,
      category: material.category,
      base_unit: material.base_unit,
      default_waste_rate: material.default_waste_rate,
      rounding_mode: material.rounding_mode,
      package_spec: {
        has_pack: material.package_spec?.has_pack ?? (material.rounding_mode === 'package'),
        pack_size: material.package_spec?.pack_size ?? 1,
        pack_unit_name: material.package_spec?.pack_unit_name ?? material.base_unit,
      },
      unit_price: material.unit_price || 0,
      weight_per_unit: material.weight_per_unit || 0,
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.material_code.trim()) {
      alert('Vui lòng nhập mã và tên vật tư');
      return;
    }

    if (formData.default_waste_rate < 0 || formData.weight_per_unit < 0) {
      alert('Không được nhập số âm');
      return;
    }

    if (editingMaterial) {
      updateMaterial(editingMaterial.id, formData);
    } else {
      addMaterial(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa vật tư "${name}"?`)) {
      deleteMaterial(id);
    }
  };

  // Inline update handlers
  const handleInlineWasteChange = (id: string, value: string) => {
    const num = Math.max(0, Math.min(100, Number(value) || 0));
    updateMaterial(id, { default_waste_rate: num });
  };

  const handleInlineWeightChange = (id: string, value: string) => {
    const num = Math.max(0, Number(value) || 0);
    updateMaterial(id, { weight_per_unit: num });
  };

  const handleInlinePackSizeChange = (material: Material, value: string) => {
    const num = Math.max(1, Number(value) || 1);
    updateMaterial(material.id, {
      package_spec: {
        ...material.package_spec,
        has_pack: true,
        pack_size: num,
      },
    });
  };

  const handleInlinePackUnitChange = (material: Material, value: string) => {
    updateMaterial(material.id, {
      package_spec: {
        ...material.package_spec,
        pack_unit_name: value.trim() || material.base_unit,
      },
    });
  };

  // Lọc vật tư theo từ khóa tìm kiếm
  const searchFiltered = materials.filter((m) =>
    m.material_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Phân loại danh sách hiển thị
  // Nếu ở "all", gom theo từng cụm CATEGORY_ORDER
  // Nếu ở tab cụ thể, chỉ hiển thị cụm đó
  const displayCategories: MaterialCategory[] = selectedCategory === 'all'
    ? CATEGORY_ORDER
    : [selectedCategory as MaterialCategory];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Thanh tiêu đề và công cụ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Danh mục Vật tư & Quy cách Đặt hàng</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kê khai định mức hao hụt, quy cách đóng gói và trọng lượng (Kg) cho từng cụm vật tư ngành gỗ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
            title="Soạn thảo, nạp hoặc xuất danh mục vật tư qua Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nhập / Xuất Excel</span>
          </Link>

          {/* Yêu cầu 2: Đang ở mục "Tất cả" thì để nút thêm vật tư mới ở góc trên bên phải như hình */}
          {selectedCategory === 'all' && (
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm Vật Tư Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã hoặc tên vật tư..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({materials.length})
          </button>
          {CATEGORY_ORDER.map((catKey) => {
            const count = materials.filter((m) => m.category === catKey).length;
            const isSelected = selectedCategory === catKey;
            const icon = CATEGORY_ICONS[catKey];
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{icon}</span>
                <span>{CATEGORY_LABELS[catKey]} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* YÊU CẦU 1: GOM VẬT TƯ THEO CỤM (Ván gỗ -> Nẹp chỉ -> Phụ kiện kim khí -> Phụ kiện chức năng -> Tiêu hao) */}
      <div className="space-y-6">
        {displayCategories.map((catKey) => {
          const catMaterials = searchFiltered.filter((m) => m.category === catKey);
          const colorConfig = CATEGORY_COLORS[catKey] || CATEGORY_COLORS.consumable;
          const catIcon = CATEGORY_ICONS[catKey];
          const catLabel = CATEGORY_LABELS[catKey];

          // Nếu đang ở "all" và nhóm này không có vật tư nào khớp với tìm kiếm thì ẩn
          if (selectedCategory === 'all' && catMaterials.length === 0 && searchTerm) {
            return null;
          }

          return (
            <div
              key={catKey}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Header của cụm nhóm vật tư */}
              <div className={`px-5 py-3 border-b border-slate-200 flex items-center justify-between ${colorConfig.bg}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{catIcon}</span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                      Cụm {catLabel}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {catMaterials.length} mã vật tư trong cụm
                    </p>
                  </div>
                </div>

                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${colorConfig.badge}`}>
                  {catLabel}
                </span>
              </div>

              {/* Bảng danh sách vật tư của cụm */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-4 w-32">Mã VT</th>
                      <th className="py-2.5 px-4 min-w-[220px]">Tên Vật Tư</th>
                      <th className="py-2.5 px-3 w-28">Nhóm VT</th>
                      <th className="py-2.5 px-3 w-20 text-center">ĐVT</th>
                      <th className="py-2.5 px-3 w-32 text-center">% Hao Hụt</th>
                      <th className="py-2.5 px-3 w-36">Kiểu Làm Tròn</th>
                      <th className="py-2.5 px-4 min-w-[190px]">Quy Cách Đóng Gói</th>
                      {/* Yêu cầu 3: Cột Trọng lượng (Kg/ĐVT) thay cho Đơn giá thành tiền */}
                      <th className="py-2.5 px-4 w-36 text-right font-bold text-slate-800">
                        Trọng Lượng (Kg/ĐVT)
                      </th>
                      <th className="py-2.5 px-4 w-24 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {catMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          Chưa có vật tư nào trong cụm {catLabel}
                        </td>
                      </tr>
                    ) : (
                      catMaterials.map((material, idx) => {
                        const hasHighWaste = material.default_waste_rate > 30;
                        const missingPackSpec =
                          material.rounding_mode === 'package' &&
                          (!material.package_spec?.pack_size || material.package_spec.pack_size <= 0);

                        return (
                          <tr
                            key={material.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="py-3 px-3 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>

                            <td className="py-3 px-4 font-mono font-bold text-slate-800">
                              {material.material_code}
                            </td>

                            <td className="py-3 px-4 font-medium text-slate-900">
                              <div className="flex items-center gap-2">
                                <span>{material.name}</span>
                                {hasHighWaste && (
                                  <span
                                    title="Cảnh báo: % hao hụt cao (>30%)"
                                    className="inline-flex items-center text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-bold"
                                  >
                                    <AlertTriangle className="w-3 h-3 mr-0.5" />
                                    HH {material.default_waste_rate}%
                                  </span>
                                )}
                                {missingPackSpec && (
                                  <span
                                    title="Lỗi: Chế độ đóng gói nhưng chưa nhập quy cách gói!"
                                    className="inline-flex items-center text-red-600 bg-red-100 px-1.5 py-0.5 rounded text-[10px] font-bold"
                                  >
                                    <AlertTriangle className="w-3 h-3 mr-0.5" />
                                    Thiếu quy cách
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorConfig.badge}`}
                              >
                                {catLabel}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center font-semibold text-slate-700">
                              {material.base_unit}
                            </td>

                            {/* Inline edit % Hao hụt */}
                            <td className="py-2 px-3 text-center">
                              <div className="inline-flex items-center justify-center bg-white border border-slate-300 rounded px-2 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  defaultValue={material.default_waste_rate}
                                  onBlur={(e) => handleInlineWasteChange(material.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="w-12 text-center text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                                />
                                <span className="text-slate-400 text-xs font-medium">%</span>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-slate-600">
                              {material.rounding_mode === 'ceil_integer' && (
                                <span className="text-amber-700 font-medium">Nguyên tấm (Ceil)</span>
                              )}
                              {material.rounding_mode === 'package' && (
                                <span className="text-blue-700 font-medium">Theo kiện (Package)</span>
                              )}
                              {material.rounding_mode === 'exact' && (
                                <span className="text-slate-600">Lẻ chính xác (Exact)</span>
                              )}
                            </td>

                            {/* Inline edit Quy cách */}
                            <td className="py-2 px-4">
                              {material.rounding_mode === 'package' ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="1"
                                    defaultValue={material.package_spec?.pack_size || 1}
                                    onBlur={(e) => handleInlinePackSizeChange(material, e.target.value)}
                                    className="w-16 px-1.5 py-1 text-xs font-semibold text-right bg-white border border-slate-300 rounded focus:outline-none focus:border-amber-500"
                                    title="Số lượng đơn vị trong 1 kiện/hộp/cuộn"
                                  />
                                  <span className="text-slate-500">{material.base_unit}/</span>
                                  <input
                                    type="text"
                                    defaultValue={material.package_spec?.pack_unit_name || 'Hộp'}
                                    onBlur={(e) => handleInlinePackUnitChange(material, e.target.value)}
                                    className="w-16 px-1.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded focus:outline-none focus:border-amber-500"
                                    title="Tên kiện (Cuộn, Hộp, Bịch)"
                                  />
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Theo đơn vị {material.base_unit}</span>
                              )}
                            </td>

                            {/* Yêu cầu 3: Inline edit Trọng lượng (Kg/ĐVT) */}
                            <td className="py-2 px-4 text-right">
                              <div className="inline-flex items-center justify-end bg-white border border-slate-300 rounded px-2 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  defaultValue={material.weight_per_unit || 0}
                                  onBlur={(e) => handleInlineWeightChange(material.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="w-20 text-right text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                                />
                                <span className="text-slate-500 text-xs ml-1 font-semibold">kg</span>
                              </div>
                            </td>

                            {/* Thao tác */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEditModal(material)}
                                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition-colors"
                                  title="Sửa toàn bộ thông tin"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(material.id, material.name)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Xóa vật tư"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* YÊU CẦU 2: KHI TRỎ SANG CÁC MỤC KHÁC THÌ PHẦN THÊM MỚI NẰM DƯỚI CÁC BẢNG TƯƠNG ỨNG */}
              {selectedCategory !== 'all' && (
                <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => handleOpenAddModal(catKey)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Thêm Vật Tư Mới Vào Nhóm "{catLabel}"</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Thêm / Sửa vật tư */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingMaterial ? 'Cập nhật Vật tư' : `Thêm Vật tư mới (${CATEGORY_LABELS[formData.category]})`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã vật tư *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.material_code}
                    onChange={(e) => setFormData({ ...formData, material_code: e.target.value.toUpperCase() })}
                    placeholder="VD: MDF-17-MP"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cụm nhóm danh mục *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const cat = e.target.value as MaterialCategory;
                      let defaultUnit: MaterialBaseUnit = 'Tấm';
                      let defaultRounding: MaterialRoundingMode = 'ceil_integer';
                      let defaultPackName = 'Tấm';
                      let defaultWeight = 31.5;

                      if (cat === 'edge') {
                        defaultUnit = 'Mét';
                        defaultRounding = 'package';
                        defaultPackName = 'Cuộn';
                        defaultWeight = 0.025;
                      } else if (cat === 'hardware') {
                        defaultUnit = 'Cái';
                        defaultRounding = 'package';
                        defaultPackName = 'Hộp';
                        defaultWeight = 0.085;
                      } else if (cat === 'accessory') {
                        defaultUnit = 'Bộ';
                        defaultRounding = 'ceil_integer';
                        defaultPackName = 'Bộ';
                        defaultWeight = 0.75;
                      } else if (cat === 'consumable') {
                        defaultUnit = 'Kg';
                        defaultRounding = 'exact';
                        defaultPackName = 'Bình';
                        defaultWeight = 1;
                      }

                      setFormData({
                        ...formData,
                        category: cat,
                        base_unit: defaultUnit,
                        rounding_mode: defaultRounding,
                        package_spec: {
                          ...formData.package_spec,
                          pack_unit_name: defaultPackName,
                        },
                        weight_per_unit: defaultWeight,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  >
                    {CATEGORY_ORDER.map((k) => (
                      <option key={k} value={k}>
                        {CATEGORY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên vật tư *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: MDF chống ẩm 17mm Melamine Mộc Phát"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đơn vị tính gốc *
                  </label>
                  <select
                    value={formData.base_unit}
                    onChange={(e) => setFormData({ ...formData, base_unit: e.target.value as MaterialBaseUnit })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  >
                    <option value="Tấm">Tấm</option>
                    <option value="Mét">Mét</option>
                    <option value="Cái">Cái</option>
                    <option value="Bộ">Bộ</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    % Hao hụt chuẩn
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.default_waste_rate}
                    onChange={(e) => setFormData({ ...formData, default_waste_rate: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Yêu cầu 3: Trọng lượng định mức Kg/ĐVT */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trọng lượng (Kg/ĐVT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={formData.weight_per_unit}
                    onChange={(e) => setFormData({ ...formData, weight_per_unit: Number(e.target.value) || 0 })}
                    placeholder="VD: 31.5"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kiểu làm tròn khi đặt hàng
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`flex flex-col p-2.5 rounded-lg border cursor-pointer text-xs ${formData.rounding_mode === 'ceil_integer' ? 'border-amber-500 bg-amber-50 text-amber-950 font-semibold' : 'border-slate-200'}`}>
                    <input
                      type="radio"
                      name="rounding_mode"
                      value="ceil_integer"
                      checked={formData.rounding_mode === 'ceil_integer'}
                      onChange={() => setFormData({ ...formData, rounding_mode: 'ceil_integer' })}
                      className="sr-only"
                    />
                    <span>Nguyên tấm (Ceil)</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">Ván chỉ bán chẵn tấm</span>
                  </label>

                  <label className={`flex flex-col p-2.5 rounded-lg border cursor-pointer text-xs ${formData.rounding_mode === 'package' ? 'border-amber-500 bg-amber-50 text-amber-950 font-semibold' : 'border-slate-200'}`}>
                    <input
                      type="radio"
                      name="rounding_mode"
                      value="package"
                      checked={formData.rounding_mode === 'package'}
                      onChange={() => setFormData({ ...formData, rounding_mode: 'package' })}
                      className="sr-only"
                    />
                    <span>Đóng gói (Package)</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">Cuộn, hộp, bịch</span>
                  </label>

                  <label className={`flex flex-col p-2.5 rounded-lg border cursor-pointer text-xs ${formData.rounding_mode === 'exact' ? 'border-amber-500 bg-amber-50 text-amber-950 font-semibold' : 'border-slate-200'}`}>
                    <input
                      type="radio"
                      name="rounding_mode"
                      value="exact"
                      checked={formData.rounding_mode === 'exact'}
                      onChange={() => setFormData({ ...formData, rounding_mode: 'exact' })}
                      className="sr-only"
                    />
                    <span>Chính xác (Exact)</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">Lẻ 2 chữ số</span>
                  </label>
                </div>
              </div>

              {/* Chi tiết quy cách nếu là package */}
              {formData.rounding_mode === 'package' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-blue-900">
                    Quy cách đóng gói của nhà sản xuất:
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        Số lượng trong 1 kiện ({formData.base_unit})
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.package_spec.pack_size}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            package_spec: {
                              ...formData.package_spec,
                              has_pack: true,
                              pack_size: Math.max(1, Number(e.target.value) || 1),
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                        placeholder="VD: 100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        Tên gọi kiện đóng gói
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.package_spec.pack_unit_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            package_spec: {
                              ...formData.package_spec,
                              pack_unit_name: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                        placeholder="VD: Cuộn / Hộp / Bịch"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm transition-colors"
                >
                  {editingMaterial ? 'Lưu Thay Đổi' : 'Thêm Vật Tư'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
