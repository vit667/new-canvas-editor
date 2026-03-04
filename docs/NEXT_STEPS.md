# Следующие шаги: Фаза 1.5 - Интеграция в UI

## 🎯 Цель
Интегрировать типы связей, Impact Engine и View Overlays в пользовательский интерфейс.

## 📋 Задачи по приоритету

### 1️⃣ Обновить EquipmentNode.tsx (КРИТИЧНЫЙ)
**Файл:** `src/components/nodes/EquipmentNode.tsx`

**Что нужно:**
- Импортировать `useViewModeStore` и `getNodeColorByViewMode`
- Применить цвет узла в зависимости от режима просмотра
- Отображать иконки для criticality/riskLevel
- Показывать owner если есть

**Пример:**
```typescript
import { useViewModeStore } from '../store/viewModeStore';
import { getNodeColorByViewMode } from '../lib/viewModeColors';

export default function EquipmentNode({ data, selected }: NodeProps) {
  const { currentMode } = useViewModeStore();
  const nodeColor = getNodeColorByViewMode(node, currentMode);
  
  return (
    <div style={{ backgroundColor: nodeColor }}>
      {/* ... */}
    </div>
  );
}
```

---

### 2️⃣ Обновить CanvasContextMenu.tsx (ВЫСОКИЙ)
**Файл:** `src/components/CanvasContextMenu.tsx`

**Что нужно:**
- Перед удалением узла показать Impact Report
- Диалог подтверждения с информацией об влиянии
- Кнопка "Удалить несмотря на риск"

**Пример:**
```typescript
import { calculateImpact, formatImpactReport } from '../lib/impactAnalysis';

const handleDelete = (nodeId: string) => {
  const report = calculateImpact(nodeId, nodes, edges);
  
  if (report.severity === 'critical') {
    // Показать диалог подтверждения
    showImpactDialog(report);
  } else {
    // Удалить сразу
    deleteNode(nodeId);
  }
};
```

---

### 3️⃣ Добавить ViewModeSelector в CanvasEditor.tsx (ВЫСОКИЙ)
**Файл:** `src/components/CanvasEditor.tsx`

**Что нужно:**
- Импортировать `ViewModeSelector`
- Разместить в верхней части канваса
- Переключение режимов в реальном времени

**Пример:**
```typescript
import ViewModeSelector from './ViewModeSelector';

export default function CanvasEditor() {
  return (
    <div className="flex flex-col h-full">
      <ViewModeSelector />
      <ReactFlow nodes={nodes} edges={edges}>
        {/* ... */}
      </ReactFlow>
    </div>
  );
}
```

---

### 4️⃣ Обновить NodeEditor.tsx (СРЕДНИЙ)
**Файл:** `src/components/NodeEditor.tsx`

**Что нужно:**
- Добавить поля для System узлов (owner, criticality, environment, techStack, status, riskLevel, sla)
- Добавить поля для Persona узлов (role, department, accessLevel, workload, reportsTo, systemsUsed)
- Добавить поля для Product узлов (sku, revenue, dependencySystems, margin)
- Условное отображение полей в зависимости от nodeType

**Пример:**
```typescript
const nodeType = node.data?.nodeType;

if (nodeType === 'system') {
  return (
    <>
      <input placeholder="Owner ID" value={node.data?.owner} />
      <select value={node.data?.criticality}>
        <option>critical</option>
        <option>high</option>
        <option>medium</option>
        <option>low</option>
      </select>
      {/* ... */}
    </>
  );
}
```

---

### 5️⃣ Создать HealthInsights.tsx (СРЕДНИЙ)
**Файл:** `src/components/HealthInsights.tsx`

**Что нужно:**
- Анализировать граф и находить проблемы
- Показывать список insights в боковой панели
- Кликабельные insights для навигации

**Примеры insights:**
- "3 системы без ответственного"
- "Этот человек участвует в 14 процессах"
- "5 систем в статусе deprecated"
- "Single point of failure: System A"

---

## 🔧 Технические детали

### Структура данных для System Node

```typescript
{
  id: 'sys-1',
  type: 'text',
  data: {
    label: 'Payment System',
    nodeType: 'system',
    owner: 'person-1',
    criticality: 'critical',
    environment: 'prod',
    techStack: ['Node.js', 'PostgreSQL', 'Redis'],
    status: 'active',
    riskLevel: 'high',
    sla: '99.9%',
    dependencies: ['sys-2', 'sys-3'],
  },
}
```

### Использование Impact Engine

```typescript
import { calculateImpact, formatImpactReport } from '../lib/impactAnalysis';

const report = calculateImpact('sys-1', nodes, edges);

console.log(report);
// {
//   nodeId: 'sys-1',
//   nodeName: 'Payment System',
//   directDependents: ['sys-4', 'sys-5'],
//   indirectDependents: ['sys-6'],
//   affectedProcesses: ['proc-1'],
//   affectedProducts: ['prod-1'],
//   affectedDepartments: ['dept-1'],
//   totalImpactCount: 6,
//   severity: 'critical'
// }

const message = formatImpactReport(report);
console.log(message);
// 📊 Анализ влияния: Payment System
// Уровень серьёзности: 🔴 КРИТИЧНОЕ
// 🔴 Прямые зависимости: 2
// 🟠 Косвенные зависимости: 1
// ⚙️ Затронутые процессы: 1
// 🛍️ Недоступные продукты: 1
// 🏢 Затронутые отделы: 1
// 📈 Всего затронуто: 6 элементов
```

### Использование View Overlays

```typescript
import { useViewModeStore } from '../store/viewModeStore';
import { getNodeColorByViewMode, getNodeStyleByViewMode } from '../lib/viewModeColors';

const { currentMode } = useViewModeStore();

// Получить цвет
const color = getNodeColorByViewMode(node, currentMode);

// Получить полный стиль
const style = getNodeStyleByViewMode(node, currentMode);

// Применить
<div style={style}>
  {node.data.label}
</div>
```

---

## 📝 Чек-лист для реализации

- [ ] EquipmentNode.tsx обновлён с View Overlays
- [ ] CanvasContextMenu.tsx показывает Impact Report
- [ ] ViewModeSelector добавлен в CanvasEditor.tsx
- [ ] NodeEditor.tsx поддерживает новые поля
- [ ] HealthInsights.tsx создан и интегрирован
- [ ] Все компоненты типизированы
- [ ] Нет ошибок в консоли
- [ ] Тестирование в браузере

---

## 🧪 Тестирование

### Тест 1: Типы связей
1. Создайте две системы
2. Свяжите их с типом `depends_on`
3. Проверьте, что связь красная и имеет label

### Тест 2: Impact Engine
1. Создайте цепочку: System A → System B → System C
2. Попробуйте удалить System A
3. Проверьте, что показывается Impact Report

### Тест 3: View Overlays
1. Установите `riskLevel: 'critical'` для узла
2. Переключитесь на Risk View
3. Проверьте, что узел красный

### Тест 4: Persona Node
1. Создайте Persona узел
2. Установите `workload: 90`
3. Переключитесь на Responsibility View
4. Проверьте, что узел красный (перегружен)

---

## 📚 Документация

- `docs/EDGE_TYPES.md` — полное описание типов связей
- `docs/PHASE1_IMPLEMENTATION.md` — что было сделано в Фазе 1
- `docs/NEXT_STEPS.md` — этот файл

---

## 🚀 После завершения Фазы 1.5

Переходим к Фазе 2:
- Health Insights (автоматические проблемы)
- Расширенные типы нод (Risk, External Service, Department, Flow)
- Organization Memory (история изменений)
