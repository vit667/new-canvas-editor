import type {
  EntityStatus,
  EntityType,
  FilterPreset,
  NotificationEntity,
  NotificationEventType,
  TaskEntity,
  UserRole
} from "@/lib/erp/types";

export const roleScope: Record<UserRole, EntityType[]> = {
  sales: ["client", "deal", "task"],
  manager: ["task", "project", "deal"],
  admin: ["client", "deal", "task", "project"],
  user: ["task", "deal"]
};

export function canAccessEntity(role: UserRole, entity: EntityType): boolean {
  return roleScope[role].includes(entity);
}

export function isTaskOverdue(task: TaskEntity): boolean {
  return new Date(task.dueDate).getTime() < Date.now() && task.status !== "done";
}

export function applyEntityFilters<T extends object>(
  list: T[],
  criteria: Record<string, string>
): T[] {
  return list.filter((item) => {
    const source = item as Record<string, unknown>;
    return Object.entries(criteria).every(([key, value]) => {
      if (!value) return true;
      if (value === "overdue") {
        const dueDate = source["dueDate"] as string | undefined;
        if (!dueDate) return false;
        return new Date(dueDate).getTime() < Date.now();
      }
      if (value === "unassigned") {
        const assigned =
          source["assignedUserId"] ?? source["responsibleUserId"] ?? source["ownerUserId"];
        return !assigned;
      }
      return String(source[key] ?? "") === value;
    });
  });
}

export function buildNotificationMessage(
  type: NotificationEventType,
  entityType: EntityType,
  entityName: string
): string {
  switch (type) {
    case "task_assigned":
      return `Вам назначена задача: ${entityName}`;
    case "task_overdue":
      return `Просрочена задача: ${entityName}`;
    case "status_changed":
      return `Изменен статус ${entityType}: ${entityName}`;
    case "comment_added":
      return `Новый комментарий в ${entityType}: ${entityName}`;
    case "file_uploaded":
      return `Добавлен файл в ${entityType}: ${entityName}`;
    default:
      return `Новое событие в ${entityType}: ${entityName}`;
  }
}

export function makeNotification(input: {
  organizationId: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  eventType: NotificationEventType;
  entityName: string;
}): NotificationEntity {
  return {
    id: `n-${crypto.randomUUID()}`,
    organizationId: input.organizationId,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    type: input.eventType,
    message: buildNotificationMessage(input.eventType, input.entityType, input.entityName),
    isRead: false,
    createdAt: new Date().toISOString()
  };
}

export function upsertFilterPreset(
  presets: FilterPreset[],
  preset: Omit<FilterPreset, "id">
): FilterPreset[] {
  const existing = presets.find((item) => item.name === preset.name && item.scope === preset.scope);
  if (existing) {
    return presets.map((item) =>
      item.id === existing.id
        ? {
            ...item,
            criteria: preset.criteria
          }
        : item
    );
  }

  return [...presets, { ...preset, id: `filter-${crypto.randomUUID()}` }];
}

export function defaultStatusCounts(statuses: EntityStatus[]): Record<EntityStatus, number> {
  return statuses.reduce(
    (acc, status) => {
      acc[status] += 1;
      return acc;
    },
    {
      new: 0,
      in_progress: 0,
      done: 0,
      blocked: 0
    }
  );
}

export function resolveBackTarget(historyLength: number, fallbackPath: string): "back" | string {
  return historyLength > 1 ? "back" : fallbackPath;
}
