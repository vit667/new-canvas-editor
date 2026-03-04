import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CMDBSystem, CMDBComponent, CMDBFilters, CMDBSort, ComponentType } from '@/types/cmdb'

interface CMDBState {
  systems: CMDBSystem[]
  components: CMDBComponent[]
  filters: CMDBFilters
  sort: CMDBSort

  // Systems
  addSystem: (system: CMDBSystem) => void
  addSystems: (systems: CMDBSystem[]) => void
  updateSystem: (id: string, data: Partial<CMDBSystem>) => void
  deleteSystem: (id: string) => void

  // Components
  addComponent: (component: CMDBComponent) => void
  addComponents: (components: CMDBComponent[]) => void
  updateComponent: (id: string, data: Partial<CMDBComponent>) => void
  deleteComponent: (id: string) => void

  // Filters
  setFilters: (filters: Partial<CMDBFilters>) => void
  resetFilters: () => void

  // Sort
  setSort: (sort: CMDBSort) => void

  // Clear
  clearAll: () => void
}

const defaultFilters: CMDBFilters = {
  search: '',
  os: [],
  vlan: [],
  componentType: [],
}

const defaultSort: CMDBSort = {
  field: 'name',
  direction: 'asc',
}

export const useCMDBStore = create<CMDBState>()(
  persist(
    (set) => ({
      systems: [],
      components: [],
      filters: defaultFilters,
      sort: defaultSort,

      // Systems
      addSystem: (system) =>
        set((state) => ({
          systems: [...state.systems, system],
        })),

      addSystems: (systems) =>
        set((state) => ({
          systems: [...state.systems, ...systems],
        })),

      updateSystem: (id, data) =>
        set((state) => ({
          systems: state.systems.map((system) =>
            system.id === id ? { ...system, ...data } : system
          ),
        })),

      deleteSystem: (id) =>
        set((state) => ({
          systems: state.systems.filter((system) => system.id !== id),
        })),

      // Components
      addComponent: (component) =>
        set((state) => ({
          components: [...state.components, component],
        })),

      addComponents: (components) =>
        set((state) => ({
          components: [...state.components, ...components],
        })),

      updateComponent: (id, data) =>
        set((state) => ({
          components: state.components.map((component) =>
            component.id === id ? { ...component, ...data } : component
          ),
        })),

      deleteComponent: (id) =>
        set((state) => ({
          components: state.components.filter((component) => component.id !== id),
        })),

      // Filters
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      resetFilters: () =>
        set({ filters: defaultFilters }),

      // Sort
      setSort: (sort) =>
        set({ sort }),

      // Clear
      clearAll: () =>
        set({ systems: [], components: [], filters: defaultFilters }),
    }),
    {
      name: 'cmdb-storage',
    }
  )
)

// Selectors
export const useFilteredSystems = () => {
  const systems = useCMDBStore((state) => state.systems)
  const components = useCMDBStore((state) => state.components)
  const filters = useCMDBStore((state) => state.filters)
  const sort = useCMDBStore((state) => state.sort)

  let filtered = [...systems]

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter((system) =>
      system.name.toLowerCase().includes(searchLower) ||
      system.description?.toLowerCase().includes(searchLower)
    )
  }

  // OS filter
  if (filters.os.length > 0) {
    filtered = filtered.filter((system) =>
      filters.os.includes(system.os)
    )
  }

  // VLAN filter
  if (filters.vlan.length > 0) {
    filtered = filtered.filter((system) =>
      filters.vlan.includes(system.vlan)
    )
  }

  // Component type filter
  if (filters.componentType.length > 0) {
    filtered = filtered.filter((system) => {
      const systemComponents = components.filter((c) =>
        system.componentIds.includes(c.id)
      )
      return systemComponents.some((c) =>
        filters.componentType.includes(c.type)
      )
    })
  }

  // Sort
  filtered.sort((a, b) => {
    const aValue = a[sort.field] || ''
    const bValue = b[sort.field] || ''
    const comparison = aValue.localeCompare(bValue)
    return sort.direction === 'asc' ? comparison : -comparison
  })

  return filtered
}

// Helper to get unique values for filters
export const useUniqueOSValues = () => {
  const systems = useCMDBStore((state) => state.systems)
  return [...new Set(systems.map((s) => s.os))].filter(Boolean).sort()
}

export const useUniqueVLANValues = () => {
  const systems = useCMDBStore((state) => state.systems)
  return [...new Set(systems.map((s) => s.vlan))].filter(Boolean).sort()
}

export const useComponentTypes = (): ComponentType[] => {
  return ['service', 'database', 'queue', 'cache', 'other']
}
