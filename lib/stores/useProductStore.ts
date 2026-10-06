import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product } from '../types';
import { MOCK_PRODUCTS } from '../mock-data';

interface ProductState {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => string;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  resetToDefault: () => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: MOCK_PRODUCTS,

      addProduct: (productData) => {
        const id = `prod-${Date.now()}`;
        const newProduct: Product = {
          ...productData,
          id,
        };
        set((state) => ({
          products: [...state.products, newProduct],
        }));
        return id;
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
        // Dọn dẹp các dòng BOM liên quan để tránh mồ côi
        try {
          const { useBomStore } = require('./useBomStore');
          const bomState = useBomStore.getState();
          useBomStore.setState({
            bomItems: bomState.bomItems.filter((b: any) => b.product_id !== id),
          });
        } catch {}
      },

      getProduct: (id) => {
        return get().products.find((p) => p.id === id);
      },

      resetToDefault: () => {
        set({ products: MOCK_PRODUCTS });
      },
    }),
    {
      name: 'furniture_products_storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
