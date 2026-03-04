"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/erp/notification-center";
import { useErpStore } from "@/lib/erp/store";

const links = [
  { href: "/erp/dashboard", label: "Dashboard" },
  { href: "/erp/clients", label: "Клиенты" },
  { href: "/erp/deals", label: "Сделки" },
  { href: "/erp/tasks", label: "Задачи" },
  { href: "/erp/projects", label: "Проекты" }
];

export default function ErpProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useErpStore((state) => state.token);
  const userId = useErpStore((state) => state.userId);
  const users = useErpStore((state) => state.users);
  const logout = useErpStore((state) => state.logout);

  const currentUser = useMemo(() => users.find((user) => user.id === userId), [users, userId]);

  useEffect(() => {
    if (!token) {
      router.replace("/erp/login");
    }
  }, [token, router]);

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground text-sm">Проверка сессии...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-background sticky top-0 z-20 border-b">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1 text-sm ${
                  pathname === link.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <NotificationCenter />
            <span className="text-muted-foreground text-sm">
              {currentUser?.name} ({currentUser?.role})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                router.push("/erp/login");
              }}>
              Выход
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-4 px-4 py-6">{children}</main>
    </div>
  );
}
