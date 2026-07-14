import { useViewModeStore, type ViewMode } from '../store/viewModeStore';

const VIEW_MODES: { value: ViewMode; label: string; icon: string; description: string }[] = [
  {
    value: 'architecture',
    label: 'Архитектура',
    icon: '🏗️',
    description: 'Стандартный вид системы',
  },
  {
    value: 'risk',
    label: 'Риски',
    icon: '🔴',
    description: 'Подсветка по уровню риска',
  },
  {
    value: 'revenue',
    label: 'Доход',
    icon: '💰',
    description: 'Подсветка по доходу',
  },
  {
    value: 'dependency',
    label: 'Зависимости',
    icon: '🔗',
    description: 'Цепочки зависимостей',
  },
  {
    value: 'responsibility',
    label: 'Ответственность',
    icon: '👤',
    description: 'Загруженность и владельцы',
  },
];

export default function ViewModeSelector() {
  const { currentMode, setViewMode } = useViewModeStore();

  return (
    <div className="flex gap-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setViewMode(mode.value)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
            currentMode === mode.value
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={mode.description}
        >
          <span className="mr-1">{mode.icon}</span>
          {mode.label}
        </button>
      ))}
    </div>
  );
}
