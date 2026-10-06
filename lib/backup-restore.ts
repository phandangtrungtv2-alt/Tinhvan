import * as XLSX from 'xlsx';
import {
  AppBackupData,
  Material,
  Product,
  ProductBom,
  Project,
  ProjectProduct,
  ProjectProductBom,
  MaterialCategory,
  MaterialBaseUnit,
  MaterialRoundingMode,
  ParsedConfigPreview,
  ValidationIssue,
  ImportMode,
  ImportResult,
} from './types';
import { useMaterialStore } from './stores/useMaterialStore';
import { useProductStore } from './stores/useProductStore';
import { useBomStore } from './stores/useBomStore';
import { useProjectStore } from './stores/useProjectStore';
import { useProcurementStore } from './stores/useProcurementStore';

const BACKUP_UNDO_KEY = 'furniture_backup_undo_snapshot';
const LAST_BACKUP_TIME_KEY = 'furniture_last_backup_time';

/**
 * 1. TẠO GÓI SAO LƯU TOÀN BỘ (JSON)
 */
export function createAppBackup(includeProjects = true): AppBackupData {
  const materials = useMaterialStore.getState().materials;
  const products = useProductStore.getState().products;
  const bomItems = useBomStore.getState().bomItems;
  const wasteRateOverrides = useProcurementStore.getState().wasteRateOverrides;

  const backup: AppBackupData = {
    version: 2,
    timestamp: new Date().toISOString(),
    app: 'Mộc ERP Pro',
    materials,
    products,
    bomItems,
    wasteRateOverrides,
  };

  if (includeProjects) {
    backup.projects = useProjectStore.getState().projects;
    backup.projectProducts = useProjectStore.getState().projectProducts;
    backup.projectProductBoms = useProjectStore.getState().projectProductBoms;
  }

  // Ghi nhận thời gian sao lưu
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_BACKUP_TIME_KEY, backup.timestamp);
  }

  return backup;
}

export function downloadJsonBackup(data: AppBackupData, filename?: string) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const name = filename || `MocERP_Backup_${dateStr}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function getLastBackupTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_BACKUP_TIME_KEY);
}

/**
 * 2. XUẤT ĐỊNH MỨC RA FILE EXCEL (3 SHEET: VatTu, SanPham, DinhMucBOM)
 */
export function exportBomConfigToExcel() {
  const wb = XLSX.utils.book_new();

  const materials = useMaterialStore.getState().materials;
  const products = useProductStore.getState().products;
  const bomItems = useBomStore.getState().bomItems;

  // Sheet 1: Vật tư
  const sheet1Data: (string | number)[][] = [
    [
      'Mã Vật Tư (*)',
      'Tên Vật Tư (*)',
      'Nhóm (board/edge/hardware/accessory/consumable)',
      'ĐVT (Tấm/Mét/Cái/Bộ/Kg)',
      '% Hao Hụt Mặc Định',
      'Kiểu Làm Tròn (ceil_integer/package/exact)',
      'Có Quy Cách (Co/Khong)',
      'Số Lượng/Gói',
      'Tên Gói (Cuộn/Hộp/Bịch)',
      'Trọng Lượng Kg/ĐVT',
    ],
  ];

  for (const m of materials) {
    sheet1Data.push([
      m.material_code,
      m.name,
      m.category,
      m.base_unit,
      m.default_waste_rate,
      m.rounding_mode,
      m.package_spec?.has_pack ? 'Co' : 'Khong',
      m.package_spec?.pack_size || 1,
      m.package_spec?.pack_unit_name || '',
      m.weight_per_unit ?? '',
    ]);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 18 },
    { wch: 36 },
    { wch: 18 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'VatTu');

  // Sheet 2: Sản phẩm
  const sheet2Data: (string | number)[][] = [
    ['Mã Sản Phẩm (*)', 'Tên Sản Phẩm (*)', 'Phân Loại', 'Mô Tả Chi Tiết'],
  ];

  for (const p of products) {
    sheet2Data.push([p.product_code, p.name, p.category, p.description]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 20 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'SanPham');

  // Sheet 3: Định mức BOM
  const sheet3Data: (string | number)[][] = [
    [
      'Mã Sản Phẩm (*)',
      'Tên SP (tham khảo)',
      'Mã Vật Tư (*)',
      'Tên VT (tham khảo)',
      'Định Mức / 1 SP (*)',
      '% Hao Hụt Riêng (bỏ trống để dùng mặc định)',
    ],
  ];

  for (const b of bomItems) {
    const prod = products.find((p) => p.id === b.product_id);
    const mat = materials.find((m) => m.id === b.material_id);
    if (!prod || !mat) continue;

    sheet3Data.push([
      prod.product_code,
      prod.name,
      mat.material_code,
      mat.name,
      b.net_quantity_per_unit,
      b.waste_rate_override !== null ? b.waste_rate_override : '',
    ]);
  }

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 35 },
    { wch: 18 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'DinhMucBOM');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Cau_Hinh_Dinh_Muc_BOM_${dateStr}.xlsx`);
}

