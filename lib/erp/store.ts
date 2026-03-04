"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { erpSeedData } from "@/lib/erp/mock-data";
import {
  canAccessEntity,
  isTaskOverdue,
  makeNotification,
  upsertFilterPreset
} from "@/lib/erp/logic";
import type {
  ClientEntity,
  DealEntity,
  EntityComment,
  EntityFile,
  EntityStatus,
  EntityType,
  FilterPreset,
  NotificationEventType,
  ProjectEntity,
  TaskEntity,
  User
} from "@/lib/erp/types";

type Credentials = {
  organizationId: string;
  userId: string;
};

type CreateClientInput = Pick<ClientEntity, "name" | "email" | "type" | "responsibleUserId">;
type CreateDealInput = Pick<DealEntity, "title" | "clientId" | "amount" | "currency" | "responsibleUserId">;
type CreateTaskInput = Pick<
  TaskEntity,
  "title" | "entityType" | "entityId" | "assignedUserId" | "dueDate"
>;
type CreateProjectInput = Pick<ProjectEntity, "name" | "ownerUserId">;

interface ErpStoreState {
  token: string | null;
  organizationId: string | null;
  userId: string | null;
  organizations: typeof erpSeedData.organizations;
  users: typeof erpSeedData.users;
  clients: ClientEntity[];
  deals: DealEntity[];
  tasks: TaskEntity[];
  projects: ProjectEntity[];
  notifications: typeof erpSeedData.notifications;
  savedFilters: FilterPreset[];
  login: (credentials: Credentials) => void;
  logout: () => void;
  markNotificationRead: (notificationId: string) => void;
  deleteNotification: (notificationId: string) => void;
  saveFilterPreset: (preset: Omit<FilterPreset, "id">) => void;
  createClient: (payload: CreateClientInput) => void;
  createDeal: (payload: CreateDealInput) => void;
  createTask: (payload: CreateTaskInput) => void;
  createProject: (payload: CreateProjectInput) => void;
  changeStatus: (entityType: EntityType, entityId: string, status: EntityStatus) => void;
  addComment: (entityType: EntityType, entityId: string, text: string) => void;
  addFile: (entityType: EntityType, entityId: string, file: Omit<EntityFile, "id" | "uploadedAt">) => void;
}

function buildComment(userId: string, text: string): EntityComment {
  return {
    id: `comment-${crypto.randomUUID()}`,
    authorId: userId,
    text,
    createdAt: new Date().toISOString()
  };
}

function pickTargetUser(
  entityType: EntityType,
  entity: any,
  fallbackUserId: string
): string {
  switch (entityType) {
    case "client":
      return entity.responsibleUserId ?? fallbackUserId;
    case "deal":
      return entity.responsibleUserId ?? fallbackUserId;
    case "task":
      return entity.assignedUserId ?? fallbackUserId;
    case "project":
      return entity.ownerUserId ?? fallbackUserId;
    default:
      return fallbackUserId;
  }
}

function userFromState(state: ErpStoreState): User | undefined {
  if (!state.userId) return undefined;
  return state.users.find((item) => item.id === state.userId);
}

function withNotification(
  state: ErpStoreState,
  params: {
    entityType: EntityType;
    entityId: string;
    entityName: string;
    eventType: NotificationEventType;
    targetUserId: string;
  }
): typeof state.notifications {
  if (!state.organizationId) return state.notifications;

  return [
    makeNotification({
      organizationId: state.organizationId,
      userId: params.targetUserId,
      entityType: params.entityType,
      entityId: params.entityId,
      eventType: params.eventType,
      entityName: params.entityName
    }),
    ...state.notifications
  ];
}

function mapEntityList<T extends { id: string }>(
  list: T[],
  id: string,
  updater: (current: T) => T
): T[] {
  return list.map((item) => (item.id === id ? updater(item) : item));
}

