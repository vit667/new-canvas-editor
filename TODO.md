# TODO: Graph OS для организации

## 🎯 Видение
Digital Twin Organization Map — интерактивная карта компании, где всё связано:
люди → системы → процессы → документы → риски → деньги.

Это не Miro, не Obsidian, не BPM. Это граф-ОС для компании.

---

## 📋 Фаза 1: Фундамент (Неделя 1-2)

### 1.1 Типы связей (Edges) с семантикой
**Приоритет: КРИТИЧНЫЙ** — без этого граф не работает

- [x] Создать enum EdgeType в types/canvas.ts
- [x] Реализовать типы связей:
  - `depends_on` — зависит от (System → System)
  - `owned_by` — владелец (System → Person)
  - `uses` — использует (Person → System, Flow → System)
  - `integrates_with` — интегрируется с (System → System)
  - `blocks` — блокирует (System → System, Risk → System)
  - `generates_revenue_for` — приносит доход (System → Product)
  - `risk_for` — риск для (Risk → System)
  - `monitored_by` — мониторится (System → Person)
  - `reports_to` — подчиняется (Person → Person)
  - `member_of` — член группы (Person → Group, System → Group)
  - `documents` — документирует (Doc → System)
  - `escalated_to` — эскалировано к (Person → Person)

- [x] Обновить EdgeEditor.tsx:
  - Dropdown для выбора типа связи
  - Валидация: какие типы нод могут связываться
  - Визуальное отличие связей (цвет, стиль линии)

- [x] Обновить CustomEdge.tsx:
  - Отображение типа связи на линии (label)
  - Разные цвета для разных типов
  - Иконка типа связи

### 1.2 Расширить System Node
**Приоритет: ВЫСОКИЙ** — это основной узел

Добавить поля:
- `owner` (Person ID) — владелец системы
- `criticality` (critical/high/medium/low) — критичность
- `environment` (prod/uat/test/dev) — окружение
- `techStack` (string[]) — технологический стек
- `status` (active/deprecated/maintenance) — статус
- `riskLevel` (critical/high/medium/low) — уровень риска
- `sla` (string) — SLA (e.g., "99.9%")
- `dependencies` (System ID[]) — зависимости (для быстрого доступа)

- [x] Обновить EquipmentSpecsEditor.tsx для System nodes
- [ ] Добавить цветовую индикацию по criticality/riskLevel

### 1.3 Расширить Persona Node
**Приоритет: ВЫСОКИЙ**

Добавить поля:
- `role` (string) — должность
- `department` (string) — отдел
- `accessLevel` (admin/power-user/user/viewer) — уровень доступа
- `workload` (number 0-100) — загруженность
- `reportsTo` (Person ID) — подчиняется
- `systemsUsed` (System ID[]) — используемые системы
- `riskProfile` (string) — профиль риска

- [ ] Обновить NodeEditor.tsx для Persona nodes

### 1.4 Расширить Product Node
**Приоритет: СРЕДНИЙ**

Добавить поля:
- `sku` (string) — артикул
- `revenue` (number) — доход
- `dependencySystems` (System ID[]) — зависимые системы
- `sla` (string) — SLA
- `riskLevel` (critical/high/medium/low) — уровень риска
- `margin` (number %) — маржа

---

## 📊 Фаза 2: Аналитика (Неделя 3-4)

### 2.1 Impact Engine
**Приоритет: КРИТИЧНЫЙ** — это killer feature

Функция: при удалении/отключении ноды показать:
- Сколько других нод зависит (по связям depends_on, uses, member_of)
- Какие процессы затронуты
- Какие продукты станут недоступны
- Какие люди потеряют доступ

Реализация:
- [x] Создать lib/impactAnalysis.ts
- [x] Функция `calculateImpact(nodeId, graph)` → ImpactReport
- [ ] Интеграция в CanvasContextMenu (при удалении показать диалог)
- [ ] UI для отображения impact report

### 2.2 View Overlays (Режимы просмотра)
**Приоритет: ВЫСОКИЙ** — быстрый win

Переключатель поверх канваса — ноды меняют цвет:

- [x] **Architecture View** — стандартный вид (текущий)
- [x] **Risk View** — подсветка по riskLevel (red/orange/yellow/green)
- [x] **Revenue View** — подсветка систем/продуктов по доходу (gradient)
- [x] **Dependency View** — подсветка цепочек зависимостей (highlight connected)
- [x] **Responsibility Heatmap** — кто перегружен (workload), где нет владельца

Реализация:
- [x] Создать store/viewModeStore.ts
- [x] Компонент ViewModeSelector.tsx
- [x] Функции расчёта цвета для каждого режима (lib/viewModeColors.ts)
- [ ] Обновить EquipmentNode.tsx для применения цветов

