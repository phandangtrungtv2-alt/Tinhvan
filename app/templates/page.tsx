'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Layers,
  Boxes,
  Building2,
  Scale,
  Search,
  Check,
  X,
  ArrowRight,
  Sparkles,
  Info,
  ShieldCheck,
  BookmarkCheck,
} from 'lucide-react';
import { useProductStore } from '@/lib/stores/useProductStore';
import { useMaterialStore } from '@/lib/stores/useMaterialStore';
import { useBomStore } from '@/lib/stores/useBomStore';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import { Product, ProductBom } from '@/lib/types';
import { formatNumber, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/format';

export default function TemplatesPage() {
  const [mounted, setMounted] = useState(false);

  const products = useProductStore((s) => s.products);
  const addProduct = useProductStore((s) => s.addProduct);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const deleteProduct = useProductStore((s) => s.deleteProduct);

  const materials = useMaterialStore((s) => s.materials);
  const bomItems = useBomStore((s) => s.bomItems);
  const addBomItem = useBomStore((s) => s.addBomItem);
  const deleteBomItem = useBomStore((s) => s.deleteBomItem);
  const setProductBom = useBomStore((s) => s.setProductBom);

  const projects = useProjectStore((s) => s.projects);
  const addProjectProduct = useProjectStore((s) => s.addProjectProduct);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal Thêm/Sửa Mẫu Đồ Nội Thất
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Product | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Tủ văn phòng');
  const [formDescription, setFormDescription] = useState('');
  const [formBoms, setFormBoms] = useState<{ material_id: string; net_quantity_per_unit: number; waste_rate_override: number | null }[]>([]);

  // Modal Áp Dụng Mẫu Vào Công Trình
  const [applyTemplate, setApplyTemplate] = useState<Product | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string>('');
  const [applyItemCode, setApplyItemCode] = useState('');
  const [applyItemName, setApplyItemName] = useState('');
  const [applyDimensions, setApplyDimensions] = useState('');
  const [applyQuantity, setApplyQuantity] = useState<number>(1);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (projects.length > 0) {
      setTargetProjectId(projects[0].id);
    }
  }, [projects]);

  if (!mounted) {
    return <div className="p-8 text-center text-slate-500">Đang tải Thư viện Định mức Mẫu...</div>;
  }

  // Danh mục phân loại duy nhất
  const categories = Array.from(new Set(products.map((p) => p.category || 'Khác')));

  // Lọc sản phẩm
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // Tính trọng lượng thành phẩm 1 cái
  const calculateUnitWeight = (productId: string) => {
    const boms = bomItems.filter((b) => b.product_id === productId);
    let totalWeight = 0;
    for (const b of boms) {
      const mat = materials.find((m) => m.id === b.material_id);
      if (mat?.weight_per_unit) {
        const waste = b.waste_rate_override ?? mat.default_waste_rate;
        const gross = b.net_quantity_per_unit * (1 + waste / 100);
        totalWeight += gross * mat.weight_per_unit;
      }
    }
    return Number(totalWeight.toFixed(1));
  };

  // Mở modal tạo mẫu mới
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormCode(`SP-${Date.now().toString().slice(-4)}`);
    setFormName('');
    setFormCategory('Tủ văn phòng');
    setFormDescription('');
    setFormBoms([]);
    setIsModalOpen(true);
  };

  // Mở modal sửa mẫu
  const handleOpenEdit = (p: Product) => {
    setEditingTemplate(p);
    setFormCode(p.product_code);
    setFormName(p.name);
    setFormCategory(p.category || 'Khác');
    setFormDescription(p.description || '');
    const currentBoms = bomItems.filter((b) => b.product_id === p.id);
    setFormBoms(
      currentBoms.map((b) => ({
        material_id: b.material_id,
        net_quantity_per_unit: b.net_quantity_per_unit,
        waste_rate_override: b.waste_rate_override,
      }))
    );
    setIsModalOpen(true);
  };

  // Nhân bản mẫu
  const handleDuplicate = (p: Product) => {
    const newCode = `${p.product_code}-COPY`;
    const newId = addProduct({
      product_code: newCode,
      name: `${p.name} (Bản sao)`,
      category: p.category,
      description: p.description,
    });
    const currentBoms = bomItems.filter((b) => b.product_id === p.id);
    for (const b of currentBoms) {
      addBomItem({
        product_id: newId,
        material_id: b.material_id,
        net_quantity_per_unit: b.net_quantity_per_unit,
        waste_rate_override: b.waste_rate_override,
      });
    }
  };

  // Xóa mẫu
  const handleDelete = (p: Product) => {
    if (confirm(`Bạn có chắc muốn xóa mẫu "${p.product_code} - ${p.name}" khỏi Thư viện?`)) {
      deleteProduct(p.id);
    }
  };

  // Lưu tạo/sửa mẫu
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      alert('Vui lòng nhập mã và tên mẫu sản phẩm!');
      return;
    }

    if (editingTemplate) {
      updateProduct(editingTemplate.id, {
        product_code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        category: formCategory.trim(),
        description: formDescription.trim(),
      });
      setProductBom(editingTemplate.id, formBoms);
    } else {
      const newId = addProduct({
        product_code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        category: formCategory.trim(),
        description: formDescription.trim(),
      });
      setProductBom(newId, formBoms);
    }

    setIsModalOpen(false);
  };

  // Mở modal Áp dụng vào Công trình
  const handleOpenApply = (p: Product) => {
    setApplyTemplate(p);
    setApplyItemCode(p.product_code);
    setApplyItemName(p.name);
    setApplyDimensions('');
    setApplyQuantity(1);
    setApplySuccessMessage(null);
  };

  // Xác nhận Áp dụng vào Công trình
  const handleConfirmApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyTemplate || !targetProjectId) return;

    const res = addProjectProduct({
      project_id: targetProjectId,
      item_code: applyItemCode.trim().toUpperCase(),
      item_name: applyItemName.trim(),
      dimensions: applyDimensions.trim(),
      template_id: applyTemplate.id,
      bom_mode: 'linked',
      quantity: Math.max(1, applyQuantity),
      note: `Áp dụng từ mẫu ${applyTemplate.product_code}`,
    });

    if (!res.success) {
      alert(res.error || 'Lỗi khi thêm vào công trình');
      return;
    }

    const targetProj = projects.find((pj) => pj.id === targetProjectId);
    setApplySuccessMessage(
      `Đã thêm thành công "${applyItemCode}" vào công trình "${targetProj?.name}"!`
    );
    setTimeout(() => {
      setApplyTemplate(null);
      setApplySuccessMessage(null);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. HEADER */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FileSpreadsheet className="w-7 h-7 text-amber-500" />
            <span>Thư Viện Định Mức Mẫu</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kho lưu trữ mẫu đồ nội thất chuẩn & định mức cấu tạo vật tư đã được bóc tách từ các công trình để tái sử dụng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
            title="Soạn thảo hoặc nhập xuất toàn bộ thư viện qua Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nhập / Xuất Excel</span>
          </Link>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Mẫu Định Mức Mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo điều hướng về Công trình & Dự án */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 text-blue-700 rounded-lg shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>Mô hình định mức mới: Lưu trữ trực tiếp trong từng Công Trình</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white font-bold rounded">Đề xuất</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Mỗi công trình sở hữu định mức BOM riêng cho từng món đồ. Khi tạo công trình mới, bạn có thể bấm <strong>"📥 Lấy từ công trình khác"</strong> để sao chép nhanh mọi đồ nội thất.
            </p>
          </div>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs shrink-0"
        >
          <span>Mở Công Trình & Dự Án</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* 2. BỘ LỌC & TÌM KIẾM */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã mẫu, tên đồ hoặc mô tả cấu tạo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. LƯỚI THẺ ĐỒ NỘI THẤT MẪU (GRID CARDS) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          <Boxes className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 text-base">Không tìm thấy mẫu đồ nội thất nào</h3>
          <p className="text-xs text-slate-400 mt-1">
            Hãy thử tìm kiếm với từ khóa khác hoặc bấm nút "+ Tạo Mẫu Định Mức Mới".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p) => {
            const pBoms = bomItems.filter((b) => b.product_id === p.id);
            const unitWeight = calculateUnitWeight(p.id);

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Phần trên của thẻ */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {p.product_code}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {p.category || 'Mẫu nội thất'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicate(p)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                        title="Nhân bản mẫu này"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                        title="Chỉnh sửa mẫu & định mức"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Xóa mẫu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">{p.name}</h3>
                  {p.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                  )}

                  {/* Thông số định mức & Trọng lượng */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      <span>{pBoms.length} loại vật tư cấu thành</span>
                    </div>

                    <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                      <Scale className="w-3.5 h-3.5 text-slate-400" />
                      <span>~{formatNumber(unitWeight, 1)} kg/cái</span>
                    </div>
                  </div>

                  {/* Danh sách vật tư thu nhỏ (Mini list) */}
                  <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 max-h-32 overflow-y-auto text-[11px]">
                    {pBoms.length === 0 ? (
                      <div className="text-slate-400 italic text-center py-1">Chưa cài đặt vật tư BOM</div>
                    ) : (
                      pBoms.map((b) => {
                        const mat = materials.find((m) => m.id === b.material_id);
                        return (
                          <div key={b.id} className="flex items-center justify-between text-slate-700">
                            <span className="truncate pr-2 font-medium">{mat?.name || mat?.material_code}</span>
                            <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
                              {b.net_quantity_per_unit} {mat?.base_unit}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Chân thẻ: Nút Áp Dụng Vào Công Trình */}
                <div className="p-3 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenApply(p)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Áp Dụng Vào Công Trình...</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TẠO / SỬA MẪU ĐỒ NỘI THẤT KÈM ĐỊNH MỨC TẠI CHỖ                   */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {editingTemplate ? 'Chỉnh Sửa Mẫu Định Mức' : 'Tạo Mẫu Định Mức Mới'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu trữ mẫu chuẩn vào Thư viện xưởng để dùng cho nhiều công trình
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã Sản Phẩm Mẫu: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên Đồ Nội Thất Mẫu: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tủ áo 4 cánh kịch trần"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phân Loại:</label>
                  <input
                    type="text"
                    placeholder="VD: Tủ áo, Tủ bếp, Bàn làm việc..."
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mô Tả Cấu Tạo:</label>
                  <input
                    type="text"
                    placeholder="VD: Kích thước chuẩn 2200x600x2600..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* BẢNG ĐỊNH MỨC VẬT TƯ CẤU THÀNH */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Định Mức Vật Tư Cấu Thành (BOM / 1 SP):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormBoms([
                        ...formBoms,
                        { material_id: materials[0]?.id || '', net_quantity_per_unit: 1, waste_rate_override: null },
                      ]);
                    }}
                    className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm vật tư</span>
                  </button>
                </div>

                {formBoms.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">
                    Chưa có vật tư nào trong định mức. Bấm "+ Thêm vật tư" để kê khai ván, nẹp, phụ kiện.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-10 text-center">STT</th>
                          <th className="p-2.5 min-w-[200px]">Vật Tư</th>
                          <th className="p-2.5 w-20 text-center">ĐVT</th>
                          <th className="p-2.5 w-28 text-center">Định Mức</th>
                          <th className="p-2.5 w-10 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formBoms.map((b, idx) => {
                          const mat = materials.find((m) => m.id === b.material_id);
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="p-2">
                                <select
                                  value={b.material_id}
                                  onChange={(e) => {
                                    const updated = [...formBoms];
                                    updated[idx].material_id = e.target.value;
                                    setFormBoms(updated);
                                  }}
                                  className="w-full text-xs border border-slate-300 rounded p-1"
                                >
                                  {materials.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.material_code} - {m.name} ({m.base_unit})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2 text-center font-medium text-slate-600">{mat?.base_unit || '-'}</td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={b.net_quantity_per_unit}
                                  onChange={(e) => {
                                    const updated = [...formBoms];
                                    updated[idx].net_quantity_per_unit = parseFloat(e.target.value) || 0;
                                    setFormBoms(updated);
                                  }}
                                  className="w-20 text-center text-xs font-bold border border-slate-300 rounded p-1"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setFormBoms(formBoms.filter((_, i) => i !== idx))}
                                  className="text-slate-400 hover:text-red-600 p-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                >
                  {editingTemplate ? 'Lưu Thay Đổi Mẫu' : 'Tạo Mẫu Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ÁP DỤNG MẪU VÀO CÔNG TRÌNH                                       */}
      {/* ========================================================================= */}
      {applyTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">Áp Dụng Mẫu Vào Công Trình</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đẩy mẫu {applyTemplate.product_code} ({applyTemplate.name}) vào công trình
                </p>
              </div>
              <button
                onClick={() => setApplyTemplate(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applySuccessMessage ? (
              <div className="p-8 text-center space-y-3">
                <Check className="w-12 h-12 text-emerald-600 mx-auto bg-emerald-50 rounded-full p-2" />
                <h4 className="font-bold text-slate-800 text-sm">{applySuccessMessage}</h4>
                <p className="text-xs text-slate-400">Đang đóng cửa sổ...</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmApply} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chọn Công Trình Cần Thi Công: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetProjectId}
                    onChange={(e) => setTargetProjectId(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  >
                    {projects.map((pj) => (
                      <option key={pj.id} value={pj.id}>
                        {pj.project_code} — {pj.name} ({pj.client_name || 'Khách vãng lai'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ký Hiệu Bản Vẽ: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={applyItemCode}
                      onChange={(e) => setApplyItemCode(e.target.value.toUpperCase())}
                      className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kích Thước (mm):
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 2200x600x2600"
                      value={applyDimensions}
                      onChange={(e) => setApplyDimensions(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên Gọi Theo Công Trình: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={applyItemName}
                    onChange={(e) => setApplyItemName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Lượng Cần Làm: <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      value={applyQuantity}
                      onChange={(e) => setApplyQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-28 text-center text-sm font-bold px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <span className="text-xs text-slate-500 font-medium">Cái</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setApplyTemplate(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm"
                  >
                    Xác Nhận Áp Dụng
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
