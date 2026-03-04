import type { ViewMode } from '../store/viewModeStore';
import type { Node } from 'reactflow';

/**
 * Возвращает цвет узла в зависимости от режима просмотра
 */
export function getNodeColorByViewMode(node: Node, viewMode: ViewMode): string {
  const nodeData = node.data as any;

  switch (viewMode) {
    case 'architecture':
      return nodeData?.color || '#ffffff';

    case 'risk':
      return getRiskColor(nodeData?.riskLevel);

    case 'revenue':
      return getRevenueColor(nodeData?.revenue);

    case 'dependency':
      return '#ffffff'; // Зависимости подсвечиваются через edges

    case 'responsibility':
      return getResponsibilityColor(nodeData?.workload, nodeData?.owner);

    default:
      return '#ffffff';
  }
}

/**
 * Возвращает цвет на основе уровня риска
 */
function getRiskColor(riskLevel?: string): string {
  const colors: Record<string, string> = {
    critical: '#dc2626', // Красный
    high: '#f97316', // Оранжевый
    medium: '#eab308', // Жёлтый
    low: '#22c55e', // Зелёный
  };
  return colors[riskLevel || 'low'] || '#e5e7eb';
}

/**
 * Возвращает цвет на основе дохода (gradient)
 */
function getRevenueColor(revenue?: number): string {
  if (!revenue) return '#e5e7eb'; // Серый для нулевого дохода

  // Нормализуем доход (предполагаем максимум 1 млн)
  const normalized = Math.min(revenue / 1000000, 1);

  // Gradient от красного (низкий доход) к зелёному (высокий доход)
  if (normalized < 0.25) return '#fecaca'; // Светло-красный
  if (normalized < 0.5) return '#fbbf24'; // Жёлтый
  if (normalized < 0.75) return '#86efac'; // Светло-зелёный
  return '#22c55e'; // Зелёный
}

/**
 * Возвращает цвет на основе загруженности и владельца
 */
function getResponsibilityColor(workload?: number, owner?: string): string {
  // Если нет владельца - красный
  if (!owner) return '#fca5a5'; // Светло-красный

  // Если есть владелец, смотрим на загруженность
  if (!workload) return '#d1fae5'; // Светло-зелёный

  if (workload > 80) return '#dc2626'; // Красный - перегружен
  if (workload > 60) return '#f97316'; // Оранжевый - высокая загруженность
  if (workload > 40) return '#eab308'; // Жёлтый - средняя загруженность
  return '#22c55e'; // Зелёный - нормальная загруженность
}

/**
 * Возвращает стиль узла для режима просмотра
 */
export function getNodeStyleByViewMode(node: Node, viewMode: ViewMode): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    backgroundColor: getNodeColorByViewMode(node, viewMode),
    transition: 'background-color 0.3s ease',
  };

  // Добавляем специальные стили для некоторых режимов
  if (viewMode === 'risk') {
    const riskLevel = (node.data as any)?.riskLevel;
    if (riskLevel === 'critical') {
      baseStyle.boxShadow = '0 0 10px rgba(220, 38, 38, 0.5)';
    }
  }

  if (viewMode === 'responsibility') {
    const owner = (node.data as any)?.owner;
    if (!owner) {
      baseStyle.boxShadow = '0 0 10px rgba(220, 38, 38, 0.5)';
      baseStyle.border = '2px dashed #dc2626';
    }
  }

  return baseStyle;
}
