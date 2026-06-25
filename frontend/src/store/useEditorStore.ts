import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  GraphElement, GraphFile, ToolType, TextElement,
  ArcElement, LineElement, CollaboratorCursor,
  DimensionConfig, DEFAULT_DIMENSION_CONFIG
} from '../types';
import { saveFile, updateFile, loadFile, createRoom, joinRoom } from '../api';
import { wsClient } from '../api/websocket';

export interface EditorState {
  // 画布数据
  currentFile: GraphFile | null;
  elements: GraphElement[];
  // 选中状态
  selectedIds: Set<string>;
  // 当前工具
  activeTool: ToolType;
  // 撤销历史
  history: GraphElement[][];
  historyIndex: number;
  // UI状态
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  // ── 尺寸标注配置 ──
  dimensionConfig: DimensionConfig;
  // ── 协同绘图 ──
  collaborationEnabled: boolean;   // 是否开启协同模式
  wsConnected: boolean;            // WebSocket 连接状态
  collaboratorCursors: CollaboratorCursor[];  // 协作者光标列表
  // ── 画室 ──
  roomId: string | null;           // 当前画室的 UUID 邀请码
  // ── 定时保存 ──
  autoSaveTimer: number | null;    // 自动保存计时器
  lastSavedElements: string;       // 上次保存时的元素JSON，用于判断是否需要保存
}

const DEFAULT_CANVAS_W = 1200;
const DEFAULT_CANVAS_H = 800;

/** 创建默认空文件 */
function createNewFile(name = '未命名图形'): GraphFile {
  return {
    name,
    canvasWidth: DEFAULT_CANVAS_W,
    canvasHeight: DEFAULT_CANVAS_H,
    backgroundColor: '#ffffff',
    elements: [],
  };
}