/**
 * 3. TẢI FILE EXCEL MẪU TRỐNG (CÓ HƯỚNG DẪN)
 */
export function downloadExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Mẫu Vật tư
  const sheet1Data: (string | number)[][] = [
    [
      'Mã Vật Tư (*)',
      'Tên Vật Tư (*)',
      'Nhóm (board/edge/hardware/accessory/consumable)',
      'ĐVT (Tấm/Mét/Cái/Bộ/Kg)',
      '% Hao Hụt Mặc Định',
      'Kiểu Làm Tròn (ceil_integer/package/exact)',
      'Có Quy Cách (Co/Khong)',
      'Số Lượng/Gói',
      'Tên Gói (Cuộn/Hộp/Bịch)',
      'Trọng Lượng Kg/ĐVT',
    ],
    ['MDF-17-MP', 'MDF chống ẩm 17mm Melamine Mộc Phát', 'board', 'Tấm', 10, 'ceil_integer', 'Khong', 1, 'Tấm', 31.5],
    ['NEP-PVC-21', 'Nẹp chỉ PVC 21x1mm', 'edge', 'Mét', 8, 'package', 'Co', 100, 'Cuộn', 0.025],
    ['BL-GC-INOX', 'Bản lề giảm chấn inox', 'hardware', 'Cái', 3, 'package', 'Co', 100, 'Hộp', 0.085],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 18 },
    { wch: 36 },
    { wch: 18 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'VatTu');

  // Sheet 2: Mẫu Sản phẩm
  const sheet2Data: (string | number)[][] = [
    ['Mã Sản Phẩm (*)', 'Tên Sản Phẩm (*)', 'Phân Loại', 'Mô Tả Chi Tiết'],
    ['TC1', 'Tủ tài liệu 2 cánh mở', 'Tủ văn phòng', 'Tủ hồ sơ văn phòng kích thước 900x400x1800'],
    ['BNV1', 'Bàn nhân viên 1m2', 'Bàn văn phòng', 'Bàn làm việc nhân viên 1200x600x750'],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 20 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'SanPham');

  // Sheet 3: Mẫu BOM
  const sheet3Data: (string | number)[][] = [
    [
      'Mã Sản Phẩm (*)',
      'Tên SP (tham khảo)',
      'Mã Vật Tư (*)',
      'Tên VT (tham khảo)',
      'Định Mức / 1 SP (*)',
      '% Hao Hụt Riêng (bỏ trống để dùng mặc định)',
    ],
    ['TC1', 'Tủ tài liệu', 'MDF-17-MP', 'MDF 17mm', 1.8, ''],
    ['TC1', 'Tủ tài liệu', 'NEP-PVC-21', 'Nẹp chỉ 21', 22, ''],
    ['TC1', 'Tủ tài liệu', 'BL-GC-INOX', 'Bản lề inox', 8, ''],
    ['BNV1', 'Bàn nhân viên', 'MDF-17-MP', 'MDF 17mm', 1.1, ''],
    ['BNV1', 'Bàn nhân viên', 'NEP-PVC-21', 'Nẹp chỉ 21', 14, ''],
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 35 },
    { wch: 18 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'DinhMucBOM');

  XLSX.writeFile(wb, 'Mau_Nhap_Dinh_Muc_BOM.xlsx');
}

/**
 * 4. PHÂN TÍCH VÀ ĐỌC FILE EXCEL ĐỊNH MỨC
 */
