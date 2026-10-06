import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Material } from '../types';
import { MOCK_MATERIALS } from '../mock-data';

interface MaterialState {
  materials: Material[];
  addMaterial: (material: Omit<Material, 'id'>) => string;
  updateMaterial: (id: string, updates: Partial<Omit<Material, 'id'>>) => void;
  deleteMaterial: (id: string) => void;
  getMaterial: (id: string) => Material | undefined;
  resetToDefault: () => void;
}

export const useMaterialStore = create<MaterialState>()(
  persist(
    (set, get) => ({
      materials: MOCK_MATERIALS,

      addMaterial: (materialData) => {
        const id = `mat-${Date.now()}`;
        const newMaterial: Material = {
          ...materialData,
          id,
        };
        set((state) => ({
          materials: [...state.materials, newMaterial],
        }));
        return id;
      },

      updateMaterial: (id, updates) => {
        set((state) => ({
          materials: state.materials.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
      },

      deleteMaterial: (id) => {
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
        }));
        // Dọn dẹp các dòng BOM liên quan
        try {
          const { useBomStore } = require('./useBomStore');
          const bomState = useBomStore.getState();
          useBomStore.setState({
            bomItems: bomState.bomItems.filter((b: any) => b.material_id !== id),
          });
        } catch {}
      },

      getMaterial: (id) => {
        return get().materials.find((m) => m.id === id);
      },

      resetToDefault: () => {
        set({ materials: MOCK_MATERIALS });
      },
    }),
    {
      name: 'furniture_materials_storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
