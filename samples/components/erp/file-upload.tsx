"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { EntityFile } from "@/lib/erp/types";

export function FileUpload({
  files,
  onUpload
}: {
  files: EntityFile[];
  onUpload: (file: File) => Promise<void>;
}) {
  const [selected, setSelected] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!selected || isUploading) return;

    setIsUploading(true);
    setProgress(10);

    const steps = [30, 55, 80, 100];
    for (const step of steps) {
      // Simulates upload progress in MVP mode without backend streaming.
      await new Promise((resolve) => setTimeout(resolve, 120));
      setProgress(step);
    }

    await onUpload(selected);
    setSelected(null);
    setTimeout(() => setProgress(0), 300);
    setIsUploading(false);
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <h3 className="text-sm font-semibold">Файлы</h3>
      <div className="flex flex-col gap-2 md:flex-row">
        <Input
          type="file"
          onChange={(event) => setSelected(event.target.files?.[0] ?? null)}
          disabled={isUploading}
        />
        <Button onClick={handleUpload} disabled={!selected || isUploading}>
          {isUploading ? "Загрузка..." : "Загрузить"}
        </Button>
      </div>
      {progress > 0 && <Progress value={progress} />}

      <div className="space-y-2">
        {files.length === 0 && <p className="text-muted-foreground text-sm">Файлы отсутствуют</p>}
        {files.map((file) => (
          <div key={file.id} className="text-muted-foreground rounded-md bg-muted/50 p-2 text-sm">
            {file.name} ({Math.ceil(file.size / 1024)} KB)
          </div>
        ))}
      </div>
    </div>
  );
}
