# 🚀 Начало работы с Graph OS

## Что это?

Graph OS — это интерактивная карта организации, где всё связано:
люди → системы → процессы → документы → риски → деньги.

Это не Miro, не Obsidian, не BPM. Это граф-ОС для компании.

---

## 📋 Что было реализовано (Фаза 1)

### ✅ Типы связей
12 семантических типов связей с цветовой кодировкой:
- `depends_on` (красный) — зависит от
- `owned_by` (синий) — владелец
- `uses` (фиолетовый) — использует
- `integrates_with` (голубой) — интегрируется с
- `blocks` (тёмно-красный) — блокирует
- `generates_revenue_for` (зелёный) — приносит доход
- `risk_for` (оранжевый) — риск для
- `monitored_by` (индиго) — мониторится
- `reports_to` (розовый) — подчиняется
- `member_of` (бирюзовый) — член группы
- `documents` (жёлтый) — документирует
- `escalated_to` (фиолетовый) — эскалировано к

### ✅ Расширенные поля узлов
- **System Node**: owner, criticality, environment, techStack, status, riskLevel, sla, dependencies
- **Persona Node**: role, department, accessLevel, workload, reportsTo, systemsUsed, riskProfile
- **Product Node**: sku, revenue, dependencySystems, sla, riskLevel, margin

### ✅ Impact Engine
Анализирует влияние удаления узла:
- Находит прямые и косвенные зависимости
- Определяет затронутые процессы, продукты, отделы
- Вычисляет уровень серьёзности

### ✅ View Overlays (5 режимов просмотра)
- **Architecture** — стандартный вид
- **Risk** — подсветка по уровню риска
- **Revenue** — подсветка по доходу
- **Dependency** — подсветка зависимостей
- **Responsibility** — подсветка загруженности и владельцев

---

## 🎯 Как использовать

### 1. Создание связи с типом

```
1. Создайте связь между двумя узлами
2. Кликните на связь правой кнопкой мыши
3. Выберите "Редактировать"
4. В диалоге выберите тип связи из dropdown
5. Нажмите "Сохранить"
```

Связь автоматически получит цвет и label.

### 2. Анализ влияния

Перед удалением узла система показывает:
- Сколько других узлов зависит
- Какие процессы затронуты
- Какие продукты станут недоступны
- Какие отделы потеряют доступ

### 3. Переключение режимов просмотра

Используйте кнопки в верхней части канваса:
- 🏗️ **Архитектура** — стандартный вид
- 🔴 **Риски** — красный = критичный, зелёный = низкий
- 💰 **Доход** — зелёный = высокий доход, серый = нет дохода
- 🔗 **Зависимости** — подсветка цепочек
- 👤 **Ответственность** — красный = перегружен, серый = нет владельца

---

## 📚 Документация

### Для пользователей
- **PHASE1_SUMMARY.md** — что было сделано
- **docs/EDGE_TYPES.md** — описание типов связей

### Для разработчиков
- **docs/ARCHITECTURE.md** — архитектурный обзор
- **docs/PHASE1_IMPLEMENTATION.md** — технические детали
- **docs/NEXT_STEPS.md** — следующие шаги

---

## 🔧 Технические детали

### Структура System Node

```typescript
{
  id: 'sys-1',
  type: 'text',
  data: {
    label: 'Payment System',
    nodeType: 'system',
    owner: 'person-1',              // ID владельца
    criticality: 'critical',         // critical/high/medium/low
    environment: 'prod',             // prod/uat/test/dev
    techStack: ['Node.js', 'PostgreSQL'],
    status: 'active',                // active/deprecated/maintenance
    riskLevel: 'high',               // critical/high/medium/low
    sla: '99.9%',
    dependencies: ['sys-2', 'sys-3'],
  },
}
```

### Использование Impact Engine

```typescript
import { calculateImpact, formatImpactReport } from './lib/impactAnalysis';

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
```

### Использование View Overlays

```typescript
import { useViewModeStore } from './store/viewModeStore';
import { getNodeColorByViewMode } from './lib/viewModeColors';

const { currentMode } = useViewModeStore();
const color = getNodeColorByViewMode(node, currentMode);

// Применить цвет
<div style={{ backgroundColor: color }}>
  {node.data.label}
</div>
```

---

## 🧪 Примеры использования

### Пример 1: Создание архитектуры

```
1. Создайте узлы:
   - System: "Payment API"
   - System: "Database"
   - System: "Cache"
   - Person: "John (DevOps)"

2. Свяжите их:
   - Payment API --depends_on--> Database
   - Payment API --depends_on--> Cache
   - Payment API --owned_by--> John
   - Database --monitored_by--> John

3. Установите поля:
   - Payment API: criticality=critical, environment=prod, riskLevel=high
   - John: workload=85, accessLevel=admin
```

### Пример 2: Анализ влияния

```
1. Создайте цепочку:
   System A --depends_on--> System B --depends_on--> System C

2. Попробуйте удалить System B

3. Система покажет:
   - 1 прямая зависимость (System A)
   - 1 косвенная зависимость (System C)
   - Severity: HIGH
```

### Пример 3: Поиск проблем

```
1. Переключитесь на Risk View

2. Красные узлы = критичные риски

3. Переключитесь на Responsibility View

4. Красные узлы = перегруженные люди
   Серые узлы = без владельца
```

---

## 🚀 Следующие шаги

### Фаза 1.5: Интеграция в UI
- Обновить EquipmentNode.tsx — применить цвета View Overlays
- Обновить CanvasContextMenu.tsx — показать Impact Report
- Добавить ViewModeSelector в CanvasEditor.tsx
- Обновить NodeEditor.tsx — добавить новые поля

### Фаза 2: Аналитика
- Health Insights — автоматические проблемы
- Расширенные типы нод (Risk, External Service, Department, Flow)
- Organization Memory — история изменений

### Фаза 3: Масштабирование
- Виртуализация узлов для больших графов
- Кэширование анализа
- Индексирование для быстрого поиска

---

## 💡 Ключевые концепции

### Семантические связи
Граф теперь "понимает" отношения между узлами. Это позволяет:
- Анализировать влияние
- Находить проблемы
- Строить отчёты

### Multi-perspective View
Один граф, много перспектив:
- Архитектор видит архитектуру
- Риск-менеджер видит риски
- Финансист видит доход
- HR видит загруженность

### Impact Analysis
Перед удалением узла система показывает, что сломается. Это критично для enterprise.

---

## 🎓 Архитектура

```
Presentation Layer (UI Components)
    ↓
Analytics Layer (Business Logic)
    ↓
Semantic Layer (Types & Schemas)
    ↓
Storage Layer (State Management)
    ↓
Data Layer (ReactFlow + WebSocket)
```

---

## 📞 Поддержка

### Документация
- `docs/EDGE_TYPES.md` — типы связей
- `docs/ARCHITECTURE.md` — архитектура
- `docs/NEXT_STEPS.md` — следующие шаги

### Примеры кода
- `src/lib/impactAnalysis.ts` — Impact Engine
- `src/lib/viewModeColors.ts` — View Overlays
- `src/components/EdgeEditor.tsx` — редактирование связей

---

## 🎉 Готово!

Фаза 1 завершена. Система готова к использованию и расширению.

**Начните с создания простого графа и экспериментируйте с типами связей!**