### 2.3 Health Insights
**Приоритет: СРЕДНИЙ**

Автоматические insights:
- [ ] "N систем без ответственного"
- [ ] "Документация не обновлялась N месяцев"
- [ ] "Этот человек участвует в N процессах"
- [ ] Single point of failure детектор
- [ ] "N систем в статусе deprecated"

Реализация:
- [ ] Создать lib/healthAnalysis.ts
- [ ] Компонент HealthInsights.tsx
- [ ] Интеграция в CanvasActionsMenu

---

## 📋 Фаза 1.5: Интеграция в UI (Текущая)

### 1.5.1 Обновить EquipmentNode.tsx
- [ ] Применить цвета из View Overlays
- [ ] Отображать поля System/Persona/Product
- [ ] Показывать иконки для criticality/riskLevel

### 1.5.2 Обновить NodeEditor.tsx
- [ ] Добавить поля для System узлов (owner, criticality, environment, etc.)
- [ ] Добавить поля для Persona узлов (role, department, accessLevel, etc.)
- [ ] Добавить поля для Product узлов (sku, revenue, margin, etc.)

### 1.5.3 Обновить CanvasContextMenu.tsx
- [ ] Показать Impact Report перед удалением узла
- [ ] Диалог подтверждения с информацией об влиянии
- [ ] Кнопка "Удалить несмотря на риск"

### 1.5.4 Обновить CanvasEditor.tsx
- [ ] Добавить ViewModeSelector в верхнюю часть
- [ ] Переключение режимов в реальном времени
- [ ] Сохранение выбранного режима в localStorage

### 1.5.5 Обновить CanvasActionsMenu.tsx
- [ ] Добавить кнопку для Health Insights
- [ ] Показывать список проблем в боковой панели

---

## 🔮 Фаза 3: Расширенные типы нод (Неделя 5-6)

### 3.1 Risk Node
- `probability` (1-5) — вероятность
- `impact` (1-5) — влияние
- `mitigation` (string) — план смягчения
- `linkedSystems` (System ID[]) — связанные системы
- `owner` (Person ID) — владелец риска

### 3.2 External Service Node
- `vendor` (string) — поставщик
- `sla` (string) — SLA
- `apiHealth` (up/degraded/down) — статус API
- `contractExpiry` (date) — дата истечения контракта
- `criticality` (critical/high/medium/low) — критичность

### 3.3 Department Node
- `head` (Person ID) — руководитель
- `budget` (number) — бюджет
- `kpi` (string[]) — KPI
- `systemsUsed` (System ID[]) — используемые системы

### 3.4 Flow Node
- `steps` (string[]) — шаги процесса
- `trigger` (string) — триггер
- `sla` (string) — SLA
- `owner` (Person ID) — владелец
- `affectedSystems` (System ID[]) — затронутые системы

---

## 💾 Фаза 4: Память и история (Неделя 7-8)

### 4.1 Organization Memory
- [ ] Добавить `createdAt`, `updatedAt`, `createdBy` к каждой ноде
- [ ] История изменений графа (когда появилась система, кто был владельцем)
- [ ] Компонент NodeHistory.tsx

### 4.2 Versioned Graph
- [ ] Снапшоты состояния графа (по времени)
- [ ] Возможность вернуться к предыдущему состоянию
- [ ] Сравнение двух версий графа

---

## 🏗️ Архитектурные изменения

### Универсальная схема ноды
```typescript
interface BaseNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  tags?: string[];
  position: { x: number; y: number };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  owner?: string;
  
  // Properties (зависит от типа)
  properties: Record<string, any>;
  
  // View
  viewMode?: 'default' | 'compact' | 'detailed';
  color?: string;
}
```

### Слои системы
1. **Semantic layer** — что это (тип ноды, поля)
2. **Behavior layer** — что она может (editable, executable, collapsible, live-data)
3. **View layer** — как отображается (org view, system view, risk view, etc.)
4. **Analytics layer** — как анализируется (impact, health, dependencies)

### Типы связей (Edge Types)
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

## 📈 Метрики успеха

- [ ] Граф может представить полную архитектуру компании
- [ ] Impact Engine показывает реальные зависимости
- [ ] View Overlays помогают найти узкие места
- [ ] Health Insights выявляют проблемы автоматически
- [ ] Система может экспортировать отчёты (HTML, JSON)

---

## 🎯 Позиционирование

Это инструмент для:
- **CTO/CIO** — архитектурная карта организации
- **Risk Manager** — карта рисков и зависимостей
- **Product Manager** — связь бизнеса и ИТ
- **DevOps/SRE** — dependency mapping и impact analysis
- **Enterprise Architect** — governance и compliance

Уникальность: **Один граф, много перспектив**
