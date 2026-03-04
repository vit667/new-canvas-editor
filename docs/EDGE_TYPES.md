# Типы связей (Edge Types)

## Обзор

Система поддерживает 12 семантических типов связей, которые описывают отношения между узлами в графе. Каждый тип имеет свой цвет и используется для анализа влияния и режимов просмотра.

## Типы связей

### 1. `depends_on` — Зависит от
**Цвет:** 🔴 Красный (#ef4444)

Используется когда один узел зависит от другого для функционирования.

**Примеры:**
- System A зависит от System B
- Process зависит от System
- Product зависит от System

**Влияние:** Если удалить узел-источник, узел-цель перестанет работать.

---

### 2. `owned_by` — Владелец
**Цвет:** 🔵 Синий (#3b82f6)

Указывает на владельца или ответственного за узел.

**Примеры:**
- System owned_by Person
- Department owned_by Person
- Project owned_by Person

**Использование:** Для анализа ответственности и нагрузки на людей.

---

### 3. `uses` — Использует
**Цвет:** 🟣 Фиолетовый (#8b5cf6)

Указывает на использование одного узла другим.

**Примеры:**
- Person uses System
- Process uses System
- Department uses System

**Использование:** Для анализа зависимостей и Impact Engine.

---

### 4. `integrates_with` — Интегрируется с
**Цвет:** 🔷 Голубой (#06b6d4)

Указывает на интеграцию между системами.

**Примеры:**
- System A integrates_with System B
- Service integrates_with API

**Использование:** Для анализа архитектуры и взаимодействия систем.

---

### 5. `blocks` — Блокирует
**Цвет:** 🔴 Тёмно-красный (#dc2626)

Указывает на блокирующую зависимость или конфликт.

**Примеры:**
- Risk blocks System
- System blocks Process
- Issue blocks Task

**Использование:** Для выявления критических проблем.

---

### 6. `generates_revenue_for` — Приносит доход
**Цвет:** 🟢 Зелёный (#10b981)

Указывает на связь между системой и продуктом/доходом.

**Примеры:**
- System generates_revenue_for Product
- Service generates_revenue_for Department

**Использование:** Для анализа Revenue View и бизнес-влияния.

---

### 7. `risk_for` — Риск для
**Цвет:** 🟠 Оранжевый (#f97316)

Указывает на риск, связанный с узлом.

**Примеры:**
- Risk risk_for System
- Vulnerability risk_for System
- Person (single point of failure) risk_for Process

**Использование:** Для анализа Risk View и выявления уязвимостей.

---

### 8. `monitored_by` — Мониторится
**Цвет:** 🟣 Индиго (#6366f1)

Указывает на мониторинг узла.

**Примеры:**
- System monitored_by Person
- Service monitored_by Team
- Process monitored_by Dashboard

**Использование:** Для анализа ответственности за мониторинг.

---

### 9. `reports_to` — Подчиняется
**Цвет:** 🩷 Розовый (#ec4899)

Указывает на иерархию подчинения.

**Примеры:**
- Person reports_to Manager
- Team reports_to Department
- Department reports_to Director

**Использование:** Для построения организационной структуры.

---

### 10. `member_of` — Член группы
**Цвет:** 🟦 Бирюзовый (#14b8a6)

Указывает на принадлежность к группе.

**Примеры:**
- System member_of Group
- Person member_of Team
- Service member_of Cluster

**Использование:** Для логической группировки узлов.

---

### 11. `documents` — Документирует
**Цвет:** 🟨 Жёлтый (#f59e0b)

Указывает на документацию узла.

**Примеры:**
- Document documents System
- Wiki documents Process
- Guide documents API

**Использование:** Для связи документации с системами.

---

### 12. `escalated_to` — Эскалировано к
**Цвет:** 🟪 Фиолетовый (#a855f7)

Указывает на эскалацию проблемы.

**Примеры:**
- Issue escalated_to Manager
- Alert escalated_to Team
- Problem escalated_to Director

**Использование:** Для отслеживания эскалаций и проблем.

---

## Использование в коде

### Создание связи с типом

```typescript
import { EdgeType } from '../types/canvas';

const edge = {
  id: 'edge-1',
  source: 'system-a',
  target: 'system-b',
  data: {
    edgeType: EdgeType.DEPENDS_ON,
    label: 'Зависит от',
  },
  style: {
    stroke: '#ef4444', // Автоматически устанавливается
  },
};
```

### Анализ связей

```typescript
import { calculateImpact } from '../lib/impactAnalysis';

const report = calculateImpact(nodeId, nodes, edges);
console.log(report.directDependents); // Узлы, которые зависят
console.log(report.severity); // Уровень серьёзности
```

### Режимы просмотра

```typescript
import { useViewModeStore } from '../store/viewModeStore';
import { getNodeColorByViewMode } from '../lib/viewModeColors';

const { currentMode } = useViewModeStore();
const color = getNodeColorByViewMode(node, currentMode);
```

---

## Валидация связей

Не все типы узлов могут быть связаны всеми типами связей. Рекомендуемые комбинации:

| Тип связи | Источник | Цель | Примечание |
|-----------|----------|------|-----------|
| `depends_on` | System, Process | System, Service | Зависимость функционирования |
| `owned_by` | System, Process, Department | Person | Ответственность |
| `uses` | Person, Process, Department | System, Service | Использование |
| `integrates_with` | System, Service | System, Service | Техническая интеграция |
| `blocks` | Risk, Issue | System, Process | Блокирующая проблема |
| `generates_revenue_for` | System, Service | Product, Department | Бизнес-связь |
| `risk_for` | Risk, Vulnerability | System, Process | Риск |
| `monitored_by` | System, Service | Person, Team | Мониторинг |
| `reports_to` | Person, Team | Person, Department | Иерархия |
| `member_of` | System, Person, Service | Group, Department | Группировка |
| `documents` | Document, Wiki | System, Process, API | Документация |
| `escalated_to` | Issue, Alert | Person, Team | Эскалация |

---

## Интеграция с Impact Engine

Типы связей используются для анализа влияния:

```typescript
// Находит узлы, которые зависят от удаляемого узла
const dependents = edges
  .filter(e => e.source === nodeId && e.data?.edgeType === EdgeType.DEPENDS_ON)
  .map(e => e.target);
```

---

## Интеграция с View Overlays

Типы связей влияют на цветовую схему в разных режимах:

- **Risk View:** Подсвечивает узлы с `risk_for` связями
- **Revenue View:** Подсвечивает узлы с `generates_revenue_for` связями
- **Dependency View:** Подсвечивает цепочки `depends_on` и `uses`
- **Responsibility View:** Подсвечивает узлы с `owned_by` и `monitored_by`
