# ✅ Проверка реализации Фазы 1

## 🔍 Как проверить, что всё работает

### 1. Проверка типов связей

**Файл:** `canvas-editor/src/types/canvas.ts`

```bash
# Проверить, что EdgeType enum существует
grep -n "enum EdgeType" canvas-editor/src/types/canvas.ts

# Проверить, что все 12 типов определены
grep -c "= '" canvas-editor/src/types/canvas.ts | grep -E "1[2-9]|2[0-9]"

# Проверить, что EDGE_TYPE_LABELS определена
grep -n "EDGE_TYPE_LABELS" canvas-editor/src/types/canvas.ts

# Проверить, что EDGE_TYPE_COLORS определена
grep -n "EDGE_TYPE_COLORS" canvas-editor/src/types/canvas.ts
```

### 2. Проверка расширенных полей

**Файл:** `canvas-editor/src/types/canvas.ts`

```bash
# Проверить System Node поля
grep -E "owner\?|criticality\?|environment\?" canvas-editor/src/types/canvas.ts

# Проверить Persona Node поля
grep -E "role\?|department\?|accessLevel\?" canvas-editor/src/types/canvas.ts

# Проверить Product Node поля
grep -E "sku\?|revenue\?|margin\?" canvas-editor/src/types/canvas.ts
```

### 3. Проверка Impact Engine

**Файл:** `canvas-editor/src/lib/impactAnalysis.ts`

```bash
# Проверить, что файл существует
ls -la canvas-editor/src/lib/impactAnalysis.ts

# Проверить, что функции определены
grep -E "export function|export interface" canvas-editor/src/lib/impactAnalysis.ts

# Проверить ImpactReport interface
grep -A 10 "interface ImpactReport" canvas-editor/src/lib/impactAnalysis.ts
```

### 4. Проверка View Overlays

**Файлы:**
- `canvas-editor/src/store/viewModeStore.ts`
- `canvas-editor/src/components/ViewModeSelector.tsx`
- `canvas-editor/src/lib/viewModeColors.ts`

```bash
# Проверить viewModeStore
ls -la canvas-editor/src/store/viewModeStore.ts

# Проверить ViewModeSelector
ls -la canvas-editor/src/components/ViewModeSelector.tsx

# Проверить viewModeColors
ls -la canvas-editor/src/lib/viewModeColors.ts

# Проверить ViewMode type
grep "type ViewMode" canvas-editor/src/store/viewModeStore.ts
```

### 5. Проверка обновленных компонентов

**EdgeEditor.tsx:**
```bash
# Проверить импорт EdgeType
grep "import.*EdgeType" canvas-editor/src/components/EdgeEditor.tsx

# Проверить dropdown для типов связей
grep -A 5 "Тип связи" canvas-editor/src/components/EdgeEditor.tsx
```

**CustomEdge.tsx:**
```bash
# Проверить импорт EdgeLabelRenderer
grep "EdgeLabelRenderer" canvas-editor/src/components/edges/CustomEdge.tsx

# Проверить отображение label
grep -A 5 "label &&" canvas-editor/src/components/edges/CustomEdge.tsx
```

---

## 🧪 Функциональное тестирование

### Тест 1: Типы связей работают

```typescript
// В консоли браузера
import { EdgeType, EDGE_TYPE_LABELS, EDGE_TYPE_COLORS } from './src/types/canvas';

// Проверить enum
console.log(EdgeType.DEPENDS_ON); // 'depends_on'

// Проверить labels
console.log(EDGE_TYPE_LABELS[EdgeType.DEPENDS_ON]); // 'Зависит от'

// Проверить colors
console.log(EDGE_TYPE_COLORS[EdgeType.DEPENDS_ON]); // '#ef4444'
```

### Тест 2: Impact Engine работает

```typescript
// В консоли браузера
import { calculateImpact, formatImpactReport } from './src/lib/impactAnalysis';

// Получить узлы и связи из store
const { nodes, edges } = useCanvasStore.getState();

// Анализировать первый узел
const report = calculateImpact(nodes[0].id, nodes, edges);
console.log(report);

// Форматировать отчёт
console.log(formatImpactReport(report));
```

### Тест 3: View Overlays работают

```typescript
// В консоли браузера
import { useViewModeStore } from './src/store/viewModeStore';
import { getNodeColorByViewMode } from './src/lib/viewModeColors';

// Получить текущий режим
const { currentMode } = useViewModeStore.getState();
console.log(currentMode); // 'architecture'

// Переключить режим
useViewModeStore.setState({ currentMode: 'risk' });

// Получить цвет узла
const { nodes } = useCanvasStore.getState();
const color = getNodeColorByViewMode(nodes[0], 'risk');
console.log(color);
```

---

## 📊 Проверка диагностики

