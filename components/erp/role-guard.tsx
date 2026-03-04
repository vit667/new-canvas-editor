"use client";

import { AlertTriangleIcon } from "lucide-react";
import { canAccessEntity } from "@/lib/erp/logic";
import type { EntityType, UserRole } from "@/lib/erp/types";

export function RoleGuard({
  role,
  entity,
  children
}: {
  role?: UserRole;
  entity: EntityType;
  children: React.ReactNode;
}) {
  if (!role || !canAccessEntity(role, entity)) {
    return (
      <div className="border-destructive/30 text-destructive flex items-center gap-2 rounded-md border p-3 text-sm">
        <AlertTriangleIcon className="size-4" />
        Доступ запрещен для вашей роли.
      </div>
    );
  }

  return <>{children}</>;
}
