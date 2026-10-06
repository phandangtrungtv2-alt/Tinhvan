import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project, ProjectItem, ProjectProduct, ProjectProductBom, ProjectStatus } from '../types';
import {
  MOCK_PROJECTS,
  MOCK_PROJECT_ITEMS,
  MOCK_PROJECT_PRODUCTS,
  MOCK_PROJECT_PRODUCT_BOMS,
} from '../mock-data';
import { useBomStore } from './useBomStore';
import { useProductStore } from './useProductStore';

interface ProjectState {
  projects: Project[];
  projectItems: ProjectItem[]; // Giữ lại để tương thích ngược nếu cần
  projectProducts: ProjectProduct[]; // Sản phẩm riêng theo từng công trình (Ký hiệu, kích thước, số lượng)
  projectProductBoms: ProjectProductBom[]; // Định mức riêng khi bom_mode = 'custom'

  // Project CRUD
  addProject: (project: Omit<Project, 'id'>) => string;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id'>>) => void;
  updateProjectStatus: (id: string, status: ProjectStatus) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;

  // Project Products (Phương án C: Ký hiệu riêng theo công trình)
  getProjectProducts: (projectId: string) => ProjectProduct[];
  addProjectProduct: (data: Omit<ProjectProduct, 'id'>) => { success: boolean; id?: string; error?: string };
  updateProjectProduct: (id: string, updates: Partial<ProjectProduct>) => { success: boolean; error?: string };
  removeProjectProduct: (id: string) => void;
  updateProjectProductQty: (id: string, quantity: number) => void;

  // Sao chép từ công trình khác (Kèm định mức BOM độc lập, tùy chọn số lượng)
  copyProductsFromProject: (
    sourceProjectId: string,
    targetProjectId: string,
    productIds: string[],
    customQuantities?: Record<string, number>
  ) => { successCount: number; duplicateCount: number; addedCodes: string[] };

  // Nhân bản đồ nội thất ngay trong cùng công trình kèm toàn bộ định mức BOM
  duplicateProjectProduct: (productId: string) => { success: boolean; newId?: string; error?: string };

  // Tách BOM riêng hoặc Liên kết lại mẫu
  detachToCustomBom: (projectProductId: string) => boolean;
  relinkToTemplate: (projectProductId: string, templateId: string) => boolean;

  // Custom BOM CRUD (cho các sản phẩm có bom_mode = 'custom')
  getCustomBomItems: (projectProductId: string) => ProjectProductBom[];
  setCustomBomItems: (
    projectProductId: string,
    items: Omit<ProjectProductBom, 'id' | 'project_product_id'>[]
  ) => void;

  // Lưu sản phẩm công trình thành Mẫu mới trong thư viện
  saveAsNewTemplate: (
    projectProductId: string,
    newTemplateCode: string,
    newTemplateName: string,
    category?: string
  ) => { success: boolean; templateId?: string; error?: string };

  // Legacy Project Items CRUD (tương thích ngược)
  getProjectItems: (projectId: string) => ProjectItem[];
  addProjectItem: (item: Omit<ProjectItem, 'id'>) => string;
  updateProjectItemQty: (id: string, quantity: number) => void;
  removeProjectItem: (id: string) => void;
  setProjectItems: (projectId: string, items: { product_id: string; quantity: number }[]) => void;

  resetToDefault: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: MOCK_PROJECTS,
      projectItems: MOCK_PROJECT_ITEMS,
      projectProducts: MOCK_PROJECT_PRODUCTS,
      projectProductBoms: MOCK_PROJECT_PRODUCT_BOMS,

