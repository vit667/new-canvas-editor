import React, { useCallback, useState, useEffect, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  getNodesBounds,
} from 'reactflow';
import { CanvasContextMenu } from './CanvasContextMenu';
import { NodeContextMenu } from './NodeContextMenu';
import { EdgeContextMenu } from './EdgeContextMenu';
import { toCanvas } from 'html-to-image';
import 'reactflow/dist/style.css';
import NodeEditor from './NodeEditor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import TextNode from './nodes/TextNode';
import GroupNode from './nodes/GroupNode';
import TrackedNode from './nodes/TrackedNode';
import TrackedGroupNode from './nodes/TrackedGroupNode';
import EquipmentNode from './nodes/EquipmentNode';
import PersonNode from './nodes/PersonNode';
import ProductCardNode from './nodes/ProductCardNode';
import StatCardNode from './nodes/StatCardNode';
import RoutingRuleNode from './nodes/RoutingRuleNode';
import NoteNode from './nodes/NoteNode';
import CustomEdge from './edges/CustomEdge';
import { NodeTypePicker, type PickableNodeType } from './NodeTypePicker';
import EdgeEditor from './EdgeEditor';
import { useCanvasStore } from '@/store/canvasStore';

const nodeTypes = {
  text: TextNode,
  group: GroupNode,
  tracked: TrackedNode,
  'tracked-group': TrackedGroupNode,
  equipment: EquipmentNode,
  person: PersonNode,
  'product-card': ProductCardNode,
  'stat-card': StatCardNode,
  'routing-rule': RoutingRuleNode,
  note: NoteNode,
};

const edgeTypes = {
  default: CustomEdge,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'text',
    position: { x: 250, y: 100 },
    data: { label: 'Веб-сервер', color: 'default', icon: 'server', content: 'nginx' },
    zIndex: 10,
  },
  {
    id: '2',
    type: 'text',
    position: { x: 100, y: 200 },
    data: { label: 'База данных', color: 'cyan', icon: 'database', content: 'PostgreSQL' },
    zIndex: 10,
  },
  {
    id: '3',
    type: 'group',
    position: { x: 400, y: 150 },
    data: { label: 'DMZ зона', color: 'red', icon: 'shield', content: 'Защищенная сеть' },
    style: { width: 300, height: 200 },
    zIndex: 1,
  },
];

const initialEdges: Edge[] = [];

export interface CanvasEditorRef {
  addNewNode: () => void;
  addNewGroup: () => void;
  addNewTrackedNode: () => void;
  addNewTrackedGroup: () => void;
  addNewEquipmentNode: () => void;
  deleteSelectedNode: () => void;
  cloneSelectedNode: () => void;
  openEditor: () => void;
  openEdgeEditor: () => void;
  handleExport: () => void;
  handleExportImage: () => void;
  handleExportHTML: () => void;
  handleImportClick: () => void;
  handleClearCanvas: () => void;
  getSelectedNode: () => Node | null;
  getSelectedEdge: () => Edge | null;
  getNodesCount: () => number;
  focusNode: (nodeId: string) => void;
}

interface CanvasEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onStateChange?: (nodes: Node[], edges: Edge[]) => void;
}

// Тип контекстного меню
type ContextMenuType = 'canvas' | 'node' | 'edge' | null;

interface ContextMenuState {
  type: ContextMenuType;
  position: { x: number; y: number };
  canvasPosition: { x: number; y: number }; // Позиция на холсте для создания элементов
}

