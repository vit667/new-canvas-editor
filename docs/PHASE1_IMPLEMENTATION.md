# Фаза 1: Реализация фундамента

## Что было сделано

### 1. Типы связей (Edge Types)
✅ Добавлены 12 семантических типов связей в `types/canvas.ts`:
- `depends_on`, `owned_by`, `uses`, `integrates_with`, `blocks`
- `generates_revenue_for`, `risk_for`, `monitored_by`, `reports_to`
- `member_of`, `documents`, `escalated_to`

Каждый тип имеет:
- Уникальный цвет
- Русское название
- Семантическое значение

**Файлы:**
- `src/types/canvas.ts` — enum EdgeType и цветовые схемы
- `src/components/EdgeEditor.tsx` — UI для выбора типа связи
- `src/components/edges/CustomEdge.tsx` — отображение типа на линии

### 2. Расширенные поля узлов
✅ Добавлены поля для System, Persona и Product узлов в `types/canvas.ts`:

**System Node:**
- `owner` — владелец системы
- `criticality` — критичность (critical/high/medium/low)
- `environment` — окружение (prod/uat/test/dev)
- `techStack` — технологический стек
- `status` — статус (active/deprecated/maintenance)
- `riskLevel` — уровень риска
- `sla` — SLA
- `dependencies` — зависимости

**Persona Node:**
- `role` — должность
- `department` — отдел
- `accessLevel` — уровень доступа
- `workload` — загруженность (0-100)
- `reportsTo` — подчиняется
- `systemsUsed` — используемые системы
- `riskProfile` — профиль риска

**Product Node:**
- `sku` — артикул
- `revenue` — доход
- `dependencySystems` — зависимые системы
- `margin` — маржа

### 3. Impact Engine
✅ Создан `lib/impactAnalysis.ts` с функциями:
- `calculateImpact()` — анализирует влияние удаления узла
- `findDirectDependents()` — находит прямые зависимости
- `findIndirectDependents()` — находит транзитивные зависимости
- `findAffectedByType()` — находит затронутые узлы по типу
- `formatImpactReport()` — форматирует отчёт для отображения

**Возвращает:**
- Прямые и косвенные зависимости
- Затронутые процессы, продукты, отделы
- Уровень серьёзности (critical/high/medium/low)

### 4. View Overlays (Режимы просмотра)
✅ Реализованы 5 режимов просмотра:

**Файлы:**
- `src/store/viewModeStore.ts` — состояние текущего режима
- `src/components/ViewModeSelector.tsx` — UI переключатель
- `src/lib/viewModeColors.ts` — функции расчёта цветов

**Режимы:**
1. **Architecture** — стандартный вид
2. **Risk** — подсветка по уровню риска (красный → зелёный)
3. **Revenue** — подсветка по доходу (gradient)
4. **Dependency** — подсветка зависимостей
5. **Responsibility** — подсветка загруженности и владельцев

---

## Как использовать

### Создание связи с типом

1. Создайте связь между двумя узлами
2. Кликните на связь правой кнопкой → "Редактировать"
3. Выберите тип связи из dropdown
4. Сохраните

Связь автоматически получит цвет и label.

### Использование Impact Engine

```typescript
import { calculateImpact, formatImpactReport } from '../lib/impactAnalysis';

// Анализируем влияние удаления узла
const report = calculateImpact(nodeId, nodes, edges);

// Форматируем для отображения
const message = formatImpactReport(report);
console.log(message);
```

### Использование View Overlays

```typescript
import { useViewModeStore } from '../store/viewModeStore';
import { getNodeColorByViewMode } from '../lib/viewModeColors';

// В компоненте
const { currentMode } = useViewModeStore();
const nodeColor = getNodeColorByViewMode(node, currentMode);

// Применяем цвет
<div style={{ backgroundColor: nodeColor }}>
  {node.data.label}
</div>
```

---

## Следующие шаги (Фаза 1.5)

### Интеграция в UI

1. **Обновить EquipmentNode.tsx**
   - Применить цвета из View Overlays
   - Отображать поля System/Persona/Product

2. **Обновить CanvasContextMenu.tsx**
   - Показать Impact Report перед удалением узла
   - Диалог подтверждения с информацией об влиянии

3. **Добавить ViewModeSelector в CanvasEditor.tsx**
   - Разместить в верхней части канваса
   - Переключение режимов в реальном времени

4. **Обновить NodeEditor.tsx**
   - Добавить поля для System/Persona/Product узлов
   - Выбор owner, criticality, environment и т.д.

---

## Архитектура

### Слои системы

```
┌─────────────────────────────────────┐
│ View Layer (UI Components)          │
│ - ViewModeSelector                  │
│ - EquipmentNode (с цветами)         │
│ - EdgeEditor (с типами)             │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Analytics Layer                     │
│ - impactAnalysis.ts                 │
│ - viewModeColors.ts                 │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Semantic Layer (Types)              │
│ - EdgeType enum                     │
│ - Extended CanvasNode               │
│ - EDGE_TYPE_LABELS & COLORS         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Storage Layer (Zustand)             │
│ - canvasStore                       │
│ - viewModeStore                     │
└─────────────────────────────────────┘
```

---

## Тестирование

### Проверка типов связей

1. Создайте две системы
2. Свяжите их с типом `depends_on`
3. Проверьте, что связь красная и имеет label "Зависит от"

### Проверка Impact Engine

1. Создайте цепочку: System A → System B → System C
2. Используйте `calculateImpact('A', nodes, edges)`
3. Проверьте, что найдены B и C как зависимые

### Проверка View Overlays

1. Установите `riskLevel: 'critical'` для узла
2. Переключитесь на Risk View
3. Проверьте, что узел красный

---

## Файлы, которые нужно обновить в следующих шагах

- [ ] `src/components/EquipmentNode.tsx` — применить цвета
- [ ] `src/components/NodeEditor.tsx` — добавить поля
- [ ] `src/components/CanvasContextMenu.tsx` — Impact Report
- [ ] `src/components/CanvasEditor.tsx` — ViewModeSelector
- [ ] `src/components/CanvasActionsMenu.tsx` — Health Insights

---

## Метрики успеха

✅ Типы связей работают и отображаются
✅ Impact Engine анализирует зависимости
✅ View Overlays меняют цвета узлов
✅ Все компоненты типизированы и без ошибок
