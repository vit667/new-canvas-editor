"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isTaskOverdue, applyEntityFilters } from "@/lib/erp/logic";
import { useErpStore } from "@/lib/erp/store";
import { FilterBar } from "@/components/erp/filter-bar";
import { ModalForm } from "@/components/erp/modal-form";

export default function TasksPage() {
  const userId = useErpStore((state) => state.userId);
  const users = useErpStore((state) => state.users);
  const tasks = useErpStore((state) => state.tasks);
  const deals = useErpStore((state) => state.deals);
  const projects = useErpStore((state) => state.projects);
  const clients = useErpStore((state) => state.clients);
  const savedFilters = useErpStore((state) => state.savedFilters);
  const saveFilter = useErpStore((state) => state.saveFilterPreset);
  const createTask = useErpStore((state) => state.createTask);
  const changeStatus = useErpStore((state) => state.changeStatus);

  const [isOpen, setOpen] = useState(false);
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    entityType: "deal",
    entityId: deals[0]?.id ?? "",
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  });

  const entityOptions = useMemo(() => {
    if (form.entityType === "deal") {
      return deals.map((item) => ({ id: item.id, label: item.title }));
    }
    if (form.entityType === "project") {
      return projects.map((item) => ({ id: item.id, label: item.name }));
    }
    return clients.map((item) => ({ id: item.id, label: item.name }));
  }, [form.entityType, deals, projects, clients]);

  const filtered = useMemo(() => {
    const base = applyEntityFilters(tasks, filter);
    if (filter.quick === "my_tasks") {
      return base.filter((item) => item.assignedUserId === userId);
    }
    if (filter.quick === "overdue") {
      return base.filter((item) => isTaskOverdue(item));
    }
    return base;
  }, [tasks, filter, userId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Задачи</h1>
        <p className="text-muted-foreground text-sm">Фильтры "Мои задачи" и "Просроченные"</p>
      </div>

      <FilterBar
        scope="task"
        value={filter}
        onChange={setFilter}
        onSave={(name, criteria) => saveFilter({ name, criteria, scope: "task" })}
        presets={savedFilters}
        quickFilters={[
          { label: "Мои задачи", criteria: { quick: "my_tasks" } },
          { label: "Просроченные", criteria: { quick: "overdue" } },
          { label: "Без ответственного", criteria: { assignedUserId: "unassigned" } }
        ]}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Список задач</CardTitle>
          <ModalForm
            trigger={<Button size="sm">Создать задачу</Button>}
            title="Новая задача"
            description="Форма создания задачи"
            open={isOpen}
            onOpenChange={setOpen}
            onSubmit={() => {
              if (!form.title.trim() || !form.entityId) return;
              const isoDue = new Date(form.dueDate).toISOString();
              createTask({
                title: form.title.trim(),
                entityType: form.entityType as "deal" | "project" | "client",
                entityId: form.entityId,
                assignedUserId: userId ?? undefined,
                dueDate: isoDue
              });
              setForm({
                title: "",
                entityType: "deal",
                entityId: deals[0]?.id ?? "",
                dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
              });
              setOpen(false);
            }}>
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Тип сущности</Label>
                <Select
                  value={form.entityType}
                  onValueChange={(value) => {
                    setForm((prev) => ({
                      ...prev,
                      entityType: value,
                      entityId: ""
                    }));
                  }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deal">deal</SelectItem>
                    <SelectItem value="project">project</SelectItem>
                    <SelectItem value="client">client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Сущность</Label>
                <Select
                  value={form.entityId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, entityId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Срок</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>
          </ModalForm>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map((task) => (
            <div key={task.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-muted-foreground">
                    Срок: {new Date(task.dueDate).toLocaleDateString("ru-RU")}
                    {isTaskOverdue(task) ? " (просрочено)" : ""}
                  </p>
                </div>
                <Select
                  value={task.status}
                  onValueChange={(value) => changeStatus("task", task.id, value as any)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">new</SelectItem>
                    <SelectItem value="in_progress">in_progress</SelectItem>
                    <SelectItem value="done">done</SelectItem>
                    <SelectItem value="blocked">blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
