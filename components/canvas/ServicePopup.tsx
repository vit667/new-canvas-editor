import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getIconComponent } from '@/lib/canvas-icons';
import type { ServiceItem, CustomField } from '@/types/canvas';
import { Copy } from 'lucide-react';

interface ServicePopupProps {
  service: ServiceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

function ServicePopup({ service, isOpen, onClose }: ServicePopupProps) {
  if (!service) return null;

  const IconComponent = getIconComponent(service.icon);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {IconComponent && <IconComponent className="w-5 h-5" />}
            {service.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {service.port && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                Порт
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm">
                  {service.port}
                </code>
                <button
                  onClick={() => copyToClipboard(service.port!)}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Копировать"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {service.description && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                Описание
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {service.description}
              </div>
            </div>
          )}

          {service.location && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                Расположение
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                  {service.location}
                </code>
                <button
                  onClick={() => copyToClipboard(service.location!)}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Копировать"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {service.startCommand && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                Команда запуска
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-900 text-green-400 px-3 py-2 rounded text-sm font-mono whitespace-pre-wrap">
                  {service.startCommand}
                </code>
                <button
                  onClick={() => copyToClipboard(service.startCommand!)}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Копировать"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {service.customFields && service.customFields.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                Кастомные поля
              </div>
              <div className="space-y-2">
                {service.customFields.map((field: CustomField) => {
                  if (!field.key) return null;
                  const FieldIcon = getIconComponent(field.icon);
                  return (
                    <div key={field.id} className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        {FieldIcon && (
                          <FieldIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        )}
                        <div className="text-sm font-medium text-gray-700">
                          {field.key}
                        </div>
                      </div>
                      {field.value && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 text-sm text-gray-600 break-words">
                            {field.value}
                          </div>
                          <button
                            onClick={() => copyToClipboard(field.value)}
                            className="p-1.5 hover:bg-gray-200 rounded flex-shrink-0"
                            title="Копировать значение"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ServicePopup;
