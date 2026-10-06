import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  BatchBreakdown,
  BatchBreakdownItem,
  Material,
  ProcurementSummary,
  ProjectBreakdown,
  ProjectBreakdownItem,
  ProductContribution,
  ProjectContribution,
} from '../types';
import { calcOrderFromGross } from '../calc';
import { useMaterialStore } from './useMaterialStore';
import { useProductStore } from './useProductStore';
import { useBomStore } from './useBomStore';
import { useProjectStore } from './useProjectStore';

interface ProcurementState {
  selectedProjectIds: string[];
  wasteRateOverrides: Record<string, number>; // materialId -> override waste rate (%)

  // Actions
  setSelectedProjectIds: (ids: string[]) => void;
  toggleProjectId: (id: string) => void;
  selectAllProjects: () => void;
  clearSelectedProjects: () => void;
  selectInProductionOnly: () => void;

  setWasteRateOverride: (materialId: string, rate: number) => void;
  resetWasteRateOverrides: () => void;

  // Selectors (giữ nguyên không đổi schema & name)
  selectProjectBreakdown: (projectId: string) => ProjectBreakdown;
  selectBatchBreakdown: (projectIds?: string[]) => BatchBreakdown;
  selectSummary: (projectIds?: string[]) => ProcurementSummary;
}

