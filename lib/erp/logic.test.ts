import { describe, expect, it } from "vitest";
import {
  applyEntityFilters,
  buildNotificationMessage,
  canAccessEntity,
  resolveBackTarget,
  upsertFilterPreset
} from "@/lib/erp/logic";

describe("canAccessEntity", () => {
  it("grants admin access to all entities", () => {
    expect(canAccessEntity("admin", "client")).toBe(true);
    expect(canAccessEntity("admin", "deal")).toBe(true);
    expect(canAccessEntity("admin", "task")).toBe(true);
    expect(canAccessEntity("admin", "project")).toBe(true);
  });

  it("denies project access for sales role", () => {
    expect(canAccessEntity("sales", "project")).toBe(false);
  });
});

describe("applyEntityFilters", () => {
  const list = [
    { id: "1", status: "new", assignedUserId: "u-1", dueDate: "2099-01-01T00:00:00.000Z" },
    { id: "2", status: "done", assignedUserId: "", dueDate: "2000-01-01T00:00:00.000Z" }
  ];

  it("filters by exact value", () => {
    const result = applyEntityFilters(list, { status: "new" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("supports unassigned criteria", () => {
    const result = applyEntityFilters(list, { assignedUserId: "unassigned" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("supports overdue criteria", () => {
    const result = applyEntityFilters(list, { dueDate: "overdue" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });
});

describe("notifications", () => {
  it("creates readable message for status change", () => {
    const message = buildNotificationMessage("status_changed", "deal", "Pilot Deal");
    expect(message).toContain("Изменен статус");
    expect(message).toContain("Pilot Deal");
  });
});

describe("upsertFilterPreset", () => {
  it("updates existing preset with same name and scope", () => {
    const initial = [{ id: "f-1", name: "Мои", scope: "task", criteria: { quick: "my_tasks" } }] as const;
    const result = upsertFilterPreset([...initial], {
      name: "Мои",
      scope: "task",
      criteria: { quick: "overdue" }
    });

    expect(result).toHaveLength(1);
    expect(result[0].criteria.quick).toBe("overdue");
  });
});

describe("resolveBackTarget", () => {
  it("returns back when history exists", () => {
    expect(resolveBackTarget(3, "/erp/dashboard")).toBe("back");
  });

  it("returns fallback for shallow history", () => {
    expect(resolveBackTarget(1, "/erp/dashboard")).toBe("/erp/dashboard");
  });
});