export function useEditorStore() {
  const [state, setState] = useState<EditorState>({
    currentFile: createNewFile(),
    elements: [],
    selectedIds: new Set(),
    activeTool: 'select',
    history: [[]],
    historyIndex: 0,
    isSaving: false,
    isLoading: false,
    error: null,
    // 尺寸标注配置
    dimensionConfig: DEFAULT_DIMENSION_CONFIG,
    // 协同绘图
    collaborationEnabled: false,
    wsConnected: false,
    collaboratorCursors: [],
    // 画室
    roomId: null,
    // 定时保存
    autoSaveTimer: null as number | null,
    lastSavedElements: JSON.stringify([]),
  });

  // 内部引用（避免闭包问题）
  const stateRef = useRef(state);
  stateRef.current = state;

  // ──────────── 历史记录（撤销/重做）────────────

  const undo = useCallback(() => {
    const s = stateRef.current;
    if (s.collaborationEnabled) {
      // 协同模式：发送到后端，由后端统一控制
      wsClient.sendHistoryOperation('UNDO');
    } else {
      // 非协同模式：本地处理
      setState(s => {
        if (s.historyIndex <= 0) return s;
        const newIndex = s.historyIndex - 1;
        const newElements = s.history[newIndex].map(e => ({ ...e }));
        return {
          ...s,
          historyIndex: newIndex,
          elements: newElements,
          selectedIds: new Set(),
        };
      });
    }
  }, []);

  // ──────────── 工具 ────────────

  const setActiveTool = useCallback((tool: ToolType) => {
    setState(s => ({
      ...s,
      activeTool: tool,
      selectedIds: tool !== 'select' ? new Set() : s.selectedIds,
    }));
  }, []);

  // ──────────── 元素 CRUD ────────────

  /** 添加元素 */
  const addElement = useCallback((el: GraphElement) => {
    setState(s => {
      const newElements = [...s.elements, el];
      const newHistory = s.history.slice(0, s.historyIndex + 1);
      newHistory.push(newElements.map(e => ({ ...e })));
      
      // 如果是协同模式，推送快照到后端历史栈
      if (s.collaborationEnabled) {
        setTimeout(() => {
          const elementsJson = JSON.stringify(newElements.map(e => ({ ...e, selected: undefined })));
          wsClient.pushHistorySnapshot(elementsJson);
        }, 0);
      }
      
      return {
        ...s,
        elements: newElements,
        history: newHistory.slice(-50),
        historyIndex: Math.min(newHistory.length - 1, 49),
      };
    });
  }, []);

  /** 批量更新元素 */
  const updateElements = useCallback((updater: (els: GraphElement[]) => GraphElement[]) => {
    setState(s => {
      const newElements = updater(s.elements);
      const newHistory = s.history.slice(0, s.historyIndex + 1);
      newHistory.push(newElements.map(e => ({ ...e })));
      
      // 如果是协同模式，推送快照到后端历史栈
      if (s.collaborationEnabled) {
        setTimeout(() => {
          const elementsJson = JSON.stringify(newElements.map(e => ({ ...e, selected: undefined })));
          wsClient.pushHistorySnapshot(elementsJson);
        }, 0);
      }
      
      return {
        ...s,
        elements: newElements,
        history: newHistory.slice(-50),
        historyIndex: Math.min(newHistory.length - 1, 49),
      };
    });
  }, []);

  /** 更新单个元素（不记录历史，用于实时拖动） */
  const updateElementSilent = useCallback((id: string, patch: Partial<GraphElement>) => {
    setState(s => ({
      ...s,
      elements: s.elements.map(el => el.id === id ? { ...el, ...patch } as GraphElement : el),
    }));
  }, []);

  /** 批量更新元素（不记录历史，用于 mousemove 实时拖动预览） */
  const updateElementsSilentBatch = useCallback((updater: (els: GraphElement[]) => GraphElement[]) => {
    setState(s => ({
      ...s,
      elements: updater(s.elements),
    }));
  }, []);

  /** 删除选中元素 */
  const deleteSelected = useCallback(() => {
    const s = stateRef.current;
    if (s.selectedIds.size === 0) return;

    // 协同模式：广播每个被删除元素的删除消息
    if (s.collaborationEnabled) {
      s.selectedIds.forEach(id => {
        wsClient.sendElementDelete(id);
      });
    }

    setState(s => {
      if (s.selectedIds.size === 0) return s;
      const newElements = s.elements.filter(el => !s.selectedIds.has(el.id));
      const newHistory = s.history.slice(0, s.historyIndex + 1);
      newHistory.push(newElements.map(e => ({ ...e })));

      // 如果是协同模式，推送快照到后端历史栈
      if (s.collaborationEnabled) {
        setTimeout(() => {
          const elementsJson = JSON.stringify(newElements.map(e => ({ ...e, selected: undefined })));
          wsClient.pushHistorySnapshot(elementsJson);
        }, 0);
      }

      return {
        ...s,
        elements: newElements,
        selectedIds: new Set(),
        history: newHistory.slice(-50),
        historyIndex: Math.min(newHistory.length - 1, 49),
      };
    });
  }, []);

  // ──────────── 选中 ────────────

  const selectElement = useCallback((id: string, multi = false) => {
    setState(s => {
      let newIds: Set<string>;
      if (multi) {
        newIds = new Set(s.selectedIds);
        if (newIds.has(id)) newIds.delete(id);
        else newIds.add(id);
      } else {
        newIds = new Set([id]);
      }
      const elements = s.elements.map(el => ({ ...el, selected: newIds.has(el.id) }));
      return { ...s, selectedIds: newIds, elements };
    });
  }, []);

  const selectElements = useCallback((ids: string[]) => {
    setState(s => {
      const newIds = new Set(ids);
      const elements = s.elements.map(el => ({ ...el, selected: newIds.has(el.id) }));
      return { ...s, selectedIds: newIds, elements };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState(s => ({
      ...s,
      selectedIds: new Set(),
      elements: s.elements.map(el => ({ ...el, selected: false })),
    }));
  }, []);

  // ──────────── 文件操作 ────────────

  const newFile = useCallback((name?: string) => {
    const file = createNewFile(name);
    setState(s => ({
      ...s,
      currentFile: file,
      elements: [],
      selectedIds: new Set(),
      history: [[]],
      historyIndex: 0,
      error: null,
    }));
  }, []);

  const openFile = useCallback(async (id: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const file = await loadFile(id);
      setState(s => ({
        ...s,
        currentFile: file,
        elements: (file.elements || []).map(e => ({ ...e, selected: false })),
        selectedIds: new Set(),
        history: [file.elements || []],
        historyIndex: 0,
        isLoading: false,
      }));
    } catch (e: any) {
      setState(s => ({ ...s, isLoading: false, error: e.message || '加载失败' }));
    }
  }, []);

  const saveCurrentFile = useCallback(async () => {
    const s = stateRef.current;
    if (!s.currentFile) return;
    setState(prev => ({ ...prev, isSaving: true, error: null }));
    try {
      const fileToSave: GraphFile = {
        ...s.currentFile,
        elements: s.elements.map(e => ({ ...e, selected: undefined } as GraphElement)),
      };
      let saved: GraphFile;
      if (s.currentFile.id) {
        saved = await updateFile(s.currentFile.id, fileToSave);
      } else {
        saved = await saveFile(fileToSave);
      }
      setState(prev => ({ ...prev, currentFile: saved, isSaving: false }));
    } catch (e: any) {
      setState(prev => ({ ...prev, isSaving: false, error: e.message || '保存失败' }));
    }
  }, []);

  const setFileName = useCallback((name: string) => {
    setState(s => ({
      ...s,
      currentFile: s.currentFile ? { ...s.currentFile, name } : null,
    }));
  }, []);

  const setCanvasSize = useCallback((w: number, h: number) => {
    setState(s => ({
      ...s,
      currentFile: s.currentFile
        ? { ...s.currentFile, canvasWidth: w, canvasHeight: h }
        : null,
    }));
  }, []);

  const setBackgroundColor = useCallback((color: string) => {
    setState(s => ({
      ...s,
      currentFile: s.currentFile
        ? { ...s.currentFile, backgroundColor: color }
        : null,
    }));
  }, []);

  // ──────────── 尺寸标注配置 ────────────

  /** 更新标注配置 */
  const setDimensionConfig = useCallback((config: Partial<DimensionConfig>) => {
    setState(s => ({
      ...s,
      dimensionConfig: { ...s.dimensionConfig, ...config },
    }));
  }, []);

  /** 切换标注显示 */
  const toggleDimensionAnnotations = useCallback(() => {
    setState(s => ({
      ...s,
      dimensionConfig: { ...s.dimensionConfig, enabled: !s.dimensionConfig.enabled },
    }));
  }, []);

  // ──────────── 创建元素工厂 ────────────

  const createTextElement = useCallback((x: number, y: number, width = 120, height = 30): TextElement => ({
    id: uuidv4(),
    type: 'text',
    zIndex: stateRef.current.elements.length,
    selected: false,
    text: '双击编辑',
    x, y, width, height,
    fontFamily: 'Arial',
    fontSize: 20,
    color: '#000000',
    fontStyle: 'normal',
  }), []);

  const createArcElement = useCallback((
    cx: number, cy: number, radius = 60,
    startAngle = 0, endAngle = 360
  ): ArcElement => ({
    id: uuidv4(),
    type: 'arc',
    zIndex: stateRef.current.elements.length,
    selected: false,
    cx, cy, radius, startAngle, endAngle,
    anticlockwise: false,
    strokeColor: '#000000',
    strokeWidth: 2,
    strokeStyle: 'solid',
  }), []);

  const createLineElement = useCallback((
    x1: number, y1: number, x2: number, y2: number
  ): LineElement => ({
    id: uuidv4(),
    type: 'line',
    zIndex: stateRef.current.elements.length,
    selected: false,
    x1, y1, x2, y2,
    strokeColor: '#000000',
    strokeWidth: 2,
    strokeStyle: 'solid',
  }), []);

  // ──────────── 协同绘图 ────────────

  /** 为每个协作者分配固定颜色 */
  const collaboratorColors = useRef<Map<number, string>>(new Map());
  const getColorForUser = useCallback((userId: number): string => {
    if (!collaboratorColors.current.has(userId)) {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
                      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
      const index = collaboratorColors.current.size % colors.length;
      collaboratorColors.current.set(userId, colors[index]);
    }
    return collaboratorColors.current.get(userId)!;
  }, []);

  /**
   * 开启协同模式：连接 WebSocket
   * 需要在打开文件（有 canvasId）之后调用
   */
  const enableCollaboration = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentFile?.id) {
      console.warn('[协同] 无法开启：未打开任何画布');
      return;
    }
    const token = localStorage.getItem('ve_token');
    if (!token) {
      console.warn('[协同] 无法开启：未登录');
      return;
    }
    const userData = localStorage.getItem('ve_user');
    const userId = userData ? JSON.parse(userData).userId : null;
    if (!userId) {
      console.warn('[协同] 无法开启：无法获取用户ID');
      return;
    }

    const canvasId = Number(s.currentFile.id);

    // 注册消息处理器
    wsClient.onRemoteElement((msg) => {
      handleRemoteElementMessage(msg);
    });
    
    // 注册历史同步消息处理器
    wsClient.onHistorySync((payload) => {
      setState(s => ({
        ...s,
        elements: JSON.parse(payload.elements).map((e: GraphElement) => ({ ...e, selected: false })),
        history: [JSON.parse(payload.elements)],
        historyIndex: 0,
        selectedIds: new Set(),
      }));
    });

    wsClient.onCursorMove((uid, uname, x, y) => {
      setState(s => ({
        ...s,
        collaboratorCursors: [
          ...s.collaboratorCursors.filter(c => c.userId !== uid),
          { userId: uid, username: uname, x, y, color: getColorForUser(uid), lastUpdateTime: Date.now() },
        ],
      }));
    });

    wsClient.onConnectionChange((connected) => {
      setState(s => ({ ...s, wsConnected: connected }));
    });

    wsClient.connect(canvasId, token, userId);
    
    // 启动定时保存（每30秒）
    const startAutoSave = () => {
      const timer = window.setInterval(() => {
        const currentState = stateRef.current;
        if (!currentState.currentFile?.id || !currentState.collaborationEnabled) {
          return;
        }
        const currentElementsJson = JSON.stringify(currentState.elements.map(e => ({ ...e, selected: undefined })));
        if (currentElementsJson !== currentState.lastSavedElements) {
          console.log('[自动保存] 检测到变化，正在保存...');
          saveCurrentFile();
          setState(s => ({ ...s, lastSavedElements: currentElementsJson }));
        }
      }, 30000); // 30秒
      setState(s => ({ ...s, autoSaveTimer: timer, lastSavedElements: JSON.stringify(s.elements.map(e => ({ ...e, selected: undefined }))) }));
    };
    
    startAutoSave();
    setState(s => ({ ...s, collaborationEnabled: true }));
  }, [getColorForUser, saveCurrentFile]);

  /** 关闭协同模式 */
  const disableCollaboration = useCallback(() => {
    wsClient.disconnect();
    
    // 清除定时保存
    if (stateRef.current.autoSaveTimer) {
      window.clearInterval(stateRef.current.autoSaveTimer);
    }
    
    setState(s => ({
      ...s,
      collaborationEnabled: false,
      wsConnected: false,
      collaboratorCursors: [],
      autoSaveTimer: null,
    }));
    collaboratorColors.current.clear();
  }, []);

  // ──────────── 画室（Room） ────────────

  /**
   * 创建画室：为当前画布生成 UUID 邀请码
   * 要求：当前已打开一个已保存的画布（有 id）
   */
  const createCanvasRoom = useCallback(async (): Promise<string | null> => {
    const s = stateRef.current;
    if (!s.currentFile?.id) {
      console.warn('[画室] 无法创建：画布未保存, currentFile=', s.currentFile);
      return null;
    }
    try {
      console.log('[画室] 正在为 canvasId=', s.currentFile.id, ' 创建画室...');
      const file = await createRoom(s.currentFile.id);
      const roomId = file.roomId;
      console.log('[画室] 后端返回 roomId:', roomId);
      if (!roomId) {
        console.error('[画室] 后端未返回 roomId');
        return null;
      }
      setState(prev => ({
        ...prev,
        currentFile: prev.currentFile ? { ...prev.currentFile, roomId } : null,
        roomId,
      }));
      return roomId;
    } catch (e: any) {
      console.error('[画室] 创建失败:', e);
      setState(prev => ({ ...prev, error: e.message || '创建画室失败' }));
      return null;
    }
  }, []);

  /**
   * 通过 UUID 加入画室
   * 加载对应画布数据，设置 roomId，并自动开启协同模式
   */
  const joinCollaborativeRoom = useCallback(async (roomIdInput: string): Promise<boolean> => {
    const roomId = roomIdInput.trim();
    if (!roomId) return false;
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const file = await joinRoom(roomId);
      setState(s => ({
        ...s,
        currentFile: file,
        elements: (file.elements || []).map((e: GraphElement) => ({ ...e, selected: false })),
        selectedIds: new Set(),
        history: [file.elements || []],
        historyIndex: 0,
        isLoading: false,
        roomId: file.roomId ?? roomId,
      }));
      return true;
    } catch (e: any) {
      setState(s => ({ ...s, isLoading: false, error: e.message || '加入画室失败' }));
      return false;
    }
  }, []);

  /** 清除画室状态 */
  const clearRoom = useCallback(() => {
    setState(s => ({
      ...s,
      roomId: null,
      currentFile: s.currentFile ? { ...s.currentFile, roomId: undefined } : null,
    }));
  }, []);

  /**
   * 处理远程元素变更消息
   * 根据消息类型对本地元素列表进行操作
   */
  const handleRemoteElementMessage = useCallback((msg: { type: string; payload: Record<string, any> }) => {
    switch (msg.type) {
      case 'ELEMENT_ADD': {
        const el = msg.payload as GraphElement;
        if (el && el.id) {
          setState(s => {
            const newElements = [...s.elements, { ...el, selected: false }];
            const newHistory = s.history.slice(0, s.historyIndex + 1);
            newHistory.push(newElements.map(e => ({ ...e })));
            return {
              ...s,
              elements: newElements,
              history: newHistory.slice(-50),
              historyIndex: Math.min(newHistory.length - 1, 49),
            };
          });
        }
        break;
      }
      case 'ELEMENT_UPDATE': {
        const el = msg.payload as GraphElement;
        if (el && el.id) {
          setState(s => {
            const newElements = s.elements.map(e => e.id === el.id ? { ...el, selected: false } : e);
            const newHistory = s.history.slice(0, s.historyIndex + 1);
            newHistory.push(newElements.map(e => ({ ...e })));
            return {
              ...s,
              elements: newElements,
              history: newHistory.slice(-50),
              historyIndex: Math.min(newHistory.length - 1, 49),
            };
          });
        }
        break;
      }
      case 'ELEMENT_DELETE': {
        const elementId = msg.payload.elementId as string;
        if (elementId) {
          setState(s => {
            const newElements = s.elements.filter(e => e.id !== elementId);
            const newHistory = s.history.slice(0, s.historyIndex + 1);
            newHistory.push(newElements.map(e => ({ ...e })));
            return {
              ...s,
              elements: newElements,
              history: newHistory.slice(-50),
              historyIndex: Math.min(newHistory.length - 1, 49),
            };
          });
        }
        break;
      }
      case 'SYNC_STATE':
        // SYNC_STATE 已经由 onSyncState 单独处理，这里跳过
        break;
    }
  }, []);

  /** 发送本地元素变更到协作者 */
  const broadcastElementAdd = useCallback((el: GraphElement) => {
    if (stateRef.current.collaborationEnabled) {
      wsClient.sendElementAdd(el);
    }
  }, []);

  const broadcastElementUpdate = useCallback((el: GraphElement) => {
    if (stateRef.current.collaborationEnabled) {
      wsClient.sendElementUpdate(el);
    }
  }, []);

  const broadcastElementDelete = useCallback((elementId: string) => {
    if (stateRef.current.collaborationEnabled) {
      wsClient.sendElementDelete(elementId);
    }
  }, []);

  /** 广播光标位置 */
  const broadcastCursorMove = useCallback((x: number, y: number) => {
    if (stateRef.current.collaborationEnabled && stateRef.current.wsConnected) {
      wsClient.sendCursorMove(x, y);
    }
  }, []);

  /** 清理过期光标（5秒未更新则移除） */
  const cleanupStaleCursors = useCallback(() => {
    const now = Date.now();
    setState(s => ({
      ...s,
      collaboratorCursors: s.collaboratorCursors.filter(c => now - c.lastUpdateTime < 5000),
    }));
  }, []);

  return {
    state,
    // 工具
    setActiveTool,
    // 元素操作
    addElement,
    updateElements,
    updateElementSilent,
    updateElementsSilentBatch,
    deleteSelected,
    // 选中
    selectElement,
    selectElements,
    clearSelection,
    // 历史
    undo,
    // 文件
    newFile,
    openFile,
    saveCurrentFile,
    setFileName,
    setCanvasSize,
    setBackgroundColor,
    // 尺寸标注配置
    setDimensionConfig,
    toggleDimensionAnnotations,
    // 工厂
    createTextElement,
    createArcElement,
    createLineElement,
    // 协同绘图
    enableCollaboration,
    disableCollaboration,
    broadcastElementAdd,
    broadcastElementUpdate,
    broadcastElementDelete,
    broadcastCursorMove,
    cleanupStaleCursors,
    // 画室
    createCanvasRoom,
    joinCollaborativeRoom,
    clearRoom,
  };
}
