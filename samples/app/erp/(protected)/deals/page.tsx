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

export default function DealsPage() {
  const userId = useErpStore((state) => state.userId);
  const users = useErpStore((state) => state.users);
  const clients = useErpStore((state) => state.clients);
  const deals = useErpStore((state) => state.deals);
  const savedFilters = useErpStore((state) => state.savedFilters);
  const saveFilter = useErpStore((state) => state.saveFilterPreset);
  const createDeal = useErpStore((state) => state.createDeal);
  const changeStatus = useErpStore((state) => state.changeStatus);
  const addComment = useErpStore((state) => state.addComment);
  const addFile = useErpStore((state) => state.addFile);

  const currentUser = users.find((item) => item.id === userId);

  const [isOpen, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(deals[0]?.id ?? null);
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    clientId: clients[0]?.id ?? "",
    amount: "",
    currency: "USD",
    responsibleUserId: ""
  });

  const filtered = useMemo(() => applyEntityFilters(deals, filter), [deals, filter]);
  const selectedDeal = deals.find((item) => item.id === selectedId) ?? filtered[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Сделки</h1>
        <p className="text-muted-foreground text-sm">Kanban/list MVP с карточкой и статусом</p>
      </div>

      <RoleGuard role={currentUser?.role} entity="deal">
        <FilterBar
          scope="deal"
          value={filter}
          onChange={setFilter}
          onSave={(name, criteria) => saveFilter({ name, criteria, scope: "deal" })}
          presets={savedFilters}
          quickFilters={[
            { label: "Новые", criteria: { status: "new" } },
            { label: "Без ответственного", criteria: { responsibleUserId: "unassigned" } }
          ]}
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Список сделок</CardTitle>
              <ModalForm
                trigger={<Button size="sm">Создать сделку</Button>}
                title="Новая сделка"
                description="Форма создания сделки"
                open={isOpen}
                onOpenChange={setOpen}
                onSubmit={() => {
                  const amount = Number(form.amount);
                  if (!form.title.trim() || !form.clientId || !Number.isFinite(amount) || amount <= 0) {
                    return;
                  }

                  createDeal({
                    title: form.title.trim(),
                    clientId: form.clientId,
                    amount,
                    currency: form.currency as "USD" | "EUR",
                    responsibleUserId: form.responsibleUserId || undefined
                  });
                  setForm({
                    title: "",
                    clientId: clients[0]?.id ?? "",
                    amount: "",
                    currency: "USD",
                    responsibleUserId: ""
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
                <div className="space-y-2">
                  <Label>Клиент</Label>
                  <Select
                    value={form.clientId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, clientId: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Сумма</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Валюта</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </ModalForm>
            </CardHeader>
            <CardContent className="space-y-2">
              {filtered.map((deal) => (
                <button
                  key={deal.id}
                  className={`w-full rounded-md border p-2 text-left text-sm ${
                    selectedDeal?.id === deal.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedId(deal.id)}>
                  <p className="font-medium">{deal.title}</p>
                  <p className="text-muted-foreground">
                    {deal.amount} {deal.currency}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedDeal && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedDeal.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    Сумма: {selectedDeal.amount} {selectedDeal.currency}
                  </p>
                  <div className="space-y-2">
                    <Label>Статус</Label>
                    <Select
                      value={selectedDeal.status}
                      onValueChange={(value) =>
                        changeStatus(selectedDeal ? "deal" : "deal", selectedDeal.id, value as any)
                      }>
                      <SelectTrigger>
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
                </CardContent>
              </Card>

              <CommentSection
                comments={selectedDeal.comments}
                onAddComment={(text) => addComment("deal", selectedDeal.id, text)}
              />

              <FileUpload
                files={selectedDeal.files}
                onUpload={async (file) => {
                  addFile("deal", selectedDeal.id, {
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
