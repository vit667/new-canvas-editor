# 🎨 Samples для Фазы 1.5

Ты добавил отличные компоненты в `samples/`. Вот как их использовать для Фазы 1.5.

---

## 📋 Полезные компоненты

### 1. NotificationCenter
**Файл:** `samples/components/erp/notification-center.tsx`

**Использование:** Для отображения Impact Reports и Health Insights

```typescript
import { NotificationCenter } from '@/samples/components/erp/notification-center';

// В CanvasActionsMenu или CanvasEditor
<NotificationCenter />
```

**Адаптация для Impact Reports:**
```typescript
// Вместо notifications из store, используем Impact Reports
const impactNotifications = nodes.map(node => ({
  id: node.id,
  message: `System ${node.data.label} has ${calculateImpact(node.id, nodes, edges).totalImpactCount} dependencies`,
  isRead: false,
  createdAt: new Date(),
}));
```

---

### 2. FilterBar
**Файл:** `samples/components/erp/filter-bar.tsx`

**Использование:** Для фильтрации узлов по типу, критичности, риску

```typescript
import { FilterBar } from '@/samples/components/erp/filter-bar';

// В CanvasEditor
const [filters, setFilters] = useState({});

<FilterBar
  scope="system"
  value={filters}
  onChange={setFilters}
  onSave={(name, criteria) => saveFilter(name, criteria)}
  presets={savedFilters}
  quickFilters={[
    { label: 'Critical Systems', criteria: { criticality: 'critical' } },
    { label: 'High Risk', criteria: { riskLevel: 'high' } },
    { label: 'No Owner', criteria: { owner: '' } },
  ]}
/>
```

---

### 3. ModalForm
**Файл:** `samples/components/erp/modal-form.tsx`

**Использование:** Для редактирования свойств узлов

```typescript
import { ModalForm } from '@/samples/components/erp/modal-form';

// В NodeEditor
<ModalForm
  trigger={<Button>Edit Node</Button>}
  title="Edit System Properties"
  description="Update system details"
  open={isOpen}
  onOpenChange={setIsOpen}
  onSubmit={handleSave}
>
  <Input placeholder="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
  <Select value={criticality} onValueChange={setCriticality}>
    <option>critical</option>
    <option>high</option>
    <option>medium</option>
    <option>low</option>
  </Select>
  {/* ... more fields */}
</ModalForm>
```

---

### 4. UI Components
**Папка:** `samples/components/ui/`

Полезные компоненты:
- **Badge** — для отображения статуса, критичности, риска
- **Card** — для отображения информации о узле
- **Tabs** — для переключения между режимами просмотра
- **Table** — для отображения списка узлов
- **Timeline** — для отображения истории изменений
- **Alert** — для отображения предупреждений об Impact

---

## 🎯 Рекомендации для Фазы 1.5

### 1. HealthInsights компонент

Используй **NotificationCenter** как основу:

```typescript
// src/components/HealthInsights.tsx
import { NotificationCenter } from '@/samples/components/erp/notification-center';

export function HealthInsights() {
  const { nodes, edges } = useCanvasStore();
  
  const insights = generateHealthInsights(nodes, edges);
  
  return (
    <NotificationCenter 
      notifications={insights.map(insight => ({
        id: insight.id,
        message: insight.message,
        isRead: false,
        createdAt: new Date(),
      }))}
    />
  );
}
```

---

### 2. NodeFilter компонент

Используй **FilterBar** как основу:

```typescript
// src/components/NodeFilter.tsx
import { FilterBar } from '@/samples/components/erp/filter-bar';

export function NodeFilter() {
  const [filters, setFilters] = useState({});
  
  const quickFilters = [
    { label: 'Critical', criteria: { criticality: 'critical' } },
    { label: 'High Risk', criteria: { riskLevel: 'high' } },
    { label: 'No Owner', criteria: { owner: '' } },
    { label: 'Deprecated', criteria: { status: 'deprecated' } },
  ];
  
  return (
    <FilterBar
      scope="system"
      value={filters}
      onChange={setFilters}
      onSave={saveFilter}
      presets={savedFilters}
      quickFilters={quickFilters}
    />
  );
}
```

---

### 3. NodeEditor обновление

Используй **ModalForm** как основу:

```typescript
// src/components/NodeEditor.tsx
import { ModalForm } from '@/samples/components/erp/modal-form';

export function NodeEditor({ node, isOpen, onOpenChange }) {
  const [data, setData] = useState(node.data);
  
  return (
    <ModalForm
      trigger={<Button>Edit</Button>}
      title={`Edit ${node.data.label}`}
      description="Update node properties"
      open={isOpen}
      onOpenChange={onOpenChange}
      onSubmit={() => updateNode(node.id, data)}
    >
      {/* System fields */}
      {node.data.nodeType === 'system' && (
        <>
          <Input 
            placeholder="Owner" 
            value={data.owner} 
            onChange={(e) => setData({...data, owner: e.target.value})}
          />
          <Select value={data.criticality} onValueChange={(v) => setData({...data, criticality: v})}>
            <option>critical</option>
            <option>high</option>
            <option>medium</option>
            <option>low</option>
          </Select>
          {/* ... more fields */}
        </>
      )}
    </ModalForm>
  );
}
```

