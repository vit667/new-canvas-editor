# Архитектура Graph OS

## 🏗️ Слои системы

```
┌─────────────────────────────────────────────────────────────┐
│ 🎨 Presentation Layer (UI Components)                       │
│ ├─ EquipmentNode.tsx (с цветами View Overlays)             │
│ ├─ EdgeEditor.tsx (выбор типа связи)                       │
│ ├─ ViewModeSelector.tsx (переключение режимов)             │
│ ├─ NodeEditor.tsx (редактирование полей)                  │
│ ├─ CanvasContextMenu.tsx (Impact Report)                   │
│ └─ HealthInsights.tsx (автоматические insights)           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 📊 Analytics Layer (Бизнес-логика)                          │
│ ├─ impactAnalysis.ts (анализ влияния)                      │
│ ├─ viewModeColors.ts (расчёт цветов)                       │
│ ├─ healthAnalysis.ts (поиск проблем)                       │
│ └─ dependencyAnalysis.ts (анализ зависимостей)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 🔗 Semantic Layer (Типы и схемы)                            │
│ ├─ EdgeType enum (12 типов связей)                         │
│ ├─ CanvasNode interface (расширенные поля)                 │
│ ├─ EDGE_TYPE_LABELS (русские названия)                    │
│ └─ EDGE_TYPE_COLORS (цветовые схемы)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 💾 Storage Layer (State Management)                         │
│ ├─ canvasStore (узлы и связи)                              │
│ ├─ viewModeStore (текущий режим просмотра)                 │
│ ├─ projectsStore (проекты)                                 │
│ └─ cmdbStore (CMDB данные)                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 🔄 Data Layer (ReactFlow + WebSocket)                       │
│ ├─ ReactFlow (граф-движок)                                 │
│ ├─ useWebSocketSync (синхронизация)                        │
│ └─ Server API (сохранение)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Компоненты и их ответственность

### Presentation Layer

#### EquipmentNode.tsx
- Отображение узла на канвасе
- Применение цветов из View Overlays
- Показ иконок для criticality/riskLevel
- Интерактивность (выделение, редактирование)

#### EdgeEditor.tsx
- Диалог редактирования связи
- Выбор типа связи (EdgeType)
- Выбор стиля и цвета
- Сохранение изменений

#### ViewModeSelector.tsx
- Переключатель между режимами просмотра
- 5 режимов: Architecture, Risk, Revenue, Dependency, Responsibility
- Сохранение выбора в localStorage

#### NodeEditor.tsx
- Редактирование полей узла
- Условное отображение полей по nodeType
- Валидация данных
- Сохранение в store

#### CanvasContextMenu.tsx
- Контекстное меню при клике на узел
- Показ Impact Report перед удалением
- Диалог подтверждения с информацией об влиянии

#### HealthInsights.tsx
- Анализ графа и поиск проблем
- Список insights в боковой панели
- Кликабельные insights для навигации

---

### Analytics Layer

#### impactAnalysis.ts
**Функции:**
- `calculateImpact(nodeId, nodes, edges)` → ImpactReport
- `findDirectDependents(nodeId, edges)` → string[]
- `findIndirectDependents(nodeId, edges, nodes)` → string[]
- `findAffectedByType(nodeId, edges, nodes, type)` → string[]
- `formatImpactReport(report)` → string

**Использование:**
```typescript
const report = calculateImpact('sys-1', nodes, edges);
// Возвращает: {
//   nodeId, nodeName, directDependents, indirectDependents,
//   affectedProcesses, affectedProducts, affectedDepartments,
//   totalImpactCount, severity
// }
```

#### viewModeColors.ts
**Функции:**
- `getNodeColorByViewMode(node, viewMode)` → string
- `getRiskColor(riskLevel)` → string
- `getRevenueColor(revenue)` → string
- `getResponsibilityColor(workload, owner)` → string
- `getNodeStyleByViewMode(node, viewMode)` → CSSProperties

**Использование:**
```typescript
const color = getNodeColorByViewMode(node, 'risk');
// Возвращает цвет на основе riskLevel
```

#### healthAnalysis.ts (TODO)
**Функции:**
- `findSystemsWithoutOwner(nodes)` → string[]
- `findOverloadedPeople(nodes)` → string[]
- `findSinglePointsOfFailure(nodes, edges)` → string[]
- `findDeprecatedSystems(nodes)` → string[]
- `generateHealthInsights(nodes, edges)` → Insight[]

---

### Semantic Layer

#### types/canvas.ts
**Экспорты:**
- `EdgeType` enum (12 типов)
- `EDGE_TYPE_LABELS` (русские названия)
- `EDGE_TYPE_COLORS` (цветовые схемы)
- `CanvasNode` interface (расширенные поля)
- `CanvasEdge` interface (с типом связи)

**Структура EdgeType:**
```typescript
enum EdgeType {
  DEPENDS_ON = 'depends_on',
  OWNED_BY = 'owned_by',
  USES = 'uses',
  INTEGRATES_WITH = 'integrates_with',
  BLOCKS = 'blocks',
  GENERATES_REVENUE_FOR = 'generates_revenue_for',
  RISK_FOR = 'risk_for',
  MONITORED_BY = 'monitored_by',
  REPORTS_TO = 'reports_to',
  MEMBER_OF = 'member_of',
  DOCUMENTS = 'documents',
  ESCALATED_TO = 'escalated_to',
}
```

---

### Storage Layer

#### canvasStore.ts
**State:**
- `nodes: Node[]` — узлы графа
- `edges: Edge[]` — связи графа

**Actions:**
- `setNodes(nodes)` — установить узлы
- `setEdges(edges)` — установить связи
- `addNode(node)` — добавить узел
- `updateNode(id, data)` — обновить узел
- `deleteNode(id)` — удалить узел
- `clearCanvas()` — очистить канвас

#### viewModeStore.ts
**State:**
- `currentMode: ViewMode` — текущий режим просмотра

**Actions:**
- `setViewMode(mode)` — установить режим

**ViewMode:**
```typescript
type ViewMode = 
  | 'architecture' 
  | 'risk' 
  | 'revenue' 
  | 'dependency' 
  | 'responsibility';
