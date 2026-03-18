import { useState, useEffect } from 'react';
import type { Node } from 'reactflow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { iconOptions } from '@/lib/canvas-icons';
import ServiceEditor from './ServiceEditor';
import CustomFieldsEditor from './CustomFieldsEditor';
import type { ServiceItem, CustomField, ScannedPort, PortMapping, ScannedHost } from '@/types/canvas';

interface NodeEditorProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

const colors = [
  { value: 'default', label: 'По умолчанию', class: 'bg-gray-200' },
  { value: 'red', label: 'Красный', class: 'bg-red-200' },
  { value: 'orange', label: 'Оранжевый', class: 'bg-orange-200' },
  { value: 'yellow', label: 'Жёлтый', class: 'bg-yellow-200' },
  { value: 'green', label: 'Зелёный', class: 'bg-green-200' },
  { value: 'cyan', label: 'Голубой', class: 'bg-cyan-200' },
  { value: 'purple', label: 'Фиолетовый', class: 'bg-purple-200' },
];

function NodeEditor({ node, isOpen, onClose, onSave }: NodeEditorProps) {
  const [label, setLabel] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('default');
  const [icon, setIcon] = useState('none');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [host, setHost] = useState('');
  const [portMappings, setPortMappings] = useState<PortMapping[]>([]);
  const [networkRange, setNetworkRange] = useState('');
  const [autoCreateNodes, setAutoCreateNodes] = useState(true);
  // person
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // product-card
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('₽');
  const [productStatus, setProductStatus] = useState('available');
  const [category, setCategory] = useState('');
  // stat-card
  const [statValue, setStatValue] = useState('');
  const [unit, setUnit] = useState('');
  const [trend, setTrend] = useState('neutral');
  const [trendValue, setTrendValue] = useState('');
  const [statDescription, setStatDescription] = useState('');
  // routing-rule
  const [condition, setCondition] = useState('');
  const [destination, setDestination] = useState('');
  const [priority, setPriority] = useState('');
  const [ruleAction, setRuleAction] = useState('route');
  // risk
  const [probability, setProbability] = useState('');
  const [impact, setImpact] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [mitigation, setMitigation] = useState('');
  // group
  const [itemCount, setItemCount] = useState('');
  const [groupType, setGroupType] = useState('');

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setContent(node.data.content || '');
      setColor(node.data.color || 'default');
      setIcon(node.data.icon || 'none');
      setServices(node.data.services || []);
      setCustomFields(node.data.customFields || []);
      setHost(node.data.host || '');
      setPortMappings(node.data.portMappings || []);
      setNetworkRange(node.data.networkRange || '');
      setAutoCreateNodes(node.data.autoCreateNodes !== false);
      // person
      setRole(node.data.role || '');
      setEmail(node.data.email || '');
      setPhone(node.data.phone || '');
      // product-card
      setPrice(node.data.price || '');
      setCurrency(node.data.currency || '₽');
      setProductStatus(node.data.status || 'available');
      setCategory(node.data.category || '');
      // stat-card
      setStatValue(node.data.value || '');
      setUnit(node.data.unit || '');
      setTrend(node.data.trend || 'neutral');
      setTrendValue(node.data.trendValue || '');
      setStatDescription(node.data.description || '');
      // routing-rule
      setCondition(node.data.condition || '');
      setDestination(node.data.destination || '');
      setPriority(node.data.priority || '');
      setRuleAction(node.data.action || 'route');
      // risk
      setProbability(node.data.probability || '');
      setImpact(node.data.impact || '');
      setSeverity(node.data.severity || 'medium');
      setMitigation(node.data.mitigation || '');
      // group
      setItemCount(node.data.itemCount || '');
      setGroupType(node.data.groupType || '');
    }
  }, [node]);

  const handleSave = () => {
    const saveData: any = { label, content, color, icon, services, customFields };
    if (node?.type === 'tracked') {
      saveData.host = host;
      saveData.portMappings = portMappings;
    }
    if (node?.type === 'tracked-group') {
      saveData.networkRange = networkRange;
      saveData.autoCreateNodes = autoCreateNodes;
    }
    if (node?.type === 'person') {
      saveData.role = role;
      saveData.email = email;
      saveData.phone = phone;
    }
    if (node?.type === 'product-card') {
      saveData.price = price;
      saveData.currency = currency;
      saveData.status = productStatus;
      saveData.category = category;
    }
    if (node?.type === 'stat-card') {
      saveData.value = statValue;
      saveData.unit = unit;
      saveData.trend = trend;
      saveData.trendValue = trendValue;
      saveData.description = statDescription;
    }
    if (node?.type === 'routing-rule') {
      saveData.condition = condition;
      saveData.destination = destination;
      saveData.priority = priority;
      saveData.action = ruleAction;
    }
    if (node?.type === 'risk') {
      saveData.probability = probability;
      saveData.impact = impact;
      saveData.severity = severity;
      saveData.mitigation = mitigation;
    }
    if (node?.type === 'group') {
      saveData.itemCount = itemCount;
      saveData.groupType = groupType;
    }
    onSave(saveData);
  };

  // Функция для маппинга порта к сервису
  const handleMapPort = (port: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const newMapping: PortMapping = {
      port,
      serviceId,
      serviceName: service.name,
    };

    setPortMappings(prev => {
      const filtered = prev.filter(m => m.port !== port);
      return [...filtered, newMapping];
    });
  };

  // Функция для удаления маппинга порта
  const handleUnmapPort = (port: number) => {
    setPortMappings(prev => prev.filter(m => m.port !== port));
  };

  if (!node) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать узел</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="label">Заголовок</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Введите заголовок"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="content">Описание (опционально)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Общее описание узла..."
              className="min-h-[80px] text-sm"
            />
          </div>

          {/* Поля для tracked узлов */}
          {node.type === 'tracked' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="host">Хост для сканирования</Label>
                <Input
                  id="host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost, 192.168.1.1, example.com"
                />
              </div>

              {/* Маппинг портов к сервисам */}
              {node.data.scannedPorts && (node.data.scannedPorts as ScannedPort[]).length > 0 && (
                <div className="grid gap-2 border-t pt-4">
                  <Label>Маппинг портов к сервисам</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(node.data.scannedPorts as ScannedPort[]).map((scannedPort) => {
                      const mapping = portMappings.find(m => m.port === scannedPort.port);
                      return (
                        <div key={scannedPort.port} className="flex items-center gap-2 p-2 border rounded">
                          <span className="font-mono font-semibold min-w-[60px]">
                            {scannedPort.port}
                          </span>
                          {scannedPort.service && (
                            <span className="text-sm text-gray-600">({scannedPort.service})</span>
                          )}
                          <span className="flex-1">→</span>
                          {mapping ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{mapping.serviceName}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnmapPort(scannedPort.port)}
                                className="h-6 px-2 text-xs"
                              >
                                Отвязать
                              </Button>
                            </div>
                          ) : (
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleMapPort(scannedPort.port, e.target.value);
                                }
                              }}
                              className="text-sm border rounded px-2 py-1"
                            >
                              <option value="">Выберите сервис...</option>
                              {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Поля для tracked-group */}
          {node.type === 'tracked-group' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="networkRange">Диапазон сети</Label>
                <Input
                  id="networkRange"
                  value={networkRange}
                  onChange={(e) => setNetworkRange(e.target.value)}
                  placeholder="172.16.8.0/24 или 172.16.8.1-100"
                />
                <div className="text-xs text-gray-500">
                  Укажите диапазон сети для сканирования (например, 172.16.8.0/24 или 172.16.8.1-100)
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoCreateNodes"
                    checked={autoCreateNodes}
                    onChange={(e) => setAutoCreateNodes(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="autoCreateNodes" className="cursor-pointer">
                    Автоматически создавать узлы для найденных хостов
                  </Label>
                </div>
              </div>

              {/* Список найденных хостов */}
              {node.data.scannedHosts && (node.data.scannedHosts as ScannedHost[]).length > 0 && (
                <div className="grid gap-2 border-t pt-4">
                  <Label>Найденные хосты ({(node.data.scannedHosts as ScannedHost[]).length})</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(node.data.scannedHosts as ScannedHost[]).map((host) => (
                      <div key={host.ip} className="flex items-center gap-2 p-2 border rounded">
                        <span className="font-mono font-semibold">{host.ip}</span>
                        {host.hostname && (
                          <span className="text-sm text-gray-600">({host.hostname})</span>
                        )}
                        <span className="ml-auto text-xs text-green-600">Online</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Поля для person */}
          {node.type === 'person' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="role">Должность / Роль</Label>
                <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Разработчик, Менеджер, CTO..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 999 123 4567" />
                </div>
              </div>
            </>
          )}

          {/* Поля для product-card */}
          {node.type === 'product-card' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="category">Категория</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Электроника, Одежда..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="price">Цена</Label>
                  <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1999.99" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Валюта</Label>
                  <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="₽" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Статус</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'available', label: 'В наличии' },
                    { value: 'out_of_stock', label: 'Нет в наличии' },
                    { value: 'discontinued', label: 'Снят' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setProductStatus(s.value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${productStatus === s.value ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 hover:border-muted-foreground'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Поля для stat-card */}
          {node.type === 'stat-card' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="statValue">Значение</Label>
                  <Input id="statValue" value={statValue} onChange={(e) => setStatValue(e.target.value)} placeholder="45 231" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">Единица</Label>
                  <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="₽, %, шт." />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Тренд</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'up', label: '↑ Рост' },
                    { value: 'down', label: '↓ Падение' },
                    { value: 'neutral', label: '→ Стабильно' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTrend(t.value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${trend === t.value ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 hover:border-muted-foreground'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="trendValue">Изменение</Label>
                  <Input id="trendValue" value={trendValue} onChange={(e) => setTrendValue(e.target.value)} placeholder="+20.1% за месяц" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="statDesc">Подпись</Label>
                  <Input id="statDesc" value={statDescription} onChange={(e) => setStatDescription(e.target.value)} placeholder="от прошлого месяца" />
                </div>
              </div>
            </>
          )}

          {/* Поля для routing-rule */}
          {node.type === 'routing-rule' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="priority">Приоритет</Label>
                <Input 
                  id="priority" 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value)} 
                  placeholder="1, 10, 100..." 
                  type="number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="condition">Условие маршрутизации</Label>
                <Textarea 
                  id="condition" 
                  value={condition} 
                  onChange={(e) => setCondition(e.target.value)} 
                  placeholder="Например: user.role == 'admin' AND request.path.startsWith('/api')"
                  className="min-h-[80px] text-sm font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="destination">Маршрут назначения</Label>
                <Input 
                  id="destination" 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value)} 
                  placeholder="Например: api-server-1, load-balancer, fallback-service"
                />
              </div>
              <div className="grid gap-2">
                <Label>Действие</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'route', label: 'Маршрут' },
                    { value: 'accept', label: 'Принять' },
                    { value: 'reject', label: 'Отклонить' },
                  ].map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setRuleAction(a.value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${ruleAction === a.value ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 hover:border-muted-foreground'}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Поля для risk */}
          {node.type === 'risk' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="probability">Вероятность (1-5)</Label>
                  <Input 
                    id="probability" 
                    value={probability} 
                    onChange={(e) => setProbability(e.target.value)} 
                    placeholder="1-5"
                    type="number"
                    min="1"
                    max="5"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="impact">Влияние (1-5)</Label>
                  <Input 
                    id="impact" 
                    value={impact} 
                    onChange={(e) => setImpact(e.target.value)} 
                    placeholder="1-5"
                    type="number"
                    min="1"
                    max="5"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Уровень серьёзности</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'critical', label: 'Критичный' },
                    { value: 'high', label: 'Высокий' },
                    { value: 'medium', label: 'Средний' },
                    { value: 'low', label: 'Низкий' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSeverity(s.value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${severity === s.value ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 hover:border-muted-foreground'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mitigation">План смягчения</Label>
                <Textarea 
                  id="mitigation" 
                  value={mitigation} 
                  onChange={(e) => setMitigation(e.target.value)} 
                  placeholder="Описание плана смягчения риска..."
                  className="min-h-[80px] text-sm"
                />
              </div>
            </>
          )}

          {/* Поля для group */}
          {node.type === 'group' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="itemCount">Количество элементов</Label>
                  <Input 
                    id="itemCount" 
                    value={itemCount} 
                    onChange={(e) => setItemCount(e.target.value)} 
                    placeholder="0"
                    type="number"
                    min="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="groupType">Тип группы</Label>
                  <Input 
                    id="groupType" 
                    value={groupType} 
                    onChange={(e) => setGroupType(e.target.value)} 
                    placeholder="Например: Отдел, Проект, Команда"
                  />
                </div>
              </div>
            </>
          )}

          <ServiceEditor services={services} onChange={setServices} />

          <CustomFieldsEditor
            customFields={customFields}
            onChange={setCustomFields}
            label="Кастомные поля узла"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Цвет</Label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`h-10 rounded-md border-2 transition-all ${c.class} ${
                      color === c.value
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-300'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Иконка</Label>
              <div className="grid grid-cols-10 gap-0.5 max-h-48 overflow-y-auto p-1 border rounded-md">
                {iconOptions.map((iconOption) => {
                  const IconComponent = iconOption.Icon;
                  return (
                    <button
                      key={iconOption.value}
                      onClick={() => setIcon(iconOption.value)}
                      className={`h-8 w-8 rounded border transition-all flex items-center justify-center ${
                        icon === iconOption.value
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                          : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      title={iconOption.label}
                    >
                      <IconComponent className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NodeEditor;
