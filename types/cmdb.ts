export type ComponentType = 'service' | 'database' | 'queue' | 'cache' | 'other'

export interface CMDBSystem {
  id: string
  name: string
  os: string
  componentIds: string[]
  vlan: string
  description?: string
  customFields?: Record<string, string>
}

export interface CMDBComponent {
  id: string
  name: string
  type: ComponentType
  description: string
}

export interface CMDBFilters {
  search: string
  os: string[]
  vlan: string[]
  componentType: ComponentType[]
}

export type SortField = 'name' | 'os' | 'vlan'
export type SortDirection = 'asc' | 'desc'

export interface CMDBSort {
  field: SortField
  direction: SortDirection
}
