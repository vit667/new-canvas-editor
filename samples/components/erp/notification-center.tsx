"use client";

import { useMemo } from "react";
import { BellIcon, CheckCheckIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useErpStore } from "@/lib/erp/store";

export function NotificationCenter() {
  const userId = useErpStore((state) => state.userId);
  const allNotifications = useErpStore((state) => state.notifications);
  const markRead = useErpStore((state) => state.markNotificationRead);
  const remove = useErpStore((state) => state.deleteNotification);

  const notifications = useMemo(
    () => (userId ? allNotifications.filter((item) => item.userId === userId) : []),
    [userId, allNotifications]
  );

  const unread = notifications.filter((item) => !item.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <BellIcon className="size-4" />
          {unread > 0 && (
            <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 min-w-4 rounded-full px-1 text-[10px]">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="px-3 py-2 text-sm font-semibold">Уведомления</div>
        <ScrollArea className="h-80 px-2">
          <div className="space-y-2 py-1">
            {notifications.length === 0 && (
              <p className="text-muted-foreground px-2 py-4 text-sm">Новых событий нет</p>
            )}
            {notifications.map((item) => (
              <div key={item.id} className="rounded-md border p-2">
                <p className="text-sm">{item.message}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {new Date(item.createdAt).toLocaleString("ru-RU")}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => markRead(item.id)}>
                    <CheckCheckIcon className="size-4" />
                    Прочитано
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(item.id)}>
                    <Trash2Icon className="size-4" />
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
