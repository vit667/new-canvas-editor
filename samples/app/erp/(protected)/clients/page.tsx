"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyEntityFilters } from "@/lib/erp/logic";
import { useErpStore } from "@/lib/erp/store";
import { RoleGuard } from "@/components/erp/role-guard";
import { ModalForm } from "@/components/erp/modal-form";
import { FilterBar } from "@/components/erp/filter-bar";
import { CommentSection } from "@/components/erp/comment-section";
import { FileUpload } from "@/components/erp/file-upload";
import { BackButton } from "@/components/erp/back-button";

export default function ClientsPage() {
  const userId = useErpStore((state) => state.userId);
  const users = useErpStore((state) => state.users);
  const clients = useErpStore((state) => state.clients);
  const savedFilters = useErpStore((state) => state.savedFilters);
  const saveFilter = useErpStore((state) => state.saveFilterPreset);
  const createClient = useErpStore((state) => state.createClient);
  const addComment = useErpStore((state) => state.addComment);
  const addFile = useErpStore((state) => state.addFile);

  const currentUser = users.find((item) => item.id === userId);

  const [isOpen, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(clients[0]?.id ?? null);
  const [filter, setFilter] = useState<Record<string, string>>({});

  const [form, setForm] = useState({ name: "", email: "", type: "company", responsibleUserId: "" });

  const filteredClients = useMemo(() => applyEntityFilters(clients, filter), [clients, filter]);

  const selectedClient = clients.find((item) => item.id === selectedId) ?? filteredClients[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Клиенты</h1>
          <p className="text-muted-foreground text-sm">Список клиентов с фильтрами и карточкой</p>
        </div>
        <BackButton fallback="/erp/dashboard" />
      </div>

      <RoleGuard role={currentUser?.role} entity="client">
        <FilterBar
          scope="client"
          value={filter}
          onChange={setFilter}
          onSave={(name, criteria) => saveFilter({ name, criteria, scope: "client" })}
          presets={savedFilters}
          quickFilters={[
            { label: "Без ответственного", criteria: { responsibleUserId: "unassigned" } },
            { label: "Новые", criteria: { status: "new" } }
          ]}
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Список</CardTitle>
              <ModalForm
                trigger={<Button size="sm">Создать клиента</Button>}
                title="Новый клиент"
                description="Создание клиента в модальном окне"
                open={isOpen}
                onOpenChange={setOpen}
                onSubmit={() => {
                  if (!form.name.trim() || !form.email.trim()) return;
                  createClient({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    type: form.type as "company" | "individual",
                    responsibleUserId: form.responsibleUserId || undefined
                  });
                  setForm({ name: "", email: "", type: "company", responsibleUserId: "" });
                  setOpen(false);
                }}>
                <div className="space-y-2">
                  <Label>Имя</Label>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Компания</SelectItem>
                      <SelectItem value="individual">Физлицо</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ответственный</Label>
                  <Select
                    value={form.responsibleUserId}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, responsibleUserId: value === "none" ? "" : value }))
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
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  className={`w-full rounded-md border p-2 text-left text-sm ${
                    selectedClient?.id === client.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedId(client.id)}>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-muted-foreground">{client.email}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedClient && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedClient.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Email: {selectedClient.email}</p>
                  <p>Тип: {selectedClient.type}</p>
                  <p>Статус: {selectedClient.status}</p>
                </CardContent>
              </Card>

              <CommentSection
                comments={selectedClient.comments}
                onAddComment={(text) => addComment("client", selectedClient.id, text)}
              />

              <FileUpload
                files={selectedClient.files}
                onUpload={async (file) => {
                  addFile("client", selectedClient.id, {
                    name: file.name,
                    size: file.size,
                    uploadedBy: userId ?? "system"
                  });
                }}
              />
            </div>
          )}
        </div>
      </RoleGuard>
    </div>
  );
}