---

## 🎨 UI Components для отображения

### Badge для статуса
```typescript
import { Badge } from '@/samples/components/ui/badge';

<Badge variant={criticality === 'critical' ? 'destructive' : 'default'}>
  {criticality}
</Badge>
```

### Card для информации о узле
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/samples/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>{node.data.label}</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Owner: {node.data.owner}</p>
    <p>Criticality: {node.data.criticality}</p>
    <p>Risk Level: {node.data.riskLevel}</p>
  </CardContent>
</Card>
```

### Table для списка узлов
```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/samples/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Owner</TableHead>
      <TableHead>Criticality</TableHead>
      <TableHead>Risk</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {nodes.map(node => (
      <TableRow key={node.id}>
        <TableCell>{node.data.label}</TableCell>
        <TableCell>{node.data.owner}</TableCell>
        <TableCell>{node.data.criticality}</TableCell>
        <TableCell>{node.data.riskLevel}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Alert для Impact Report
```typescript
import { Alert, AlertDescription, AlertTitle } from '@/samples/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const report = calculateImpact(nodeId, nodes, edges);

{report.severity === 'critical' && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Critical Impact</AlertTitle>
    <AlertDescription>
      {report.totalImpactCount} elements will be affected
    </AlertDescription>
  </Alert>
)}
```

---

## 📋 Чек-лист для Фазы 1.5

### Компоненты для создания/обновления
- [ ] HealthInsights.tsx (на основе NotificationCenter)
- [ ] NodeFilter.tsx (на основе FilterBar)
- [ ] NodeEditor.tsx (обновить с ModalForm)
- [ ] ImpactReportDialog.tsx (на основе Alert + Dialog)

### Компоненты для обновления
- [ ] EquipmentNode.tsx — добавить Badge для статуса
- [ ] CanvasEditor.tsx — добавить ViewModeSelector + NodeFilter
- [ ] CanvasContextMenu.tsx — добавить Impact Report Dialog

### UI компоненты для использования
- [ ] Badge — для статуса, критичности, риска
- [ ] Card — для информации о узле
- [ ] Table — для списка узлов
- [ ] Alert — для предупреждений
- [ ] Dialog — для модальных окон
- [ ] Tabs — для переключения режимов

---

## 🚀 Порядок реализации

1. **Создать HealthInsights.tsx** (на основе NotificationCenter)
2. **Создать NodeFilter.tsx** (на основе FilterBar)
3. **Обновить NodeEditor.tsx** (использовать ModalForm)
4. **Обновить EquipmentNode.tsx** (добавить Badge)
5. **Обновить CanvasEditor.tsx** (добавить ViewModeSelector + NodeFilter)
6. **Обновить CanvasContextMenu.tsx** (добавить Impact Report)

---

## 💡 Примеры использования

### Полный пример: HealthInsights
```typescript
// src/components/HealthInsights.tsx
import { NotificationCenter } from '@/samples/components/erp/notification-center';
import { useCanvasStore } from '@/store/canvasStore';
import { generateHealthInsights } from '@/lib/healthAnalysis';

export function HealthInsights() {
  const { nodes, edges } = useCanvasStore();
  
  const insights = generateHealthInsights(nodes, edges);
  
  const notifications = insights.map(insight => ({
    id: insight.id,
    message: insight.message,
    isRead: false,
    createdAt: new Date(),
    userId: 'current-user', // Для фильтрации в NotificationCenter
  }));
  
  return <NotificationCenter notifications={notifications} />;
}
```

### Полный пример: NodeFilter
```typescript
// src/components/NodeFilter.tsx
import { FilterBar } from '@/samples/components/erp/filter-bar';
import { useCanvasStore } from '@/store/canvasStore';
import { useState } from 'react';

export function NodeFilter() {
  const { nodes } = useCanvasStore();
  const [filters, setFilters] = useState({});
  
  const quickFilters = [
    { label: 'Critical Systems', criteria: { criticality: 'critical' } },
    { label: 'High Risk', criteria: { riskLevel: 'high' } },
    { label: 'No Owner', criteria: { owner: '' } },
    { label: 'Deprecated', criteria: { status: 'deprecated' } },
  ];
  
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Фильтруем узлы
    const filtered = nodes.filter(node => {
      return Object.entries(newFilters).every(([key, value]) => {
        if (!value) return true;
        return node.data[key] === value;
      });
    });
    // Обновляем canvas
  };
  
  return (
    <FilterBar
      scope="system"
      value={filters}
      onChange={handleFilterChange}
      onSave={(name, criteria) => console.log('Save filter:', name, criteria)}
      presets={[]}
      quickFilters={quickFilters}
    />
  );
}
```

---

## 📞 Поддержка

Все компоненты находятся в `samples/components/`:
- `erp/` — бизнес-логика компоненты
- `ui/` — базовые UI компоненты
- `layout/` — компоненты макета
- `theme-customizer/` — кастомизация темы

Используй их как основу для своих компонентов!

---

**Готовы к Фазе 1.5! 🚀**
