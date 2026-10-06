'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import { useProductStore } from '@/lib/stores/useProductStore';
import { useMaterialStore } from '@/lib/stores/useMaterialStore';
import { useBomStore } from '@/lib/stores/useBomStore';
import { useProcurementStore } from '@/lib/stores/useProcurementStore';
import { ProjectProduct, ProjectStatus, Material } from '@/lib/types';
import {
  formatNumber,
  formatQtyDisplay,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '@/lib/format';
import {
  ArrowLeft,
  Calendar,
  Layers,
  AlertTriangle,
  ShoppingCart,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Check,
  X,
  Ruler,
  Boxes,
  Sliders,
  Sparkles,
  Download,
  CheckSquare,
  Square,
  Save,
} from 'lucide-react';
import { ImageUploadBox } from '@/components/common/ImageUploadBox';

export default function ProjectDetailClient({ initialId }: { initialId?: string }) {
  const params = useParams();
  const rawId = (params?.id as string) || initialId || '';
  const [projectId, setProjectId] = useState<string>(rawId);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const pIdx = parts.indexOf('projects');
      if (pIdx !== -1 && parts[pIdx + 1] && parts[pIdx + 1] !== projectId) {
        setProjectId(parts[pIdx + 1]);
      }
    }
  }, []);

  const [mounted, setMounted] = useState(false);

  // Zustand Stores
  const project = useProjectStore((s) => s.getProject(projectId));
  const updateProject = useProjectStore((s) => s.updateProject);
  const updateProjectStatus = useProjectStore((s) => s.updateProjectStatus);
  const projectProducts = useProjectStore((s) => s.getProjectProducts(projectId));
  const addProjectProduct = useProjectStore((s) => s.addProjectProduct);
  const updateProjectProduct = useProjectStore((s) => s.updateProjectProduct);
  const removeProjectProduct = useProjectStore((s) => s.removeProjectProduct);
  const updateProjectProductQty = useProjectStore((s) => s.updateProjectProductQty);
  const copyProductsFromProject = useProjectStore((s) => s.copyProductsFromProject);
  const duplicateProjectProduct = useProjectStore((s) => s.duplicateProjectProduct);
  const detachToCustomBom = useProjectStore((s) => s.detachToCustomBom);
  const getCustomBomItems = useProjectStore((s) => s.getCustomBomItems);
  const setCustomBomItems = useProjectStore((s) => s.setCustomBomItems);
  const allProjects = useProjectStore((s) => s.projects);

  const materials = useMaterialStore((s) => s.materials);
  const templateProducts = useProductStore((s) => s.products);
  const templateBomItems = useBomStore((s) => s.bomItems);
  const selectProjectBreakdown = useProcurementStore((s) => s.selectProjectBreakdown);

  // State: Slide-over Drawer chỉnh sửa định mức (BOM) bên phải
  const [drawerProduct, setDrawerProduct] = useState<ProjectProduct | null>(null);
  const [drawerBoms, setDrawerBoms] = useState<
    { material_id: string; net_quantity_per_unit: number; waste_rate_override: number | null }[]
  >([]);
  const [newBomMaterialId, setNewBomMaterialId] = useState<string>('');
  const [drawerSourceFurnitureId, setDrawerSourceFurnitureId] = useState<string>('');

  // State: Modal Thêm Đồ Nội Thất Mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [formItemCode, setFormItemCode] = useState('');
  const [formItemName, setFormItemName] = useState('');
  const [formDimensions, setFormDimensions] = useState('');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formImageUrl, setFormImageUrl] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State: Modal Lấy Đồ Nội Thất Từ Công Trình Khác
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceProjectId, setCopySourceProjectId] = useState<string>('');
  const [copySelectedProductIds, setCopySelectedProductIds] = useState<string[]>([]);
  const [copyQuantities, setCopyQuantities] = useState<Record<string, number>>({});

  // State: Modal Sửa Ký hiệu / Tên / Kích thước
  const [editingProduct, setEditingProduct] = useState<ProjectProduct | null>(null);
  const [editItemCode, setEditItemCode] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editDimensions, setEditDimensions] = useState('');
  const [editImageUrl, setEditImageUrl] = useState<string | undefined>(undefined);

  // Refs cho ô input số lượng nhảy Tab/Enter
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu công trình...</div>;
  }

  if (!project) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-lg mx-auto">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">Không tìm thấy công trình</h3>
        <p className="text-xs text-slate-500 mt-1">Công trình không tồn tại hoặc đã bị xóa.</p>
        <Link
          href="/projects"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách công trình</span>
        </Link>
      </div>
    );
  }

  const isCompleted = project.status === 'completed';

  // Tổng số lượng đồ nội thất thi công
  const totalProductsCount = projectProducts.reduce((acc, p) => acc + (p.quantity || 0), 0);

  // Lấy danh sách BOM của 1 sản phẩm
  const getProductBomList = (p: ProjectProduct) => {
    if (p.bom_mode === 'custom') {
      return getCustomBomItems(p.id);
    }
    if (p.template_id) {
      return templateBomItems.filter((b) => b.product_id === p.template_id);
    }
    return [];
  };

  // Tính trọng lượng ước tính của 1 sản phẩm (kg)
  const calculateUnitWeight = (p: ProjectProduct): number => {
    const boms = getProductBomList(p);
    let weight = 0;
    for (const b of boms) {
      const mat = materials.find((m) => m.id === b.material_id);
      if (mat?.weight_per_unit) {
        const waste = b.waste_rate_override ?? mat.default_waste_rate;
        const gross = b.net_quantity_per_unit * (1 + waste / 100);
        weight += gross * mat.weight_per_unit;
      }
    }
    return Number(weight.toFixed(1));
  };

  // Thay đổi số lượng sản phẩm trên ô input cỡ lớn
  const handleQuantityChange = (productId: string, valStr: string) => {
    if (isCompleted) return;
    const rawNum = parseInt(valStr, 10);
    const newQty = isNaN(rawNum) ? 0 : Math.max(0, rawNum);
    updateProjectProductQty(productId, newQty);
  };

  // Nhảy ô khi bấm Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextProduct = projectProducts[currentIndex + 1];
      if (nextProduct && inputRefs.current[nextProduct.id]) {
        inputRefs.current[nextProduct.id]?.focus();
        inputRefs.current[nextProduct.id]?.select();
      } else {
        (e.target as HTMLInputElement).blur();
      }
    }
  };

  // =========================================================================
  // SLIDE-OVER DRAWER: CHỈNH SỬA ĐỊNH MỨC (BOM) CHO TỪNG SẢN PHẨM
  // =========================================================================
  const handleOpenDrawer = (p: ProjectProduct) => {
    setDrawerProduct(p);
    setDrawerSourceFurnitureId('');
    setNewBomMaterialId(materials[0]?.id || '');

    const currentBoms = getProductBomList(p);
    setDrawerBoms(
      currentBoms.map((b) => ({
        material_id: b.material_id,
        net_quantity_per_unit: b.net_quantity_per_unit,
        waste_rate_override: b.waste_rate_override,
      }))
    );
  };

  // Sao chép định mức nhanh từ 1 món đồ khác vào Drawer
  const handleApplySourceBomToDrawer = (sourceId: string) => {
    if (!sourceId) return;
    // Tìm trong projectProducts của công trình hiện tại hoặc từ all projects
    const allProds = useProjectStore.getState().projectProducts;
    const srcProd = allProds.find((p) => p.id === sourceId);
    if (!srcProd) return;

    const srcBoms = getProductBomList(srcProd);
    setDrawerBoms(
      srcBoms.map((b) => ({
        material_id: b.material_id,
        net_quantity_per_unit: b.net_quantity_per_unit,
        waste_rate_override: b.waste_rate_override,
      }))
    );
  };

  // Thêm vật tư mới vào Drawer
  const handleAddMaterialToDrawer = () => {
    if (!newBomMaterialId) return;
    // Kiểm tra trùng
    const exists = drawerBoms.some((b) => b.material_id === newBomMaterialId);
    if (exists) {
      alert('Vật tư này đã có trong định mức. Bạn có thể sửa trực tiếp số lượng ở bảng dưới!');
      return;
    }
    const mat = materials.find((m) => m.id === newBomMaterialId);
    setDrawerBoms([
      ...drawerBoms,
      {
        material_id: newBomMaterialId,
        net_quantity_per_unit: 1,
        waste_rate_override: null, // mặc định lấy waste_rate của vật tư
      },
    ]);
  };

  // Tính tổng trọng lượng trong Drawer
  const calculateDrawerWeight = () => {
    let weight = 0;
    for (const b of drawerBoms) {
      const mat = materials.find((m) => m.id === b.material_id);
      if (mat?.weight_per_unit) {
        const waste = b.waste_rate_override ?? mat.default_waste_rate;
        const gross = b.net_quantity_per_unit * (1 + waste / 100);
        weight += gross * mat.weight_per_unit;
      }
    }
    return Number(weight.toFixed(1));
  };

  // Lưu định mức từ Drawer trực tiếp vào sản phẩm của công trình
  const handleSaveDrawerBom = () => {
    if (!drawerProduct) return;
    if (drawerProduct.bom_mode === 'linked') {
      detachToCustomBom(drawerProduct.id);
    }
    setCustomBomItems(drawerProduct.id, drawerBoms);
    setDrawerProduct(null);
  };

  // =========================================================================
  // THÊM ĐỒ MỚI & LẤY ĐỒ TỪ CÔNG TRÌNH KHÁC
  // =========================================================================
  const handleOpenAddModal = () => {
    setErrorMessage(null);
    setFormItemCode(`SP-${projectProducts.length + 1}`);
    setFormItemName('');
    setFormDimensions('');
    setFormQuantity(1);
    setFormImageUrl(undefined);
    setShowAddModal(true);
  };

  const handleConfirmAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formItemCode.trim() || !formItemName.trim()) {
      setErrorMessage('Vui lòng nhập ký hiệu và tên đồ nội thất!');
      return;
    }

    const res = addProjectProduct({
      project_id: projectId,
      item_code: formItemCode.trim().toUpperCase(),
      item_name: formItemName.trim(),
      dimensions: formDimensions.trim(),
      template_id: null,
      bom_mode: 'custom',
      quantity: Math.max(1, formQuantity),
      image_url: formImageUrl,
      note: 'Tạo mới tại công trình',
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Lỗi khi thêm đồ nội thất');
      return;
    }

    setShowAddModal(false);

    // Mở ngay Drawer để người dùng kê định mức vật tư cấu thành tại chỗ!
    if (res.id) {
      const added = useProjectStore.getState().projectProducts.find((p) => p.id === res.id);
      if (added) handleOpenDrawer(added);
    }
  };

  // Mở modal Lấy Đồ Từ Công Trình Khác
  const handleOpenCopyModal = () => {
    const otherProjects = allProjects.filter((p) => p.id !== projectId);
    const initialSourceId = otherProjects[0]?.id || '';
    setCopySourceProjectId(initialSourceId);
    setCopySelectedProductIds([]);
    setCopyQuantities({});
    setShowCopyModal(true);
  };

  // Thực hiện sao chép đồ từ công trình nguồn sang công trình hiện tại
  const handleConfirmCopyFromProject = () => {
    if (!copySourceProjectId) {
      alert('Vui lòng chọn công trình nguồn!');
      return;
    }
    if (copySelectedProductIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 đồ nội thất để sao chép!');
      return;
    }

    const res = copyProductsFromProject(
      copySourceProjectId,
      projectId,
      copySelectedProductIds,
      copyQuantities
    );

    let msg = `Đã sao chép thành công ${res.successCount} món đồ nội thất vào công trình!`;
    if (res.duplicateCount > 0) {
      msg += `\n(${res.duplicateCount} món bị trùng ký hiệu đã được tự động thêm hậu tố phân biệt).`;
    }
    alert(msg);
    setShowCopyModal(false);
  };

  // Nhân bản đồ nội thất trong cùng công trình
  const handleDuplicateProduct = (p: ProjectProduct) => {
    const res = duplicateProjectProduct(p.id);
    if (res.success) {
      alert(`Đã nhân bản "${p.item_code}" thành công kèm toàn bộ định mức BOM!`);
    } else {
      alert(res.error || 'Không thể nhân bản');
    }
  };

  // Sửa Ký hiệu / Tên / Kích thước
  const handleStartEdit = (p: ProjectProduct) => {
    setEditingProduct(p);
    setEditItemCode(p.item_code);
    setEditItemName(p.item_name);
    setEditDimensions(p.dimensions || '');
    setEditImageUrl(p.image_url);
    setErrorMessage(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setErrorMessage(null);

    const res = updateProjectProduct(editingProduct.id, {
      item_code: editItemCode,
      item_name: editItemName,
      dimensions: editDimensions,
      image_url: editImageUrl,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Lỗi cập nhật');
      return;
    }

    setEditingProduct(null);
  };

  // Khóa / Mở khóa số liệu
  const handleToggleStatus = () => {
    if (project.status === 'completed') {
      if (confirm('Mở khóa công trình về trạng thái "Đang sản xuất"?')) {
        updateProject(project.id, { status: 'in_production' });
      }
    } else {
      if (
        confirm(
          'XÁC NHẬN HOÀN THÀNH CÔNG TRÌNH VÀ KHÓA SỐ LIỆU:\n\n- Toàn bộ định mức BOM của công trình sẽ được đóng băng snapshot độc lập.\n- Số lượng đồ nội thất sẽ được khóa để lưu trữ nghiệm thu.\n\nBạn có muốn tiếp tục?'
        )
      ) {
        updateProjectStatus(project.id, 'completed');
      }
    }
  };

  // Bóc tách vật tư riêng cho công trình (Realtime)
  const breakdown = selectProjectBreakdown(projectId);

  // Danh sách các công trình khác để sao chép
  const otherProjects = allProjects.filter((p) => p.id !== projectId);
  const sourceProjectProducts = copySourceProjectId
    ? useProjectStore.getState().getProjectProducts(copySourceProjectId)
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* 1. HEADER CÔNG TRÌNH                                                      */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/projects"
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Danh sách công trình</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {project.project_code}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>ĐÃ KHÓA SỐ LIỆU</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{project.name}</h1>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
            <span>
              Khách hàng: <strong className="text-slate-700">{project.client_name || 'Khách vãng lai'}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Hạn bàn giao: <strong>{new Date(project.deadline).toLocaleDateString('vi-VN')}</strong>
              </span>
            </span>
            <span>•</span>
            <span>
              Trạng thái:{' '}
              <strong className={`uppercase font-bold ${isCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                {project.status === 'in_production'
                  ? 'Đang sản xuất'
                  : project.status === 'completed'
                  ? 'Đã hoàn thành'
                  : 'Đang lập kế hoạch'}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleToggleStatus}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {isCompleted ? <Lock className="w-3.5 h-3.5 text-emerald-600" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
            <span>{isCompleted ? 'Mở khóa số liệu' : 'Khóa số liệu'}</span>
          </button>

          <Link
            href="/reports"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Gộp Đặt Hàng Vật Tư (PO)</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BẢNG DANH SÁCH ĐỒ NỘI THẤT CẦN THI CÔNG                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-600" />
              <span>Danh Sách Đồ Nội Thất Cần Thi Công</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mỗi đồ nội thất sở hữu định mức BOM riêng biệt • Dễ dàng lấy đồ từ công trình khác hoặc nhân bản nhanh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold px-3 py-1.5 bg-amber-100 text-amber-900 rounded-lg border border-amber-200">
              Tổng số lượng: <strong className="text-sm">{totalProductsCount}</strong> cái ({projectProducts.length} đồ)
            </div>

            {!isCompleted && (
              <>
                {/* NÚT LẤY ĐỒ TỪ CÔNG TRÌNH KHÁC (THEO ĐÚNG YÊU CẦU DUYỆT) */}
                <button
                  onClick={handleOpenCopyModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold rounded-lg shadow-2xs transition-all"
                  title="Sao chép đồ nội thất kèm định mức BOM từ công trình khác sang công trình này"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>📥 Lấy từ công trình khác</span>
                </button>

                {/* NÚT THÊM ĐỒ MỚI */}
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>+ Thêm Đồ Mới</span>
                </button>
              </>
            )}
          </div>
        </div>

        {projectProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Boxes className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-700 text-base">Công trình chưa có đồ nội thất nào</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Hãy bấm <strong>"+ Thêm Đồ Mới"</strong> hoặc <strong>"📥 Lấy từ công trình khác"</strong> để nạp các món đồ kèm định mức vào công trình này.
            </p>
            {!isCompleted && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={handleOpenCopyModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold rounded-lg shadow-2xs"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Lấy đồ từ công trình khác</span>
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm Đồ Mới</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">STT</th>
                  <th className="py-3 px-3 w-32">Ký Hiệu Bản Vẽ</th>
                  <th className="py-3 px-4 min-w-[240px]">Tên Đồ Nội Thất & Kích Thước</th>
                  <th className="py-3 px-3 w-36 text-center">Số Lượng</th>
                  <th className="py-3 px-4 min-w-[240px]">Định Mức Cấu Thành (BOM)</th>
                  <th className="py-3 px-3 w-32 text-right">Trọng Lượng (Kg)</th>
                  <th className="py-3 px-3 w-44 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectProducts.map((p, idx) => {
                  const boms = getProductBomList(p);
                  const bomCount = boms.length;
                  const unitWeight = calculateUnitWeight(p);
                  const totalItemWeight = Number((unitWeight * p.quantity).toFixed(1));

                  // Lấy 3 vật tư chính để preview
                  const topMats = boms.slice(0, 3).map((b) => {
                    const mat = materials.find((m) => m.id === b.material_id);
                    return mat ? `${mat.name} (${b.net_quantity_per_unit} ${mat.base_unit})` : null;
                  }).filter(Boolean);

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        p.quantity > 0 ? 'bg-amber-50/20 hover:bg-amber-50/40 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>

                      {/* KÝ HIỆU BẢN VẼ */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {p.item_code}
                          </span>
                          {!isCompleted && (
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                              title="Đổi ký hiệu, tên hoặc kích thước"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* TÊN ĐỒ NỘI THẤT & KÍCH THƯỚC */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <ImageUploadBox
                            compact
                            disabled={isCompleted}
                            value={p.image_url}
                            onChange={(newUrl) => updateProjectProduct(p.id, { image_url: newUrl })}
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{p.item_name}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {p.dimensions ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                  <Ruler className="w-3 h-3 text-slate-400" />
                                  <span>{p.dimensions} mm</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Chưa nhập kích thước</span>
                              )}
                              {p.note && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {p.note}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SỐ LƯỢNG INPUT CỠ LỚN */}
                      <td className="py-2 px-3 text-center bg-amber-50/30">
                        <div className="flex items-center justify-center">
                          <input
                            ref={(el) => {
                              inputRefs.current[p.id] = el;
                            }}
                            type="number"
                            min="0"
                            step="1"
                            disabled={isCompleted}
                            value={p.quantity === 0 ? '' : p.quantity}
                            placeholder="0"
                            onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            onFocus={(e) => e.target.select()}
                            className={`w-20 text-center text-base font-black text-slate-900 bg-white border-2 rounded-lg py-1 px-2 shadow-xs transition-all ${
                              isCompleted
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                                : 'border-slate-300 focus:border-amber-500 focus:bg-amber-50 focus:ring-4 focus:ring-amber-500/20'
                            }`}
                          />
                          <span className="ml-1.5 text-xs text-slate-500 font-semibold">Cái</span>
                        </div>
                      </td>

                      {/* ĐỊNH MỨC CẤU THÀNH (BOM) & NÚT MỞ DRAWER CHỈNH SỬA */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <button
                            onClick={() => handleOpenDrawer(p)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs rounded-lg border border-amber-300 shadow-2xs transition-colors"
                            title="Bấm để mở Drawer bên phải chỉnh sửa chi tiết định mức BOM cho món đồ này"
                          >
                            <Sliders className="w-3.5 h-3.5 text-amber-600" />
                            <span>{bomCount > 0 ? `${bomCount} loại vật tư` : 'Chưa cài định mức'}</span>
                            <span className="text-[10px] text-amber-700 bg-amber-200/60 px-1 py-0.2 rounded font-semibold">
                              Sửa BOM
                            </span>
                          </button>

                          {/* Preview nhanh các vật tư chính */}
                          {topMats.length > 0 && (
                            <div className="text-[10px] text-slate-500 truncate max-w-xs" title={topMats.join(', ')}>
                              {topMats.join(' • ')}
                              {bomCount > 3 && <span className="text-slate-400"> (+{bomCount - 3})</span>}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* TRỌNG LƯỢNG */}
                      <td className="py-3.5 px-3 text-right font-mono">
                        <div className="font-bold text-slate-900">
                          {totalItemWeight > 0 ? `${formatNumber(totalItemWeight, 1)} kg` : '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">(~{formatNumber(unitWeight, 1)} kg/cái)</div>
                      </td>

                      {/* THAO TÁC: SỬA BOM, NHÂN BẢN, XÓA */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Nút sửa BOM */}
                          <button
                            onClick={() => handleOpenDrawer(p)}
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded border border-amber-200 transition-colors"
                            title="Chỉnh sửa định mức BOM"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút nhân bản đồ trong cùng công trình */}
                          {!isCompleted && (
                            <button
                              onClick={() => handleDuplicateProduct(p)}
                              className="p-1.5 text-blue-700 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                              title="Nhân bản đồ nội thất này trong công trình"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Nút xóa */}
                          {!isCompleted && (
                            <button
                              onClick={() => {
                                if (confirm(`Xóa đồ nội thất "${p.item_code} - ${p.item_name}" khỏi công trình?`)) {
                                  removeProjectProduct(p.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Xóa khỏi công trình"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                  <td colSpan={3} className="py-3 px-4 text-right uppercase text-xs">
                    Tổng cộng:
                  </td>
                  <td className="py-3 px-3 text-center text-sm font-black text-amber-900 bg-amber-100/60">
                    {totalProductsCount} cái
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BẢNG BÓC TÁCH VẬT TƯ RIÊNG CHO CÔNG TRÌNH                              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600" />
              <span>Bảng Bóc Tách Vật Tư Riêng Cho Công Trình: {project.name}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động tổng hợp ván, nẹp, phụ kiện theo định mức của các đồ nội thất bên trên.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Tổng trọng lượng vật tư:</span>
            <span className="text-lg font-black text-amber-700 font-mono">
              {formatNumber(breakdown.totalWeight, 1)} kg
              <span className="text-xs font-normal text-slate-500 ml-1">
                (≈ {(breakdown.totalWeight / 1000).toFixed(2)} Tấn)
              </span>
            </span>
          </div>
        </div>

        {breakdown.items.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Chưa có số liệu bóc tách vật tư. Hãy cài đặt định mức cho đồ nội thất ở bảng phía trên.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">STT</th>
                  <th className="py-3 px-3 w-32">Mã VT</th>
                  <th className="py-3 px-4 min-w-[200px]">Tên Vật Tư</th>
                  <th className="py-3 px-3 w-28">Nhóm</th>
                  <th className="py-3 px-2 w-16 text-center">ĐVT</th>
                  <th className="py-3 px-3 w-24 text-right">Net</th>
                  <th className="py-3 px-2 w-16 text-center">% HH</th>
                  <th className="py-3 px-3 w-24 text-right">Gross</th>
                  <th className="py-3 px-4 min-w-[200px]">Khối Lượng Đặt Hàng (Order Qty)</th>
                  <th className="py-3 px-3 w-28 text-right font-bold">Trọng Lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdown.items.map((item, idx) => {
                  const mat = item.material;
                  const colorConfig = CATEGORY_COLORS[mat.category] || CATEGORY_COLORS.consumable;
                  const itemWeight = Number((item.orderQty * (mat.weight_per_unit || 0)).toFixed(1));

                  return (
                    <tr key={mat.id} className={`${colorConfig.bg} transition-colors border-b border-slate-100`}>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{mat.material_code}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{mat.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {item.productContributions.map((c) => (
                            <span key={c.productId} className="mr-2">
                              <strong>{c.itemCode || c.productCode}</strong> ({c.productQty} cái): {formatNumber(c.totalNet)} {mat.base_unit}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${colorConfig.badge}`}>
                          {CATEGORY_LABELS[mat.category] || mat.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-slate-600">{mat.base_unit}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">{formatNumber(item.netQty, 2)}</td>
                      <td className="py-3 px-2 text-center font-bold text-slate-700">{item.wasteRate}%</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-800">{formatNumber(item.grossQty, 2)}</td>
                      <td className="py-3 px-4 font-black text-amber-700 text-xs">
                        {formatQtyDisplay(mat, item.orderQty, item.grossQty)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {itemWeight > 0 ? `${formatNumber(itemWeight, 1)} kg` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50/80 font-black border-t-2 border-amber-300 text-slate-900">
                  <td colSpan={9} className="py-3.5 px-4 text-right text-slate-800 uppercase">
                    TỔNG TRỌNG LƯỢNG VẬT TƯ:
                  </td>
                  <td className="py-3.5 px-3 text-right text-amber-800 font-mono font-black">
                    {formatNumber(breakdown.totalWeight, 1)} kg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. SLIDE-OVER DRAWER: CHỈNH SỬA ĐỊNH MỨC (BOM) CHO TỪNG SẢN PHẨM          */}
      {/* ========================================================================= */}
      {drawerProduct && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-3xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Header Drawer */}
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300">
                      {drawerProduct.item_code}
                    </span>
                    <h3 className="font-black text-slate-900 text-lg">{drawerProduct.item_name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Cài đặt định mức vật tư cấu thành cho 1 SP • Kích thước: {drawerProduct.dimensions || 'N/A'} • Khối lượng sản xuất: {drawerProduct.quantity} cái
                  </p>
                </div>
                <button
                  onClick={() => setDrawerProduct(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Thanh sao chép nhanh định mức từ đồ khác */}
              <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-950">Sao chép định mức nhanh:</span>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <select
                    value={drawerSourceFurnitureId}
                    onChange={(e) => {
                      setDrawerSourceFurnitureId(e.target.value);
                      handleApplySourceBomToDrawer(e.target.value);
                    }}
                    className="w-full text-xs font-medium px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Chọn đồ nội thất khác để đắp nhanh BOM --</option>
                    {/* Các đồ khác trong cùng công trình */}
                    <optgroup label="Trong công trình này">
                      {projectProducts
                        .filter((p) => p.id !== drawerProduct.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.item_code} — {p.item_name}
                          </option>
                        ))}
                    </optgroup>
                    {/* Các đồ từ các công trình khác */}
                    {otherProjects.map((proj) => {
                      const prods = useProjectStore.getState().getProjectProducts(proj.id);
                      if (prods.length === 0) return null;
                      return (
                        <optgroup key={proj.id} label={`Công trình: ${proj.project_code} - ${proj.name}`}>
                          {prods.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.item_code} — {sp.item_name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Danh sách vật tư trong Drawer */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* Ảnh minh họa / Bản vẽ 3D của đồ nội thất */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <ImageUploadBox
                    disabled={isCompleted}
                    value={drawerProduct.image_url}
                    onChange={(newUrl) => {
                      updateProjectProduct(drawerProduct.id, { image_url: newUrl });
                      setDrawerProduct({ ...drawerProduct, image_url: newUrl });
                    }}
                    label="Hình Ảnh Minh Họa / Bản Vẽ Phối Cảnh 3D:"
                    placeholderText="Tải ảnh bản vẽ hoặc phối cảnh 3D của đồ này"
                    heightClass="h-44"
                  />
                </div>

                {/* Form thêm vật tư mới vào BOM */}
                {!isCompleted && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Thêm vật tư:</span>
                    <select
                      value={newBomMaterialId}
                      onChange={(e) => setNewBomMaterialId(e.target.value)}
                      className="flex-1 min-w-[220px] text-xs font-medium px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{CATEGORY_LABELS[m.category] || m.category}] {m.material_code} - {m.name} ({m.base_unit})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddMaterialToDrawer}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-2xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm vào BOM</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Danh Sách Vật Tư Cấu Thành ({drawerBoms.length} loại)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Sửa trực tiếp số lượng và % hao hụt trên từng dòng
                  </span>
                </div>

                {drawerBoms.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl space-y-2">
                    <Boxes className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">Chưa có vật tư nào trong định mức đồ này</p>
                    <p className="text-[11px] text-slate-500">
                      Hãy chọn vật tư ở ô trên để thêm vào, hoặc chọn sao chép nhanh từ đồ nội thất khác.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {/* Header bảng định mức Drawer */}
                    <div className="bg-slate-100/90 text-slate-700 text-[11px] font-bold uppercase tracking-wider py-2.5 px-3 flex items-center gap-2">
                      <span className="w-6 text-center">STT</span>
                      <span className="flex-1">Tên & Phân Nhóm Vật Tư</span>
                      <span className="w-24 text-center">Định mức/1 SP</span>
                      <span className="w-12 text-center">ĐVT</span>
                      <span className="w-20 text-center">% Hao hụt</span>
                      <span className="w-20 text-right">Gross/1 SP</span>
                      <span className="w-20 text-right">Trọng lượng</span>
                      <span className="w-8 text-center"></span>
                    </div>

                    {drawerBoms.map((b, idx) => {
                      const mat = materials.find((m) => m.id === b.material_id);
                      if (!mat) return null;

                      const isReadOnly = isCompleted;
                      const waste = b.waste_rate_override ?? mat.default_waste_rate;
                      const grossPerUnit = Number((b.net_quantity_per_unit * (1 + waste / 100)).toFixed(3));
                      const itemWeight = mat.weight_per_unit
                        ? Number((grossPerUnit * mat.weight_per_unit).toFixed(2))
                        : 0;

                      return (
                        <div key={idx} className="p-3 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400 w-6 text-center">{idx + 1}</span>

                          {/* Tên vật tư */}
                          <div className="flex-1">
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <span className="font-mono text-amber-700">{mat.material_code}</span>
                              <span>{mat.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="text-slate-600 font-semibold">{CATEGORY_LABELS[mat.category]}</span>
                              {mat.weight_per_unit && <span>• TL: {mat.weight_per_unit} kg/{mat.base_unit}</span>}
                            </div>
                          </div>

                          {/* Định mức cho 1 SP (Net Qty) */}
                          <div className="w-24 text-center">
                            {isReadOnly ? (
                              <span className="font-bold text-xs text-slate-900">{b.net_quantity_per_unit}</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={b.net_quantity_per_unit}
                                onChange={(e) => {
                                  const updated = [...drawerBoms];
                                  updated[idx].net_quantity_per_unit = Math.max(0, parseFloat(e.target.value) || 0);
                                  setDrawerBoms(updated);
                                }}
                                className="w-full text-center text-xs font-bold border-2 border-slate-300 focus:border-amber-500 rounded p-1 bg-amber-50/20"
                              />
                            )}
                          </div>

                          {/* ĐVT */}
                          <div className="w-12 text-center text-xs font-semibold text-slate-600">
                            {mat.base_unit}
                          </div>

                          {/* % Hao hụt tùy chỉnh */}
                          <div className="w-20 text-center">
                            {isReadOnly ? (
                              <span className="font-bold text-xs text-slate-700">{waste}%</span>
                            ) : (
                              <div className="relative">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  max="100"
                                  placeholder={`${mat.default_waste_rate}%`}
                                  value={b.waste_rate_override === null ? '' : b.waste_rate_override}
                                  onChange={(e) => {
                                    const val = e.target.value.trim();
                                    const updated = [...drawerBoms];
                                    updated[idx].waste_rate_override = val === '' ? null : Math.max(0, Math.min(100, parseFloat(val) || 0));
                                    setDrawerBoms(updated);
                                  }}
                                  className="w-full text-center text-xs font-bold border border-slate-300 focus:border-amber-500 rounded p-1"
                                  title="Để trống nếu muốn dùng % mặc định của vật tư"
                                />
                              </div>
                            )}
                          </div>

                          {/* Khối lượng thô Gross */}
                          <div className="w-20 text-right font-mono text-xs text-slate-700">
                            {formatNumber(grossPerUnit, 2)}
                          </div>

                          {/* Trọng lượng */}
                          <div className="w-20 text-right font-mono text-xs font-bold text-slate-900">
                            {itemWeight > 0 ? `${formatNumber(itemWeight, 1)} kg` : '-'}
                          </div>

                          {/* Xóa dòng */}
                          <div className="w-8 text-center">
                            {!isCompleted && (
                              <button
                                type="button"
                                onClick={() => setDrawerBoms(drawerBoms.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-red-600 p-1 rounded"
                                title="Xóa vật tư này khỏi định mức"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chân Drawer: Thống kê & Nút Lưu Định Mức */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Tổng trọng lượng ước tính 1 cái:</span>
                  <span className="text-lg font-black text-amber-900 font-mono">
                    ~{formatNumber(calculateDrawerWeight(), 1)} kg
                  </span>
                  <span className="text-xs text-slate-500 ml-2 font-normal">
                    (Cả lô {drawerProduct.quantity} cái: <strong>~{formatNumber(calculateDrawerWeight() * drawerProduct.quantity, 1)} kg</strong>)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawerProduct(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
                  >
                    Đóng
                  </button>

                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={handleSaveDrawerBom}
                      className="flex items-center gap-1.5 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-lg shadow-sm transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>Lưu Định Mức Sản Phẩm</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL LẤY ĐỒ NỘI THẤT TỪ CÔNG TRÌNH KHÁC                                */}
      {/* ========================================================================= */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  <span>Lấy Đồ Nội Thất & Định Mức Từ Công Trình Khác</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sao chép đồ nội thất kèm 100% định mức BOM sang công trình <strong>{project.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowCopyModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Chọn công trình nguồn */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  1. Chọn Công Trình Nguồn: <span className="text-red-500">*</span>
                </label>
                <select
                  value={copySourceProjectId}
                  onChange={(e) => {
                    setCopySourceProjectId(e.target.value);
                    setCopySelectedProductIds([]);
                    setCopyQuantities({});
                  }}
                  className="w-full text-xs font-bold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:border-amber-500"
                >
                  {otherProjects.map((p) => {
                    const count = useProjectStore.getState().getProjectProducts(p.id).length;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.project_code} — {p.name} ({p.client_name || 'Khách vãng lai'}) • Có {count} đồ nội thất
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Danh sách đồ nội thất của công trình nguồn */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    2. Chọn Đồ Nội Thất Cần Sao Chép ({copySelectedProductIds.length}/{sourceProjectProducts.length} đã chọn):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCopySelectedProductIds(sourceProjectProducts.map((p) => p.id))}
                      className="text-[11px] font-bold text-blue-700 hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setCopySelectedProductIds([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {sourceProjectProducts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-slate-200 rounded-xl text-xs">
                    Công trình nguồn được chọn chưa có đồ nội thất nào.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {sourceProjectProducts.map((sp) => {
                      const isChecked = copySelectedProductIds.includes(sp.id);
                      const boms = getProductBomList(sp);
                      const unitWeight = calculateUnitWeight(sp);

                      return (
                        <div
                          key={sp.id}
                          className={`p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            if (isChecked) {
                              setCopySelectedProductIds(copySelectedProductIds.filter((id) => id !== sp.id));
                            } else {
                              setCopySelectedProductIds([...copySelectedProductIds, sp.id]);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by row click
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            {sp.image_url && (
                              <img
                                src={sp.image_url}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {sp.item_code}
                                </span>
                                <span className="font-bold text-xs text-slate-800">{sp.item_name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                {sp.dimensions && <span>KT: {sp.dimensions} mm</span>}
                                <span>• Định mức: <strong>{boms.length} loại vật tư</strong></span>
                                <span>• TL: <strong>~{formatNumber(unitWeight, 1)} kg/cái</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Nhập số lượng cần làm cho công trình mới */}
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()} // ngăn click lan sang chọn dòng
                          >
                            <label className="text-[11px] text-slate-500 font-medium">SL làm:</label>
                            <input
                              type="number"
                              min="1"
                              value={copyQuantities[sp.id] !== undefined ? copyQuantities[sp.id] : sp.quantity || 1}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setCopyQuantities({
                                  ...copyQuantities,
                                  [sp.id]: val,
                                });
                              }}
                              className="w-16 text-center text-xs font-bold border border-slate-300 rounded p-1 bg-white"
                            />
                            <span className="text-xs text-slate-500">Cái</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Toàn bộ định mức BOM sẽ được nhân bản độc lập cho công trình này.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCopyFromProject}
                  disabled={copySelectedProductIds.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Sao Chép Vào Công Trình ({copySelectedProductIds.length} đồ)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL THÊM ĐỒ MỚI                                                      */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">Thêm Đồ Nội Thất Mới</h3>
                <p className="text-xs text-slate-500 mt-0.5">Công trình: {project.name}</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleConfirmAddProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ký Hiệu Bản Vẽ: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: TA-01, BLV-02"
                    value={formItemCode}
                    onChange={(e) => setFormItemCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kích Thước D × R × C (mm):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 2200x600x2600"
                    value={formDimensions}
                    onChange={(e) => setFormDimensions(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Đồ Nội Thất: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tủ áo master 4 cánh"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
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
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-24 text-center text-sm font-bold px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-500 font-semibold">Cái</span>
                </div>
              </div>

              <div>
                <ImageUploadBox
                  value={formImageUrl}
                  onChange={setFormImageUrl}
                  label="Ảnh Minh Họa / Bản Vẽ 3D (Tùy chọn):"
                  placeholderText="Bấm để chọn file ảnh từ máy tính"
                  heightClass="h-32"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                >
                  + Thêm & Kê Định Mức
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL ĐỔI TÊN & KÝ HIỆU                                                */}
      {/* ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">Đổi Tên & Ký Hiệu Đồ Nội Thất</h3>
                <p className="text-xs text-slate-500 mt-0.5">Công trình: {project.name}</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ký Hiệu Bản Vẽ: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editItemCode}
                  onChange={(e) => setEditItemCode(e.target.value.toUpperCase())}
                  className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Đồ Nội Thất: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kích Thước D × R × C (mm):</label>
                <input
                  type="text"
                  placeholder="VD: 2200x600x2600"
                  value={editDimensions}
                  onChange={(e) => setEditDimensions(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                />
              </div>

              <div>
                <ImageUploadBox
                  value={editImageUrl}
                  onChange={setEditImageUrl}
                  label="Ảnh Minh Họa / Bản Vẽ 3D:"
                  placeholderText="Bấm để chọn file ảnh từ máy tính"
                  heightClass="h-32"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
