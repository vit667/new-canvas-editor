"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useErpStore } from "@/lib/erp/store";
import { applyEntityFilters } from "@/lib/erp/logic";
import { FilterBar } from "@/components/erp/filter-bar";
import { ModalForm } from "@/components/erp/modal-form";
import { RoleGuard } from "@/components/erp/role-guard";

export default function ProjectsPage() {
  const userId = useErpStore((state) => state.userId);
  const users = useErpStore((state) => state.users);
  const projects = useErpStore((state) => state.projects);
  const savedFilters = useErpStore((state) => state.savedFilters);
  const saveFilter = useErpStore((state) => state.saveFilterPreset);
  const createProject = useErpStore((state) => state.createProject);
  const changeStatus = useErpStore((state) => state.changeStatus);

  const currentUser = users.find((item) => item.id === userId);

  const [isOpen, setOpen] = useState(false);
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", ownerUserId: "" });

  const filtered = useMemo(() => applyEntityFilters(projects, filter), [projects, filter]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Проекты</h1>
        <p className="text-muted-foreground text-sm">Управление проектами и статусами</p>
      </div>

      <RoleGuard role={currentUser?.role} entity="project">
        <FilterBar
          scope="project"
          value={filter}
          onChange={setFilter}
          onSave={(name, criteria) => saveFilter({ name, criteria, scope: "project" })}
          presets={savedFilters}
          quickFilters={[
            { label: "Новые", criteria: { status: "new" } },
            { label: "Без владельца", criteria: { ownerUserId: "unassigned" } }
          ]}
        />

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Список проектов</CardTitle>
            <ModalForm
              trigger={<Button size="sm">Создать проект</Button>}
              title="Новый проект"
              description="Форма создания проекта"
              open={isOpen}
              onOpenChange={setOpen}
              onSubmit={() => {
                if (!form.name.trim()) return;
                createProject({
                  name: form.name.trim(),
                  ownerUserId: form.ownerUserId || undefined
                });
                setForm({ name: "", ownerUserId: "" });
                setOpen(false);
              }}>
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Владелец</Label>
                <Select
                  value={form.ownerUserId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, ownerUserId: value === "none" ? "" : value }))
                  }>
                  <SelectTrigger>
                    <SelectValue placeholder="Не выбран" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбран</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ModalForm>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map((project) => (
              <div key={project.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-muted-foreground">id: {project.id}</p>
                  </div>
                  <Select
                    value={project.status}
                    onValueChange={(value) => changeStatus("project", project.id, value as any)}>
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
      </RoleGuard>
    </div>
  );
}