export function parseBomConfigExcel(buffer: ArrayBuffer): ParsedConfigPreview {
  const wb = XLSX.read(buffer, { type: 'array' });
  const issues: ValidationIssue[] = [];

  const existingMaterials = useMaterialStore.getState().materials;
  const existingProducts = useProductStore.getState().products;

  const parsedMaterials: Material[] = [];
  const parsedProducts: Product[] = [];
  const parsedBoms: ProductBom[] = [];

  const materialCodeMap = new Map<string, Material>();
  const productCodeMap = new Map<string, Product>();

  // Khởi tạo map từ dữ liệu hiện có
  for (const m of existingMaterials) materialCodeMap.set(m.material_code.toUpperCase(), m);
  for (const p of existingProducts) productCodeMap.set(p.product_code.toUpperCase(), p);

  // Đọc Sheet 1: VatTu
  const wsMaterials = wb.Sheets['VatTu'] || wb.Sheets['vattu'] || wb.Sheets['Materials'];
  if (wsMaterials) {
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wsMaterials, { header: 1 });
    // Bỏ qua dòng tiêu đề
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      const code = String(row[0]).trim().toUpperCase();
      const name = String(row[1] || '').trim();
      const rawCategory = String(row[2] || 'board').trim().toLowerCase();
      const rawUnit = String(row[3] || 'Tấm').trim();
      const rawWaste = parseFloat(String(row[4])) || 0;
      const rawRounding = String(row[5] || 'ceil_integer').trim().toLowerCase();
      const hasPackStr = String(row[6] || '').trim().toLowerCase();
      const packSize = parseFloat(String(row[7])) || 1;
      const packUnitName = String(row[8] || '').trim();
      const weight = row[9] !== undefined && row[9] !== '' ? parseFloat(String(row[9])) : undefined;

      if (!name) {
        issues.push({
          type: 'error',
          sheet: 'VatTu',
          row: i + 1,
          code,
          message: `Vật tư "${code}" thiếu Tên vật tư`,
        });
        continue;
      }

      const validCategories: MaterialCategory[] = ['board', 'edge', 'hardware', 'accessory', 'consumable'];
      const category: MaterialCategory = validCategories.includes(rawCategory as MaterialCategory)
        ? (rawCategory as MaterialCategory)
        : 'consumable';

      const validUnits: MaterialBaseUnit[] = ['Tấm', 'Mét', 'Cái', 'Bộ', 'Kg'];
      const baseUnit: MaterialBaseUnit = validUnits.includes(rawUnit as MaterialBaseUnit)
        ? (rawUnit as MaterialBaseUnit)
        : 'Cái';

      const validRounding: MaterialRoundingMode[] = ['ceil_integer', 'package', 'exact'];
      const roundingMode: MaterialRoundingMode = validRounding.includes(rawRounding as MaterialRoundingMode)
        ? (rawRounding as MaterialRoundingMode)
        : 'ceil_integer';

      const hasPack = hasPackStr === 'co' || hasPackStr === 'yes' || hasPackStr === 'true' || roundingMode === 'package';

      const mat: Material = {
        id: materialCodeMap.get(code)?.id || `mat-imp-${Date.now()}-${i}`,
        material_code: code,
        name,
        category,
        base_unit: baseUnit,
        default_waste_rate: Math.max(0, Math.min(100, rawWaste)),
        rounding_mode: roundingMode,
        package_spec: {
          has_pack: hasPack,
          pack_size: Math.max(1, packSize),
          pack_unit_name: packUnitName || (category === 'edge' ? 'Cuộn' : 'Hộp'),
        },
        unit_price: materialCodeMap.get(code)?.unit_price || 0,
        weight_per_unit: weight !== undefined && !isNaN(weight) ? Math.max(0, weight) : undefined,
      };

      parsedMaterials.push(mat);
      materialCodeMap.set(code, mat);
    }
  } else {
    issues.push({
      type: 'warning',
      sheet: 'VatTu',
      message: 'Không tìm thấy sheet "VatTu". Hệ thống sẽ giữ nguyên danh mục vật tư hiện tại.',
    });
  }

  // Đọc Sheet 2: SanPham
  const wsProducts = wb.Sheets['SanPham'] || wb.Sheets['sanpham'] || wb.Sheets['Products'];
  if (wsProducts) {
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wsProducts, { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      const code = String(row[0]).trim().toUpperCase();
      const name = String(row[1] || '').trim();
      const category = String(row[2] || 'Khác').trim();
      const description = String(row[3] || '').trim();

      if (!name) {
        issues.push({
          type: 'error',
          sheet: 'SanPham',
          row: i + 1,
          code,
          message: `Sản phẩm "${code}" thiếu Tên sản phẩm`,
        });
        continue;
      }

      const prod: Product = {
        id: productCodeMap.get(code)?.id || `prod-imp-${Date.now()}-${i}`,
        product_code: code,
        name,
        category,
        description,
      };

      parsedProducts.push(prod);
      productCodeMap.set(code, prod);
    }
  }

  // Đọc Sheet 3: DinhMucBOM
  const wsBom = wb.Sheets['DinhMucBOM'] || wb.Sheets['dinhmucbom'] || wb.Sheets['BOM'];
  if (wsBom) {
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wsBom, { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      const prodCode = String(row[0]).trim().toUpperCase();
      const matCode = String(row[2] || '').trim().toUpperCase();
      const netQty = parseFloat(String(row[4])) || 0;
      const wasteOverride = row[5] !== undefined && String(row[5]).trim() !== '' ? parseFloat(String(row[5])) : null;

      const prod = productCodeMap.get(prodCode);
      if (!prod) {
        issues.push({
          type: 'error',
          sheet: 'DinhMucBOM',
          row: i + 1,
          message: `Dòng ${i + 1}: Mã sản phẩm "${prodCode}" không tồn tại trong sheet SanPham hoặc hệ thống`,
        });
        continue;
      }

      const mat = materialCodeMap.get(matCode);
      if (!mat) {
        issues.push({
          type: 'error',
          sheet: 'DinhMucBOM',
          row: i + 1,
          message: `Dòng ${i + 1}: Mã vật tư "${matCode}" không tồn tại trong sheet VatTu hoặc hệ thống`,
        });
        continue;
      }

      if (netQty <= 0) {
        issues.push({
          type: 'error',
          sheet: 'DinhMucBOM',
          row: i + 1,
          message: `Dòng ${i + 1}: Định mức vật tư cho "${prodCode} - ${matCode}" phải lớn hơn 0`,
        });
        continue;
      }

      parsedBoms.push({
        id: `bom-imp-${Date.now()}-${i}`,
        product_id: prod.id,
        material_id: mat.id,
        net_quantity_per_unit: netQty,
        waste_rate_override: wasteOverride !== null && !isNaN(wasteOverride) ? Math.max(0, wasteOverride) : null,
      });
    }
  }

  const backupData: AppBackupData = {
    version: 2,
    timestamp: new Date().toISOString(),
    app: 'Mộc ERP Pro',
    materials: parsedMaterials,
    products: parsedProducts,
    bomItems: parsedBoms,
  };

  return analyzeConfigChanges(backupData, issues);
}

