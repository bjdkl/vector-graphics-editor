import React, {
  useRef, useEffect, useCallback, useState, forwardRef,
  useImperativeHandle
} from 'react';
import { GraphElement, ToolType, Point, CurveElement, LineElement, ArcElement, CollaboratorCursor, DimensionConfig } from '../../types';
import {
  renderAll, hitTest, intersects, snapToGrid,
  exportCanvasToImage, getElementHandlePoints, hitTestHandle, computeElementIntersections
} from '../../engine/renderer';
import {
  translateElement, scaleElement, getGroupBoundingBox
} from '../../engine/transform';

interface CanvasEditorProps {
  elements: GraphElement[];
  selectedIds: Set<string>;
  activeTool: ToolType;
  backgroundColor: string;
  dimensionConfig?: DimensionConfig;
  onSelectionChange: (ids: string[]) => void;
  onElementAdd: (el: GraphElement) => void;
  onElementsUpdate: (updater: (els: GraphElement[]) => GraphElement[]) => void;
  onElementsUpdateSilent: (updater: (els: GraphElement[]) => GraphElement[]) => void;
  // ── 协同绘图 ──
  collaboratorCursors?: CollaboratorCursor[];
  collaborationEnabled?: boolean;
  onBroadcastElementAdd?: (el: GraphElement) => void;
  onBroadcastElementUpdate?: (el: GraphElement) => void;
  onBroadcastElementDelete?: (elementId: string) => void;
  onBroadcastCursorMove?: (x: number, y: number) => void;
}

export interface CanvasEditorRef {
  redraw: () => void;
  getCanvas: () => HTMLCanvasElement | null;
  /** 导出当前画布内容为 PNG（120% 内容区） */
  exportImage: () => Promise<string>;
  /** 重置视图到默认位置和缩放 */
  resetView: () => void;
  /** 获取当前缩放比例 */
  getZoom: () => number;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se' | null;

/** 特征控制点信息（用于线段端点/圆弧圆心等拖拽） */
interface ElementHandleInfo {
  elementId: string;  // 被操作元素
  handleId: string;   // 控制点ID
}

const GRID_SIZE = 20;
const SNAP_THRESHOLD = 8;
const WORLD_SIZE = 20000; // 世界坐标系大小（足够大的虚拟画布）
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>((props, ref) => {
  const {
    elements, selectedIds, activeTool,
    backgroundColor,
    dimensionConfig,
    onSelectionChange, onElementAdd, onElementsUpdate, onElementsUpdateSilent,
    collaboratorCursors = [], collaborationEnabled = false,
    onBroadcastElementAdd, onBroadcastElementUpdate, onBroadcastElementDelete,
    onBroadcastCursorMove,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── 视口状态 ──
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const viewportOffset = useRef({ x: 0, y: 0 }); // 视口左上角在世界坐标中的位置
  const zoom = useRef(1);                          // 当前缩放比例
  const [version, setVersion] = useState(0); // 用于触发重绘

  // ── 协同光标广播节流 ──
  const lastCursorBroadcastTime = useRef(0);

  /** 包装 onElementAdd：本地添加 + 协同广播 */
  const handleElementAddWrapper = useCallback((el: GraphElement) => {
    onElementAdd(el);
    if (collaborationEnabled && onBroadcastElementAdd) {
      onBroadcastElementAdd(el);
    }
  }, [onElementAdd, collaborationEnabled, onBroadcastElementAdd]);

  /** 包装 onElementsUpdate：本地更新 + 协同广播 */
  const handleElementsUpdateWrapper = useCallback((updater: (els: GraphElement[]) => GraphElement[]) => {
    const oldElements = [...elements];
    const newElements = updater(oldElements);
    
    // 找出更新和删除的元素
    const oldIds = new Set(oldElements.map(e => e.id));
    const newIds = new Set(newElements.map(e => e.id));
    
    // 找出删除的元素
    const deletedIds: string[] = [];
    oldIds.forEach(id => {
      if (!newIds.has(id)) {
        deletedIds.push(id);
      }
    });
    
    // 找出更新的元素
    const updatedElements: GraphElement[] = [];
    newElements.forEach(newEl => {
      const oldEl = oldElements.find(e => e.id === newEl.id);
      if (oldEl && JSON.stringify(oldEl) !== JSON.stringify(newEl)) {
        updatedElements.push(newEl);
      }
    });
    
    // 执行本地更新
    onElementsUpdate(() => newElements);
    
    // 广播变更
    if (collaborationEnabled) {
      deletedIds.forEach(id => {
        if (onBroadcastElementDelete) {
          onBroadcastElementDelete(id);
        }
      });
      updatedElements.forEach(el => {
        if (onBroadcastElementUpdate) {
          onBroadcastElementUpdate(el);
        }
      });
    }
  }, [elements, onElementsUpdate, collaborationEnabled, onBroadcastElementUpdate, onBroadcastElementDelete]);

  /** 包装静默更新：mousemove 时使用，不记录历史但广播给协作者 */
  const handleElementsUpdateSilentWrapper = useCallback((updater: (els: GraphElement[]) => GraphElement[]) => {
    const oldElements = [...elements];
    const newElements = updater(oldElements);

    // 执行静默本地更新（不记录历史）
    onElementsUpdateSilent(() => newElements);

    // 广播变更给协作者
    if (collaborationEnabled) {
      const newIds = new Set(newElements.map(e => e.id));
      const oldIds = new Set(oldElements.map(e => e.id));
      oldIds.forEach(id => {
        if (!newIds.has(id) && onBroadcastElementDelete) {
          onBroadcastElementDelete(id);
        }
      });
      newElements.forEach(newEl => {
        const oldEl = oldElements.find(e => e.id === newEl.id);
        if (oldEl && JSON.stringify(oldEl) !== JSON.stringify(newEl) && onBroadcastElementUpdate) {
          onBroadcastElementUpdate(newEl);
        }
      });
    }
  }, [elements, onElementsUpdateSilent, collaborationEnabled, onBroadcastElementUpdate, onBroadcastElementDelete]);

  const redraw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let allElements = elements;

    // 曲线绘制预览（已有逻辑）
    if ((activeTool === 'curve' || activeTool === 'bezier') && curvePoints.current.length > 0) {
      const previewCurve: CurveElement = {
        id: '__preview__',
        type: 'curve',
        zIndex: 9999,
        bezier: activeTool === 'bezier',
        points: curvePoints.current,
        strokeColor: '#1677ff',
        strokeWidth: 2,
        strokeStyle: 'dashed',
      };
      allElements = [...elements, previewCurve];
    }

    // 线段绘制预览（注入伪元素，由 renderAll Layer 8 统一渲染）
    if (activeTool === 'line' && dragStart.current.x !== 0 && linePreviewEnd.current) {
      const previewLine: LineElement = {
        id: '__preview_line__',
        type: 'line',
        zIndex: 9999,
        selected: false,
        x1: dragStart.current.x, y1: dragStart.current.y,
        x2: linePreviewEnd.current.x, y2: linePreviewEnd.current.y,
        strokeColor: '#1677ff',
        strokeWidth: 2,
        strokeStyle: 'dashed',
      };
      allElements = [...allElements, previewLine];
    }

    await renderAll(
      canvas, allElements, viewportOffset.current, selectionBox.current,
      backgroundColor, true, GRID_SIZE, zoom.current, hoveredElementId.current,
      // 圆/圆弧预览状态（动态几何计算，通过参数传入）
      (activeTool === 'arc' || activeTool === 'circle') ? arcDrawPhase.current : 'idle',
      arcCenter.current, arcRadius.current, arcStartPoint.current,
      arcMousePos.current,
      // 尺寸标注配置
      dimensionConfig
    );
  }, [elements, activeTool, backgroundColor, version, dimensionConfig]);

  // 容器尺寸变化 → 更新 canvas 像素尺寸
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { redraw(); }, [redraw, canvasSize]);

