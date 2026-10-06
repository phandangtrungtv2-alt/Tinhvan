import { Material, Product, ProductBom, Project, ProjectItem, ProjectProduct, ProjectProductBom } from "./types";

export const MOCK_MATERIALS: Material[] = [
  {
    id: 'mat-1',
    material_code: 'MDF-17-MP',
    name: 'MDF chống ẩm 17mm Melamine Mộc Phát',
    category: 'board',
    base_unit: 'Tấm',
    default_waste_rate: 10,
    rounding_mode: 'ceil_integer',
    package_spec: {
      has_pack: false,
      pack_size: 1,
      pack_unit_name: 'Tấm',
    },
    unit_price: 320000,
    weight_per_unit: 31.5,
  },
  {
    id: 'mat-2',
    material_code: 'MDF-09-HT',
    name: 'MDF chống ẩm 9mm (hậu tủ)',
    category: 'board',
    base_unit: 'Tấm',
    default_waste_rate: 12,
    rounding_mode: 'ceil_integer',
    package_spec: {
      has_pack: false,
      pack_size: 1,
      pack_unit_name: 'Tấm',
    },
    unit_price: 195000,
    weight_per_unit: 16.7,
  },
  {
    id: 'mat-7',
    material_code: 'MDF-17-AC',
    name: 'Ván MDF chống ẩm 17mm Melamine An Cường',
    category: 'board',
    base_unit: 'Tấm',
    default_waste_rate: 10,
    rounding_mode: 'ceil_integer',
    package_spec: {
      has_pack: false,
      pack_size: 1,
      pack_unit_name: 'Tấm',
    },
    unit_price: 430000,
    weight_per_unit: 32.0,
  },
  {
    id: 'mat-8',
    material_code: 'MFC-18-BT',
    name: 'Ván MFC chống ẩm 18mm Ba Thanh',
    category: 'board',
    base_unit: 'Tấm',
    default_waste_rate: 10,
    rounding_mode: 'ceil_integer',
    package_spec: {
      has_pack: false,
      pack_size: 1,
      pack_unit_name: 'Tấm',
    },
    unit_price: 290000,
    weight_per_unit: 33.0,
  },
  {
    id: 'mat-3',
    material_code: 'NEP-PVC-21',
    name: 'Nẹp chỉ PVC 21x1mm',
    category: 'edge',
    base_unit: 'Mét',
    default_waste_rate: 8,
    rounding_mode: 'package',
    package_spec: {
      has_pack: true,
      pack_size: 100,
      pack_unit_name: 'Cuộn',
    },
    unit_price: 1200,
    weight_per_unit: 0.025,
  },
  {
    id: 'mat-9',
    material_code: 'NEP-PVC-45',
    name: 'Nẹp chỉ PVC 45x1mm dán cạnh mặt bàn',
    category: 'edge',
    base_unit: 'Mét',
    default_waste_rate: 8,
    rounding_mode: 'package',
    package_spec: {
      has_pack: true,
      pack_size: 100,
      pack_unit_name: 'Cuộn',
    },
    unit_price: 2600,
    weight_per_unit: 0.055,
  },
  {
    id: 'mat-4',
    material_code: 'BL-GC-INOX',
    name: 'Bản lề giảm chấn inox 304',
    category: 'hardware',
    base_unit: 'Cái',
    default_waste_rate: 3,
    rounding_mode: 'package',
    package_spec: {
      has_pack: true,
      pack_size: 100,
      pack_unit_name: 'Hộp',
    },
    unit_price: 12000,
    weight_per_unit: 0.085,
  },
  {
    id: 'mat-5',
    material_code: 'OC-CAM-LK',
    name: 'Ốc cam liên kết (chốt đợt + tán nở)',
    category: 'hardware',
    base_unit: 'Bộ',
    default_waste_rate: 5,
    rounding_mode: 'package',
    package_spec: {
      has_pack: true,
      pack_size: 500,
      pack_unit_name: 'Bịch',
    },
    unit_price: 800,
    weight_per_unit: 0.012,
  },
  {
    id: 'mat-6',
    material_code: 'RAY-BI-450',
    name: 'Ray trượt bi 3 tầng 450mm sơn đen',
    category: 'accessory',
    base_unit: 'Bộ',
    default_waste_rate: 0,
    rounding_mode: 'ceil_integer',
    package_spec: {
      has_pack: false,
      pack_size: 1,
      pack_unit_name: 'Bộ',
    },
    unit_price: 45000,
    weight_per_unit: 0.75,
  },
  {
    id: 'mat-10',
    material_code: 'RAY-AM-GC',
    name: 'Ray trượt âm đáy giảm chấn mở toàn phần 450mm',
    category: 'accessory',
    base_unit: 'Bộ',
    default_waste_rate: 0,
    rounding_mode: 'ceil_integer',
    package_spec: {
      has_pack: false,
      pack_size: 1,
      pack_unit_name: 'Bộ',
    },
    unit_price: 135000,
    weight_per_unit: 1.15,
  },
  {
    id: 'mat-11',
    material_code: 'PISTON-80N',
    name: 'Piston thủy lực nâng cánh lật tủ 80N',
    category: 'accessory',
    base_unit: 'Cái',
    default_waste_rate: 0,
    rounding_mode: 'ceil_integer',
    package_spec: {
      has_pack: false,
      pack_size: 1,
      pack_unit_name: 'Cái',
    },
    unit_price: 32000,
    weight_per_unit: 0.28,
  },
  {
    id: 'mat-12',
    material_code: 'TN-NHOM-U',
    name: 'Tay nắm nhôm đúc âm chữ U thanh dài',
    category: 'hardware',
    base_unit: 'Cái',
    default_waste_rate: 2,
    rounding_mode: 'ceil_integer',
    package_spec: {
      has_pack: false,
      pack_size: 1,
      pack_unit_name: 'Cái',
    },
    unit_price: 38000,
    weight_per_unit: 0.16,
  },
  {
    id: 'mat-13',
    material_code: 'KEO-PUR-01',
    name: 'Keo hạt dán cạnh chịu nhiệt chống nước PUR',
    category: 'consumable',
    base_unit: 'Kg',
    default_waste_rate: 15,
    rounding_mode: 'exact',
    package_spec: {
      has_pack: true,
      pack_size: 25,
      pack_unit_name: 'Bao (25kg)',
    },
    unit_price: 185000,
    weight_per_unit: 1.0,
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    product_code: 'TC1',
    name: 'Tủ tài liệu',
    description: 'Tủ hồ sơ văn phòng 2 cánh mở kích thước tiêu chuẩn',
    category: 'Tủ văn phòng',
  },
  {
    id: 'prod-2',
    product_code: 'BNV1',
    name: 'Bàn nhân viên',
    description: 'Bàn làm việc nhân viên văn phòng 1200x600',
    category: 'Bàn văn phòng',
  },
  {
    id: 'prod-3',
    product_code: 'TN1',
    name: 'Tủ nước',
    description: 'Tủ pantry / tủ nước văn phòng kèm ngăn kéo',
    category: 'Tủ văn phòng',
  },
];