const CanvasEditorInner = React.forwardRef<CanvasEditorRef, CanvasEditorProps>(function CanvasEditorInner({ initialNodes: propInitialNodes, initialEdges: propInitialEdges, onStateChange }, ref) {
  const { nodes, edges, setNodes, setEdges, addNode, updateNode: updateStoreNode, deleteNode, clearCanvas } = useCanvasStore();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEdgeEditorOpen, setIsEdgeEditorOpen] = useState(false);
  const [isNodeTypePickerOpen, setIsNodeTypePickerOpen] = useState(false);
  const [pendingNodePosition, setPendingNodePosition] = useState<{ x: number; y: number } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const isInitializing = React.useRef(true);
  const onStateChangeRef = React.useRef(onStateChange);

  // Состояние контекстного меню
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  // Буфер обмена для копирования узлов
  const [clipboard, setClipboard] = useState<Node | null>(null);
  // Позиция мыши для вставки
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Ref на контейнер для отслеживания позиции мыши
  const containerRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition, setCenter, getNode } = useReactFlow();

  // Обновляем ref при изменении callback
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  // Синхронизируем состояние с родителем (но не во время инициализации)
  useEffect(() => {
    if (!isInitializing.current && onStateChangeRef.current) {
      onStateChangeRef.current(nodes, edges);
    }
  }, [nodes, edges]);

  // Инициализация начальными данными при первом запуске
  useEffect(() => {
    isInitializing.current = true;

    if (propInitialNodes && propInitialEdges) {
      // Если переданы начальные данные из props, используем их
      setNodes(propInitialNodes);
      setEdges(propInitialEdges);
    } else if (nodes.length === 0) {
      // Иначе используем дефолтные данные
      setNodes(initialNodes);
      setEdges(initialEdges);
    } else {
      // Нормализуем z-index для существующих узлов
      setNodes((currentNodes) =>
        currentNodes.map((node) => ({
          ...node,
          zIndex: node.zIndex ?? ((node.type === 'group' || node.type === 'tracked-group') ? 1 : 10),
        }))
      );
    }

    // Даем время на применение изменений, затем разрешаем синхронизацию
    setTimeout(() => {
      isInitializing.current = false;
    }, 100);
  }, [propInitialNodes, propInitialEdges]);

  // Debug: выводим количество узлов
  useEffect(() => {
    console.log('Nodes count:', nodes.length);
  }, [nodes]);

  // Выделяем узлы которые связаны с выделенной связью
  useEffect(() => {
    // Убираем класс со всех узлов
    document.querySelectorAll('.react-flow__node.edge-connected').forEach(el => {
      el.classList.remove('edge-connected');
    });

    // Если связь выделена, добавляем класс к узлам на её концах
    if (selectedEdge) {
      const sourceNode = document.querySelector(`[data-id="${selectedEdge.source}"]`);
      const targetNode = document.querySelector(`[data-id="${selectedEdge.target}"]`);
      
      if (sourceNode) sourceNode.classList.add('edge-connected');
      if (targetNode) targetNode.classList.add('edge-connected');
    }
  }, [selectedEdge]);

  // Обработчик обновления данных узла (для TrackedNode)
  useEffect(() => {
    const handleUpdateNodeData = (event: CustomEvent) => {
      const { nodeId, data: newData } = event.detail;
      updateStoreNode(nodeId, newData);
    };

    window.addEventListener('updateNodeData', handleUpdateNodeData as EventListener);
    return () => {
      window.removeEventListener('updateNodeData', handleUpdateNodeData as EventListener);
    };
  }, [updateStoreNode]);

  // Обработчик создания узлов из найденных хостов (для TrackedGroupNode)
  useEffect(() => {
    const handleCreateNodesFromHosts = (event: CustomEvent) => {
      const { groupId, hosts } = event.detail;
      
      // Находим группу
      const group = nodes.find(n => n.id === groupId);
      if (!group || group.type !== 'tracked-group') return;

      const groupX = group.position.x;
      const groupY = group.position.y;

      // Создаем узлы для каждого найденного хоста
      const newNodes: Node[] = hosts.map((host: any, index: number) => {
        // Располагаем узлы в сетке внутри группы
        const cols = Math.ceil(Math.sqrt(hosts.length));
        const row = Math.floor(index / cols);
        const col = index % cols;
        const spacing = 20;
        const nodeWidth = 200;
        const nodeHeight = 100;
        
        const relativeX = spacing + col * (nodeWidth + spacing);
        const relativeY = spacing + row * (nodeHeight + spacing) + 40; // +40 для заголовка группы

        return {
          id: `tracked-${groupId}-${host.ip}-${Date.now()}-${index}`,
          type: 'tracked',
          position: {
            x: groupX + relativeX,
            y: groupY + relativeY,
          },
          data: {
            label: host.hostname || host.ip,
            color: 'cyan',
            icon: 'network',
            host: host.ip,
            hostStatus: 'online',
            scannedPorts: [],
            portMappings: [],
          },
          parentId: groupId,
          extent: 'parent' as const,
          zIndex: 10,
        };
      });

      // Добавляем все узлы
      newNodes.forEach(node => addNode(node));
    };

    window.addEventListener('createNodesFromHosts', handleCreateNodesFromHosts as EventListener);
    return () => {
      window.removeEventListener('createNodesFromHosts', handleCreateNodesFromHosts as EventListener);
    };
  }, [nodes, addNode]);

  // Функция для определения, попадает ли узел в границы группы
  const findParentGroup = useCallback((node: Node, allNodes: Node[]): string | null => {
    // Не привязываем группы к группам и сами узлы к себе
    if (node.type === 'group' || node.type === 'tracked-group') return null;
    
    // Проверяем каждую группу
    for (const group of allNodes) {
      if ((group.type !== 'group' && group.type !== 'tracked-group') || group.id === node.id) continue;
      
      const groupWidth = typeof group.style?.width === 'number' ? group.style.width : 300;
      const groupHeight = typeof group.style?.height === 'number' ? group.style.height : 200;
      const groupX = group.position.x;
      const groupY = group.position.y;
      
      // Учитываем размер узла (примерный размер TextNode)
      const nodeWidth = 200;
      const nodeHeight = 100;
      const nodeCenterX = node.position.x + nodeWidth / 2;
      const nodeCenterY = node.position.y + nodeHeight / 2;
      
      // Проверяем, находится ли центр узла внутри группы
      if (
        nodeCenterX >= groupX &&
        nodeCenterX <= groupX + groupWidth &&
        nodeCenterY >= groupY &&
        nodeCenterY <= groupY + groupHeight
      ) {
        return group.id;
      }
    }
    
    return null;
  }, []);

  const onNodesChange = useCallback(
    (changes: any) => {
      setNodes((nds) => {
        // Применяем изменения
        let updatedNodes = applyNodeChanges(changes, nds);
        
        // Обрабатываем изменения для прилипания узлов к группам
        updatedNodes = updatedNodes.map((node) => {
          // Пропускаем группы (но обрабатываем их позиции для дочерних узлов)
          if (node.type === 'group') return node;
          
          // Если узел уже привязан к группе, проверяем, что группа все еще существует
          if (node.parentId) {
            const parentGroup = updatedNodes.find((n) => n.id === node.parentId);
            if (!parentGroup) {
              // Группа была удалена - освобождаем узел
              return {
                ...node,
                parentId: undefined,
                extent: undefined,
              };
            }
            
            // Если группа переместилась, позиция узла автоматически обновится ReactFlow
            // Но нужно проверить, все ли еще узел в границах группы
            const groupWidth = typeof parentGroup.style?.width === 'number' ? parentGroup.style.width : 300;
            const groupHeight = typeof parentGroup.style?.height === 'number' ? parentGroup.style.height : 200;
            const absoluteX = parentGroup.position.x + (node.position.x || 0);
            const absoluteY = parentGroup.position.y + (node.position.y || 0);
            
            const nodeWidth = 200;
            const nodeHeight = 100;
            const nodeCenterX = absoluteX + nodeWidth / 2;
            const nodeCenterY = absoluteY + nodeHeight / 2;
            
            const isInsideGroup = (
              nodeCenterX >= parentGroup.position.x &&
              nodeCenterX <= parentGroup.position.x + groupWidth &&
              nodeCenterY >= parentGroup.position.y &&
              nodeCenterY <= parentGroup.position.y + groupHeight
            );
            
            if (!isInsideGroup) {
              // Узел вышел из группы - освобождаем
              return {
                ...node,
                parentId: undefined,
                position: {
                  x: absoluteX,
                  y: absoluteY,
                },
                extent: undefined,
              };
            }
            
            // Узел все еще в группе - сохраняем привязку
            return node;
          }
          
          // Узел не привязан - проверяем, попадает ли он в какую-то группу
          const parentId = findParentGroup(node, updatedNodes);
          
          if (parentId) {
            const parentGroup = updatedNodes.find((n) => n.id === parentId);
            if (parentGroup) {
              // Вычисляем относительную позицию от группы
              const relativeX = node.position.x - parentGroup.position.x;
              const relativeY = node.position.y - parentGroup.position.y;
              
              return {
                ...node,
                parentId: parentId,
                position: {
                  x: relativeX,
                  y: relativeY,
                },
                extent: 'parent' as const,
              };
            }
          }
          
          return node;
        });
        
        return updatedNodes;
      });
    },
    [setNodes, findParentGroup]
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge({ 
          ...params,
          type: 'default',
          markerEnd: {
            type: 'arrowclosed',
            width: 10,
            height: 10,
          } as any,
          style: {
            strokeWidth: 2,
            stroke: '#b1b1b7',
          },
          data: {
            showStartDot: true,
            showEndDot: false,
          },
        }, eds);
        // Устанавливаем zIndex и тип для всех новых связей
        return newEdges.map((edge) => ({
          ...edge,
          zIndex: edge.zIndex ?? 10,
          pathOptions: {
            offset: 50,
          },
        }));
      });
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    // Если связь уже выделена, снимаем выделение
    if (selectedEdge?.id === edge.id) {
      setSelectedEdge(null);
    } else {
      // Иначе выделяем
      setSelectedEdge(edge);
    }
  }, [selectedEdge]);

  const updateEdge = useCallback((edgeId: string, updates: Partial<Edge>) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? { ...edge, ...updates }
          : edge
      )
    );
  }, [setEdges]);

  // Функция для получения позиции или случайной
  const getPositionOrRandom = useCallback((position?: { x: number; y: number }) => {
    if (position) return position;
    return {
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100
    };
  }, []);

  const addNewNode = useCallback((position?: { x: number; y: number }) => {
    setPendingNodePosition(position || null);
    setIsNodeTypePickerOpen(true);
  }, []);

  const handleNodeTypeSelect = useCallback((type: PickableNodeType) => {
    const defaultDataMap: Record<string, Record<string, unknown>> = {
      text: { label: 'Новый узел', color: 'default' },
      person: { label: 'Новый контакт', role: '', email: '', phone: '', color: 'default' },
      'product-card': { label: 'Новый товар', description: '', price: '', currency: '₽', status: 'available', category: '', color: 'default' },
      'stat-card': { label: 'Метрика', value: '0', unit: '', trend: 'neutral', trendValue: '', description: '', color: 'default' },
      'routing-rule': { label: 'Новое правило', srcIp: '', srcPort: '', dstIp: '', dstPort: '', protocol: 'tcp', action: 'allow', color: 'default' },
      note: { label: '', content: 'Новая заметка...', color: 'default' },
    };
    const newNode: Node = {
      id: `${Date.now()}`,
      type,
      position: getPositionOrRandom(pendingNodePosition || undefined),
      data: defaultDataMap[type] || { label: 'Новый узел', color: 'default' },
      zIndex: 10,
    };
    addNode(newNode);
    setIsNodeTypePickerOpen(false);
    setPendingNodePosition(null);
  }, [pendingNodePosition, addNode, getPositionOrRandom]);

  const addNewGroup = useCallback((position?: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'group',
      position: getPositionOrRandom(position),
      data: { label: `Группа`, color: 'default' },
      style: { width: 300, height: 200 },
      zIndex: 1,
    };
    addNode(newNode);
  }, [addNode, getPositionOrRandom]);

  const addNewTrackedNode = useCallback((position?: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'tracked',
      position: getPositionOrRandom(position),
      data: {
        label: `Отслеживаемый узел`,
        color: 'cyan',
        icon: 'network',
        host: 'localhost',
        scannedPorts: [],
        portMappings: [],
      },
      zIndex: 10,
    };
    addNode(newNode);
  }, [addNode, getPositionOrRandom]);

  const addNewTrackedGroup = useCallback((position?: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'tracked-group',
      position: getPositionOrRandom(position),
      data: {
        label: `Отслеживаемая группа`,
        color: 'cyan',
        icon: 'network',
        networkRange: '',
        scannedHosts: [],
        autoCreateNodes: true,
      },
      style: { width: 400, height: 300 },
      zIndex: 1,
    };
    addNode(newNode);
  }, [addNode, getPositionOrRandom]);

  const addNewEquipmentNode = useCallback((position?: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'equipment',
      position: getPositionOrRandom(position),
      data: {
        label: `Новое оборудование`,
        equipmentType: 'generic',
        equipmentSpecs: null,
      },
      zIndex: 10,
    };
    addNode(newNode);
  }, [addNode, getPositionOrRandom]);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      deleteNode(selectedNode.id);
      setSelectedNode(null);
    }
  }, [selectedNode, deleteNode]);

  const cloneSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    
    const newId = `${Date.now()}`;
    
    // Глубокое копирование данных узла
    const clonedNode: Node = {
      ...selectedNode,
      id: newId,
      position: {
        x: selectedNode.position.x + 20,
        y: selectedNode.position.y + 20,
      },
      data: {
        ...selectedNode.data,
        // Если есть сервисы, клонируем их тоже
        services: selectedNode.data.services
          ? selectedNode.data.services.map((service: any) => ({
              ...service,
              id: `${Date.now()}-${Math.random()}`,
            }))
          : undefined,
        // Если есть кастомные поля, клонируем их тоже
        customFields: selectedNode.data.customFields
          ? selectedNode.data.customFields.map((field: any) => ({
              ...field,
              id: `field-${Date.now()}-${Math.random()}`,
            }))
          : undefined,
      },
      // Убираем parentId если узел был в группе (клонируем как отдельный)
      parentId: undefined,
      extent: undefined,
    };
    
    addNode(clonedNode);
    
    // Убеждаемся, что никакие связи не связаны с новым клонированным узлом
    // Связи не должны копироваться, так как у клона новый ID
    // Но на всякий случай проверяем и удаляем любые связи, которые могли бы быть созданы
    setEdges((currentEdges) => {
      // Фильтруем связи, которые ссылаются на новый ID узла
      // (на случай, если что-то автоматически создало связи)
      return currentEdges.filter(
        (edge) => edge.source !== newId && edge.target !== newId
      );
    });
    
    // Выбираем новый клонированный узел
    setSelectedNode(clonedNode);
  }, [selectedNode, addNode, setEdges]);

  // Копирование узла в буфер обмена
  const copySelectedNode = useCallback(() => {
    if (selectedNode) {
      setClipboard(selectedNode);
    }
  }, [selectedNode]);

  // Вставка узла из буфера обмена
  const pasteNode = useCallback((position?: { x: number; y: number }) => {
    if (!clipboard) return;

    const pastePosition = position || mousePositionRef.current;
    const newId = `${Date.now()}`;

    const pastedNode: Node = {
      ...clipboard,
      id: newId,
      position: pastePosition,
      data: {
        ...clipboard.data,
        services: clipboard.data.services
          ? clipboard.data.services.map((service: any) => ({
              ...service,
              id: `${Date.now()}-${Math.random()}`,
            }))
          : undefined,
        customFields: clipboard.data.customFields
          ? clipboard.data.customFields.map((field: any) => ({
              ...field,
              id: `field-${Date.now()}-${Math.random()}`,
            }))
          : undefined,
      },
      parentId: undefined,
      extent: undefined,
    };

    addNode(pastedNode);
    setSelectedNode(pastedNode);
  }, [clipboard, addNode]);

  // Удаление выбранной связи
  const deleteSelectedEdge = useCallback(() => {
    if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  }, [selectedEdge, setEdges]);

  // Закрытие контекстного меню
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Обработчик контекстного меню на холсте
  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const canvasPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setContextMenu({
      type: 'canvas',
      position: { x: event.clientX, y: event.clientY },
      canvasPosition,
    });
    // Снимаем выделение
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [screenToFlowPosition]);

  // Обработчик контекстного меню на узле
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const canvasPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setContextMenu({
      type: 'node',
      position: { x: event.clientX, y: event.clientY },
      canvasPosition,
    });
    setSelectedNode(node);
    setSelectedEdge(null);
  }, [screenToFlowPosition]);

  // Обработчик контекстного меню на связи
  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    const canvasPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setContextMenu({
      type: 'edge',
      position: { x: event.clientX, y: event.clientY },
      canvasPosition,
    });
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, [screenToFlowPosition]);

  // Обработчик клика на пустом месте холста (закрытие контекстного меню)
  const onPaneClick = useCallback(() => {
    if (contextMenu) {
      closeContextMenu();
    }
  }, [contextMenu, closeContextMenu]);

  // Отслеживание позиции мыши
  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (containerRef.current) {
      try {
        mousePositionRef.current = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
      } catch {
        // Игнорируем ошибки если screenToFlowPosition недоступен
      }
    }
  }, [screenToFlowPosition]);

  // Обработчик клавиатурных событий
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape - закрыть контекстное меню
      if (event.key === 'Escape') {
        if (contextMenu) {
          closeContextMenu();
          return;
        }
      }

      // Не обрабатываем если фокус в input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Delete - удалить выбранный элемент
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNode) {
          deleteSelectedNode();
        } else if (selectedEdge) {
          deleteSelectedEdge();
        }
        return;
      }

      // Enter - редактировать выбранный узел
      if (event.key === 'Enter' && selectedNode) {
        setIsEditorOpen(true);
        return;
      }

      // Ctrl+C - копировать узел
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && selectedNode) {
        event.preventDefault();
        copySelectedNode();
        return;
      }

      // Ctrl+V - вставить узел
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && clipboard) {
        event.preventDefault();
        pasteNode();
        return;
      }

      // Ctrl+D - клонировать узел
      if ((event.ctrlKey || event.metaKey) && event.key === 'd' && selectedNode) {
        event.preventDefault();
        cloneSelectedNode();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNode, selectedEdge, clipboard, contextMenu, deleteSelectedNode, deleteSelectedEdge, copySelectedNode, pasteNode, cloneSelectedNode, closeContextMenu]);

  // Закрытие контекстного меню при клике вне его
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (contextMenu) {
        // Проверяем, был ли клик внутри контекстного меню
        const target = event.target as HTMLElement;
        const isInsideMenu = target.closest('[data-context-menu]');
        if (!isInsideMenu) {
          closeContextMenu();
        }
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [contextMenu, closeContextMenu]);

  const openEditor = useCallback(() => {
    if (selectedNode) {
      setIsEditorOpen(true);
    }
  }, [selectedNode]);

  const updateNode = useCallback((updatedData: any) => {
    if (selectedNode) {
      updateStoreNode(selectedNode.id, updatedData);
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, ...updatedData } } : null
      );
    }
    setIsEditorOpen(false);
  }, [selectedNode, updateStoreNode]);

  const handleClearCanvas = useCallback(() => {
    clearCanvas();
    setSelectedNode(null);
    setShowClearConfirm(false);
  }, [clearCanvas]);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    addNewNode,
    addNewGroup,
    addNewTrackedNode,
    addNewTrackedGroup,
    addNewEquipmentNode,
    deleteSelectedNode,
    cloneSelectedNode,
    openEditor,
    openEdgeEditor: () => setIsEdgeEditorOpen(true),
    handleExport,
    handleExportImage,
    handleExportHTML,
    handleImportClick,
    handleClearCanvas: () => setShowClearConfirm(true),
    getSelectedNode: () => selectedNode,
    getSelectedEdge: () => selectedEdge,
    getNodesCount: () => nodes.length,
    focusNode: (nodeId: string) => {
      const node = getNode(nodeId);
      if (node) {
        const x = node.position.x + (node.width ?? 150) / 2;
        const y = node.position.y + (node.height ?? 50) / 2;
        setCenter(x, y, { zoom: 1.5, duration: 600 });
        setSelectedNode(node);
      }
    },
  }));

  const handleExport = useCallback(() => {
    const data = {
      nodes,
      edges,
      version: '1.0',
      exportedAt: new Date().toISOString(),
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canvas-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handleExportImage = useCallback(() => {
    const reactFlowWrapper = document.querySelector('.react-flow') as HTMLElement;
    if (!reactFlowWrapper) return;

    // Если нет узлов, выходим
    if (nodes.length === 0) {
      console.warn('No nodes to export');
      return;
    }

    // Получаем границы всех узлов
    const nodesBounds = getNodesBounds(nodes);

    // Добавляем отступы вокруг содержимого (padding)
    const padding = 100;
    const width = nodesBounds.width + padding * 2;
    const height = nodesBounds.height + padding * 2;

    // Высокое качество: увеличиваем разрешение в 2 раза
    const scale = 2;
    const imageWidth = width * scale;
    const imageHeight = height * scale;

    // Вычисляем позицию для центрирования содержимого
    const x = nodesBounds.x - padding;
    const y = nodesBounds.y - padding;

    // Временно устанавливаем трансформацию для экспорта
    const viewport = reactFlowWrapper.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) return;

    const originalTransform = viewport.style.transform;
    viewport.style.transform = `translate(${-x}px, ${-y}px) scale(1)`;

    // Исправляем проблему с маркерами - убираем все <defs> с маркерами
    const svgElements = viewport.querySelectorAll('svg');
    const removedDefs: Array<{ parent: SVGSVGElement; defs: SVGDefsElement }> = [];

    svgElements.forEach((svg) => {
      const defs = svg.querySelector('defs');
      if (defs) {
        // Сохраняем для восстановления
        removedDefs.push({ parent: svg as SVGSVGElement, defs: defs as SVGDefsElement });
        // Удаляем defs, чтобы маркеры не экспортировались
        defs.remove();
      }
    });

    // Убираем атрибуты marker-end и marker-start со всех paths
    const edgePaths = viewport.querySelectorAll('.react-flow__edge-path');
    const originalMarkers: Array<{ path: Element; markerEnd: string | null; markerStart: string | null }> = [];

    edgePaths.forEach((path) => {
      const markerEnd = path.getAttribute('marker-end');
      const markerStart = path.getAttribute('marker-start');
      originalMarkers.push({ path, markerEnd, markerStart });

      // Убираем маркеры
      path.removeAttribute('marker-end');
      path.removeAttribute('marker-start');
    });

    // Даем время браузеру перерендерить элементы
    setTimeout(() => {
      // Используем toCanvas для лучшего контроля над экспортом
      toCanvas(viewport, {
        backgroundColor: '#ffffff',
        width: imageWidth,
        height: imageHeight,
        pixelRatio: scale,
        quality: 1,
        cacheBust: true,
        canvasWidth: imageWidth,
        canvasHeight: imageHeight,
        style: {
          width: `${width}px`,
          height: `${height}px`,
        },
        filter: (node: HTMLElement) => {
          // Исключаем элементы UI (миникарта, контролы, фон)
          const exclusionClasses = [
            'react-flow__background',
            'react-flow__minimap',
            'react-flow__controls',
            'react-flow__panel',
          ];
          return !exclusionClasses.some(classname => node.classList?.contains(classname));
        },
        skipFonts: false,
        preferredFontFormat: 'woff2',
      })
        .then((canvas: HTMLCanvasElement) => {
          // Получаем контекст canvas для дополнительной обработки
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Создаем новый canvas с белым фоном
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = canvas.width;
            finalCanvas.height = canvas.height;
            const finalCtx = finalCanvas.getContext('2d');

            if (finalCtx) {
              // Заполняем белым фоном
              finalCtx.fillStyle = '#ffffff';
              finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

              // Рисуем оригинальный контент поверх
              finalCtx.drawImage(canvas, 0, 0);

              // Рисуем стрелки вручную
              edges.forEach((edge) => {
                // Находим path элемент этой связи
                const pathElement = viewport.querySelector(`[data-id="${edge.id}"] .react-flow__edge-path`) as SVGPathElement;
                if (!pathElement) return;

                try {
                  // Получаем общую длину пути
                  const pathLength = pathElement.getTotalLength();
                  if (pathLength === 0) return;

                  // Цвет стрелки из edge.style или по умолчанию
                  const strokeColor = edge.style?.stroke || '#b1b1b7';
                  const arrowSize = 10 * scale;

                  // Рисуем стрелку в конце (markerEnd)
                  if (edge.markerEnd) {
                    const endPoint = pathElement.getPointAtLength(pathLength);
                    const beforeEndPoint = pathElement.getPointAtLength(Math.max(0, pathLength - 15));

                    const angle = Math.atan2(
                      endPoint.y - beforeEndPoint.y,
                      endPoint.x - beforeEndPoint.x
                    );

                    const arrowX = (endPoint.x + x) * scale;
                    const arrowY = (endPoint.y + y) * scale;

                    finalCtx.save();
                    finalCtx.translate(arrowX, arrowY);
                    finalCtx.rotate(angle);

                    finalCtx.beginPath();
                    finalCtx.moveTo(0, 0);
                    finalCtx.lineTo(-arrowSize, -arrowSize / 2);
                    finalCtx.lineTo(-arrowSize, arrowSize / 2);
                    finalCtx.closePath();

                    finalCtx.fillStyle = strokeColor;
                    finalCtx.fill();
                    finalCtx.restore();
                  }

                  // Рисуем стрелку в начале (markerStart)
                  if (edge.markerStart) {
                    const startPoint = pathElement.getPointAtLength(0);
                    const afterStartPoint = pathElement.getPointAtLength(Math.min(15, pathLength));

                    const angle = Math.atan2(
                      afterStartPoint.y - startPoint.y,
                      afterStartPoint.x - startPoint.x
                    );

                    const arrowX = (startPoint.x + x) * scale;
                    const arrowY = (startPoint.y + y) * scale;

                    finalCtx.save();
                    finalCtx.translate(arrowX, arrowY);
                    finalCtx.rotate(angle + Math.PI);

                    finalCtx.beginPath();
                    finalCtx.moveTo(0, 0);
                    finalCtx.lineTo(-arrowSize, -arrowSize / 2);
                    finalCtx.lineTo(-arrowSize, arrowSize / 2);
                    finalCtx.closePath();

                    finalCtx.fillStyle = strokeColor;
                    finalCtx.fill();
                    finalCtx.restore();
                  }
                } catch (error) {
                  console.warn('Failed to draw arrow for edge:', edge.id, error);
                }
              });

              // Открываем canvas в новом окне для просмотра
              const dataUrl = finalCanvas.toDataURL('image/png', 1.0);
              const newWindow = window.open();
              if (newWindow) {
                newWindow.document.write(`
                  <html>
                    <head>
                      <title>Canvas Export Preview</title>
                      <style>
                        body {
                          margin: 0;
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          justify-content: center;
                          background: #f0f0f0;
                          font-family: system-ui, -apple-system, sans-serif;
                        }
                        img {
                          max-width: 95%;
                          max-height: 85vh;
                          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                          background: white;
                        }
                        .controls {
                          margin: 20px;
                          display: flex;
                          gap: 10px;
                        }
                        button {
                          padding: 10px 20px;
                          font-size: 14px;
                          cursor: pointer;
                          border: none;
                          border-radius: 6px;
                          background: #3b82f6;
                          color: white;
                          font-weight: 500;
                        }
                        button:hover {
                          background: #2563eb;
                        }
                        button.secondary {
                          background: #6b7280;
                        }
                        button.secondary:hover {
                          background: #4b5563;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="controls">
                        <button onclick="downloadImage()">Скачать PNG</button>
                        <button class="secondary" onclick="window.close()">Закрыть</button>
                      </div>
                      <img src="${dataUrl}" alt="Canvas Export" />
                      <script>
                        function downloadImage() {
                          const link = document.createElement('a');
                          link.download = 'canvas-${new Date().toISOString().split('T')[0]}.png';
                          link.href = '${dataUrl}';
                          link.click();
                        }
                      </script>
                    </body>
                  </html>
                `);
                newWindow.document.close();
              }
            }
          }
        })
        .catch((error: Error) => {
          console.error('Export image failed:', error);
        })
        .finally(() => {
          // Восстанавливаем оригинальную трансформацию
          viewport.style.transform = originalTransform;

          // Восстанавливаем defs с маркерами
          removedDefs.forEach(({ parent, defs }) => {
            parent.prepend(defs);
          });

          // Восстанавливаем атрибуты маркеров
          originalMarkers.forEach(({ path, markerEnd, markerStart }) => {
            if (markerEnd) path.setAttribute('marker-end', markerEnd);
            if (markerStart) path.setAttribute('marker-start', markerStart);
          });
        });
    }, 100);
  }, [nodes]);

  const handleExportHTML = useCallback(() => {
    const reactFlowWrapper = document.querySelector('.react-flow') as HTMLElement;
    if (!reactFlowWrapper) return;

    if (nodes.length === 0) {
      console.warn('No nodes to export');
      return;
    }

    // Даем время для рендеринга всех edges перед клонированием
    setTimeout(() => {
      // Клонируем весь wrapper вместо только viewport для сохранения всех SVG структур
      const content = reactFlowWrapper.cloneNode(true) as HTMLElement;

    // Удаляем элементы UI
    content.querySelectorAll('.react-flow__background').forEach(el => el.remove());
    content.querySelectorAll('.react-flow__minimap').forEach(el => el.remove());
    content.querySelectorAll('.react-flow__controls').forEach(el => el.remove());
    content.querySelectorAll('.react-flow__panel').forEach(el => el.remove());

    // Находим viewport в клонированном контенте
    const clonedViewport = content.querySelector('.react-flow__viewport') as HTMLElement;
    if (!clonedViewport) return;

    // Получаем границы всех узлов для центрирования
    const nodesBounds = getNodesBounds(nodes);
    const padding = 100;
    const x = nodesBounds.x - padding;
    const y = nodesBounds.y - padding;

    // Применяем трансформацию для центрирования на viewport
    clonedViewport.style.transform = `translate(${-x}px, ${-y}px) scale(1)`;

    // Устанавливаем размеры на контейнер
    content.style.width = `${nodesBounds.width + padding * 2}px`;
    content.style.height = `${nodesBounds.height + padding * 2}px`;
    content.style.position = 'relative';
    content.style.overflow = 'visible';

    // Проверяем, что edges присутствуют
    const edgesContainer = content.querySelector('.react-flow__edges');
    const edgePaths = content.querySelectorAll('.react-flow__edge');
    console.log(`Экспорт HTML: найдено ${edgePaths.length} edges из ${edges.length} в данных`);

    if (edgesContainer) {
      console.log('SVG edges контейнер найден:', edgesContainer);
    } else {
      console.warn('SVG edges контейнер не найден!');
    }

    // Собираем все CSS стили
    const allCSS = Array.from(document.styleSheets)
      .map((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .filter((cssText) => !cssText.includes('@media print'))
            .join('\n');
        } catch (e) {
          // Пропускаем внешние стили (CORS)
          return '';
        }
      })
      .join('\n');

    // Генерируем HTML
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Canvas Export - ${new Date().toISOString().split('T')[0]}</title>
  <style>
${allCSS}

/* Дополнительные стили для экспорта */
body {
  margin: 0;
  padding: 20px;
  background: #f0f0f0;
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.export-container {
  background: white;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  display: inline-block;
  position: relative;
  overflow: visible;
}

.react-flow__viewport {
  overflow: visible !important;
}

/* Обеспечиваем правильное отображение edges */
.react-flow__edges {
  position: absolute;
  z-index: 10;
  pointer-events: none;
  overflow: visible !important;
}

.react-flow__edge {
  pointer-events: all;
}

svg.react-flow__edges {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  overflow: visible !important;
}

/* Кнопки для управления */
.export-controls {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 1000;
}

.export-controls button {
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.export-controls button:hover {
  background: #2563eb;
}

@media print {
  body {
    background: white;
    padding: 0;
  }
  .export-controls {
    display: none;
  }
  .export-container {
    box-shadow: none;
  }
}
  </style>
</head>
<body class="${document.body.className}">
  <div class="export-controls">
    <button onclick="window.print()">Печать / Сохранить как PDF</button>
    <button onclick="downloadHTML()">Скачать HTML</button>
  </div>
  <div class="export-container">
    ${content.outerHTML}
  </div>
  <script>
    function downloadHTML() {
      const htmlContent = document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'canvas-${new Date().toISOString().split('T')[0]}.html';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;

      // Открываем HTML в новом окне
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    }, 100); // Закрываем setTimeout
  }, [nodes, edges]);

  const handleImportClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const data = JSON.parse(text);
          
          // Валидация данных
          if (!data || typeof data !== 'object') {
            throw new Error('Некорректный формат файла');
          }
          
          if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
            throw new Error('Файл должен содержать nodes и edges массивы');
          }
          
          setImportError(null);
          setShowImportConfirm(true);
          
          // Сохраняем данные для импорта
          (window as any).__pendingImportData = data;
        } catch (error) {
          setImportError(error instanceof Error ? error.message : 'Ошибка при чтении файла');
          setShowImportConfirm(true);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleImportConfirm = useCallback(() => {
    const data = (window as any).__pendingImportData;
    if (!data || importError) {
      setShowImportConfirm(false);
      setImportError(null);
      return;
    }

    try {
      // Нормализуем данные при импорте
      const normalizedNodes = data.nodes.map((node: Node) => ({
        ...node,
        zIndex: node.zIndex ?? ((node.type === 'group' || node.type === 'tracked-group') ? 1 : 10),
      }));
      
      const normalizedEdges = data.edges.map((edge: Edge) => ({
        ...edge,
        zIndex: edge.zIndex ?? 10,
      }));

      setNodes(normalizedNodes);
      setEdges(normalizedEdges);
      setSelectedNode(null);
      setShowImportConfirm(false);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Ошибка при импорте данных');
    }
  }, [setNodes, setEdges, importError]);

  return (
    <div className="w-full h-full flex flex-col" ref={containerRef} onMouseMove={onMouseMove}>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{
            style: { strokeWidth: 3 },
            zIndex: 10,
          }}
          snapToGrid={false}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Контекстное меню холста */}
      {contextMenu?.type === 'canvas' && (
        <CanvasContextMenu
          position={contextMenu.position}
          onAddNode={() => {
            addNewNode(contextMenu.canvasPosition);
            closeContextMenu();
          }}
          onAddGroup={() => {
            addNewGroup(contextMenu.canvasPosition);
            closeContextMenu();
          }}
          onAddTrackedNode={() => {
            addNewTrackedNode(contextMenu.canvasPosition);
            closeContextMenu();
          }}
          onAddTrackedGroup={() => {
            addNewTrackedGroup(contextMenu.canvasPosition);
            closeContextMenu();
          }}
          onAddEquipmentNode={() => {
            addNewEquipmentNode(contextMenu.canvasPosition);
            closeContextMenu();
          }}
          onPaste={() => {
            pasteNode(contextMenu.canvasPosition);
            closeContextMenu();
          }}
          hasClipboard={!!clipboard}
        />
      )}

      {/* Контекстное меню узла */}
      {contextMenu?.type === 'node' && (
        <NodeContextMenu
          position={contextMenu.position}
          onEdit={() => {
            setIsEditorOpen(true);
            closeContextMenu();
          }}
          onClone={() => {
            cloneSelectedNode();
            closeContextMenu();
          }}
          onCopy={() => {
            copySelectedNode();
            closeContextMenu();
          }}
          onDelete={() => {
            deleteSelectedNode();
            closeContextMenu();
          }}
        />
      )}

      {/* Контекстное меню связи */}
      {contextMenu?.type === 'edge' && (
        <EdgeContextMenu
          position={contextMenu.position}
          onEdit={() => {
            setIsEdgeEditorOpen(true);
            closeContextMenu();
          }}
          onDelete={() => {
            deleteSelectedEdge();
            closeContextMenu();
          }}
        />
      )}
      <NodeTypePicker
        isOpen={isNodeTypePickerOpen}
        onClose={() => { setIsNodeTypePickerOpen(false); setPendingNodePosition(null); }}
        onSelect={handleNodeTypeSelect}
      />

      {selectedNode && (
        <NodeEditor
          node={selectedNode}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={updateNode}
        />
      )}

      <EdgeEditor
        edge={selectedEdge}
        isOpen={isEdgeEditorOpen}
        onClose={() => {
          setIsEdgeEditorOpen(false);
          setSelectedEdge(null);
        }}
        onUpdate={updateEdge}
      />

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтвердите очистку</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Вы уверены, что хотите очистить canvas? Все узлы и связи будут удалены.
              Это действие необратимо.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleClearCanvas}>
              Очистить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{importError ? 'Ошибка импорта' : 'Подтвердите импорт'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {importError ? (
              <div className="text-sm text-red-600">
                <p className="font-medium mb-2">Произошла ошибка:</p>
                <p>{importError}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Вы уверены, что хотите импортировать данные из файла? 
                Все текущие узлы и связи будут заменены на данные из файла.
                Это действие необратимо.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportConfirm(false);
              setImportError(null);
            }}>
              Отмена
            </Button>
            {!importError && (
              <Button onClick={handleImportConfirm}>
                Импортировать
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

// Обёртка с ReactFlowProvider для useReactFlow()
const CanvasEditorWithProvider = React.forwardRef<CanvasEditorRef, CanvasEditorProps>(
  (props, ref) => (
    <ReactFlowProvider>
      <CanvasEditorInner {...props} ref={ref} />
    </ReactFlowProvider>
  )
);

CanvasEditorWithProvider.displayName = 'CanvasEditor';

export default CanvasEditorWithProvider;
