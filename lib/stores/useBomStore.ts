import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ProductBom } from '../types';
import { MOCK_BOM } from '../mock-data';

interface BomState {
  bomItems: ProductBom[];
  addBomItem: (item: Omit<ProductBom, 'id'>) => string;
  updateBomItem: (id: string, updates: Partial<Omit<ProductBom, 'id'>>) => void;
  deleteBomItem: (id: string) => void;
  getBomByProductId: (productId: string) => ProductBom[];
  setProductBom: (productId: string, items: Omit<ProductBom, 'id' | 'product_id'>[]) => void;
  resetToDefault: () => void;
}

export const useBomStore = create<BomState>()(
  persist(
    (set, get) => ({
      bomItems: MOCK_BOM,

      addBomItem: (itemData) => {
        const id = `bom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newItem: ProductBom = {
          ...itemData,
          id,
        };
        set((state) => ({
          bomItems: [...state.bomItems, newItem],
        }));
        return id;
      },

      updateBomItem: (id, updates) => {
        set((state) => ({
          bomItems: state.bomItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      deleteBomItem: (id) => {
        set((state) => ({
          bomItems: state.bomItems.filter((item) => item.id !== id),
        }));
      },

      getBomByProductId: (productId) => {
        return get().bomItems.filter((item) => item.product_id === productId);
      },

      setProductBom: (productId, items) => {
        set((state) => {
          const otherItems = state.bomItems.filter((item) => item.product_id !== productId);
          const newBomItems: ProductBom[] = items.map((item, index) => ({
            id: `bom-${productId}-${Date.now()}-${index}`,
            product_id: productId,
            material_id: item.material_id,
            net_quantity_per_unit: item.net_quantity_per_unit,
            waste_rate_override: item.waste_rate_override,
          }));
          return { bomItems: [...otherItems, ...newBomItems] };
        });
      },

      resetToDefault: () => {
        set({ bomItems: MOCK_BOM });
      },
    }),
    {
      name: 'furniture_bom_storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