/**
 * 5. PHÂN TÍCH VÀ ĐỌC FILE JSON
 */
export function parseJsonBackup(jsonStr: string): { valid: boolean; preview?: ParsedConfigPreview; error?: string } {
  try {
    const raw = JSON.parse(jsonStr);
    if (!raw || typeof raw !== 'object') {
      return { valid: false, error: 'File JSON không đúng định dạng đối tượng' };
    }

    if (!Array.isArray(raw.materials) || !Array.isArray(raw.products)) {
      return { valid: false, error: 'File JSON thiếu danh mục vật tư hoặc sản phẩm' };
    }

    const backupData: AppBackupData = {
      version: raw.version || 1,
      timestamp: raw.timestamp || new Date().toISOString(),
      app: raw.app || 'Mộc ERP Pro',
      materials: raw.materials,
      products: raw.products,
      bomItems: raw.bomItems || [],
      projects: raw.projects,
      projectProducts: raw.projectProducts,
      projectProductBoms: raw.projectProductBoms,
      wasteRateOverrides: raw.wasteRateOverrides,
    };

    const preview = analyzeConfigChanges(backupData);
    return { valid: true, preview };
  } catch (err) {
    return { valid: false, error: `Lỗi đọc file JSON: ${(err as Error).message}` };
  }
}

/**
 * 6. SO SÁNH VÀ TẠO BÁO CÁO XEM TRƯỚC (PREVIEW) TRƯỚC KHI NẠP
 */
export function analyzeConfigChanges(
  imported: AppBackupData,
  initialIssues: ValidationIssue[] = []
): ParsedConfigPreview {
  const currentMaterials = useMaterialStore.getState().materials;
  const currentProducts = useProductStore.getState().products;

  const currentMatCodes = new Set(currentMaterials.map((m) => m.material_code.toUpperCase()));
  const currentProdCodes = new Set(currentProducts.map((p) => p.product_code.toUpperCase()));

  let newMaterialsCount = 0;
  let updatedMaterialsCount = 0;
  for (const m of imported.materials) {
    if (currentMatCodes.has(m.material_code.toUpperCase())) {
      updatedMaterialsCount++;
    } else {
      newMaterialsCount++;
    }
  }

  let newProductsCount = 0;
  let updatedProductsCount = 0;
  for (const p of imported.products) {
    if (currentProdCodes.has(p.product_code.toUpperCase())) {
      updatedProductsCount++;
    } else {
      newProductsCount++;
    }
  }

  return {
    materialsCount: imported.materials.length,
    newMaterialsCount,
    updatedMaterialsCount,
    productsCount: imported.products.length,
    newProductsCount,
    updatedProductsCount,
    bomCount: imported.bomItems.length,
    projectsCount: imported.projects?.length,
    issues: initialIssues,
    data: imported,
  };
}

