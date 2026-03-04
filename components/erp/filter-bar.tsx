"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EntityType, FilterPreset } from "@/lib/erp/types";

type Criteria = Record<string, string>;

export function FilterBar({
  scope,
  value,
  onChange,
  onSave,
  presets,
  quickFilters
}: {
  scope: EntityType;
  value: Criteria;
  onChange: (next: Criteria) => void;
  onSave: (name: string, criteria: Criteria) => void;
  presets: FilterPreset[];
  quickFilters: Array<{ label: string; criteria: Criteria }>;
}) {
  const [presetName, setPresetName] = useState("");

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {quickFilters.map((item) => (
          <Button
            key={item.label}
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...value, ...item.criteria })}>
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor={`${scope}-saved-filter`}>Сохраненный фильтр</Label>
          <div className="flex gap-2">
            <Input
              id={`${scope}-saved-filter`}
              value={presetName}
              placeholder="Название фильтра"
              onChange={(event) => setPresetName(event.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (!presetName.trim()) return;
                onSave(presetName.trim(), value);
                setPresetName("");
              }}>
              Сохранить
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Применить</Label>
          <div className="flex flex-wrap gap-2">
            {presets
              .filter((item) => item.scope === scope)
              .map((preset) => (
                <Button
                  key={preset.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(preset.criteria)}>
                  {preset.name}
                </Button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