export const MOCK_BOM: ProductBom[] = [
  // TC1 Tủ tài liệu: 1.8 MDF17, 0.4 MDF9, 22m nẹp, 8 bản lề, 24 ốc cam
  { id: 'bom-1', product_id: 'prod-1', material_id: 'mat-1', net_quantity_per_unit: 1.8, waste_rate_override: null },
  { id: 'bom-2', product_id: 'prod-1', material_id: 'mat-2', net_quantity_per_unit: 0.4, waste_rate_override: null },
  { id: 'bom-3', product_id: 'prod-1', material_id: 'mat-3', net_quantity_per_unit: 22,  waste_rate_override: null },
  { id: 'bom-4', product_id: 'prod-1', material_id: 'mat-4', net_quantity_per_unit: 8,   waste_rate_override: null },
  { id: 'bom-5', product_id: 'prod-1', material_id: 'mat-5', net_quantity_per_unit: 24,  waste_rate_override: null },

  // BNV1 Bàn nhân viên: 1.1 MDF17, 14m nẹp, 16 ốc cam
  { id: 'bom-6', product_id: 'prod-2', material_id: 'mat-1', net_quantity_per_unit: 1.1, waste_rate_override: null },
  { id: 'bom-7', product_id: 'prod-2', material_id: 'mat-3', net_quantity_per_unit: 14,  waste_rate_override: null },
  { id: 'bom-8', product_id: 'prod-2', material_id: 'mat-5', net_quantity_per_unit: 16,  waste_rate_override: null },

  // TN1 Tủ nước: 1.4 MDF17, 0.3 MDF9, 18m nẹp, 6 bản lề, 1 ray
  { id: 'bom-9',  product_id: 'prod-3', material_id: 'mat-1', net_quantity_per_unit: 1.4, waste_rate_override: null },
  { id: 'bom-10', product_id: 'prod-3', material_id: 'mat-2', net_quantity_per_unit: 0.3, waste_rate_override: null },
  { id: 'bom-11', product_id: 'prod-3', material_id: 'mat-3', net_quantity_per_unit: 18,  waste_rate_override: null },
  { id: 'bom-12', product_id: 'prod-3', material_id: 'mat-4', net_quantity_per_unit: 6,   waste_rate_override: null },
  { id: 'bom-13', product_id: 'prod-3', material_id: 'mat-6', net_quantity_per_unit: 1,   waste_rate_override: null },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    project_code: 'DA-TB-01',
    name: 'A – Văn phòng Tân Bình',
    client_name: 'Công ty Cổ phần Công nghệ Tân Bình',
    deadline: '2026-11-15',
    status: 'in_production',
  },
  {
    id: 'proj-2',
    project_code: 'DA-CG-02',
    name: 'B – Chi nhánh Cầu Giấy',
    client_name: 'Ngân hàng TMCP Chi nhánh Cầu Giấy',
    deadline: '2026-11-30',
    status: 'planning',
  },
];

