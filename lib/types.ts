/**
 * SCHEMA DEFINITIONS - HỆ THỐNG BÓC TÁCH ĐỊNH MỨC & TÍNH TOÁN ĐẶT HÀNG VẬT TƯ
 */

export type MaterialCategory = 'board' | 'edge' | 'hardware' | 'accessory' | 'consumable';

export type MaterialBaseUnit = 'Tấm' | 'Mét' | 'Cái' | 'Bộ' | 'Kg';

export type MaterialRoundingMode = 'ceil_integer' | 'package' | 'exact';

export interface PackageSpec {
  has_pack: boolean;
  pack_size: number;
  pack_unit_name: string;
}

export interface Material {
  id: string;
  material_code: string;
  name: string;
  category: MaterialCategory;
  base_unit: MaterialBaseUnit;
  default_waste_rate: number; // e.g. 10 for 10%
  rounding_mode: MaterialRoundingMode;
  package_spec: PackageSpec;
  unit_price: number; // VNĐ
  weight_per_unit?: number; // Khối lượng (Kg) trên 1 đơn vị base_unit
}

export interface Product {
  id: string;
  product_code: string;
  name: string;
  description: string;
  category: string;
  image_url?: string; // Hình ảnh minh họa sản phẩm (Base64 hoặc URL)
}

export interface ProductBom {
  id: string;
  product_id: string;
  material_id: string;
  net_quantity_per_unit: number;
  waste_rate_override: number | null;
}

export type ProjectStatus = 'planning' | 'in_production' | 'completed';

export interface Project {
  id: string;
  project_code: string;
  name: string;
  client_name: string;
  deadline: string; // ISO date string (YYYY-MM-DD)
  status: ProjectStatus;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  product_id: string;
  quantity: number;
}

/**
 * QUẢN LÝ SẢN PHẨM RIÊNG THEO CÔNG TRÌNH (PHƯƠNG ÁN C - HYBRID)
 */
export type BomMode = 'linked' | 'custom';

export interface ProjectProduct {
  id: string;
  project_id: string;
  item_code: string;        // Ký hiệu theo bản vẽ công trình (ví dụ TC2, BNV1, T-05) - DUY NHẤT trong 1 công trình
  item_name: string;        // Tên gọi sản phẩm theo công trình
  dimensions?: string;      // Kích thước (D x R x C, mm) ví dụ: "900x400x1800"
  template_id?: string | null; // ID sản phẩm trong thư viện mẫu (để nhận biết cùng cấu tạo)
  bom_mode: BomMode;        // 'linked': liên kết dùng BOM mẫu; 'custom': BOM riêng biệt
  quantity: number;         // Số lượng cần làm trong công trình này
  note?: string;
  image_url?: string;       // Hình ảnh minh họa bản vẽ / phối cảnh 3D
}

export interface ProjectProductBom {
  id: string;
  project_product_id: string; // Trỏ tới ProjectProduct.id
  material_id: string;
  net_quantity_per_unit: number;
  waste_rate_override: number | null;
}

/**
 * CALCULATION & REPORTING TYPES
 */

export interface MaterialCalcResult {
  netQty: number;        // Khối lượng tinh
  wasteRate: number;     // Tỷ lệ hao hụt (%)
  grossQty: number;      // Khối lượng thô (Net * (1 + Waste/100))
  orderQty: number;      // Khối lượng đặt hàng theo đơn vị chuẩn
  orderPacks: number;    // Số gói/cuộn/hộp nếu rounding_mode là 'package'
  surplus: number;       // Lượng dư dôi (orderQty - grossQty)
  totalAmount: number;   // Thành tiền dự kiến (orderQty * unit_price)
  totalWeight?: number;  // Tổng trọng lượng dự kiến (Kg)
}

// Chi tiết cấu thành từ sản phẩm trong công trình
export interface ProductContribution {
  productId: string;
  productCode: string;
  productName: string;
  itemCode?: string;       // Ký hiệu riêng theo bản vẽ công trình (ví dụ TC2, T-05)
  itemName?: string;       // Tên gọi riêng theo công trình
  dimensions?: string;     // Kích thước D x R x C
  templateCode?: string;   // Mã mẫu gốc nếu liên kết
  bomMode?: BomMode;
  productQty: number;
  netPerUnit: number;
  totalNet: number;
  wasteRate: number;
  totalGross: number;
  weightPerUnit?: number;
}

// Bóc tách theo từng công trình
export interface ProjectBreakdownItem extends MaterialCalcResult {
  material: Material;
  productContributions: ProductContribution[];
}

export interface ProjectBreakdown {
  projectId: string;
  project: Project | null;
  items: ProjectBreakdownItem[];
  totalAmount: number;
  totalWeight: number; // Tổng trọng lượng vật tư công trình (Kg)
}

// Chi tiết cấu thành từ từng công trình trong lô đặt hàng gộp
export interface ProjectContribution {
  projectId: string;
  projectCode: string;
  projectName: string;
  netQty: number;
  grossQty: number;
}

// Bóc tách gộp theo lô nhiều công trình
export interface BatchBreakdownItem extends MaterialCalcResult {
  material: Material;
  projectContributions: ProjectContribution[];
}

export interface BatchBreakdown {
  selectedProjectIds: string[];
  items: BatchBreakdownItem[];
  totalAmount: number;
  totalWeight: number; // Tổng trọng lượng lô đặt hàng (Kg)
}

// Tổng quan nhanh cho phòng mua hàng / sản xuất
export interface ProcurementSummary {
  totalBoardSheets: number;   // Tổng tấm ván cần mua (Tấm)
  totalEdgeMeters: number;    // Tổng mét nẹp cần mua (Mét)
  totalPackages: number;      // Tổng số kiện/hộp/cuộn/bịch
  totalAmount: number;        // Tổng giá trị đặt hàng (VNĐ)
  totalWeightKg: number;      // Tổng trọng lượng vật tư cần nhập/vận chuyển (Kg)
  materialTypesCount: number; // Số loại vật tư khác nhau
  projectCount: number;       // Số công trình được chọn
}

/**
 * CẤU HÌNH & SAO LƯU HỆ THỐNG (BACKUP / RESTORE / EXCEL IMPORT)
 */
export interface AppBackupData {
  version: number;
  timestamp: string;
  app: string;
  materials: Material[];
  products: Product[];
  bomItems: ProductBom[];
  projects?: Project[];
  projectProducts?: ProjectProduct[];
  projectProductBoms?: ProjectProductBom[];
  wasteRateOverrides?: Record<string, number>;
}

export type ImportMode = 'merge' | 'add_only' | 'overwrite';

export interface ValidationIssue {
  type: 'error' | 'warning';
  sheet?: string;
  row?: number;
  code?: string;
  message: string;
}

export interface ParsedConfigPreview {
  materialsCount: number;
  newMaterialsCount: number;
  updatedMaterialsCount: number;

  productsCount: number;
  newProductsCount: number;
  updatedProductsCount: number;

  bomCount: number;
  projectsCount?: number;

  issues: ValidationIssue[];
  data: AppBackupData;
}

export interface ImportResult {
  success: boolean;
  importedMaterials: number;
  importedProducts: number;
  importedBoms: number;
  importedProjects?: number;
  message: string;
}

