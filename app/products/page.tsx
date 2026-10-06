'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProductStore } from '@/lib/stores/useProductStore';
import { useMaterialStore } from '@/lib/stores/useMaterialStore';
import { useBomStore } from '@/lib/stores/useBomStore';
import { calcProductWeight } from '@/lib/calc';
import { Product } from '@/lib/types';
import {
  Armchair,
  Plus,
  Edit2,
  Trash2,
  Search,
  FileSpreadsheet,
  AlertTriangle,
  X,
  PackageCheck,
  Scale,
} from 'lucide-react';

export default function ProductsPage() {
  const [mounted, setMounted] = useState(false);
  const products = useProductStore((s) => s.products);
  const addProduct = useProductStore((s) => s.addProduct);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const deleteProduct = useProductStore((s) => s.deleteProduct);

  const bomItems = useBomStore((s) => s.bomItems);
  const materials = useMaterialStore((s) => s.materials);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<{
    product_code: string;
    name: string;
    category: string;
    description: string;
  }>({
    product_code: '',
    name: '',
    category: 'Tủ văn phòng',
    description: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-8 text-center text-slate-500">
        Đang tải danh mục sản phẩm...
      </div>
    );
  }

  const filteredProducts = products.filter(
    (p) =>
      p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      product_code: `SP-${Date.now().toString().slice(-3)}`,
      name: '',
      category: 'Tủ văn phòng',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      product_code: p.product_code,
      name: p.name,
      category: p.category,
      description: p.description,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_code.trim() || !formData.name.trim()) {
      alert('Vui lòng nhập mã và tên sản phẩm');
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, formData);
    } else {
      addProduct(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}"? Định mức BOM đi kèm có thể bị ảnh hưởng.`)) {
      deleteProduct(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Danh mục Sản phẩm Nội thất</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thành phẩm, module sản xuất và liên kết với định mức bóc tách vật tư (BOM)
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Sản Phẩm Mới</span>
        </button>
      </div>

      {/* Thông báo hợp nhất sang Thư viện Định mức Mẫu */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-700 rounded-lg shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>Đã có giao diện hợp nhất: Thư viện Định mức Mẫu</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-slate-950 font-bold rounded">Mới</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Quản lý sản phẩm và định mức BOM trong cùng 1 màn hình trực quan, nhân bản và áp dụng nhanh vào công trình.
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

      {/* Tìm kiếm */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã, tên hoặc phân loại sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Tổng số: <strong className="text-slate-800">{products.length}</strong> sản phẩm
        </div>
      </div>

      {/* Danh sách thẻ sản phẩm và bảng */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const productBoms = bomItems.filter((b) => b.product_id === product.id);
          const hasBom = productBoms.length > 0;

          return (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {product.product_code}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                      {product.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                      title="Sửa sản phẩm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Xóa sản phẩm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-2.5">
                  {product.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {product.description || 'Không có mô tả chi tiết'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hasBom ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{productBoms.length} loại VT</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Chưa có BOM</span>
                    </span>
                  )}

                  {(() => {
                    const weight = calcProductWeight(productBoms, materials);
                    return weight > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Scale className="w-3.5 h-3.5 text-slate-500" />
                        <span>~{weight} kg</span>
                      </span>
                    ) : null;
                  })()}
                </div>

                <Link
                  href={`/bom?productId=${product.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Cấu hình BOM</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Thêm/Sửa Sản phẩm */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingProduct ? 'Cập nhật Sản phẩm' : 'Thêm Sản phẩm mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã sản phẩm *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value.toUpperCase() })}
                    placeholder="VD: TC1"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phân loại
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="VD: Tủ văn phòng / Bàn làm việc"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên sản phẩm *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Tủ tài liệu 2 cánh mở"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả quy cách / kích thước
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kích thước W800xD400xH1200, tiêu chuẩn gỗ MDF 17mm..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

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
                  {editingProduct ? 'Lưu Thay Đổi' : 'Thêm Sản Phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