```bash
# Проверить, что нет ошибок TypeScript
cd canvas-editor
npm run type-check

# Или вручную проверить файлы
npx tsc --noEmit src/types/canvas.ts
npx tsc --noEmit src/lib/impactAnalysis.ts
npx tsc --noEmit src/store/viewModeStore.ts
npx tsc --noEmit src/components/ViewModeSelector.tsx
npx tsc --noEmit src/lib/viewModeColors.ts
```

---

## 📁 Проверка файлов

### Исходный код

```bash
# Проверить, что все файлы существуют
ls -la canvas-editor/src/types/canvas.ts
ls -la canvas-editor/src/components/EdgeEditor.tsx
ls -la canvas-editor/src/components/edges/CustomEdge.tsx
ls -la canvas-editor/src/lib/impactAnalysis.ts
ls -la canvas-editor/src/store/viewModeStore.ts
ls -la canvas-editor/src/components/ViewModeSelector.tsx
ls -la canvas-editor/src/lib/viewModeColors.ts

# Проверить размер файлов
wc -l canvas-editor/src/lib/impactAnalysis.ts
wc -l canvas-editor/src/lib/viewModeColors.ts
```

### Документация

```bash
# Проверить, что все документы существуют
ls -la canvas-editor/docs/EDGE_TYPES.md
ls -la canvas-editor/docs/PHASE1_IMPLEMENTATION.md
ls -la canvas-editor/docs/NEXT_STEPS.md
ls -la canvas-editor/docs/ARCHITECTURE.md
ls -la canvas-editor/PHASE1_SUMMARY.md
ls -la canvas-editor/GETTING_STARTED.md
ls -la canvas-editor/PHASE1_CHECKLIST.md
ls -la canvas-editor/README_PHASE1.md
```

---

## 🔄 Проверка интеграции

### EdgeEditor интегрирован

```bash
# Проверить, что EdgeEditor импортирует EdgeType
grep "import.*EdgeType" canvas-editor/src/components/EdgeEditor.tsx

# Проверить, что есть dropdown для типов
grep -A 10 "Тип связи" canvas-editor/src/components/EdgeEditor.tsx | head -15
```

### CustomEdge интегрирован

```bash
# Проверить, что CustomEdge отображает label
grep "EdgeLabelRenderer" canvas-editor/src/components/edges/CustomEdge.tsx

# Проверить, что используется EDGE_TYPE_LABELS
grep "EDGE_TYPE_LABELS" canvas-editor/src/components/edges/CustomEdge.tsx
```

---

## 📈 Проверка производительности

### Impact Engine

```typescript
// Тест производительности
import { calculateImpact } from './src/lib/impactAnalysis';

const { nodes, edges } = useCanvasStore.getState();

console.time('Impact Analysis');
const report = calculateImpact(nodes[0].id, nodes, edges);
console.timeEnd('Impact Analysis');

// Должно быть < 100ms для графа с 1000 узлов
```

### View Overlays

```typescript
// Тест производительности
import { getNodeColorByViewMode } from './src/lib/viewModeColors';

const { nodes } = useCanvasStore.getState();

console.time('Color Calculation');
nodes.forEach(node => {
  getNodeColorByViewMode(node, 'risk');
});
console.timeEnd('Color Calculation');

// Должно быть < 50ms для 1000 узлов
```

---

## ✅ Чек-лист проверки

- [ ] Все файлы существуют
- [ ] Нет ошибок TypeScript
- [ ] EdgeType enum определен с 12 типами
- [ ] EDGE_TYPE_LABELS определена
- [ ] EDGE_TYPE_COLORS определена
- [ ] Расширенные поля добавлены в CanvasNode
- [ ] Impact Engine функции работают
- [ ] View Overlays функции работают
- [ ] EdgeEditor обновлен
- [ ] CustomEdge обновлен
- [ ] Документация полная
- [ ] Примеры кода работают
- [ ] Производительность приемлема

---

## 🐛 Если что-то не работает

### Ошибка: "Cannot find module"

```bash
# Проверить, что файл существует
ls -la canvas-editor/src/lib/impactAnalysis.ts

# Проверить импорт
grep "import.*impactAnalysis" canvas-editor/src/components/*.tsx
```

### Ошибка: "Type not found"

```bash
# Проверить, что EdgeType экспортируется
grep "export.*EdgeType" canvas-editor/src/types/canvas.ts

# Проверить импорт в компоненте
grep "import.*EdgeType" canvas-editor/src/components/EdgeEditor.tsx
```

### Ошибка: "Function not found"

```bash
# Проверить, что функция экспортируется
grep "export function" canvas-editor/src/lib/impactAnalysis.ts

# Проверить импорт в компоненте
grep "import.*calculateImpact" canvas-editor/src/components/*.tsx
```

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте файлы существуют
2. Проверьте импорты правильные
3. Проверьте диагностику TypeScript
4. Смотрите документацию в `docs/`
5. Смотрите примеры в `NEXT_STEPS.md`

---

**Все проверки пройдены? Отлично! Переходим к Фазе 1.5! 🚀**