export const useProcurementStore = create<ProcurementState>()(
  persist(
    (set, get) => ({
      // Mặc định nạp 2 dự án mẫu ban đầu
      selectedProjectIds: ['proj-1', 'proj-2'],
      wasteRateOverrides: {},

      setSelectedProjectIds: (ids) => {
        set({ selectedProjectIds: ids });
      },

      toggleProjectId: (id) => {
        set((state) => {
          const exists = state.selectedProjectIds.includes(id);
          return {
            selectedProjectIds: exists
              ? state.selectedProjectIds.filter((pId) => pId !== id)
              : [...state.selectedProjectIds, id],
          };
        });
      },

      selectAllProjects: () => {
        const allProjectIds = useProjectStore.getState().projects.map((p) => p.id);
        set({ selectedProjectIds: allProjectIds });
      },

      clearSelectedProjects: () => {
        set({ selectedProjectIds: [] });
      },

      selectInProductionOnly: () => {
        const inProdIds = useProjectStore
          .getState()
          .projects.filter((p) => p.status === 'in_production')
          .map((p) => p.id);
        set({ selectedProjectIds: inProdIds });
      },

      setWasteRateOverride: (materialId, rate) => {
        const cleanRate = Math.max(0, Math.min(100, Number(rate) || 0));
        set((state) => ({
          wasteRateOverrides: {
            ...state.wasteRateOverrides,
            [materialId]: cleanRate,
          },
        }));
      },

      resetWasteRateOverrides: () => {
        set({ wasteRateOverrides: {} });
      },

      /**
       * Selector 1: Bóc tách vật tư cho 1 công trình cụ thể
       */
      selectProjectBreakdown: (projectId: string): ProjectBreakdown => {
        const project = useProjectStore.getState().getProject(projectId) || null;
        const projectProducts = useProjectStore.getState().getProjectProducts(projectId);
        const projectItems = useProjectStore.getState().getProjectItems(projectId);
        const materials = useMaterialStore.getState().materials;
        const products = useProductStore.getState().products;
        const bomItems = useBomStore.getState().bomItems;

        const materialMap = new Map<
          string,
          {
            material: Material;
            contributions: ProductContribution[];
          }
        >();

        // 1. ƯU TIÊN: Đọc từ projectProducts (Phương án C - Sản phẩm & ký hiệu theo công trình)
        if (projectProducts.length > 0) {
          for (const pProduct of projectProducts) {
            if (pProduct.quantity <= 0) continue;

            const template = pProduct.template_id
              ? products.find((p) => p.id === pProduct.template_id)
              : null;

            // Xác định danh sách BOM tùy theo bom_mode
            let boms: { material_id: string; net_quantity_per_unit: number; waste_rate_override: number | null }[] = [];
            if (pProduct.bom_mode === 'custom') {
              boms = useProjectStore.getState().getCustomBomItems(pProduct.id);
            } else if (pProduct.template_id) {
              boms = bomItems.filter((b) => b.product_id === pProduct.template_id);
            }

            for (const bom of boms) {
              const material = materials.find((m) => m.id === bom.material_id);
              if (!material) continue;

              const netPerUnit = bom.net_quantity_per_unit;
              const totalNet = Number((pProduct.quantity * netPerUnit).toFixed(4));
              const wasteRate = bom.waste_rate_override ?? material.default_waste_rate;
              const totalGross = Number((totalNet * (1 + wasteRate / 100)).toFixed(4));

              const contribution: ProductContribution = {
                productId: pProduct.id,
                productCode: pProduct.item_code,
                productName: pProduct.item_name,
                itemCode: pProduct.item_code,
                itemName: pProduct.item_name,
                dimensions: pProduct.dimensions,
                templateCode: template?.product_code,
                bomMode: pProduct.bom_mode,
                productQty: pProduct.quantity,
                netPerUnit,
                totalNet,
                wasteRate,
                totalGross,
              };

              if (!materialMap.has(material.id)) {
                materialMap.set(material.id, {
                  material,
                  contributions: [],
                });
              }

              materialMap.get(material.id)!.contributions.push(contribution);
            }
          }
        } else {
          // 2. FALLBACK TƯƠNG THÍCH NGƯỢC: Nếu chưa có projectProducts
          for (const item of projectItems) {
            const product = products.find((p) => p.id === item.product_id);
            if (!product || item.quantity <= 0) continue;

            const productBoms = bomItems.filter((b) => b.product_id === product.id);

            for (const bom of productBoms) {
              const material = materials.find((m) => m.id === bom.material_id);
              if (!material) continue;

              const netPerUnit = bom.net_quantity_per_unit;
              const totalNet = Number((item.quantity * netPerUnit).toFixed(4));
              const wasteRate = bom.waste_rate_override ?? material.default_waste_rate;
              const totalGross = Number((totalNet * (1 + wasteRate / 100)).toFixed(4));

              const contribution: ProductContribution = {
                productId: product.id,
                productCode: product.product_code,
                productName: product.name,
                itemCode: product.product_code,
                itemName: product.name,
                productQty: item.quantity,
                netPerUnit,
                totalNet,
                wasteRate,
                totalGross,
              };

              if (!materialMap.has(material.id)) {
                materialMap.set(material.id, {
                  material,
                  contributions: [],
                });
              }

              materialMap.get(material.id)!.contributions.push(contribution);
            }
          }
        }

        const items: ProjectBreakdownItem[] = [];
        let projectTotalAmount = 0;

        for (const entry of Array.from(materialMap.values())) {
          const { material, contributions } = entry;
          const totalNet = contributions.reduce((acc, c) => acc + c.totalNet, 0);
          const totalGross = contributions.reduce((acc, c) => acc + c.totalGross, 0);

          const calc = calcOrderFromGross(material, totalNet, totalGross);
          projectTotalAmount += calc.totalAmount;

          items.push({
            ...calc,
            material,
            productContributions: contributions,
          });
        }

        const categoryPriority: Record<string, number> = {
          board: 1,
          edge: 2,
          hardware: 3,
          accessory: 4,
          consumable: 5,
        };
        items.sort((a, b) => {
          const pA = categoryPriority[a.material.category] || 99;
          const pB = categoryPriority[b.material.category] || 99;
          if (pA !== pB) return pA - pB;
          return a.material.material_code.localeCompare(b.material.material_code);
        });

        const projectTotalWeight = Number(items.reduce((acc, it) => acc + (it.totalWeight || 0), 0).toFixed(2));

        return {
          projectId,
          project,
          items,
          totalAmount: projectTotalAmount,
          totalWeight: projectTotalWeight,
        };
      },

      /**
       * Selector 2: Bóc tách gộp nhiều công trình thành một lô đặt hàng lớn
       * Hỗ trợ realtime ghi đè % hao hụt ngay trên bảng tổng hợp
       */
      selectBatchBreakdown: (projectIds?: string[]): BatchBreakdown => {
        const targetIds = projectIds ?? get().selectedProjectIds;
        const allProjects = useProjectStore.getState().projects;
        const overrides = get().wasteRateOverrides;

        const batchMap = new Map<
          string,
          {
            material: Material;
            contributions: ProjectContribution[];
          }
        >();

        for (const pId of targetIds) {
          const pBreakdown = get().selectProjectBreakdown(pId);
          const projectInfo = allProjects.find((p) => p.id === pId) || pBreakdown.project;
          const projectCode = projectInfo?.project_code || 'DA-UNKNOWN';
          const projectName = projectInfo?.name || 'Công trình';

          for (const item of pBreakdown.items) {
            const matId = item.material.id;
            if (!batchMap.has(matId)) {
              batchMap.set(matId, {
                material: item.material,
                contributions: [],
              });
            }

            batchMap.get(matId)!.contributions.push({
              projectId: pId,
              projectCode,
              projectName,
              netQty: item.netQty,
              grossQty: item.grossQty,
            });
          }
        }

        const items: BatchBreakdownItem[] = [];
        let batchTotalAmount = 0;

        for (const entry of Array.from(batchMap.values())) {
          const { material, contributions } = entry;
          const batchNetQty = contributions.reduce((acc, c) => acc + c.netQty, 0);

          let batchGrossQty: number;
          let effectiveRate: number;

          // Nếu có override tỷ lệ hao hụt của vật tư này
          if (typeof overrides[material.id] === 'number') {
            effectiveRate = overrides[material.id];
            batchGrossQty = Number((batchNetQty * (1 + effectiveRate / 100)).toFixed(4));
          } else {
            batchGrossQty = contributions.reduce((acc, c) => acc + c.grossQty, 0);
            effectiveRate = batchNetQty > 0 ? ((batchGrossQty - batchNetQty) / batchNetQty) * 100 : material.default_waste_rate;
          }

          const calc = calcOrderFromGross(material, batchNetQty, batchGrossQty, effectiveRate);
          batchTotalAmount += calc.totalAmount;

          items.push({
            ...calc,
            material,
            projectContributions: contributions,
          });
        }

        const categoryPriority: Record<string, number> = {
          board: 1,
          edge: 2,
          hardware: 3,
          accessory: 4,
          consumable: 5,
        };
        items.sort((a, b) => {
          const pA = categoryPriority[a.material.category] || 99;
          const pB = categoryPriority[b.material.category] || 99;
          if (pA !== pB) return pA - pB;
          return a.material.material_code.localeCompare(b.material.material_code);
        });

        const batchTotalWeight = Number(items.reduce((acc, it) => acc + (it.totalWeight || 0), 0).toFixed(2));

        return {
          selectedProjectIds: targetIds,
          items,
          totalAmount: batchTotalAmount,
          totalWeight: batchTotalWeight,
        };
      },

      /**
       * Selector 3: Tổng hợp nhanh số liệu
       */
      selectSummary: (projectIds?: string[]): ProcurementSummary => {
        const batch = get().selectBatchBreakdown(projectIds);

        let totalBoardSheets = 0;
        let totalEdgeMeters = 0;
        let totalPackages = 0;

        for (const item of batch.items) {
          if (item.material.category === 'board' || item.material.base_unit === 'Tấm') {
            totalBoardSheets += item.orderQty;
          } else if (item.material.category === 'edge' || item.material.base_unit === 'Mét') {
            totalEdgeMeters += item.orderQty;
          }

          if (item.material.rounding_mode === 'package') {
            totalPackages += item.orderPacks;
          }
        }

        return {
          totalBoardSheets,
          totalEdgeMeters,
          totalPackages,
          totalAmount: batch.totalAmount,
          totalWeightKg: batch.totalWeight,
          materialTypesCount: batch.items.length,
          projectCount: batch.selectedProjectIds.length,
        };
      },
    }),
    {
      name: 'furniture_procurement_storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
