"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/lib/erp/store";

export default function ErpDashboardPage() {
  const userId = useErpStore((state) => state.userId);
  const users = useErpStore((state) => state.users);
  const clients = useErpStore((state) => state.clients);
  const deals = useErpStore((state) => state.deals);
  const tasks = useErpStore((state) => state.tasks);
  const projects = useErpStore((state) => state.projects);

  const user = users.find((item) => item.id === userId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Роль: <Badge variant="secondary">{user?.role ?? "guest"}</Badge>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Клиенты</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{clients.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Сделки</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{deals.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Задачи</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{tasks.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Проекты</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{projects.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ролевое представление</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {user?.role === "sales" && "Фокус: сделки и клиенты."}
          {user?.role === "manager" && "Фокус: задачи команды и проекты."}
          {user?.role === "admin" && "Фокус: полный обзор системы."}
          {user?.role === "user" && "Фокус: мои задачи и сделки."}
        </CardContent>
      </Card>
    </div>
  );
}
