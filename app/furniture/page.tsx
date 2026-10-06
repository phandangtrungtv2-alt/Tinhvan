'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProductStore } from '@/lib/stores/useProductStore';
import { useMaterialStore } from '@/lib/stores/useMaterialStore';
import { useBomStore } from '@/lib/stores/useBomStore';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import { Product, Material, ProjectProduct } from '@/lib/types';
import { formatNumber, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/format';
import {
  Armchair,
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
  Download,
  Ruler,
  Sliders,
  Save,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Rows3,
  Table as TableIcon,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { ImageUploadBox } from '@/components/common/ImageUploadBox';

interface FurnitureGroup {
  id: string; // 'template' hoặc project.id
  type: 'template' | 'project';
  code: string;
  name: string;
  clientName?: string;
  deadline?: string;
  status?: string;
  items: UnifiedFurnitureItem[];
  totalWeight: number;
}

interface UnifiedFurnitureItem {
  id: string;
  sourceType: 'template' | 'project';
  sourceName: string; // "Mẫu xưởng chuẩn" hoặc tên công trình
  sourceProjectId?: string;
  itemCode: string;
  itemName: string;
  dimensions?: string;
  category?: string;
  imageUrl?: string;
  unitWeight: number;
  bomCount: number;
  boms: {
    material_id: string;
    net_quantity_per_unit: number;
    waste_rate_override: number | null;
  }[];
}

export default function FurnitureLibraryPage() {
  const [mounted, setMounted] = useState(false);

  // Stores
  const templateProducts = useProductStore((s) => s.products);
  const addTemplateProduct = useProductStore((s) => s.addProduct);
  const updateTemplateProduct = useProductStore((s) => s.updateProduct);
  const deleteTemplateProduct = useProductStore((s) => s.deleteProduct);

  const materials = useMaterialStore((s) => s.materials);
  const templateBomItems = useBomStore((s) => s.bomItems);
  const addTemplateBom = useBomStore((s) => s.addBomItem);
  const setProductBom = useBomStore((s) => s.setProductBom);

  const projects = useProjectStore((s) => s.projects);
  const projectProducts = useProjectStore((s) => s.projectProducts);
  const projectProductBoms = useProjectStore((s) => s.projectProductBoms);
  const addProjectProduct = useProjectStore((s) => s.addProjectProduct);
  const updateProjectProduct = useProjectStore((s) => s.updateProjectProduct);
  const setCustomBomItems = useProjectStore((s) => s.setCustomBomItems);
  const removeProjectProduct = useProjectStore((s) => s.removeProjectProduct);

  // Bộ lọc, chế độ xem & tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all'); // 'all', 'template', hoặc projectId
  const [viewMode, setViewMode] = useState<'rows' | 'grid' | 'table'>('rows'); // Mặc định chia theo hàng từng công trình
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Modal: Áp dụng vào công trình
  const [applyItem, setApplyItem] = useState<UnifiedFurnitureItem | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string>('');
  const [applyQuantity, setApplyQuantity] = useState<number>(1);
  const [applyItemCode, setApplyItemCode] = useState<string>('');
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  // Modal / Drawer: Thêm đồ mới vào Thư viện
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDimensions, setFormDimensions] = useState('');
  const [formCategory, setFormCategory] = useState('Tủ văn phòng');
  const [formImageUrl, setFormImageUrl] = useState<string | undefined>(undefined);
  const [formBoms, setFormBoms] = useState<
    { material_id: string; net_quantity_per_unit: number; waste_rate_override: number | null }[]
  >([]);

  // Drawer: Chỉnh sửa định mức đồ nội thất
  const [editingItem, setEditingItem] = useState<UnifiedFurnitureItem | null>(null);
  const [editDrawerBoms, setEditDrawerBoms] = useState<
    { material_id: string; net_quantity_per_unit: number; waste_rate_override: number | null }[]
  >([]);
  const [newBomMaterialId, setNewBomMaterialId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-8 text-center text-slate-500">Đang tải Thư viện đồ nội thất...</div>;
  }

  // Tính trọng lượng của 1 list BOMs
  const calculateWeightForBoms = (
    boms: { material_id: string; net_quantity_per_unit: number; waste_rate_override: number | null }[]
  ): number => {
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

  // Cập nhật ảnh minh họa cho món đồ
  const handleUpdateItemImage = (item: UnifiedFurnitureItem, newImageUrl: string | undefined) => {
    if (item.sourceType === 'template') {
      updateTemplateProduct(item.id, { image_url: newImageUrl });
    } else {
      updateProjectProduct(item.id, { image_url: newImageUrl });
    }
  };

  // Tổng hợp toàn bộ đồ nội thất từ Mẫu xưởng + Các công trình đã làm
  const allFurnitureList: UnifiedFurnitureItem[] = [];

  // 1. Thêm từ Mẫu xưởng chuẩn
  for (const tp of templateProducts) {
    const boms = templateBomItems
      .filter((b) => b.product_id === tp.id)
      .map((b) => ({
        material_id: b.material_id,
        net_quantity_per_unit: b.net_quantity_per_unit,
        waste_rate_override: b.waste_rate_override,
      }));
    allFurnitureList.push({
      id: tp.id,
      sourceType: 'template',
      sourceName: 'Mẫu xưởng chuẩn',
      itemCode: tp.product_code,
      itemName: tp.name,
      dimensions: tp.description?.includes('KT:') ? tp.description.split('KT:')[1]?.trim() : '',
      category: tp.category,
      imageUrl: tp.image_url,
      unitWeight: calculateWeightForBoms(boms),
      bomCount: boms.length,
      boms,
    });
  }

  // 2. Thêm từ các Công trình thực tế
  for (const pp of projectProducts) {
    const proj = projects.find((p) => p.id === pp.project_id);
    let boms: { material_id: string; net_quantity_per_unit: number; waste_rate_override: number | null }[] = [];
    if (pp.bom_mode === 'custom') {
      boms = projectProductBoms
        .filter((b) => b.project_product_id === pp.id)
        .map((b) => ({
          material_id: b.material_id,
          net_quantity_per_unit: b.net_quantity_per_unit,
          waste_rate_override: b.waste_rate_override,
        }));
    } else if (pp.template_id) {
      boms = templateBomItems
        .filter((b) => b.product_id === pp.template_id)
        .map((b) => ({
          material_id: b.material_id,
          net_quantity_per_unit: b.net_quantity_per_unit,
          waste_rate_override: b.waste_rate_override,
        }));
    }

    allFurnitureList.push({
      id: pp.id,
      sourceType: 'project',
      sourceName: proj ? `${proj.project_code} – ${proj.name}` : 'Công trình khác',
      sourceProjectId: pp.project_id,
      itemCode: pp.item_code,
      itemName: pp.item_name,
      dimensions: pp.dimensions,
      category: 'Đồ công trình',
      imageUrl: pp.image_url,
      unitWeight: calculateWeightForBoms(boms),
      bomCount: boms.length,
      boms,
    });
  }

  // Lọc theo từ khóa tìm kiếm và nguồn
  const filteredList = allFurnitureList.filter((item) => {
    const matchSearch =
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.dimensions && item.dimensions.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.sourceName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (filterSource === 'all') return true;
    if (filterSource === 'template') return item.sourceType === 'template';
    return item.sourceProjectId === filterSource;
  });

  // Phân chia theo từng hàng công trình
  const projectGroups: FurnitureGroup[] = [];

  // 1. Nhóm Mẫu xưởng chuẩn
  if (filterSource === 'all' || filterSource === 'template') {
    const templateItems = filteredList.filter((item) => item.sourceType === 'template');
    if (templateItems.length > 0 || !searchTerm) {
      projectGroups.push({
        id: 'template',
        type: 'template',
        code: 'MẪU CHUẨN',
        name: 'Mẫu Xưởng Tiêu Chuẩn (Dùng chung toàn hệ thống)',
        items: templateItems,
        totalWeight: Number(templateItems.reduce((acc, it) => acc + it.unitWeight, 0).toFixed(1)),
      });
    }
  }

  // 2. Nhóm theo từng công trình thực tế
  for (const proj of projects) {
    if (filterSource !== 'all' && filterSource !== proj.id) continue;
    const pItems = filteredList.filter(
      (item) => item.sourceType === 'project' && item.sourceProjectId === proj.id
    );
    if (pItems.length > 0 || (!searchTerm && (filterSource === proj.id || filterSource === 'all'))) {
      projectGroups.push({
        id: proj.id,
        type: 'project',
        code: proj.project_code,
        name: proj.name,
        clientName: proj.client_name,
        deadline: proj.deadline,
        status: proj.status,
        items: pItems,
        totalWeight: Number(pItems.reduce((acc, it) => acc + it.unitWeight, 0).toFixed(1)),
      });
    }
  }

  // Xử lý đóng/mở hàng công trình
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleAllGroups = (collapse: boolean) => {
    const next: Record<string, boolean> = {};
    for (const g of projectGroups) {
      next[g.id] = collapse;
    }
    setCollapsedGroups(next);
  };

  // Mở modal Áp dụng vào công trình
  const handleOpenApplyModal = (item: UnifiedFurnitureItem) => {
    setApplyItem(item);
    setTargetProjectId(projects[0]?.id || '');
    setApplyQuantity(1);
    setApplyItemCode(item.itemCode);
    setApplySuccessMessage(null);
  };

  const handleConfirmApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyItem || !targetProjectId) return;

    // Nạp món đồ vào công trình đích kèm toàn bộ BOM độc lập
    const res = addProjectProduct({
      project_id: targetProjectId,
      item_code: applyItemCode.trim().toUpperCase(),
      item_name: applyItem.itemName,
      dimensions: applyItem.dimensions || '',
      template_id: null,
      bom_mode: 'custom',
      quantity: Math.max(1, applyQuantity),
      image_url: applyItem.imageUrl,
      note: `Lấy từ Thư viện (${applyItem.sourceName})`,
    });

    if (!res.success) {
      alert(res.error || 'Lỗi khi thêm vào công trình');
      return;
    }

    if (res.id && applyItem.boms.length > 0) {
      setCustomBomItems(res.id, applyItem.boms);
    }

    const targetProj = projects.find((p) => p.id === targetProjectId);
    setApplySuccessMessage(
      `Đã nạp thành công "${applyItemCode}" kèm toàn bộ ${applyItem.boms.length} loại vật tư định mức vào công trình "${targetProj?.name}"!`
    );
    setTimeout(() => {
      setApplyItem(null);
      setApplySuccessMessage(null);
    }, 1500);
  };

  // Mở Drawer sửa định mức
  const handleOpenEditDrawer = (item: UnifiedFurnitureItem) => {
    setEditingItem(item);
    setEditDrawerBoms([...item.boms]);
    setNewBomMaterialId(materials[0]?.id || '');
  };

  const handleSaveEditDrawer = () => {
    if (!editingItem) return;

    if (editingItem.sourceType === 'template') {
      // Cập nhật vào Template BOM
      setProductBom(editingItem.id, editDrawerBoms);
    } else {
      // Cập nhật vào Project Product BOM
      setCustomBomItems(editingItem.id, editDrawerBoms);
    }

    setEditingItem(null);
    alert('Đã cập nhật định mức BOM thành công!');
  };

  // Xóa đồ nội thất
  const handleDeleteItem = (item: UnifiedFurnitureItem) => {
    if (!confirm(`Bạn có chắc muốn xóa "${item.itemCode} - ${item.itemName}"?`)) return;

    if (item.sourceType === 'template') {
      deleteTemplateProduct(item.id);
    } else {
      removeProjectProduct(item.id);
    }
  };

  // Mở Modal thêm đồ mới
  const handleOpenAddModal = () => {
    setFormCode(`NT-${Date.now().toString().slice(-4)}`);
    setFormName('');
    setFormDimensions('');
    setFormCategory('Tủ văn phòng');
    setFormImageUrl(undefined);
    setFormBoms([]);
    setIsAddModalOpen(true);
  };

  const handleSaveNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      alert('Vui lòng nhập mã và tên đồ nội thất!');
      return;
    }

    const newId = addTemplateProduct({
      product_code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      description: formDimensions ? `KT: ${formDimensions}` : '',
      category: formCategory,
      image_url: formImageUrl,
    });

    if (formBoms.length > 0) {
      setProductBom(newId, formBoms);
    }

    setIsAddModalOpen(false);
    alert('Đã thêm đồ nội thất mới vào Thư viện thành công!');
  };

  // Render thẻ đồ nội thất (Dùng chung cho cả chế độ Theo hàng công trình và Lưới thẻ)
  const renderFurnitureCard = (item: UnifiedFurnitureItem) => {
    const isTemplate = item.sourceType === 'template';

    return (
      <div
        key={`${item.sourceType}-${item.id}`}
        className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
      >
        {/* Vùng ảnh minh họa đồ nội thất */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <ImageUploadBox
            value={item.imageUrl}
            onChange={(newUrl) => handleUpdateItemImage(item, newUrl)}
            placeholderText={`Tải ảnh (${item.itemCode})`}
            heightClass="h-40"
          />
        </div>

        {/* Header thẻ */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-black bg-slate-900 text-amber-400 px-2 py-0.5 rounded-md shadow-2xs">
                {item.itemCode}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isTemplate
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-blue-50 text-blue-900 border-blue-200'
                }`}
              >
                {item.sourceName}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleOpenEditDrawer(item)}
                className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded"
                title="Chỉnh sửa định mức BOM"
              >
                <Sliders className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(item)}
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Xóa khỏi thư viện"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 className="text-sm font-black text-slate-900 mt-2 truncate" title={item.itemName}>
            {item.itemName}
          </h3>

          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
            {item.dimensions ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                <Ruler className="w-3 h-3 text-slate-400" />
                <span>{item.dimensions} mm</span>
              </span>
            ) : (
              <span className="text-[10px] italic text-slate-400">Chưa nhập KT</span>
            )}

            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 font-mono">
              <Scale className="w-3 h-3 text-amber-600" />
              <span>~{formatNumber(item.unitWeight, 1)} kg</span>
            </span>
          </div>
        </div>

        {/* Danh sách vật tư BOM preview */}
        <div className="p-3.5 flex-1 space-y-1.5 bg-white">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Định Mức BOM:</span>
            <span className="text-amber-800 font-bold">{item.bomCount} loại VT</span>
          </div>

          {item.boms.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic py-1">Chưa cài đặt định mức</div>
          ) : (
            <div className="divide-y divide-slate-100 text-[11px] border border-slate-100 rounded-lg overflow-hidden">
              {item.boms.slice(0, 3).map((b, bIdx) => {
                const mat = materials.find((m) => m.id === b.material_id);
                if (!mat) return null;
                const waste = b.waste_rate_override ?? mat.default_waste_rate;

                return (
                  <div key={bIdx} className="p-1.5 flex items-center justify-between bg-slate-50/50">
                    <span className="font-medium text-slate-800 truncate mr-2 text-[11px]">
                      {mat.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 whitespace-nowrap text-[10px]">
                      {b.net_quantity_per_unit} {mat.base_unit}{' '}
                      <span className="text-slate-400 font-normal">({waste}%)</span>
                    </span>
                  </div>
                );
              })}
              {item.boms.length > 3 && (
                <div className="p-1 text-center text-[10px] text-slate-500 font-semibold bg-slate-50">
                  +{item.boms.length - 3} loại vật tư khác...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer thẻ: Nút Áp dụng vào công trình */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditDrawer(item)}
            className="text-[11px] font-bold text-slate-600 hover:text-slate-900"
          >
            Sửa BOM
          </button>

          <button
            type="button"
            onClick={() => handleOpenApplyModal(item)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-all"
          >
            <Download className="w-3 h-3" />
            <span>Đưa Vào CT...</span>
          </button>
        </div>
      </div>
    );
  };

  // Render dạng bảng danh sách
  const renderTableView = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-3 w-12 text-center">STT</th>
              <th className="py-3 px-3 w-16 text-center">Ảnh</th>
              <th className="py-3 px-3 w-28">Ký Hiệu</th>
              <th className="py-3 px-4 min-w-[200px]">Tên Đồ Nội Thất</th>
              <th className="py-3 px-4 min-w-[200px]">Nguồn / Công Trình</th>
              <th className="py-3 px-3 min-w-[140px]">Kích Thước</th>
              <th className="py-3 px-3 text-right">Trọng Lượng</th>
              <th className="py-3 px-4 min-w-[220px]">Định Mức BOM</th>
              <th className="py-3 px-3 w-40 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredList.map((item, idx) => (
              <tr key={`${item.sourceType}-${item.id}`} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                <td className="py-2 px-3 text-center">
                  <ImageUploadBox
                    compact
                    value={item.imageUrl}
                    onChange={(newUrl) => handleUpdateItemImage(item, newUrl)}
                  />
                </td>
                <td className="py-3 px-3">
                  <span className="font-mono font-black text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {item.itemCode}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-slate-900">{item.itemName}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      item.sourceType === 'template'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-blue-50 text-blue-900 border-blue-200'
                    }`}
                  >
                    {item.sourceName}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-600">
                  {item.dimensions ? `${item.dimensions} mm` : '-'}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                  ~{formatNumber(item.unitWeight, 1)} kg
                </td>
                <td className="py-3 px-4">
                  <div className="text-[11px] text-slate-600">
                    <strong>{item.bomCount} loại vật tư</strong>
                    {item.boms.length > 0 && (
                      <span className="text-slate-400 ml-1.5">
                        (
                        {item.boms
                          .slice(0, 2)
                          .map((b) => {
                            const m = materials.find((mat) => mat.id === b.material_id);
                            return m ? `${m.material_code}: ${b.net_quantity_per_unit} ${m.base_unit}` : '';
                          })
                          .filter(Boolean)
                          .join(', ')}
                        {item.boms.length > 2 ? '...' : ''}
                        )
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditDrawer(item)}
                      className="p-1 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded"
                      title="Sửa định mức"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenApplyModal(item)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded shadow-2xs"
                      title="Đưa vào công trình"
                    >
                      Nạp CT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. HEADER */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wide">
              Kho Tri Thức & Thiết Kế
            </span>
            <span className="text-xs text-slate-500">Toàn bộ đồ nội thất & định mức BOM</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Armchair className="w-7 h-7 text-amber-500" />
            <span>Thư Viện Đồ Nội Thất</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp mọi món đồ từ mẫu xưởng chuẩn và các công trình dự án • Tra cứu định mức, xem trọng lượng và nạp 1-click vào công trình đang thi công.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Mẫu Đồ Mới</span>
          </button>
        </div>
      </div>

      {/* 2. BỘ LỌC, TÌM KIẾM & CHẾ ĐỘ XEM */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo ký hiệu (TC1, BNV...), tên đồ, kích thước hoặc công trình..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Nguồn:</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tất cả nguồn ({allFurnitureList.length} đồ)</option>
              <option value="template">Mẫu xưởng chuẩn ({templateProducts.length} đồ)</option>
              <optgroup label="Theo công trình dự án">
                {projects.map((p) => {
                  const count = projectProducts.filter((pp) => pp.project_id === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.project_code} – {p.name} ({count} đồ)
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Chuyển đổi chế độ hiển thị */}
        <div className="flex items-center gap-2 justify-between sm:justify-end flex-wrap">
          {viewMode === 'rows' && projectGroups.length > 1 && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-1">
              <button
                type="button"
                onClick={() => toggleAllGroups(false)}
                className="hover:text-amber-800 hover:underline px-1 py-0.5"
              >
                Mở rộng tất cả
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => toggleAllGroups(true)}
                className="hover:text-amber-800 hover:underline px-1 py-0.5"
              >
                Thu gọn
              </button>
            </div>
          )}

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('rows')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'rows'
                  ? 'bg-white text-amber-950 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Phân chia theo hàng từng công trình"
            >
              <Rows3 className="w-3.5 h-3.5 text-amber-600" />
              <span>Chia Theo Hàng Công Trình</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Lưới thẻ liên tục"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
              <span>Lưới Thẻ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Bảng danh sách cô đọng"
            >
              <TableIcon className="w-3.5 h-3.5 text-slate-600" />
              <span>Dạng Bảng</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. DANH SÁCH ĐỒ NỘI THẤT */}
      {filteredList.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
          <Armchair className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 text-base">Không tìm thấy đồ nội thất phù hợp</h3>
          <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc chọn nguồn khác.</p>
        </div>
      ) : viewMode === 'rows' ? (
        /* ========================================================================= */
        /* CHẾ ĐỘ: CHIA THEO HÀNG TỪNG CÔNG TRÌNH                                     */
        /* ========================================================================= */
        <div className="space-y-6">
          {projectGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.id];
            const isTemplate = group.type === 'template';

            return (
              <div
                key={group.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Header của hàng công trình */}
                <div
                  className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b transition-colors cursor-pointer select-none ${
                    isTemplate
                      ? 'bg-gradient-to-r from-amber-500/10 via-amber-50 to-white border-amber-200'
                      : 'bg-gradient-to-r from-blue-500/10 via-slate-50 to-white border-slate-200'
                  }`}
                  onClick={() => toggleGroupCollapse(group.id)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-transform"
                      title={isCollapsed ? 'Mở rộng hàng này' : 'Thu gọn hàng này'}
                    >
                      {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>

                    <span
                      className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border shadow-2xs ${
                        isTemplate
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-amber-400 border-slate-800'
                      }`}
                    >
                      {group.code}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-black text-slate-900">{group.name}</h2>
                        {isTemplate ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Dùng chung toàn hệ thống
                          </span>
                        ) : (
                          group.status && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                group.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {group.status === 'in_production'
                                ? 'Đang sản xuất'
                                : group.status === 'completed'
                                ? 'Đã hoàn thành'
                                : 'Đang lên kế hoạch'}
                            </span>
                          )
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {group.clientName && (
                          <span>
                            Khách hàng: <strong className="text-slate-700">{group.clientName}</strong>
                          </span>
                        )}
                        {group.deadline && (
                          <>
                            <span>•</span>
                            <span>
                              Hạn bàn giao: <strong>{new Date(group.deadline).toLocaleDateString('vi-VN')}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thống kê số lượng, trọng lượng và nút thao tác */}
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        <strong>{group.items.length}</strong> món đồ
                      </span>
                      <span className="bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200 font-mono">
                        ~<strong>{formatNumber(group.totalWeight, 1)}</strong> kg
                      </span>
                    </div>

                    {group.type === 'project' && (
                      <Link
                        href={`/projects/${group.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>Mở Công Trình</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Các đồ nội thất thuộc hàng công trình này */}
                {!isCollapsed && (
                  <div className="p-5 bg-slate-50/40">
                    {group.items.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs italic">
                        Không có đồ nội thất nào phù hợp trong công trình này.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
                        {group.items.map((item) => renderFurnitureCard(item))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === 'grid' ? (
        /* ========================================================================= */
        /* CHẾ ĐỘ: LƯỚI THẺ                                                          */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredList.map((item) => renderFurnitureCard(item))}
        </div>
      ) : (
        /* ========================================================================= */
        /* CHẾ ĐỘ: DẠNG BẢNG                                                         */
        /* ========================================================================= */
        renderTableView()
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: ĐƯA ĐỒ NỘI THẤT VÀO CÔNG TRÌNH                                  */}
      {/* ========================================================================= */}
      {applyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">Đưa Đồ Vào Công Trình</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sao chép {applyItem.itemCode} kèm {applyItem.bomCount} loại vật tư BOM
                </p>
              </div>
              <button
                onClick={() => setApplyItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applySuccessMessage && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{applySuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleConfirmApply} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Chọn Công Trình Đích: <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:border-amber-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code} — {p.name} ({p.client_name || 'Khách vãng lai'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Ký Hiệu Bản Vẽ: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={applyItemCode}
                    onChange={(e) => setApplyItemCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Số Lượng Thi Công: <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      value={applyQuantity}
                      onChange={(e) => setApplyQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-20 text-center text-xs font-bold px-2 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                    />
                    <span className="text-xs text-slate-500">Cái</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                <p>
                  Toàn bộ định mức BOM ({applyItem.bomCount} loại vật tư) sẽ được nhân bản sang công trình đích.
                </p>
                <p className="text-[11px] text-blue-700">
                  Tại công trình, bạn có thể chỉnh sửa lại số lượng hoặc % hao hụt mà không ảnh hưởng đến đồ gốc.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApplyItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Xác Nhận Nạp Vào Công Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SLIDE-OVER DRAWER: CHỈNH SỬA ĐỊNH MỨC BOM                              */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300">
                      {editingItem.itemCode}
                    </span>
                    <h3 className="font-black text-slate-900 text-base">{editingItem.itemName}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Nguồn: {editingItem.sourceName} • Kích thước: {editingItem.dimensions || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* Ảnh minh họa của đồ nội thất trong Drawer */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <ImageUploadBox
                    value={editingItem.imageUrl}
                    onChange={(newUrl) => {
                      handleUpdateItemImage(editingItem, newUrl);
                      setEditingItem({ ...editingItem, imageUrl: newUrl });
                    }}
                    label="Ảnh Minh Họa / Bản Vẽ 3D:"
                    placeholderText="Tải ảnh minh họa cho món đồ này"
                    heightClass="h-48"
                  />
                </div>

                {/* Thêm vật tư mới vào BOM */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Thêm vật tư:</span>
                  <select
                    value={newBomMaterialId}
                    onChange={(e) => setNewBomMaterialId(e.target.value)}
                    className="flex-1 min-w-[200px] text-xs font-medium px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        [{CATEGORY_LABELS[m.category]}] {m.material_code} - {m.name} ({m.base_unit})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newBomMaterialId) return;
                      const exists = editDrawerBoms.some((b) => b.material_id === newBomMaterialId);
                      if (exists) {
                        alert('Vật tư này đã có trong định mức!');
                        return;
                      }
                      setEditDrawerBoms([
                        ...editDrawerBoms,
                        { material_id: newBomMaterialId, net_quantity_per_unit: 1, waste_rate_override: null },
                      ]);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm</span>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase">
                    Danh Sách Vật Tư Cấu Thành ({editDrawerBoms.length} loại)
                  </label>
                </div>

                {editDrawerBoms.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl text-xs">
                    Chưa có vật tư nào trong định mức đồ này.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {editDrawerBoms.map((b, idx) => {
                      const mat = materials.find((m) => m.id === b.material_id);
                      if (!mat) return null;
                      const waste = b.waste_rate_override ?? mat.default_waste_rate;

                      return (
                        <div key={idx} className="p-3 bg-white hover:bg-slate-50 flex items-center gap-3">
                          <span className="font-mono text-xs text-slate-400 w-6 text-center">{idx + 1}</span>

                          <div className="flex-1">
                            <div className="font-bold text-xs text-slate-900">
                              <span className="font-mono text-amber-700 mr-1.5">{mat.material_code}</span>
                              {mat.name}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {CATEGORY_LABELS[mat.category]} • ĐVT: {mat.base_unit}
                            </div>
                          </div>

                          {/* Định mức Net */}
                          <div className="w-24 text-center">
                            <label className="text-[10px] text-slate-400 block mb-0.5">Định mức/1 SP</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={b.net_quantity_per_unit}
                              onChange={(e) => {
                                const updated = [...editDrawerBoms];
                                updated[idx].net_quantity_per_unit = Math.max(0, parseFloat(e.target.value) || 0);
                                setEditDrawerBoms(updated);
                              }}
                              className="w-full text-center text-xs font-bold border border-slate-300 rounded p-1"
                            />
                          </div>

                          {/* % Hao hụt */}
                          <div className="w-20 text-center">
                            <label className="text-[10px] text-slate-400 block mb-0.5">% Hao hụt</label>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              placeholder={`${mat.default_waste_rate}%`}
                              value={b.waste_rate_override === null ? '' : b.waste_rate_override}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                const updated = [...editDrawerBoms];
                                updated[idx].waste_rate_override = val === '' ? null : Math.max(0, Math.min(100, parseFloat(val) || 0));
                                setEditDrawerBoms(updated);
                              }}
                              className="w-full text-center text-xs font-bold border border-slate-300 rounded p-1"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setEditDrawerBoms(editDrawerBoms.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Trọng lượng ước tính:</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    ~{formatNumber(calculateWeightForBoms(editDrawerBoms), 1)} kg/cái
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditDrawer}
                    className="flex items-center gap-1 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu Định Mức</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: THÊM MẪU ĐỒ MỚI                                                 */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">Thêm Mẫu Đồ Nội Thất Mới</h3>
                <p className="text-xs text-slate-500 mt-0.5">Lưu vào Thư viện dùng chung</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Mã Sản Phẩm: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Kích Thước D × R × C:</label>
                  <input
                    type="text"
                    placeholder="VD: 1200x600x750"
                    value={formDimensions}
                    onChange={(e) => setFormDimensions(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tên Đồ Nội Thất: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Bàn giám đốc chữ L"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Phân Loại:</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500"
                />
              </div>

              <div>
                <ImageUploadBox
                  value={formImageUrl}
                  onChange={setFormImageUrl}
                  label="Ảnh Minh Họa / Bản Vẽ 3D (Tùy chọn):"
                  placeholderText="Bấm để chọn ảnh từ máy tính"
                  heightClass="h-32"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                >
                  Lưu Vào Thư Viện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
