# ⚡ Быстрая справка

## 🎯 За 30 секунд

**Фаза 1 завершена.** Система готова к использованию.

### Что работает
- ✅ 12 типов связей с цветами
- ✅ Impact Engine (анализ влияния)
- ✅ 5 режимов просмотра
- ✅ Расширенные поля узлов

### Где начать
1. **START_HERE.md** — 2 минуты
2. **README_PHASE1.md** — 5 минут
3. **GETTING_STARTED.md** — 10 минут

---

## 📚 Документация

| Файл | Время | Для кого |
|------|-------|----------|
| START_HERE.md | 2 мин | Все |
| README_PHASE1.md | 5 мин | Все |
| GETTING_STARTED.md | 10 мин | Разработчики |
| docs/ARCHITECTURE.md | 30 мин | Архитекторы |
| docs/NEXT_STEPS.md | 30 мин | Разработчики |
| SAMPLES_FOR_PHASE1_5.md | 20 мин | Разработчики |

---

## 🔧 Исходный код

```
src/lib/impactAnalysis.ts       ← Impact Engine
src/lib/viewModeColors.ts       ← View Overlays
src/store/viewModeStore.ts      ← View Mode state
src/components/ViewModeSelector.tsx ← UI selector
src/types/canvas.ts             ← EdgeType enum
```

---

## 🎨 Samples компоненты

```
samples/components/erp/
├── notification-center.tsx      ← Для Impact Reports
├── filter-bar.tsx               ← Для фильтрации
└── modal-form.tsx               ← Для редактирования

samples/components/ui/
├── badge.tsx                    ← Для статуса
├── card.tsx                     ← Для информации
├── table.tsx                    ← Для списков
└── alert.tsx                    ← Для предупреждений
```

---

## 💡 Примеры

### Использовать Impact Engine
```typescript
import { calculateImpact } from './src/lib/impactAnalysis';

const report = calculateImpact(nodeId, nodes, edges);
console.log(report.severity); // 'critical' | 'high' | 'medium' | 'low'
```

### Использовать View Overlays
```typescript
import { useViewModeStore } from './src/store/viewModeStore';
import { getNodeColorByViewMode } from './src/lib/viewModeColors';

const { currentMode } = useViewModeStore();
const color = getNodeColorByViewMode(node, currentMode);
```

### Использовать NotificationCenter
```typescript
import { NotificationCenter } from '@/samples/components/erp/notification-center';

<NotificationCenter />
```

---

## 🚀 Фаза 1.5

### Что нужно сделать
1. Создать HealthInsights.tsx
2. Создать NodeFilter.tsx
3. Обновить NodeEditor.tsx
4. Обновить EquipmentNode.tsx
5. Обновить CanvasEditor.tsx

### Как начать
Смотрите **docs/NEXT_STEPS.md** и **SAMPLES_FOR_PHASE1_5.md**

---

## 📊 Статистика

- 12 типов связей
- 5 режимов просмотра
- 7 файлов исходного кода
- 12 файлов документации
- 50+ samples компонентов
- 0 ошибок TypeScript

---

## 📞 Помощь

- **Начало:** START_HERE.md
- **Обзор:** README_PHASE1.md
- **Примеры:** GETTING_STARTED.md
- **Архитектура:** docs/ARCHITECTURE.md
- **Следующие шаги:** docs/NEXT_STEPS.md
- **Samples:** SAMPLES_FOR_PHASE1_5.md
- **Все ресурсы:** RESOURCES.md

---

**Готовы? Откройте START_HERE.md! 🚀**
