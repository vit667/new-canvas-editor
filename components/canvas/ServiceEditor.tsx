"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { iconOptions } from '@/lib/canvas-icons';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import CustomFieldsEditor from './CustomFieldsEditor';
import type { ServiceItem, CustomField } from '@/types/canvas';

interface ServiceEditorProps {
  services: ServiceItem[];
  onChange: (services: ServiceItem[]) => void;
}

function ServiceEditor({ services, onChange }: ServiceEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addService = () => {
    const newService: ServiceItem = {
      id: Date.now().toString(),
      name: '',
      icon: 'none',
      port: '',
      description: '',
      location: '',
      startCommand: '',
      customFields: [],
    };
    onChange([...services, newService]);
    setExpandedId(newService.id);
  };

  const removeService = (id: string) => {
    onChange(services.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateService = (id: string, field: keyof ServiceItem, value: string | CustomField[]) => {
    onChange(
      services.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const updateServiceCustomFields = (id: string, customFields: CustomField[]) => {
    updateService(id, 'customFields', customFields);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>Сервисы и компоненты</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addService}
          className="h-8"
        >
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-2">
        {services.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Нет сервисов. Нажмите "Добавить" для создания.
          </p>
        ) : (
          services.map((service) => {
            const isExpanded = expandedId === service.id;
            const IconComponent = iconOptions.find(
              (opt) => opt.value === service.icon
            )?.Icon;

            return (
              <div
                key={service.id}
                className="border rounded-md p-3 bg-white"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : service.id)
                    }
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {IconComponent && (
                    <IconComponent className="w-4 h-4 text-gray-600" />
                  )}

                  <span className="font-medium text-sm flex-1">
                    {service.name || 'Без названия'}
                  </span>

                  {service.port && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      :{service.port}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => removeService(service.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 pl-6">
                    <div className="grid gap-2">
                      <Label htmlFor={`service-name-${service.id}`}>
                        Название
                      </Label>
                      <Input
                        id={`service-name-${service.id}`}
                        value={service.name}
                        onChange={(e) =>
                          updateService(service.id, 'name', e.target.value)
                        }
                        placeholder="Название сервиса"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Иконка</Label>
                      <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto p-2 border rounded-md">
                        {iconOptions.map((iconOption) => {
                          const Icon = iconOption.Icon;
                          return (
                            <button
                              key={iconOption.value}
                              type="button"
                              onClick={() =>
                                updateService(
                                  service.id,
                                  'icon',
                                  iconOption.value
                                )
                              }
                              className={`h-8 w-8 rounded border flex items-center justify-center ${
                                service.icon === iconOption.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                              title={iconOption.label}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`service-port-${service.id}`}>
                        Порт
                      </Label>
                      <Input
                        id={`service-port-${service.id}`}
                        value={service.port}
                        onChange={(e) =>
                          updateService(service.id, 'port', e.target.value)
                        }
                        placeholder="8888"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`service-desc-${service.id}`}>
                        Описание
                      </Label>
                      <Textarea
                        id={`service-desc-${service.id}`}
                        value={service.description}
                        onChange={(e) =>
                          updateService(
                            service.id,
                            'description',
                            e.target.value
                          )
                        }
                        placeholder="Что за сервис и для чего нужен"
                        className="min-h-[60px]"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`service-location-${service.id}`}>
                        Расположение
                      </Label>
                      <Input
                        id={`service-location-${service.id}`}
                        value={service.location}
                        onChange={(e) =>
                          updateService(service.id, 'location', e.target.value)
                        }
                        placeholder="/usr/local/bin/service"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`service-start-${service.id}`}>
                        Команда запуска
                      </Label>
                      <Textarea
                        id={`service-start-${service.id}`}
                        value={service.startCommand}
                        onChange={(e) =>
                          updateService(
                            service.id,
                            'startCommand',
                            e.target.value
                          )
                        }
                        placeholder="systemctl start service"
                        className="min-h-[60px] font-mono text-xs"
                      />
                    </div>

                    <CustomFieldsEditor
                      customFields={service.customFields || []}
                      onChange={(fields) => updateServiceCustomFields(service.id, fields)}
                      label="Кастомные поля сервиса"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ServiceEditor;
