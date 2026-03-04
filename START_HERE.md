# 🚀 Начните отсюда

Добро пожаловать в Graph OS — интерактивную карту организации!

## ⚡ За 2 минуты

Фаза 1 завершена. Вот что работает:

### 1. Типы связей (12 типов)
Каждая связь имеет тип, цвет и значение:
- `depends_on` 🔴 — зависит от
- `owned_by` 🔵 — владелец
- `uses` 🟣 — использует
- И ещё 9 типов...

### 2. Impact Engine
Анализирует влияние удаления узла:
```typescript
const report = calculateImpact(nodeId, nodes, edges);
// Показывает: прямые/косвенные зависимости, severity
```

### 3. View Overlays (5 режимов)
Один граф, много перспектив:
- 🏗️ Architecture — стандартный вид
- 🔴 Risk — подсветка по риску
- 💰 Revenue — подсветка по доходу
- 🔗 Dependency — подсветка зависимостей
- 👤 Responsibility — подсветка загруженности

---

## 📚 Документация

### Для быстрого старта (5-10 мин)
1. **README_PHASE1.md** — краткое резюме
2. **GETTING_STARTED.md** — как использовать

### Для разработчиков (30 мин)
1. **docs/ARCHITECTURE.md** — архитектура системы
2. **docs/PHASE1_IMPLEMENTATION.md** — технические детали
3. **docs/NEXT_STEPS.md** — что делать дальше

### Для проверки (10 мин)
1. **VERIFICATION.md** — как проверить реализацию
2. **PHASE1_CHECKLIST.md** — чек-лист

---

## 🔧 Файлы

### Исходный код
```
src/
├── lib/
│   ├── impactAnalysis.ts      ← Impact Engine
│   └── viewModeColors.ts      ← View Overlays
├── store/
│   └── viewModeStore.ts       ← View Mode state
├── components/
│   └── ViewModeSelector.tsx   ← UI selector
└── types/
    └── canvas.ts              ← EdgeType enum
```

### Документация
```
docs/
├── EDGE_TYPES.md              ← Описание типов
├── ARCHITECTURE.md            ← Архитектура
├── PHASE1_IMPLEMENTATION.md   ← Технические детали
└── NEXT_STEPS.md              ← Следующие шаги
```

---

## 💡 Примеры

### Использовать Impact Engine
```typescript
import { calculateImpact, formatImpactReport } from './src/lib/impactAnalysis';

const report = calculateImpact(nodeId, nodes, edges);
console.log(formatImpactReport(report));
// 📊 Анализ влияния: Payment System
// Уровень серьёзности: 🔴 КРИТИЧНОЕ
// 🔴 Прямые зависимости: 2
// 📈 Всего затронуто: 6 элементов
```

### Использовать View Overlays
```typescript
import { useViewModeStore } from './src/store/viewModeStore';
import { getNodeColorByViewMode } from './src/lib/viewModeColors';

const { currentMode } = useViewModeStore();
const color = getNodeColorByViewMode(node, currentMode);
```

### Использовать ViewModeSelector
```typescript
import ViewModeSelector from './src/components/ViewModeSelector';

<ViewModeSelector />
```

---

## 🎯 Следующие шаги

### Фаза 1.5: Интеграция в UI
- [ ] Обновить EquipmentNode.tsx — применить цвета
- [ ] Обновить CanvasContextMenu.tsx — показать Impact Report
- [ ] Добавить ViewModeSelector в CanvasEditor.tsx
- [ ] Обновить NodeEditor.tsx — добавить новые поля

Смотрите `docs/NEXT_STEPS.md` для подробных инструкций.

---

## ✅ Проверка

Всё работает? Проверьте:

```bash
# Проверить типы
grep "enum EdgeType" src/types/canvas.ts

# Проверить Impact Engine
ls -la src/lib/impactAnalysis.ts

# Проверить View Overlays
ls -la src/lib/viewModeColors.ts
```

Смотрите `VERIFICATION.md` для полной проверки.

---

## 📊 Статистика

- ✅ 12 типов связей
- ✅ 5 режимов просмотра
- ✅ Impact Engine работает
- ✅ 0 ошибок TypeScript
- ✅ Полная документация

---

## 🎓 Архитектура

```
Presentation (UI Components)
    ↓
Analytics (Business Logic)
    ↓
Semantic (Types & Schemas)
    ↓
Storage (State Management)
    ↓
Data (ReactFlow + WebSocket)
```

---

## 📞 Помощь

- **Быстрый старт:** `README_PHASE1.md`
- **Архитектура:** `docs/ARCHITECTURE.md`
- **Типы связей:** `docs/EDGE_TYPES.md`
- **Проверка:** `VERIFICATION.md`
- **Индекс файлов:** `PHASE1_FILES_INDEX.md`

---

**Готовы? Начните с `README_PHASE1.md`! 🚀**
