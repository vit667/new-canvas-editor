import type { Node, Edge } from 'reactflow';
import { EdgeType } from '../types/canvas';

export interface ImpactReport {
  nodeId: string;
  nodeName: string;
  directDependents: string[]; // Узлы, которые зависят от этого
  indirectDependents: string[]; // Транзитивные зависимости
  affectedProcesses: string[]; // Процессы, которые будут затронуты
  affectedProducts: string[]; // Продукты, которые станут недоступны
  affectedDepartments: string[]; // Отделы, которые потеряют доступ
  totalImpactCount: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Анализирует влияние удаления узла на остальную систему
 */
export function calculateImpact(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): ImpactReport {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    return {
      nodeId,
      nodeName: 'Unknown',
      directDependents: [],
      indirectDependents: [],
      affectedProcesses: [],
      affectedProducts: [],
      affectedDepartments: [],
      totalImpactCount: 0,
      severity: 'low',
    };
  }

  const directDependents = findDirectDependents(nodeId, edges);
  const indirectDependents = findIndirectDependents(nodeId, edges, nodes);
  const affectedProcesses = findAffectedByType(nodeId, edges, nodes, 'flow');
  const affectedProducts = findAffectedByType(nodeId, edges, nodes, 'product');
  const affectedDepartments = findAffectedByType(nodeId, edges, nodes, 'department');

  const totalImpactCount = 
    directDependents.length + 
    indirectDependents.length + 
    affectedProcesses.length + 
    affectedProducts.length + 
    affectedDepartments.length;

  let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (totalImpactCount > 10) severity = 'critical';
  else if (totalImpactCount > 5) severity = 'high';
  else if (totalImpactCount > 2) severity = 'medium';

  // Проверяем критичность самого узла
  const nodeCriticality = (node.data as any)?.criticality;
  if (nodeCriticality === 'critical') severity = 'critical';
  else if (nodeCriticality === 'high' && severity === 'low') severity = 'medium';

  return {
    nodeId,
    nodeName: node.data?.label || node.id,
    directDependents,
    indirectDependents,
    affectedProcesses,
    affectedProducts,
    affectedDepartments,
    totalImpactCount,
    severity,
  };
}

/**
 * Находит узлы, которые напрямую зависят от данного узла
 */
function findDirectDependents(nodeId: string, edges: Edge[]): string[] {
  return edges
    .filter(edge => {
      const edgeType = (edge.data as any)?.edgeType;
      return edge.source === nodeId && 
             (edgeType === EdgeType.DEPENDS_ON || 
              edgeType === EdgeType.USES || 
              edgeType === EdgeType.MEMBER_OF);
    })
    .map(edge => edge.target);
}

/**
 * Находит транзитивные зависимости (узлы, которые зависят от зависимых)
 */
function findIndirectDependents(
  nodeId: string,
  edges: Edge[],
  nodes: Node[],
  visited = new Set<string>()
): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const directDependents = findDirectDependents(nodeId, edges);
  const indirectDependents: string[] = [];

  for (const dependent of directDependents) {
    const transitive = findIndirectDependents(dependent, edges, nodes, visited);
    indirectDependents.push(...transitive);
  }

  return [...new Set(indirectDependents)];
}

/**
 * Находит узлы определённого типа, которые зависят от данного узла
 */
function findAffectedByType(
  nodeId: string,
  edges: Edge[],
  nodes: Node[],
  nodeType: string
): string[] {
  const allDependents = new Set<string>();
  
  // Находим все узлы, которые зависят от nodeId (прямо или косвенно)
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const dependents = findDirectDependents(current, edges);
    for (const dependent of dependents) {
      const dependentNode = nodes.find(n => n.id === dependent);
      if (dependentNode?.data?.nodeType === nodeType) {
        allDependents.add(dependent);
      }
      queue.push(dependent);
    }
  }

  return Array.from(allDependents);
}

/**
 * Форматирует отчёт об влиянии для отображения
 */
export function formatImpactReport(report: ImpactReport): string {
  const lines: string[] = [];
  
  lines.push(`📊 Анализ влияния: ${report.nodeName}`);
  lines.push(`Уровень серьёзности: ${getSeverityLabel(report.severity)}`);
  lines.push('');

  if (report.directDependents.length > 0) {
    lines.push(`🔴 Прямые зависимости: ${report.directDependents.length}`);
  }

  if (report.indirectDependents.length > 0) {
    lines.push(`🟠 Косвенные зависимости: ${report.indirectDependents.length}`);
  }

  if (report.affectedProcesses.length > 0) {
    lines.push(`⚙️ Затронутые процессы: ${report.affectedProcesses.length}`);
  }

  if (report.affectedProducts.length > 0) {
    lines.push(`🛍️ Недоступные продукты: ${report.affectedProducts.length}`);
  }

  if (report.affectedDepartments.length > 0) {
    lines.push(`🏢 Затронутые отделы: ${report.affectedDepartments.length}`);
  }

  lines.push('');
  lines.push(`📈 Всего затронуто: ${report.totalImpactCount} элементов`);

  return lines.join('\n');
}

function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    critical: '🔴 КРИТИЧНОЕ',
    high: '🟠 ВЫСОКОЕ',
    medium: '🟡 СРЕДНЕЕ',
    low: '🟢 НИЗКОЕ',
  };
  return labels[severity] || severity;
}