```

---

## 🔄 Потоки данных

### Создание связи с типом

```
User создаёт связь
    ↓
CanvasEditor создаёт Edge
    ↓
User кликает на связь → EdgeEditor открывается
    ↓
User выбирает EdgeType
    ↓
EdgeEditor обновляет edge.data.edgeType
    ↓
CustomEdge отображает label с типом связи
    ↓
Edge сохраняется в canvasStore
```

### Анализ влияния

```
User пытается удалить узел
    ↓
CanvasContextMenu вызывает calculateImpact()
    ↓
impactAnalysis анализирует граф
    ↓
Возвращается ImpactReport
    ↓
Показывается диалог подтверждения
    ↓
User подтверждает или отменяет
    ↓
Узел удаляется или остаётся
```

### Переключение режима просмотра

```
User кликает на ViewModeSelector
    ↓
setViewMode() обновляет viewModeStore
    ↓
EquipmentNode.tsx переподписывается на изменение
    ↓
getNodeColorByViewMode() пересчитывает цвета
    ↓
Узлы перерисовываются с новыми цветами
```

---

## 🎯 Типы узлов и их поля

### System Node
```typescript
{
  nodeType: 'system',
  owner?: string,           // Person ID
  criticality?: 'critical' | 'high' | 'medium' | 'low',
  environment?: 'prod' | 'uat' | 'test' | 'dev',
  techStack?: string[],
  status?: 'active' | 'deprecated' | 'maintenance',
  riskLevel?: 'critical' | 'high' | 'medium' | 'low',
  sla?: string,
  dependencies?: string[],  // System IDs
}
```

### Persona Node
```typescript
{
  nodeType: 'person',
  role?: string,
  department?: string,
  accessLevel?: 'admin' | 'power-user' | 'user' | 'viewer',
  workload?: number,        // 0-100
  reportsTo?: string,       // Person ID
  systemsUsed?: string[],   // System IDs
  riskProfile?: string,
}
```

### Product Node
```typescript
{
  nodeType: 'product',
  sku?: string,
  revenue?: number,
  dependencySystems?: string[],  // System IDs
  sla?: string,
  riskLevel?: 'critical' | 'high' | 'medium' | 'low',
  margin?: number,          // %
}
```

---

## 🔐 Валидация

### Валидация типов связей

Не все типы узлов могут быть связаны всеми типами связей:

| EdgeType | Допустимые источники | Допустимые цели |
|----------|----------------------|-----------------|
| depends_on | System, Process | System, Service |
| owned_by | System, Process, Department | Person |
| uses | Person, Process, Department | System, Service |
| integrates_with | System, Service | System, Service |
| blocks | Risk, Issue | System, Process |
| generates_revenue_for | System, Service | Product, Department |
| risk_for | Risk, Vulnerability | System, Process |
| monitored_by | System, Service | Person, Team |
| reports_to | Person, Team | Person, Department |
| member_of | System, Person, Service | Group, Department |
| documents | Document, Wiki | System, Process, API |
| escalated_to | Issue, Alert | Person, Team |

---

## 📈 Масштабируемость

### Оптимизация для больших графов

1. **Виртуализация узлов** — отображать только видимые узлы
2. **Кэширование анализа** — кэшировать результаты calculateImpact()
3. **Ленивая загрузка** — загружать данные по мере необходимости
4. **Индексирование** — быстрый поиск узлов по ID

### Производительность

- Impact Engine: O(V + E) для анализа графа
- View Overlays: O(V) для пересчёта цветов
- Health Insights: O(V + E) для анализа проблем

---

## 🔮 Будущие расширения

### Фаза 3: Новые типы узлов
- Risk Node
- External Service Node
- Department Node
- Flow Node
- Document Node

### Фаза 4: Память и история
- Organization Memory (история изменений)
- Versioned Graph (снапшоты)
- Audit Log (кто что изменил)

### Фаза 5: AI и автоматизация
- AI Insights (автоматические рекомендации)
- Anomaly Detection (обнаружение аномалий)
- Predictive Analysis (прогнозирование проблем)