export const useErpStore = create<ErpStoreState>()(
  persist(
    (set, get) => ({
      token: null,
      organizationId: null,
      userId: null,
      organizations: erpSeedData.organizations,
      users: erpSeedData.users,
      clients: erpSeedData.clients,
      deals: erpSeedData.deals,
      tasks: erpSeedData.tasks,
      projects: erpSeedData.projects,
      notifications: erpSeedData.notifications,
      savedFilters: erpSeedData.savedFilters,

      login: ({ organizationId, userId }) => {
        set({
          organizationId,
          userId,
          token: `token-${crypto.randomUUID()}`
        });
      },

      logout: () => {
        set({ token: null, organizationId: null, userId: null });
      },

      markNotificationRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === notificationId ? { ...item, isRead: true } : item
          )
        }));
      },

      deleteNotification: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.filter((item) => item.id !== notificationId)
        }));
      },

      saveFilterPreset: (preset) => {
        set((state) => ({
          savedFilters: upsertFilterPreset(state.savedFilters, preset)
        }));
      },

      createClient: (payload) => {
        set((state) => {
          if (!state.organizationId) return state;
          const created: ClientEntity = {
            id: `c-${crypto.randomUUID()}`,
            organizationId: state.organizationId,
            status: "new",
            comments: [],
            files: [],
            ...payload
          };
          return { clients: [created, ...state.clients] };
        });
      },

      createDeal: (payload) => {
        set((state) => {
          if (!state.organizationId) return state;
          const created: DealEntity = {
            id: `d-${crypto.randomUUID()}`,
            organizationId: state.organizationId,
            status: "new",
            comments: [],
            files: [],
            ...payload
          };
          return { deals: [created, ...state.deals] };
        });
      },

      createTask: (payload) => {
        set((state) => {
          if (!state.organizationId) return state;
          const created: TaskEntity = {
            id: `t-${crypto.randomUUID()}`,
            organizationId: state.organizationId,
            status: "new",
            comments: [],
            files: [],
            ...payload
          };

          const nextNotifications = created.assignedUserId
            ? withNotification(state, {
                entityType: "task",
                entityId: created.id,
                entityName: created.title,
                eventType: isTaskOverdue(created) ? "task_overdue" : "task_assigned",
                targetUserId: created.assignedUserId
              })
            : state.notifications;

          return {
            tasks: [created, ...state.tasks],
            notifications: nextNotifications
          };
        });
      },

      createProject: (payload) => {
        set((state) => {
          if (!state.organizationId) return state;
          const created: ProjectEntity = {
            id: `p-${crypto.randomUUID()}`,
            organizationId: state.organizationId,
            status: "new",
            comments: [],
            files: [],
            ...payload
          };
          return { projects: [created, ...state.projects] };
        });
      },

      changeStatus: (entityType, entityId, status) => {
        set((state) => {
          const currentUserId = state.userId;
          if (!currentUserId) return state;

          const user = userFromState(state);
          if (!user || !canAccessEntity(user.role, entityType)) return state;

          if (entityType === "client") {
            const target = state.clients.find((item) => item.id === entityId);
            if (!target) return state;
            return {
              clients: mapEntityList(state.clients, entityId, (item) => ({ ...item, status })),
              notifications: withNotification(state, {
                entityType,
                entityId,
                entityName: target.name,
                eventType: "status_changed",
                targetUserId: pickTargetUser(entityType, target, currentUserId)
              })
            };
          }

          if (entityType === "deal") {
            const target = state.deals.find((item) => item.id === entityId);
            if (!target) return state;
            return {
              deals: mapEntityList(state.deals, entityId, (item) => ({ ...item, status })),
              notifications: withNotification(state, {
                entityType,
                entityId,
                entityName: target.title,
                eventType: "status_changed",
                targetUserId: pickTargetUser(entityType, target, currentUserId)
              })
            };
          }

          if (entityType === "task") {
            const target = state.tasks.find((item) => item.id === entityId);
            if (!target) return state;
            return {
              tasks: mapEntityList(state.tasks, entityId, (item) => ({ ...item, status })),
              notifications: withNotification(state, {
                entityType,
                entityId,
                entityName: target.title,
                eventType: "status_changed",
                targetUserId: pickTargetUser(entityType, target, currentUserId)
              })
            };
          }

          const target = state.projects.find((item) => item.id === entityId);
          if (!target) return state;
          return {
            projects: mapEntityList(state.projects, entityId, (item) => ({ ...item, status })),
            notifications: withNotification(state, {
              entityType,
              entityId,
              entityName: target.name,
              eventType: "status_changed",
              targetUserId: pickTargetUser(entityType, target, currentUserId)
            })
          };
        });
      },

      addComment: (entityType, entityId, text) => {
        set((state) => {
          const currentUserId = state.userId;
          if (!currentUserId) return state;

          const comment = buildComment(currentUserId, text);

          if (entityType === "client") {
            const target = state.clients.find((item) => item.id === entityId);
            if (!target) return state;
            return {
              clients: mapEntityList(state.clients, entityId, (item) => ({
                ...item,
                comments: [...item.comments, comment]
              })),
              notifications: withNotification(state, {
                entityType,
                entityId,
                entityName: target.name,
                eventType: "comment_added",
                targetUserId: pickTargetUser(entityType, target, currentUserId)
              })
            };
          }

          if (entityType === "deal") {
            const target = state.deals.find((item) => item.id === entityId);
            if (!target) return state;
            return {
              deals: mapEntityList(state.deals, entityId, (item) => ({
                ...item,
                comments: [...item.comments, comment]
              })),
              notifications: withNotification(state, {
                entityType,
                entityId,
                entityName: target.title,
                eventType: "comment_added",
                targetUserId: pickTargetUser(entityType, target, currentUserId)
              })
            };
          }

          if (entityType === "task") {
            const target = state.tasks.find((item) => item.id === entityId);
            if (!target) return state;
            return {
              tasks: mapEntityList(state.tasks, entityId, (item) => ({
                ...item,
                comments: [...item.comments, comment]
              })),
              notifications: withNotification(state, {
                entityType,
                entityId,
                entityName: target.title,
                eventType: "comment_added",
                targetUserId: pickTargetUser(entityType, target, currentUserId)
              })
            };
          }

          const target = state.projects.find((item) => item.id === entityId);
          if (!target) return state;
          return {
            projects: mapEntityList(state.projects, entityId, (item) => ({
              ...item,
              comments: [...item.comments, comment]
            })),
            notifications: withNotification(state, {
              entityType,
              entityId,
              entityName: target.name,
              eventType: "comment_added",
              targetUserId: pickTargetUser(entityType, target, currentUserId)
            })
          };
        });
      },

      addFile: (entityType, entityId, file) => {
        set((state) => {
          const currentUserId = state.userId;
          if (!currentUserId) return state;

          const enrichedFile: EntityFile = {
            ...file,
            id: `file-${crypto.randomUUID()}`,
            uploadedAt: new Date().toISOString()
          };

          if (entityType === "client") {
            const target = state.clients.find((item) => item.id === entityId);
            if (!target) return state;
            return {
              clients: mapEntityList(state.clients, entityId, (item) => ({
                ...item,
                files: [...item.files, enrichedFile]
              })),
              notifications: withNotification(state, {
                entityType,
                entityId,
                entityName: target.name,
                eventType: "file_uploaded",
                targetUserId: pickTargetUser(entityType, target, currentUserId)
              })
            };
          }

          if (entityType === "deal") {
            const target = state.deals.find((item) => item.id === entityId);
            if (!target) return state;
            return {
              deals: mapEntityList(state.deals, entityId, (item) => ({
                ...item,
                files: [...item.files, enrichedFile]
              })),
              notifications: withNotification(state, {
                entityType,
                entityId,
                entityName: target.title,
                eventType: "file_uploaded",
                targetUserId: pickTargetUser(entityType, target, currentUserId)
              })
            };
          }

          if (entityType === "task") {
            const target = state.tasks.find((item) => item.id === entityId);
            if (!target) return state;
            return {
              tasks: mapEntityList(state.tasks, entityId, (item) => ({
                ...item,
                files: [...item.files, enrichedFile]
              })),
              notifications: withNotification(state, {
                entityType,
                entityId,
                entityName: target.title,
                eventType: "file_uploaded",
                targetUserId: pickTargetUser(entityType, target, currentUserId)
              })
            };
          }

          const target = state.projects.find((item) => item.id === entityId);
          if (!target) return state;
          return {
            projects: mapEntityList(state.projects, entityId, (item) => ({
              ...item,
              files: [...item.files, enrichedFile]
            })),
            notifications: withNotification(state, {
              entityType,
              entityId,
              entityName: target.name,
              eventType: "file_uploaded",
              targetUserId: pickTargetUser(entityType, target, currentUserId)
            })
          };
        });
      }
    }),
    {
      name: "erp-mvp-store",
      partialize: (state) => ({
        token: state.token,
        organizationId: state.organizationId,
        userId: state.userId,
        clients: state.clients,
        deals: state.deals,
        tasks: state.tasks,
        projects: state.projects,
        notifications: state.notifications,
        savedFilters: state.savedFilters
      })
    }
  )
);