export const MOCK_PROJECT_ITEMS: ProjectItem[] = [
  // A – Văn phòng Tân Bình: 25 TC1, 40 BNV1
  { id: 'pi-1', project_id: 'proj-1', product_id: 'prod-1', quantity: 25 },
  { id: 'pi-2', project_id: 'proj-1', product_id: 'prod-2', quantity: 40 },

  // B – Chi nhánh Cầu Giấy: 15 TC1, 10 TN1
  { id: 'pi-3', project_id: 'proj-2', product_id: 'prod-1', quantity: 15 },
  { id: 'pi-4', project_id: 'proj-2', product_id: 'prod-3', quantity: 10 },
];

export const MOCK_PROJECT_PRODUCTS: ProjectProduct[] = [
  // A – Văn phòng Tân Bình
  {
    id: 'pp-1-1',
    project_id: 'proj-1',
    item_code: 'TC1',
    item_name: 'Tủ tài liệu 2 cánh',
    dimensions: '900 x 400 x 1800',
    template_id: 'prod-1',
    bom_mode: 'linked',
    quantity: 25,
    note: 'Khu vực phòng kinh doanh',
  },
  {
    id: 'pp-1-2',
    project_id: 'proj-1',
    item_code: 'BNV1',
    item_name: 'Bàn nhân viên chuẩn',
    dimensions: '1200 x 600 x 750',
    template_id: 'prod-2',
    bom_mode: 'linked',
    quantity: 40,
    note: 'Cụm bàn làm việc 4 chỗ',
  },

  // B – Chi nhánh Cầu Giấy (Ký hiệu bản vẽ gọi là TC2 nhưng cấu tạo dùng chung mẫu TC1)
  {
    id: 'pp-2-1',
    project_id: 'proj-2',
    item_code: 'TC2',
    item_name: 'Tủ hồ sơ phòng giao dịch',
    dimensions: '900 x 400 x 1800',
    template_id: 'prod-1', // Cùng cấu tạo với TC1!
    bom_mode: 'linked',
    quantity: 15,
    note: 'Bản vẽ Cầu Giấy ký hiệu TC2',
  },
  {
    id: 'pp-2-2',
    project_id: 'proj-2',
    item_code: 'TN1',
    item_name: 'Tủ nước pantry văn phòng',
    dimensions: '800 x 450 x 850',
    template_id: 'prod-3',
    bom_mode: 'linked',
    quantity: 10,
    note: 'Khu vực pantry tầng 2',
  },
];

export const MOCK_PROJECT_PRODUCT_BOMS: ProjectProductBom[] = [
  // Khi sản phẩm chuyển sang bom_mode = 'custom', các định mức riêng sẽ được lưu tại đây
];
