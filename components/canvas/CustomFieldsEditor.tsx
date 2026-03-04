import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { iconOptions } from '@/lib/canvas-icons';
import type { CustomField } from '@/types/canvas';

interface CustomFieldsEditorProps {
  customFields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  label?: string;
}

function CustomFieldsEditor({ customFields, onChange, label = 'Кастомные поля' }: CustomFieldsEditorProps) {
  const addField = () => {
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      key: '',
      value: '',
      icon: 'none',
    };
    onChange([...customFields, newField]);
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    onChange(
      customFields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  const removeField = (id: string) => {
    onChange(customFields.filter((field) => field.id !== id));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          onClick={addField}
          size="sm"
          variant="outline"
          className="h-8"
        >
          <Plus className="w-3 h-3 mr-1" />
          Добавить поле
        </Button>
      </div>

      {customFields.length > 0 && (
        <div className="space-y-3 border rounded-md p-3 bg-muted/30">
          {customFields.map((field) => {
            return (
              <div key={field.id} className="space-y-2">
                <div className="flex gap-2 items-start">
                  <Input
                    placeholder="Ключ"
                    value={field.key}
                    onChange={(e) => updateField(field.id, { key: e.target.value })}
                    className="flex-1 text-sm h-9"
                  />
                  <Input
                    placeholder="Значение"
                    value={field.value}
                    onChange={(e) => updateField(field.id, { value: e.target.value })}
                    className="flex-1 text-sm h-9"
                  />
                  <Button
                    type="button"
                    onClick={() => removeField(field.id)}
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Иконка</Label>
                  <div className="grid grid-cols-10 gap-1 max-h-32 overflow-y-auto p-1 border rounded-md bg-background">
                    {iconOptions.map((iconOption) => {
                      const Icon = iconOption.Icon;
                      const isSelected = (field.icon || 'none') === iconOption.value;
                      return (
                        <button
                          key={iconOption.value}
                          type="button"
                          onClick={() =>
                            updateField(field.id, { icon: iconOption.value })
                          }
                          className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                          title={iconOption.label}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomFieldsEditor;