/**
 * 7. ÁP DỤNG CẤU HÌNH VÀO CÁC STORE THEO CHẾ ĐỘ (GỘP / THÊM MỚI / GHI ĐÈ)
 */
export function applyConfigImport(data: AppBackupData, mode: ImportMode): ImportResult {
  // BƯỚC 1: TỰ ĐỘNG CHỤP SNAPSHOT HOÀN TÁC (UNDO)
  createUndoSnapshot();

  const matStore = useMaterialStore.getState();
  const prodStore = useProductStore.getState();
  const bomStore = useBomStore.getState();
  const projectStore = useProjectStore.getState();
  const procStore = useProcurementStore.getState();

  let importedMaterials = 0;
  let importedProducts = 0;
  let importedBoms = 0;
  let importedProjects = 0;

  if (mode === 'overwrite') {
    // CHẾ ĐỘ 1: GHI ĐÈ TOÀN BỘ (Dùng khi chuyển máy hoặc khôi phục hoàn toàn)
    useMaterialStore.setState({ materials: data.materials });
    useProductStore.setState({ products: data.products });
    useBomStore.setState({ bomItems: data.bomItems });

    if (data.projects) {
      useProjectStore.setState({
        projects: data.projects,
        projectProducts: data.projectProducts || [],
        projectProductBoms: data.projectProductBoms || [],
      });
      importedProjects = data.projects.length;
    }

    if (data.wasteRateOverrides) {
      procStore.resetWasteRateOverrides();
      for (const [mId, rate] of Object.entries(data.wasteRateOverrides)) {
        procStore.setWasteRateOverride(mId, rate);
      }
    }

    importedMaterials = data.materials.length;
    importedProducts = data.products.length;
    importedBoms = data.bomItems.length;

    return {
      success: true,
      importedMaterials,
      importedProducts,
      importedBoms,
      importedProjects,
      message: `Đã ghi đè toàn bộ: ${importedMaterials} vật tư, ${importedProducts} sản phẩm, ${importedBoms} dòng BOM${importedProjects ? `, ${importedProjects} công trình` : ''}.`,
    };
  }

  // CHẾ ĐỘ 2 (GỘP) HOẶC 3 (CHỈ THÊM MỚI)
  const currentMaterials = [...matStore.materials];
  const currentProducts = [...prodStore.products];
  const currentBoms = [...bomStore.bomItems];

  const materialIdByCode = new Map<string, string>();
  for (const m of currentMaterials) materialIdByCode.set(m.material_code.toUpperCase(), m.id);

  // 1. Xử lý Vật tư
  for (const m of data.materials) {
    const code = m.material_code.toUpperCase();
    const existingIndex = currentMaterials.findIndex((x) => x.material_code.toUpperCase() === code);

    if (existingIndex >= 0) {
      if (mode === 'merge') {
        currentMaterials[existingIndex] = { ...currentMaterials[existingIndex], ...m, id: currentMaterials[existingIndex].id };
        importedMaterials++;
      }
    } else {
      currentMaterials.push(m);
      materialIdByCode.set(code, m.id);
      importedMaterials++;
    }
  }
  useMaterialStore.setState({ materials: currentMaterials });

  // 2. Xử lý Sản phẩm
  const productIdByCode = new Map<string, string>();
  for (const p of currentProducts) productIdByCode.set(p.product_code.toUpperCase(), p.id);

  for (const p of data.products) {
    const code = p.product_code.toUpperCase();
    const existingIndex = currentProducts.findIndex((x) => x.product_code.toUpperCase() === code);

    if (existingIndex >= 0) {
      if (mode === 'merge') {
        currentProducts[existingIndex] = { ...currentProducts[existingIndex], ...p, id: currentProducts[existingIndex].id };
        importedProducts++;
      }
    } else {
      currentProducts.push(p);
      productIdByCode.set(code, p.id);
      importedProducts++;
    }
  }
  useProductStore.setState({ products: currentProducts });

  // 3. Xử lý Định mức BOM
  // Chuẩn hóa ID của BOM theo ID hiện tại trong Store
  for (const b of data.bomItems) {
    // Tìm product_id và material_id tương ứng
    const srcProd = data.products.find((p) => p.id === b.product_id);
    const srcMat = data.materials.find((m) => m.id === b.material_id);

    const targetProdId = srcProd ? productIdByCode.get(srcProd.product_code.toUpperCase()) : b.product_id;
    const targetMatId = srcMat ? materialIdByCode.get(srcMat.material_code.toUpperCase()) : b.material_id;

    if (!targetProdId || !targetMatId) continue;

    const existingBomIdx = currentBoms.findIndex(
      (x) => x.product_id === targetProdId && x.material_id === targetMatId
    );

    if (existingBomIdx >= 0) {
      if (mode === 'merge') {
        currentBoms[existingBomIdx] = {
          ...currentBoms[existingBomIdx],
          net_quantity_per_unit: b.net_quantity_per_unit,
          waste_rate_override: b.waste_rate_override,
        };
        importedBoms++;
      }
    } else {
      currentBoms.push({
        id: `bom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product_id: targetProdId,
        material_id: targetMatId,
        net_quantity_per_unit: b.net_quantity_per_unit,
        waste_rate_override: b.waste_rate_override,
      });
      importedBoms++;
    }
  }
  useBomStore.setState({ bomItems: currentBoms });

  // 4. Xử lý Công trình nếu có trong file (chỉ thêm mới nếu chưa trùng mã)
  if (data.projects && data.projects.length > 0) {
    const curProjects = [...projectStore.projects];
    const curProjectProducts = [...projectStore.projectProducts];
    const curProjectBoms = [...projectStore.projectProductBoms];

    for (const proj of data.projects) {
      const exists = curProjects.some((p) => p.project_code.toUpperCase() === proj.project_code.toUpperCase());
      if (!exists) {
        curProjects.push(proj);
        importedProjects++;
        // Thêm các sản phẩm tương ứng của công trình này
        const prods = data.projectProducts?.filter((p) => p.project_id === proj.id) || [];
        curProjectProducts.push(...prods);
        const pIds = prods.map((p) => p.id);
        const boms = data.projectProductBoms?.filter((b) => pIds.includes(b.project_product_id)) || [];
        curProjectBoms.push(...boms);
      }
    }
    useProjectStore.setState({
      projects: curProjects,
      projectProducts: curProjectProducts,
      projectProductBoms: curProjectBoms,
    });
  }

  return {
    success: true,
    importedMaterials,
    importedProducts,
    importedBoms,
    importedProjects,
    message: `Đã nạp thành công: ${importedMaterials} vật tư, ${importedProducts} sản phẩm, ${importedBoms} dòng BOM${importedProjects ? `, ${importedProjects} công trình` : ''}.`,
  };
}

/**
 * 8. CƠ CHẾ HOÀN TÁC (UNDO SNAPSHOT)
 */
export function createUndoSnapshot() {
  if (typeof window === 'undefined') return;
  const snapshot = {
    materials: useMaterialStore.getState().materials,
    products: useProductStore.getState().products,
    bomItems: useBomStore.getState().bomItems,
    projects: useProjectStore.getState().projects,
    projectProducts: useProjectStore.getState().projectProducts,
    projectProductBoms: useProjectStore.getState().projectProductBoms,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(BACKUP_UNDO_KEY, JSON.stringify(snapshot));
}

export function hasUndoSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(BACKUP_UNDO_KEY);
}

export function restoreUndoSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(BACKUP_UNDO_KEY);
  if (!raw) return false;

  try {
    const snapshot = JSON.parse(raw);
    if (snapshot.materials) useMaterialStore.setState({ materials: snapshot.materials });
    if (snapshot.products) useProductStore.setState({ products: snapshot.products });
    if (snapshot.bomItems) useBomStore.setState({ bomItems: snapshot.bomItems });
    if (snapshot.projects) {
      useProjectStore.setState({
        projects: snapshot.projects,
        projectProducts: snapshot.projectProducts || [],
        projectProductBoms: snapshot.projectProductBoms || [],
      });
    }
    localStorage.removeItem(BACKUP_UNDO_KEY);
    return true;
  } catch {
    return false;
  }
}
