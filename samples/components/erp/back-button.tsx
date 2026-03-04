"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { resolveBackTarget } from "@/lib/erp/logic";

export function BackButton({ fallback = "/erp/dashboard" }: { fallback?: string }) {
  const router = useRouter();

  const onBack = () => {
    const target = resolveBackTarget(window.history.length, fallback);
    if (target === "back") {
      router.back();
      return;
    }
    router.push(target);
  };

  return (
    <Button variant="outline" size="sm" onClick={onBack}>
      <ArrowLeftIcon className="size-4" />
      Назад
    </Button>
  );
}