      addProject: (projectData) => {
        const id = `proj-${Date.now()}`;
        const newProject: Project = {
          ...projectData,
          id,
        };
        set((state) => ({
          projects: [...state.projects, newProject],
        }));
        return id;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      /**
       * CẬP NHẬT TRẠNG THÁI CÔNG TRÌNH
       * Nếu chuyển sang 'completed': Tự động KHÓA SỐ LIỆU bằng cách sao chép toàn bộ BOM mẫu
       * của các sản phẩm 'linked' thành 'custom' BOM riêng biệt (snapshot bất biến).
       */
      updateProjectStatus: (id, status) => {
        const state = get();
        const project = state.projects.find((p) => p.id === id);
        if (!project) return;

        // Nếu chuyển sang trạng thái 'completed', thực hiện snapshot khóa số liệu
        if (status === 'completed' && project.status !== 'completed') {
          const prods = state.projectProducts.filter((p) => p.project_id === id);
          const allBomItems = useBomStore.getState().bomItems;
          const newCustomBoms: ProjectProductBom[] = [];

          const updatedProds = prods.map((p) => {
            if (p.bom_mode === 'linked' && p.template_id) {
              // Lấy BOM mẫu hiện tại và snapshot sang custom BOM
              const templateBoms = allBomItems.filter((b) => b.product_id === p.template_id);
              for (const tb of templateBoms) {
                newCustomBoms.push({
                  id: `cpbom-snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  project_product_id: p.id,
                  material_id: tb.material_id,
                  net_quantity_per_unit: tb.net_quantity_per_unit,
                  waste_rate_override: tb.waste_rate_override,
                });
              }
              return {
                ...p,
                bom_mode: 'custom' as const,
                note: (p.note ? p.note + ' • ' : '') + 'Đã khóa BOM khi nghiệm thu công trình',
              };
            }
            return p;
          });

          set((s) => ({
            projects: s.projects.map((p) => (p.id === id ? { ...p, status } : p)),
            projectProducts: s.projectProducts.map((p) => {
              const found = updatedProds.find((up) => up.id === p.id);
              return found || p;
            }),
            projectProductBoms: [...s.projectProductBoms, ...newCustomBoms],
          }));
          return;
        }

        // Cập nhật trạng thái thông thường
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, status } : p)),
        }));
      },

      deleteProject: (id) => {
        set((state) => {
          const removedProdIds = state.projectProducts
            .filter((p) => p.project_id === id)
            .map((p) => p.id);
          return {
            projects: state.projects.filter((p) => p.id !== id),
            projectItems: state.projectItems.filter((item) => item.project_id !== id),
            projectProducts: state.projectProducts.filter((p) => p.project_id !== id),
            projectProductBoms: state.projectProductBoms.filter(
              (b) => !removedProdIds.includes(b.project_product_id)
            ),
          };
        });
      },

      getProject: (id) => {
        return get().projects.find((p) => p.id === id);
      },

      /**
       * QUẢN LÝ SẢN PHẨM RIÊNG CỦA CÔNG TRÌNH
       */
      getProjectProducts: (projectId) => {
        return get().projectProducts.filter((p) => p.project_id === projectId);
      },

      addProjectProduct: (data) => {
        const state = get();
        const cleanCode = data.item_code.trim().toUpperCase();

        if (!cleanCode) {
          return { success: false, error: 'Ký hiệu sản phẩm không được để trống' };
        }

        // KIỂM TRA TRÙNG KÝ HIỆU TRONG CÙNG 1 CÔNG TRÌNH
        const isDuplicate = state.projectProducts.some(
          (p) => p.project_id === data.project_id && p.item_code.trim().toUpperCase() === cleanCode
        );

        if (isDuplicate) {
          return {
            success: false,
            error: `Ký hiệu "${cleanCode}" đã tồn tại trong công trình này. Vui lòng đặt ký hiệu khác!`,
          };
        }

        const id = `pp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newProduct: ProjectProduct = {
          ...data,
          id,
          item_code: cleanCode,
          item_name: data.item_name.trim(),
          dimensions: data.dimensions?.trim() || '',
          quantity: Math.max(0, data.quantity || 0),
        };

        set((s) => ({
          projectProducts: [...s.projectProducts, newProduct],
        }));

        return { success: true, id };
      },

      updateProjectProduct: (id, updates) => {
        const state = get();
        const current = state.projectProducts.find((p) => p.id === id);
        if (!current) {
          return { success: false, error: 'Không tìm thấy sản phẩm' };
        }

        // Nếu có thay đổi ký hiệu (item_code), kiểm tra trùng trong công trình
        if (updates.item_code) {
          const newCode = updates.item_code.trim().toUpperCase();
          const isDuplicate = state.projectProducts.some(
            (p) =>
              p.id !== id &&
              p.project_id === current.project_id &&
              p.item_code.trim().toUpperCase() === newCode
          );

          if (isDuplicate) {
            return {
              success: false,
              error: `Ký hiệu "${newCode}" đã được dùng cho sản phẩm khác trong công trình này!`,
            };
          }
          updates.item_code = newCode;
        }

        set((s) => ({
          projectProducts: s.projectProducts.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));

        return { success: true };
      },

      removeProjectProduct: (id) => {
        set((state) => ({
          projectProducts: state.projectProducts.filter((p) => p.id !== id),
          projectProductBoms: state.projectProductBoms.filter((b) => b.project_product_id !== id),
        }));
      },

      updateProjectProductQty: (id, quantity) => {
        set((state) => ({
          projectProducts: state.projectProducts.map((p) =>
            p.id === id ? { ...p, quantity: Math.max(0, quantity) } : p
          ),
        }));
      },

      /**
       * SAO CHÉP SẢN PHẨM TỪ CÔNG TRÌNH KHÁC
       * - Sao chép toàn bộ định mức BOM độc lập (chuyển sang 'custom' để tự do sửa đổi)
       * - Tự kiểm tra trùng ký hiệu bản vẽ
       * - Cho phép truyền số lượng tùy chọn (mặc định = 1)
       */
      copyProductsFromProject: (sourceProjectId, targetProjectId, productIds, customQuantities = {}) => {
        const state = get();
        const sourceProject = state.projects.find((p) => p.id === sourceProjectId);
        const sourceProducts = state.projectProducts.filter(
          (p) => p.project_id === sourceProjectId && productIds.includes(p.id)
        );

        const targetExistingCodes = new Set(
          state.projectProducts
            .filter((p) => p.project_id === targetProjectId)
            .map((p) => p.item_code.trim().toUpperCase())
        );

        let successCount = 0;
        let duplicateCount = 0;
        const addedCodes: string[] = [];
        const newProductsToAdd: ProjectProduct[] = [];
        const newBomsToAdd: ProjectProductBom[] = [];
        const allTemplateBoms = useBomStore.getState().bomItems;

        for (const src of sourceProducts) {
          let targetCode = src.item_code.trim().toUpperCase();

          // Nếu trùng ký hiệu, tự sinh hậu tố _1, _2
          if (targetExistingCodes.has(targetCode)) {
            duplicateCount++;
            let counter = 1;
            while (targetExistingCodes.has(`${targetCode}_${counter}`)) {
              counter++;
            }
            targetCode = `${targetCode}_${counter}`;
          }

          targetExistingCodes.add(targetCode);

          const newId = `pp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const initialQty = customQuantities[src.id] !== undefined ? customQuantities[src.id] : (src.quantity > 0 ? src.quantity : 1);

          const newProd: ProjectProduct = {
            id: newId,
            project_id: targetProjectId,
            item_code: targetCode,
            item_name: src.item_name,
            dimensions: src.dimensions,
            template_id: src.template_id,
            bom_mode: 'custom', // Luôn chuyển sang BOM riêng để công trình mới tự do tùy biến
            quantity: initialQty,
            image_url: src.image_url,
            note: sourceProject ? `Sao chép từ ${sourceProject.project_code} (${src.item_code})` : 'Sao chép từ công trình khác',
          };

          newProductsToAdd.push(newProd);
          addedCodes.push(targetCode);
          successCount++;

          // Lấy định mức nguồn: Dù nguồn là custom hay linked, sao chép 100% sang BOM riêng của sản phẩm mới
          let sourceBoms: { material_id: string; net_quantity_per_unit: number; waste_rate_override: number | null }[] = [];
          if (src.bom_mode === 'custom') {
            sourceBoms = state.projectProductBoms.filter((b) => b.project_product_id === src.id);
          } else if (src.template_id) {
            sourceBoms = allTemplateBoms.filter((b) => b.product_id === src.template_id);
          }

          for (const b of sourceBoms) {
            newBomsToAdd.push({
              id: `cpbom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              project_product_id: newId,
              material_id: b.material_id,
              net_quantity_per_unit: b.net_quantity_per_unit,
              waste_rate_override: b.waste_rate_override,
            });
          }
        }

        set((s) => ({
          projectProducts: [...s.projectProducts, ...newProductsToAdd],
          projectProductBoms: [...s.projectProductBoms, ...newBomsToAdd],
        }));

        return { successCount, duplicateCount, addedCodes };
      },

      /**
       * NHÂN BẢN ĐỒ NỘI THẤT TRONG CÙNG CÔNG TRÌNH
       */
      duplicateProjectProduct: (productId) => {
        const state = get();
        const src = state.projectProducts.find((p) => p.id === productId);
        if (!src) return { success: false, error: 'Không tìm thấy sản phẩm' };

        const targetExistingCodes = new Set(
          state.projectProducts
            .filter((p) => p.project_id === src.project_id)
            .map((p) => p.item_code.trim().toUpperCase())
        );

        let targetCode = src.item_code.trim().toUpperCase();
        let counter = 1;
        while (targetExistingCodes.has(`${targetCode}_${counter}`)) {
          counter++;
        }
        targetCode = `${targetCode}_${counter}`;

        const newId = `pp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newProd: ProjectProduct = {
          ...src,
          id: newId,
          item_code: targetCode,
          item_name: `${src.item_name} (Bản sao)`,
          bom_mode: 'custom',
          note: `Nhân bản từ ${src.item_code}`,
        };

        const allTemplateBoms = useBomStore.getState().bomItems;
        let sourceBoms: { material_id: string; net_quantity_per_unit: number; waste_rate_override: number | null }[] = [];
        if (src.bom_mode === 'custom') {
          sourceBoms = state.projectProductBoms.filter((b) => b.project_product_id === src.id);
        } else if (src.template_id) {
          sourceBoms = allTemplateBoms.filter((b) => b.product_id === src.template_id);
        }

        const newBomsToAdd: ProjectProductBom[] = sourceBoms.map((b) => ({
          id: `cpbom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          project_product_id: newId,
          material_id: b.material_id,
          net_quantity_per_unit: b.net_quantity_per_unit,
          waste_rate_override: b.waste_rate_override,
        }));

        set((s) => ({
          projectProducts: [...s.projectProducts, newProd],
          projectProductBoms: [...s.projectProductBoms, ...newBomsToAdd],
        }));

        return { success: true, newId };
      },

      /**
       * TÁCH BOM RIÊNG: Chuyển từ 'linked' sang 'custom'
       * Sao chép toàn bộ vật tư từ mẫu sang bảng BOM riêng để chỉnh tự do
       */
      detachToCustomBom: (projectProductId) => {
        const state = get();
        const prod = state.projectProducts.find((p) => p.id === projectProductId);
        if (!prod || !prod.template_id) return false;

        const allBomItems = useBomStore.getState().bomItems;
        const templateBoms = allBomItems.filter((b) => b.product_id === prod.template_id);

        const newCustomBoms: ProjectProductBom[] = templateBoms.map((tb) => ({
          id: `cpbom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          project_product_id: projectProductId,
          material_id: tb.material_id,
          net_quantity_per_unit: tb.net_quantity_per_unit,
          waste_rate_override: tb.waste_rate_override,
        }));

        set((s) => ({
          projectProducts: s.projectProducts.map((p) =>
            p.id === projectProductId ? { ...p, bom_mode: 'custom' } : p
          ),
          projectProductBoms: [
            ...s.projectProductBoms.filter((b) => b.project_product_id !== projectProductId),
            ...newCustomBoms,
          ],
        }));

        return true;
      },

      /**
       * LIÊN KẾT LẠI VỚI MẪU THƯ VIỆN: Chuyển về 'linked'
       */
      relinkToTemplate: (projectProductId, templateId) => {
        set((s) => ({
          projectProducts: s.projectProducts.map((p) =>
            p.id === projectProductId
              ? { ...p, template_id: templateId, bom_mode: 'linked' }
              : p
          ),
          projectProductBoms: s.projectProductBoms.filter(
            (b) => b.project_product_id !== projectProductId
          ),
        }));
        return true;
      },

      getCustomBomItems: (projectProductId) => {
        return get().projectProductBoms.filter((b) => b.project_product_id === projectProductId);
      },

      setCustomBomItems: (projectProductId, items) => {
        const newBoms: ProjectProductBom[] = items.map((it, idx) => ({
          id: `cpbom-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          project_product_id: projectProductId,
          material_id: it.material_id,
          net_quantity_per_unit: it.net_quantity_per_unit,
          waste_rate_override: it.waste_rate_override,
        }));

        set((s) => ({
          projectProductBoms: [
            ...s.projectProductBoms.filter((b) => b.project_product_id !== projectProductId),
            ...newBoms,
          ],
        }));
      },

      /**
       * LƯU SẢN PHẨM CÔNG TRÌNH THÀNH MẪU MỚI TRONG THƯ VIỆN
       */
      saveAsNewTemplate: (projectProductId, newTemplateCode, newTemplateName, category = 'Mẫu công trình') => {
        const state = get();
        const prod = state.projectProducts.find((p) => p.id === projectProductId);
        if (!prod) return { success: false, error: 'Không tìm thấy sản phẩm' };

        const productStore = useProductStore.getState();
        const bomStore = useBomStore.getState();

        // Kiểm tra trùng mã sản phẩm trong thư viện
        const codeExists = productStore.products.some(
          (p) => p.product_code.toUpperCase() === newTemplateCode.trim().toUpperCase()
        );
        if (codeExists) {
          return { success: false, error: `Mã sản phẩm mẫu "${newTemplateCode}" đã tồn tại trong thư viện!` };
        }

        // Tạo sản phẩm mới trong ProductStore
        const newTemplateId = productStore.addProduct({
          product_code: newTemplateCode.trim().toUpperCase(),
          name: newTemplateName.trim(),
          description: `Tạo từ ký hiệu ${prod.item_code} (${prod.item_name}) - KT: ${prod.dimensions || 'N/A'}`,
          category,
        });

        // Lấy danh sách BOM để gán cho template mới
        let bomsToCopy: { material_id: string; net_quantity_per_unit: number; waste_rate_override: number | null }[] = [];

        if (prod.bom_mode === 'custom') {
          bomsToCopy = state.projectProductBoms.filter((b) => b.project_product_id === prod.id);
        } else if (prod.template_id) {
          bomsToCopy = bomStore.bomItems.filter((b) => b.product_id === prod.template_id);
        }

        for (const b of bomsToCopy) {
          bomStore.addBomItem({
            product_id: newTemplateId,
            material_id: b.material_id,
            net_quantity_per_unit: b.net_quantity_per_unit,
            waste_rate_override: b.waste_rate_override,
          });
        }

        // Cập nhật sản phẩm này trỏ về template mới vừa tạo
        set((s) => ({
          projectProducts: s.projectProducts.map((p) =>
            p.id === projectProductId ? { ...p, template_id: newTemplateId, bom_mode: 'linked' } : p
          ),
          projectProductBoms: s.projectProductBoms.filter((b) => b.project_product_id !== projectProductId),
        }));

        return { success: true, templateId: newTemplateId };
      },

      /**
       * TƯƠNG THÍCH NGƯỢC: Legacy Project Items
       */
      getProjectItems: (projectId) => {
        return get().projectItems.filter((item) => item.project_id === projectId);
      },

      addProjectItem: (itemData) => {
        const id = `pi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newItem: ProjectItem = {
          ...itemData,
          id,
        };
        set((state) => {
          const existing = state.projectItems.find(
            (it) => it.project_id === itemData.project_id && it.product_id === itemData.product_id
          );
          if (existing) {
            return {
              projectItems: state.projectItems.map((it) =>
                it.id === existing.id
                  ? { ...it, quantity: it.quantity + itemData.quantity }
                  : it
              ),
            };
          }
          return {
            projectItems: [...state.projectItems, newItem],
          };
        });
        return id;
      },

      updateProjectItemQty: (id, quantity) => {
        set((state) => ({
          projectItems: state.projectItems.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item
          ),
        }));
      },

      removeProjectItem: (id) => {
        set((state) => ({
          projectItems: state.projectItems.filter((item) => item.id !== id),
        }));
      },

      setProjectItems: (projectId, items) => {
        set((state) => {
          const otherItems = state.projectItems.filter((it) => it.project_id !== projectId);
          const newItems: ProjectItem[] = items.map((it, idx) => ({
            id: `pi-${projectId}-${Date.now()}-${idx}`,
            project_id: projectId,
            product_id: it.product_id,
            quantity: it.quantity,
          }));
          return {
            projectItems: [...otherItems, ...newItems],
          };
        });
      },

      resetToDefault: () => {
        set({
          projects: MOCK_PROJECTS,
          projectItems: MOCK_PROJECT_ITEMS,
          projectProducts: MOCK_PROJECT_PRODUCTS,
          projectProductBoms: MOCK_PROJECT_PRODUCT_BOMS,
        });
      },
    }),
    {
      name: 'furniture_projects_storage_v3',
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persistedState: any, version: number) => {
        // Tự động khôi phục nếu người dùng từng có dữ liệu ở bản cũ
        if (typeof window !== 'undefined' && (!persistedState || !persistedState.projects || persistedState.projects.length === 0)) {
          try {
            const legacyRaw = localStorage.getItem('furniture_projects_storage');
            if (legacyRaw) {
              const parsed = JSON.parse(legacyRaw);
              if (parsed?.state?.projects?.length > 0) {
                return {
                  ...persistedState,
                  projects: parsed.state.projects,
                  projectItems: parsed.state.projectItems || [],
                  projectProducts: persistedState?.projectProducts || MOCK_PROJECT_PRODUCTS,
                  projectProductBoms: persistedState?.projectProductBoms || MOCK_PROJECT_PRODUCT_BOMS,
                };
              }
            }
          } catch {}
        }
        return persistedState as ProjectState;
      },
    }
  )
);
