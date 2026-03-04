export type UserRole = "sales" | "manager" | "admin" | "user";

export type EntityType = "client" | "deal" | "task" | "project";

export type EntityStatus = "new" | "in_progress" | "done" | "blocked";

export interface Organization {
  id: string;
  name: string;
}

export interface User {
  id: string;
  organizationId: string;
  name: string;
  role: UserRole;
}

export interface EntityComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface EntityFile {
  id: string;
  name: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ClientEntity {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  type: "individual" | "company";
  responsibleUserId?: string;
  status: EntityStatus;
  comments: EntityComment[];
  files: EntityFile[];
}

export interface DealEntity {
  id: string;
  organizationId: string;
  title: string;
  clientId: string;
  amount: number;
  currency: "USD" | "EUR";
  responsibleUserId?: string;
  status: EntityStatus;
  comments: EntityComment[];
  files: EntityFile[];
}

export interface TaskEntity {
  id: string;
  organizationId: string;
  title: string;
  entityType: EntityType;
  entityId: string;
  assignedUserId?: string;
  dueDate: string;
  status: EntityStatus;
  comments: EntityComment[];
  files: EntityFile[];
}

export interface ProjectEntity {
  id: string;
  organizationId: string;
  name: string;
  ownerUserId?: string;
  status: EntityStatus;
  comments: EntityComment[];
  files: EntityFile[];
}

export type NotificationEventType =
  | "task_assigned"
  | "task_overdue"
  | "status_changed"
  | "comment_added"
  | "file_uploaded";

export interface NotificationEntity {
  id: string;
  organizationId: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  type: NotificationEventType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  scope: EntityType;
  criteria: Record<string, string>;
}

export interface ErpStateData {
  organizations: Organization[];
  users: User[];
  clients: ClientEntity[];
  deals: DealEntity[];
  tasks: TaskEntity[];
  projects: ProjectEntity[];
  notifications: NotificationEntity[];
  savedFilters: FilterPreset[];
}