  useImperativeHandle(ref, () => ({
    redraw: () => setVersion(v => v + 1),
    getCanvas: () => canvasRef.current,

    /** 导出为 PNG（120% 内容区） */
    exportImage: async () => {
      return exportCanvasToImage(elements, backgroundColor, 1.2);
    },

    /** 重置视图（位置 + 缩放） */
    resetView: () => {
      viewportOffset.current = { x: 0, y: 0 };
      zoom.current = 1;
      setVersion(v => v + 1);
    },

    /** 获取当前缩放比例 */
    getZoom: () => zoom.current,
  }), [elements, backgroundColor]);

  // ── 世界坐标转换（含 zoom）──
  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    // 鼠标屏幕坐标 → canvas 像素坐标 → 世界坐标（除以 zoom 再加偏移）
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;
    return {
      x: sx / zoom.current + viewportOffset.current.x,
      y: sy / zoom.current + viewportOffset.current.y,
    };
  }, []);

  // ── 状态引用 ──
  const isDragging = useRef(false);
  const isPanning = useRef(false);       // 中键平移
  const dragMoved = useRef(false);       // 拖拽过程中是否有实际位移
  const isSelecting = useRef(false);
  const isResizing = useRef<ResizeHandle>(null);
  const isDraggingHandle = useRef<ElementHandleInfo | null>(null); // 特征控制点拖拽
  const isDrawingCurve = useRef(false);
  const isDrawingTextBox = useRef(false);
  /** 圆/圆弧绘制状态：'idle' | 'center_set'(已选圆心) | 'radius_set'(圆弧已选起点) */
  const arcDrawPhase = useRef<'idle' | 'center_set' | 'radius_set'>('idle');
  const arcCenter = useRef<Point>({ x: 0, y: 0 });       // 圆心坐标
  const arcStartPoint = useRef<Point | null>(null);        // 圆弧起点（仅arc用）
  const arcRadius = useRef(0);                              // 当前半径
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const dragLastPos = useRef<Point>({ x: 0, y: 0 });
  const panStart = useRef<Point>({ x: 0, y: 0 });
  const selectionBox = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const curvePoints = useRef<Point[]>([]);
  const textBoxRect = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  /** 鼠标悬停到的元素ID（用于显示特征点预览，不选中） */
  const hoveredElementId = useRef<string | null>(null);
  /** 线段绘制预览终点（dragStart非零时有效，解决鼠标静止时预览消失） */
  const linePreviewEnd = useRef<Point | null>(null);
  /** 圆/圆弧绘制时鼠标位置（解决圆弧预览终点角度追踪） */
  const arcMousePos = useRef<Point | null>(null);

  // 文字输入弹窗
  const [textInput, setTextInput] = useState<{
    visible: boolean;
    x: number; y: number;
    width: number; height: number;
    value: string;
    elementId: string | null;
  }>({ visible: false, x: 0, y: 0, width: 0, height: 0, value: '', elementId: null });

  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // 选中文字时的浮动工具栏
  const [floatingToolbar, setFloatingToolbar] = useState<{
    visible: boolean;
    x: number; y: number;
    elementId: string | null;
  }>({ visible: false, x: 0, y: 0, elementId: null });

  /** 特征点/交点吸附阈值（像素） */
  const SNAP_FEATURE_THRESHOLD = 8;

  const snap = useCallback((pt: Point): Point => {
    // 第1步：网格吸附
    let result = snapToGrid(pt.x, pt.y, GRID_SIZE, SNAP_THRESHOLD);

    // 第2步：特征点吸附（所有元素的控制点）
    let minDist = SNAP_FEATURE_THRESHOLD;
    for (const el of elements) {
      const pts = getElementHandlePoints(el);
      for (const p of pts) {
        const d = Math.sqrt(Math.pow(result.x - p.x, 2) + Math.pow(result.y - p.y, 2));
        if (d < minDist) {
          minDist = d;
          result = { x: p.x, y: p.y };
        }
      }
    }

    // 第3步：交点吸附（线/弧之间的交点）
    const intersections = computeElementIntersections(elements);
    for (const ip of intersections) {
      const d = Math.sqrt(Math.pow(result.x - ip.x, 2) + Math.pow(result.y - ip.y, 2));
      if (d < minDist) {
        minDist = d;
        result = { x: ip.x, y: ip.y };
      }
    }

    return result;
  }, [elements]);

  // ──────────── 滚轮缩放 ────────────
  // 使用原生事件（passive:false）以便 preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      // 鼠标在 canvas 像素坐标中的位置
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      // 鼠标在世界坐标中的位置（缩放前）
      const worldX = mx / zoom.current + viewportOffset.current.x;
      const worldY = my / zoom.current + viewportOffset.current.y;

      // 计算新 zoom（Ctrl+滚轮 / 普通滚轮都触发）
      const delta = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.current * delta));

      // 调整 viewportOffset，使鼠标下方的世界点保持不变
      viewportOffset.current.x = worldX - mx / newZoom;
      viewportOffset.current.y = worldY - my / newZoom;
      zoom.current = newZoom;

      setVersion(v => v + 1);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // ──────────── 键盘事件：Esc 取消圆/圆弧绘制 ────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && arcDrawPhase.current !== 'idle') {
        arcDrawPhase.current = 'idle';
        arcStartPoint.current = null;
        setVersion(v => v + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 切换工具时重置圆/圆弧绘制状态
  useEffect(() => {
    arcDrawPhase.current = 'idle';
    arcStartPoint.current = null;
  }, [activeTool]);

  // ──────────── 检测控制点 ────────────
  const getResizeHandle = useCallback((pt: Point): ResizeHandle => {
    if (selectedIds.size === 0) return null;
    const selected = elements.filter(el => selectedIds.has(el.id));
    const bb = getGroupBoundingBox(selected);
    if (!bb) return null;
    const { x, y, width, height } = bb;
    const handles: Array<{ id: ResizeHandle; hx: number; hy: number }> = [
      { id: 'nw', hx: x - 4, hy: y - 4 },
      { id: 'n', hx: x + width / 2, hy: y - 4 },
      { id: 'ne', hx: x + width + 4, hy: y - 4 },
      { id: 'w', hx: x - 4, hy: y + height / 2 },
      { id: 'e', hx: x + width + 4, hy: y + height / 2 },
      { id: 'sw', hx: x - 4, hy: y + height + 4 },
      { id: 's', hx: x + width / 2, hy: y + height + 4 },
      { id: 'se', hx: x + width + 4, hy: y + height + 4 },
    ];
    for (const h of handles) {
      if (Math.abs(pt.x - h.hx) <= 8 && Math.abs(pt.y - h.hy) <= 8) return h.id;
    }
    return null;
  }, [selectedIds, elements]);

  /** 检测是否点中某个选中元素的特征控制点 */
  const getHitElementHandle = useCallback((pt: Point): ElementHandleInfo | null => {
    // 只在单选时检测特征点
    if (selectedIds.size !== 1) return null;
    const el = elements.find(e => selectedIds.has(e.id));
    if (!el) return null;
    const handleId = hitTestHandle(el, pt.x, pt.y);
    if (handleId) {
      return { elementId: el.id, handleId };
    }
    return null;
  }, [selectedIds, elements]);

  // ──────────── 选中文字时显示浮动工具栏 ────────────
  const showTextFloatingBar = useCallback((elId: string, worldX: number, worldY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    setFloatingToolbar({
      visible: true,
      x: rect.left + (worldX - viewportOffset.current.x) * zoom.current * scaleX,
      y: rect.top + (worldY - viewportOffset.current.y) * zoom.current * scaleY - 44,
      elementId: elId,
    });
  }, []);

  const hideFloatingBar = useCallback(() => {
    setFloatingToolbar(s => ({ ...s, visible: false }));
  }, []);

  // ──────────── 鼠标按下 ────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 中键 → 开始平移
    if (e.button === 1) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button !== 0) return;

    const pt = getCanvasPoint(e);
    const snapped = snap(pt);

    if (activeTool === 'select') {
      // 1. 优先检测特征控制点（线段端点、圆心、象限点等）
      const elHandle = getHitElementHandle(snapped);
      if (elHandle) {
        isDraggingHandle.current = elHandle;
        dragStart.current = snapped;
        dragLastPos.current = snapped;
        dragMoved.current = false;
        return;
      }

      // 2. 再检测通用包围盒缩放控制点
      const handle = getResizeHandle(snapped);
      if (handle) {
        isResizing.current = handle;
        dragStart.current = snapped;
        dragLastPos.current = snapped;
        dragMoved.current = false;
        return;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d') ?? undefined;
      const clicked = [...elements].reverse().find(el => hitTest(el, snapped.x, snapped.y, ctx));

      if (clicked) {
        const multi = e.shiftKey || e.metaKey || e.ctrlKey;
        if (!selectedIds.has(clicked.id)) {
          onSelectionChange(multi ? [...Array.from(selectedIds), clicked.id] : [clicked.id]);
        }
        if (clicked.type === 'text') {
          showTextFloatingBar(clicked.id, snapped.x, snapped.y);
        } else {
          hideFloatingBar();
        }
        isDragging.current = true;
        dragStart.current = snapped;
        dragLastPos.current = snapped;
        dragMoved.current = false;
      } else {
        if (!e.shiftKey) {
          onSelectionChange([]);
          hideFloatingBar();
        }
        isSelecting.current = true;
        dragStart.current = snapped;
        selectionBox.current = { x: snapped.x, y: snapped.y, width: 0, height: 0 };
      }
      return;
    }

    if (activeTool === 'text') {
      isDrawingTextBox.current = true;
      dragStart.current = snapped;
      textBoxRect.current = { x: snapped.x, y: snapped.y, width: 0, height: 0 };
      return;
    }

    if (activeTool === 'curve' || activeTool === 'bezier') {
      if (!isDrawingCurve.current) {
        isDrawingCurve.current = true;
        curvePoints.current = [snapped];
      } else {
        curvePoints.current.push(snapped);
      }
      setVersion(v => v + 1);
      return;
    }

    // ── 圆/圆弧：点击式绘制 ──
    if (activeTool === 'circle' || activeTool === 'arc') {
      const phase = arcDrawPhase.current;
      if (phase === 'idle') {
        // 第1次点击 → 选圆心
        arcDrawPhase.current = 'center_set';
        arcCenter.current = snapped;
        arcRadius.current = 0;
        arcStartPoint.current = null;
      } else if (phase === 'center_set') {
        // 第2次点击 → 选半径点（圆完成）/ 选起点（圆弧进入下一步）
        const r = Math.sqrt(
          Math.pow(snapped.x - arcCenter.current.x, 2) +
          Math.pow(snapped.y - arcCenter.current.y, 2)
        );
        if (r > 3) {
          arcRadius.current = r;
          if (activeTool === 'circle') {
            // 圆：两步完成，直接创建元素
            handleElementAddWrapper({
              id: `el-${Date.now()}`,
              type: 'arc',
              zIndex: elements.length,
              selected: false,
              cx: arcCenter.current.x,
              cy: arcCenter.current.y,
              radius: r,
              startAngle: 0,
              endAngle: 360,
              anticlockwise: false,
              strokeColor: '#000000',
              strokeWidth: 2,
              strokeStyle: 'solid',
            });
            // 重置状态
            arcDrawPhase.current = 'idle';
            arcStartPoint.current = null;
            arcMousePos.current = null;
          } else {
            // 圆弧：记录起点，进入第3步
            arcDrawPhase.current = 'radius_set';
            arcStartPoint.current = { ...snapped };
          }
        }
      } else if (phase === 'radius_set') {
        // 第3次点击（仅圆弧）→ 选终点，创建圆弧
        const cx = arcCenter.current.x;
        const cy = arcCenter.current.y;
        const startPt = arcStartPoint.current!;
        // 计算起始角度和结束角度
        const startAngle = Math.atan2(startPt.y - cy, startPt.x - cx) * 180 / Math.PI;
        const endAngle = Math.atan2(snapped.y - cy, snapped.x - cx) * 180 / Math.PI;
        handleElementAddWrapper({
          id: `el-${Date.now()}`,
          type: 'arc',
          zIndex: elements.length,
          selected: false,
          cx, cy,
          radius: arcRadius.current,
          startAngle,
          endAngle,
          anticlockwise: false,
          strokeColor: '#000000',
          strokeWidth: 2,
          strokeStyle: 'solid',
        });
        // 重置状态
        arcDrawPhase.current = 'idle';
        arcStartPoint.current = null;
        arcMousePos.current = null;
      }
      setVersion(v => v + 1);
      return;
    }

    dragStart.current = snapped;
  }, [activeTool, elements, selectedIds, getResizeHandle, getHitElementHandle, getCanvasPoint, snap,
      onSelectionChange, showTextFloatingBar, hideFloatingBar]);

  // ──────────── 鼠标移动 ────────────
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // 中键平移
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      panStart.current = { x: e.clientX, y: e.clientY };
      const canvas = canvasRef.current;
      if (canvas) {
        const scaleX = canvas.width / canvas.clientWidth;
        const scaleY = canvas.height / canvas.clientHeight;
        // 平移量要除以 zoom，才能在世界坐标系中正确移动
        viewportOffset.current.x -= dx * scaleX / zoom.current;
        viewportOffset.current.y -= dy * scaleY / zoom.current;
        setVersion(v => v + 1);
      }
      return;
    }

    const pt = getCanvasPoint(e);
    const snapped = snap(pt);

    // 特征控制点拖拽（线段端点、圆心、圆上象限点等）
    if (isDraggingHandle.current && selectedIds.size > 0) {
      const dx = snapped.x - dragLastPos.current.x;
      const dy = snapped.y - dragLastPos.current.y;
      dragLastPos.current = snapped;
      dragMoved.current = true;

      const { elementId, handleId } = isDraggingHandle.current;

      handleElementsUpdateSilentWrapper(els => {
        return els.map(el => {
          if (el.id !== elementId) return el;

          // 线段端点拖拽
          if (el.type === 'line') {
            const l = el as LineElement;
            if (handleId === 'p1') return { ...l, x1: snapped.x, y1: snapped.y };
            if (handleId === 'p2') return { ...l, x2: snapped.x, y2: snapped.y };
            // 中点拖拽 → 平移整条线
            return translateElement(el, dx, dy);
          }

          // 圆弧特征点拖拽
          if (el.type === 'arc') {
            const a = el as ArcElement;
            if (handleId === 'center') {
              // 圆心移动 → 整体平移
              const cdx = snapped.x - a.cx;
              const cdy = snapped.y - a.cy;
              return {
                ...a,
                cx: a.cx + cdx,
                cy: a.cy + cdy,
              };
            }
            // 弧端点拖拽 → 调整对应角度（保持半径不变）
            if (handleId === 'arc-start' || handleId === 'arc-end') {
              const newAngleDeg = Math.atan2(snapped.y - a.cy, snapped.x - a.cx) * 180 / Math.PI;
              if (handleId === 'arc-start') {
                return { ...a, startAngle: newAngleDeg };
              } else {
                return { ...a, endAngle: newAngleDeg };
              }
            }
            // 象限点拖拽 → 修改半径
            const newR = Math.sqrt(
              Math.pow(snapped.x - a.cx, 2) + Math.pow(snapped.y - a.cy, 2)
            );
            if (newR > 1) return { ...a, radius: newR };
            return el;
          }

          // 曲线控制点拖拽
          if (el.type === 'curve' && handleId.startsWith('cp-')) {
            const idx = parseInt(handleId.replace('cp-', ''), 10);
            const c = el as CurveElement;
            const newPoints = [...c.points];
            if (idx >= 0 && idx < newPoints.length) {
              newPoints[idx] = { x: snapped.x, y: snapped.y };
            }
            return { ...c, points: newPoints };
          }

          // 文字/图片角点 → 缩放
          return translateElement(el, dx, dy);
        });
      });
      setVersion(v => v + 1);
      return;
    }

    if (isDragging.current && selectedIds.size > 0) {
      const dx = snapped.x - dragLastPos.current.x;
      const dy = snapped.y - dragLastPos.current.y;
      dragLastPos.current = snapped;
      dragMoved.current = true;
      handleElementsUpdateSilentWrapper(els =>
        els.map(el => selectedIds.has(el.id) ? translateElement(el, dx, dy) : el)
      );
      if (floatingToolbar.visible) {
        const canvas = canvasRef.current;
        if (canvas) {
          const scaleX = canvas.clientWidth / canvas.width;
          const scaleY = canvas.clientHeight / canvas.height;
          setFloatingToolbar(s => ({
            ...s,
            x: s.x + dx * zoom.current * scaleX,
            y: s.y + dy * zoom.current * scaleY,
          }));
        }
      }
    } else if (isSelecting.current && selectionBox.current) {
      selectionBox.current = {
        x: dragStart.current.x,
        y: dragStart.current.y,
        width: snapped.x - dragStart.current.x,
        height: snapped.y - dragStart.current.y,
      };
      setVersion(v => v + 1);
    } else if (isResizing.current && selectedIds.size > 0) {
      const handle = isResizing.current;
      const selected = elements.filter(el => selectedIds.has(el.id));
      const bb = getGroupBoundingBox(selected);
      if (!bb) return;
      const dx = snapped.x - dragLastPos.current.x;
      const dy = snapped.y - dragLastPos.current.y;
      dragLastPos.current = snapped;
      dragMoved.current = true;

      let scaleX = 1, scaleY = 1, originX = bb.x, originY = bb.y;
      if (bb.width > 0 && bb.height > 0) {
        if (handle.includes('e')) { scaleX = (bb.width + dx) / bb.width; }
        if (handle.includes('s')) { scaleY = (bb.height + dy) / bb.height; }
        if (handle.includes('w')) { scaleX = (bb.width - dx) / bb.width; originX = bb.x + bb.width; }
        if (handle.includes('n')) { scaleY = (bb.height - dy) / bb.height; originY = bb.y + bb.height; }
      }
      scaleX = Math.max(0.05, scaleX);
      scaleY = Math.max(0.05, scaleY);
      handleElementsUpdateSilentWrapper(els =>
        els.map(el => selectedIds.has(el.id) ? scaleElement(el, scaleX, scaleY, originX, originY) : el)
      );
    } else if (isDrawingTextBox.current && textBoxRect.current) {
      textBoxRect.current = {
        x: dragStart.current.x,
        y: dragStart.current.y,
        width: snapped.x - dragStart.current.x,
        height: snapped.y - dragStart.current.y,
      };
      setVersion(v => v + 1);
    } else if (isDrawingCurve.current && curvePoints.current.length > 0) {
      curvePoints.current = [...curvePoints.current.slice(0, -1), snapped];
      setVersion(v => v + 1);
    } else if ((activeTool === 'arc' || activeTool === 'circle') && arcDrawPhase.current !== 'idle') {
      // 圆/圆弧预览：只更新状态 + 记录鼠标位置，由 redraw 统一渲染
      arcMousePos.current = { x: snapped.x, y: snapped.y };
      if (arcDrawPhase.current === 'center_set') {
        // 更新半径（圆心到鼠标距离）
        const dx = snapped.x - arcCenter.current.x;
        const dy = snapped.y - arcCenter.current.y;
        arcRadius.current = Math.sqrt(dx * dx + dy * dy);
      }
      setVersion(v => v + 1);
    } else if (dragStart.current.x !== 0 && activeTool === 'line') {
      // 线段拖拽预览：记录终点，由 redraw 统一渲染
      linePreviewEnd.current = { x: snapped.x, y: snapped.y };
      setVersion(v => v + 1);
    } else {
      // ── 空闲状态：检测鼠标悬停的元素（用于显示特征点预览） ──
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d') ?? undefined;
      const hovered = [...elements].reverse().find(el => hitTest(el, pt.x, pt.y, ctx));
      const newHoveredId = hovered?.id ?? null;
      if (hoveredElementId.current !== newHoveredId) {
        hoveredElementId.current = newHoveredId;
        setVersion(v => v + 1);
      }
    }

    // ── 协同：广播光标位置（节流 100ms） ──
    if (collaborationEnabled && onBroadcastCursorMove) {
      const now = Date.now();
      if (!lastCursorBroadcastTime.current || now - lastCursorBroadcastTime.current > 100) {
        lastCursorBroadcastTime.current = now;
        onBroadcastCursorMove(snapped.x, snapped.y);
      }
    }
  }, [activeTool, elements, selectedIds, onElementsUpdate, getCanvasPoint, snap,
      floatingToolbar, collaborationEnabled, onBroadcastCursorMove, handleElementsUpdateSilentWrapper]);

  // ──────────── 鼠标释放 ────────────
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    const pt = getCanvasPoint(e);
    const snapped = snap(pt);

    if (isDragging.current) {
      isDragging.current = false;
      // 拖拽结束：仅在确实有位移时记录历史
      if (dragMoved.current) {
        onElementsUpdate(els => els.map(e => ({ ...e })));
        dragMoved.current = false;
      }
      return;
    }

    // 特征控制点拖拽结束
    if (isDraggingHandle.current) {
      isDraggingHandle.current = null;
      // 控制点拖拽结束：仅在确实有位移时记录历史
      if (dragMoved.current) {
        onElementsUpdate(els => els.map(e => ({ ...e })));
        dragMoved.current = false;
      }
      return;
    }

    if (isSelecting.current && selectionBox.current) {
      isSelecting.current = false;
      const { x, y, width, height } = selectionBox.current;
      const nx = width < 0 ? x + width : x;
      const ny = height < 0 ? y + height : y;
      const nw = Math.abs(width);
      const nh = Math.abs(height);

      if (nw > 4 || nh > 4) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d') ?? undefined;
        const inBox = elements.filter(el => intersects(el, nx, ny, nw, nh, ctx)).map(el => el.id);
        onSelectionChange(inBox);
      }
      selectionBox.current = null;
      setVersion(v => v + 1);
      return;
    }

    if (isResizing.current) {
      isResizing.current = null;
      // 缩放结束：仅在确实有位移时记录历史
      if (dragMoved.current) {
        onElementsUpdate(els => els.map(e => ({ ...e })));
        dragMoved.current = false;
      }
      return;
    }

    if (isDrawingTextBox.current && textBoxRect.current) {
      isDrawingTextBox.current = false;
      const r = textBoxRect.current;
      const nx = r.width < 0 ? r.x + r.width : r.x;
      const ny = r.height < 0 ? r.y + r.height : r.y;
      const nw = Math.abs(r.width);
      const nh = Math.abs(r.height);
      if (nw > 10 || nh > 10) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / canvas.width;
        const scaleY = rect.height / canvas.height;
        const offX = viewportOffset.current.x;
        const offY = viewportOffset.current.y;
        setTextInput({
          visible: true,
          x: rect.left + (nx - offX) * zoom.current * scaleX,
          y: rect.top + (ny - offY) * zoom.current * scaleY,
          width: Math.max(nw * zoom.current * scaleX, 120),
          height: Math.max(nh * zoom.current * scaleY, 40),
          value: '',
          elementId: null,
        });
      }
      textBoxRect.current = null;
      setVersion(v => v + 1);
      return;
    }

    if (isDrawingCurve.current && curvePoints.current.length >= 2) {
      if (curvePoints.current.length >= 2) {
        const last = curvePoints.current[curvePoints.current.length - 1];
        const dist = Math.sqrt(Math.pow(snapped.x - last.x, 2) + Math.pow(snapped.y - last.y, 2));
        if (dist > 5) {
          curvePoints.current.push(snapped);
        }
      }
    }

    if (dragStart.current.x !== 0 && activeTool === 'line') {
      // 线段：保持拖拽释放创建（两步拖拽）
      const dx = snapped.x - dragStart.current.x;
      const dy = snapped.y - dragStart.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        handleElementAddWrapper({
          id: `el-${Date.now()}`,
          type: 'line',
          zIndex: elements.length,
          selected: false,
          x1: dragStart.current.x, y1: dragStart.current.y,
          x2: snapped.x, y2: snapped.y,
          strokeColor: '#000000',
          strokeWidth: 2,
          strokeStyle: 'solid',
        });
      }
      dragStart.current = { x: 0, y: 0 };
      linePreviewEnd.current = null;
      setVersion(v => v + 1);
      return;
    }
  }, [activeTool, elements, onElementAdd, onElementsUpdate, onSelectionChange, getCanvasPoint, snap]);

  // ──────────── 右键结束曲线 / 取消圆弧绘制 ────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // 圆/圆弧绘制中 → 取消
    if (arcDrawPhase.current !== 'idle') {
      arcDrawPhase.current = 'idle';
      arcStartPoint.current = null;
      arcMousePos.current = null;
      setVersion(v => v + 1);
      return;
    }
    if (isDrawingCurve.current && curvePoints.current.length >= 2) {
      const curve: CurveElement = {
        id: `el-${Date.now()}`,
        type: 'curve',
        zIndex: elements.length,
        selected: false,
        points: curvePoints.current.map(p => ({ ...p })),
        bezier: activeTool === 'bezier',
        strokeColor: '#000000',
        strokeWidth: 2,
        strokeStyle: 'solid',
      };
      handleElementAddWrapper(curve);
      curvePoints.current = [];
      isDrawingCurve.current = false;
      setVersion(v => v + 1);
    }
  }, [activeTool, elements, onElementAdd]);

  // ──────────── 双击结束曲线 ────────────
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const pt = getCanvasPoint(e);

    if (isDrawingCurve.current && curvePoints.current.length >= 2) {
      const curve: CurveElement = {
        id: `el-${Date.now()}`,
        type: 'curve',
        zIndex: elements.length,
        selected: false,
        points: curvePoints.current.map(p => ({ ...p })),
        bezier: activeTool === 'bezier',
        strokeColor: '#000000',
        strokeWidth: 2,
        strokeStyle: 'solid',
      };
      handleElementAddWrapper(curve);
      curvePoints.current = [];
      isDrawingCurve.current = false;
      setVersion(v => v + 1);
      return;
    }

    if (activeTool === 'select') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d') ?? undefined;
      const clicked = [...elements].reverse().find(el =>
        el.type === 'text' && hitTest(el, pt.x, pt.y, ctx)
      );
      if (clicked && clicked.type === 'text') {
        const rect = canvas!.getBoundingClientRect();
        const scaleX = rect.width / canvas!.width;
        const scaleY = rect.height / canvas!.height;
        const offX = viewportOffset.current.x;
        const offY = viewportOffset.current.y;
        const txt = clicked as any;
        setTextInput({
          visible: true,
          x: rect.left + (txt.x - offX) * zoom.current * scaleX,
          y: rect.top + (txt.y - offY) * zoom.current * scaleY,
          width: Math.max((txt.width || 150) * zoom.current * scaleX, 120),
          height: Math.max((txt.height || 40) * zoom.current * scaleY, 40),
          value: txt.text || '',
          elementId: clicked.id,
        });
      }
    }
  }, [activeTool, elements, getCanvasPoint, onElementAdd]);

  // ──────────── 提交文字 ────────────
  const commitText = useCallback(() => {
    if (!textInput.visible) return;
    const { value, elementId, x, y, width, height } = textInput;
    if (!value.trim()) {
      setTextInput(s => ({ ...s, visible: false }));
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const offX = viewportOffset.current.x;
    const offY = viewportOffset.current.y;
    const cx = (x - rect.left) * scaleX + offX;
    const cy = (y - rect.top) * scaleY + offY;
    const w = width * scaleX;
    const h = height * scaleY;

    if (elementId) {
      handleElementsUpdateWrapper(els =>
        els.map(el => el.id === elementId
          ? { ...el, text: value, width: w, height: h } as any
          : el)
      );
    } else {
      handleElementAddWrapper({
        id: `el-${Date.now()}`,
        type: 'text',
        zIndex: elements.length,
        selected: false,
        text: value,
        x: cx, y: cy,
        width: w,
        height: h,
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#000000',
        fontStyle: 'normal',
      });
    }
    setTextInput(s => ({ ...s, visible: false }));
  }, [textInput, elements, onElementAdd, onElementsUpdate]);

  const handleTextStyleChange = useCallback((style: string) => {
    if (!floatingToolbar.elementId) return;
    handleElementsUpdateWrapper(els =>
      els.map(el => el.id === floatingToolbar.elementId
        ? { ...el, fontStyle: style } as any
        : el)
    );
  }, [floatingToolbar.elementId, handleElementsUpdateWrapper]);

  const handleTextColorChange = useCallback((color: string) => {
    if (!floatingToolbar.elementId) return;
    handleElementsUpdateWrapper(els =>
      els.map(el => el.id === floatingToolbar.elementId
        ? { ...el, color } as any
        : el)
    );
  }, [floatingToolbar.elementId, handleElementsUpdateWrapper]);

  const handleTextFontSizeChange = useCallback((size: number) => {
    if (!floatingToolbar.elementId) return;
    handleElementsUpdateWrapper(els =>
      els.map(el => el.id === floatingToolbar.elementId
        ? { ...el, fontSize: size } as any
        : el)
    );
  }, [floatingToolbar.elementId, handleElementsUpdateWrapper]);

  const getCursor = () => {
    if (isPanning.current) return 'grabbing';
    if (activeTool === 'select') return 'default';
    return 'crosshair';
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'block', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 主画布 */}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        style={{
          cursor: getCursor(),
          display: 'block',
          width: '100%',
          height: '100%',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />

      {/* 文字输入弹窗 */}
      {textInput.visible && (
        <textarea
          ref={textInputRef}
          autoFocus
          value={textInput.value}
          placeholder="请输入文字..."
          onChange={e => setTextInput(s => ({ ...s, value: e.target.value }))}
          onBlur={commitText}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitText();
            }
            if (e.key === 'Escape') {
              setTextInput(s => ({ ...s, visible: false }));
            }
          }}
          style={{
            position: 'fixed',
            left: textInput.x,
            top: textInput.y,
            width: textInput.width,
            height: textInput.height,
            fontSize: 16,
            padding: '4px 6px',
            border: '2px solid #1677ff',
            borderRadius: 3,
            background: 'rgba(255,255,255,0.98)',
            outline: 'none',
            resize: 'both',
            zIndex: 100,
            fontFamily: 'Arial',
          }}
        />
      )}

      {/* 选中文字时的浮动格式工具栏 */}
      {floatingToolbar.visible && (
        <div
          style={{
            position: 'fixed',
            left: floatingToolbar.x,
            top: floatingToolbar.y,
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            background: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            padding: '4px 8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 200,
            fontSize: 13,
          }}
        >
          <button title="普通" onClick={() => handleTextStyleChange('normal')}
            style={{ padding: '2px 6px', cursor: 'pointer', fontWeight: 'normal', fontStyle: 'normal' }}>常规</button>
          <button title="加粗" onClick={() => handleTextStyleChange('bold')}
            style={{ padding: '2px 6px', cursor: 'pointer', fontWeight: 'bold', fontStyle: 'normal' }}>B</button>
          <button title="斜体" onClick={() => handleTextStyleChange('italic')}
            style={{ padding: '2px 6px', cursor: 'pointer', fontWeight: 'normal', fontStyle: 'italic' }}>I</button>
          <button title="加粗斜体" onClick={() => handleTextStyleChange('bold-italic')}
            style={{ padding: '2px 6px', cursor: 'pointer', fontWeight: 'bold', fontStyle: 'italic' }}>B+I</button>
          <span style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />
          <select onChange={e => handleTextFontSizeChange(Number(e.target.value))} style={{ cursor: 'pointer', padding: '2px 4px' }}>
            {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map(s => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
          <span style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />
          <input type="color" title="文字颜色" defaultValue="#000000"
            onChange={e => handleTextColorChange(e.target.value)}
            style={{ width: 24, height: 24, cursor: 'pointer', border: 'none', padding: 0 }} />
          <button title="关闭" onClick={hideFloatingBar}
            style={{ marginLeft: 4, cursor: 'pointer', border: 'none', background: 'none', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* 曲线绘制提示 */}
      {isDrawingCurve.current && curvePoints.current.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          padding: '4px 12px',
          borderRadius: 4,
          fontSize: 12,
          pointerEvents: 'none',
          zIndex: 100,
        }}>
          点击添加点 · 双击/右键完成
        </div>
      )}

      {/* 圆/圆弧绘制提示 */}
      {(activeTool === 'circle' || activeTool === 'arc') && arcDrawPhase.current !== 'idle' && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          padding: '4px 12px',
          borderRadius: 4,
          fontSize: 12,
          pointerEvents: 'none',
          zIndex: 100,
        }}>
          {arcDrawPhase.current === 'center_set'
            ? (activeTool === 'circle'
                ? '已选圆心 · 点击确定半径（Esc 取消）'
                : '已选圆心 · 点击确定起点与半径（Esc 取消）')
            : '已选起点 · 点击确定终点（Esc 取消）'}
        </div>
      )}

      {/* 画布边界指示（世界坐标系范围） */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: 8,
        background: 'rgba(0,0,0,0.5)',
        color: '#aaa',
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 3,
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ fontFamily: 'monospace' }}>
          {Math.round(zoom.current * 100)}%
        </span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span style={{ fontFamily: 'monospace' }}>
          {Math.round(viewportOffset.current.x)},{Math.round(viewportOffset.current.y)}
        </span>
        {' · '}
        <button
          onClick={() => { viewportOffset.current = { x: 0, y: 0 }; zoom.current = 1; setVersion(v => v + 1); }}
          style={{ background: 'none', border: 'none', color: '#8ab4f8', cursor: 'pointer', fontSize: 11, padding: 0, pointerEvents: 'all' }}
          title="重置视图到原点"
        >重置</button>
      </div>

      {/* ── 协作者光标显示层 ── */}
      {collaborationEnabled && collaboratorCursors.length > 0 && collaboratorCursors.map(cursor => {
        // 将世界坐标转为屏幕坐标
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const scaleX = canvas.clientWidth / canvasSize.w;
        const scaleY = canvas.clientHeight / canvasSize.h;
        const screenX = (cursor.x - viewportOffset.current.x) * zoom.current * scaleX;
        const screenY = (cursor.y - viewportOffset.current.y) * zoom.current * scaleY;
        // 超出视口范围不渲染
        if (screenX < -20 || screenY < -20 || screenX > canvas.clientWidth + 20 || screenY > canvas.clientHeight + 20) return null;
        return (
          <div
            key={`cursor-${cursor.userId}`}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              pointerEvents: 'none',
              zIndex: 300,
              transition: 'left 0.15s ease-out, top 0.15s ease-out',
            }}
          >
            {/* 光标箭头 */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill={cursor.color}>
              <path d="M0 0 L16 12 L8 12 L4 18 L5 11 L0 9 Z" />
            </svg>
            {/* 用户名标签 */}
            <span style={{
              position: 'absolute',
              left: 14,
              top: 2,
              fontSize: 11,
              color: '#fff',
              background: cursor.color,
              padding: '1px 6px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
              fontFamily: 'Arial, sans-serif',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}>
              {cursor.username}
            </span>
          </div>
        );
      })}
    </div>
  );
});

export default CanvasEditor;
