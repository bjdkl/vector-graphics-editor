/**
 * Canvas 绘图引擎
 * 负责将所有图形元素绘制到 Canvas 上
 * 支持视口偏移（实现无限画布效果）
 */
import {
  GraphElement, TextElement,
  ArcElement, LineElement, CurveElement, StrokeStyle
} from '../types';

/** ──────────────── 网格背景 ──────────────── */

/** 绘制点格背景（支持视口偏移 + 缩放）*/
export function drawDotGrid(
  ctx: CanvasRenderingContext2D,
  viewportW: number,
  viewportH: number,
  offsetX: number,
  offsetY: number,
  gridSize = 20,
  dotRadius = 1.2,
  dotColor = '#c0c0c0',
  zoom = 1
) {
  ctx.save();
  ctx.fillStyle = dotColor;

  // 缩放后的显示网格间距（在屏幕像素里）
  const displayGrid = gridSize * zoom;

  // 屏幕上网格起始位置（对应世界坐标原点在屏幕上的偏移取模）
  const startX = -(offsetX * zoom % displayGrid);
  const startY = -(offsetY * zoom % displayGrid);

  // 点太密则跳过，避免渲染卡顿
  if (displayGrid < 6) {
    ctx.restore();
    return;
  }

  // 点缩小/放大时同步缩放半径
  const r = Math.max(0.5, dotRadius * Math.min(zoom, 1.5));

  for (let sx = startX; sx <= viewportW; sx += displayGrid) {
    for (let sy = startY; sy <= viewportH; sy += displayGrid) {
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** ──────────────── 辅助函数 ──────────────── */

/** 吸附点到最近的网格点 */
export function snapToGrid(x: number, y: number, gridSize = 20, threshold = 8): { x: number; y: number } {
  const gx = Math.round(x / gridSize) * gridSize;
  const gy = Math.round(y / gridSize) * gridSize;
  const dx = Math.abs(x - gx);
  const dy = Math.abs(y - gy);
  return {
    x: dx <= threshold ? gx : x,
    y: dy <= threshold ? gy : y,
  };
}

/** 设置画笔线型（lineDash 也需要除以 zoom 保持屏幕尺寸不变）*/
function applyStrokeStyle(ctx: CanvasRenderingContext2D, style: StrokeStyle, screenWidth: number) {
  switch (style) {
    case 'dashed':
      ctx.setLineDash([screenWidth * 4, screenWidth * 2]);
      break;
    case 'dotted':
      ctx.setLineDash([screenWidth, screenWidth * 2]);
      break;
    default:
      ctx.setLineDash([]);
  }
}

/** 绘制文字元素 */
function drawText(ctx: CanvasRenderingContext2D, el: TextElement) {
  ctx.save();
  let fontStr = '';
  if (el.fontStyle === 'bold' || el.fontStyle === 'bold-italic') fontStr += 'bold ';
  if (el.fontStyle === 'italic' || el.fontStyle === 'bold-italic') fontStr += 'italic ';
  fontStr += `${el.fontSize}px ${el.fontFamily || 'Arial'}`;
  ctx.font = fontStr;
  ctx.fillStyle = el.color || '#000000';
  ctx.textBaseline = 'top';

  const lines = (el.text || '').split('\n');
  const lineHeight = el.fontSize * 1.3;
  lines.forEach((line, i) => {
    ctx.fillText(line, el.x, el.y + i * lineHeight);
  });
  ctx.restore();
}

/** 绘制圆弧/圆元素 */
function drawArc(ctx: CanvasRenderingContext2D, el: ArcElement, zoom = 1) {
  ctx.save();
  const startRad = (el.startAngle * Math.PI) / 180;
  const endRad = (el.endAngle * Math.PI) / 180;
  ctx.beginPath();
  ctx.arc(el.cx, el.cy, el.radius, startRad, endRad, el.anticlockwise);
  if (el.fillColor) {
    ctx.fillStyle = el.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = el.strokeColor || '#000000';
  // 线宽除以 zoom，使屏幕上线宽固定不随缩放变化
  const sw = (el.strokeWidth || 1) / zoom;
  ctx.lineWidth = sw;
  applyStrokeStyle(ctx, el.strokeStyle || 'solid', sw);
  ctx.stroke();
  ctx.restore();
}

/** 绘制线段元素 */
function drawLine(ctx: CanvasRenderingContext2D, el: LineElement, zoom = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(el.x1, el.y1);
  ctx.lineTo(el.x2, el.y2);
  ctx.strokeStyle = el.strokeColor || '#000000';
  // 线宽除以 zoom，使屏幕上线宽固定不随缩放变化
  const sw = (el.strokeWidth || 1) / zoom;
  ctx.lineWidth = sw;
  applyStrokeStyle(ctx, el.strokeStyle || 'solid', sw);
  ctx.stroke();
  ctx.restore();
}

/** 绘制曲线/折线元素 */
function drawCurve(ctx: CanvasRenderingContext2D, el: CurveElement, zoom = 1) {
  if (el.points.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(el.points[0].x, el.points[0].y);

  if (el.bezier && el.points.length >= 4) {
    for (let i = 1; i + 2 < el.points.length; i += 3) {
      const p1 = el.points[i];
      const p2 = el.points[i + 1];
      const p3 = el.points[i + 2];
      ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    }
    if (el.points.length % 3 !== 1) {
      const last = el.points[el.points.length - 1];
      const secondLast = el.points[el.points.length - 2];
      ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
    }
  } else if (el.closed) {
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.points[i].x, el.points[i].y);
    }
    ctx.closePath();
  } else {
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.points[i].x, el.points[i].y);
    }
  }

  if (el.fillColor && el.closed) {
    ctx.fillStyle = el.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = el.strokeColor || '#000000';
  // 线宽除以 zoom，使屏幕上线宽固定不随缩放变化
  const sw = (el.strokeWidth || 2) / zoom;
  ctx.lineWidth = sw;
  applyStrokeStyle(ctx, el.strokeStyle || 'solid', sw);
  ctx.stroke();
  ctx.restore();
}

/** ──────────────── 选中相关 ──────────────── */

/**
 * 获取元素的特征控制点（世界坐标）
 * 用于替代通用的包围盒选择框
 */
export function getElementHandlePoints(el: GraphElement): Array<{
  id: string;       // 唯一标识
  x: number; y: number;
  type: 'endpoint' | 'center' | 'quadrant' | 'control' | 'corner';
}> {
  switch (el.type) {
    case 'line': {
      const l = el as LineElement;
      const mx = (l.x1 + l.x2) / 2;
      const my = (l.y1 + l.y2) / 2;
      return [
        { id: 'p1', x: l.x1, y: l.y1, type: 'endpoint' },   // 起点
        { id: 'p2', x: l.x2, y: l.y2, type: 'endpoint' },   // 终点
        { id: 'mid', x: mx, y: my, type: 'control' },        // 中点
      ];
    }
    case 'arc': {
      const a = el as ArcElement;
      // 圆弧起止角度（弧度）
      const startRad = (a.startAngle * Math.PI) / 180;
      const endRad = (a.endAngle * Math.PI) / 180;
      // 弧的两端点
      const sx = a.cx + a.radius * Math.cos(startRad);
      const sy = a.cy + a.radius * Math.sin(startRad);
      const ex = a.cx + a.radius * Math.cos(endRad);
      const ey = a.cy + a.radius * Math.sin(endRad);
      return [
        { id: 'center', x: a.cx, y: a.cy, type: 'center' },             // 圆心
        { id: 'arc-start', x: sx, y: sy, type: 'endpoint' },            // 弧起点
        { id: 'arc-end', x: ex, y: ey, type: 'endpoint' },              // 弧终点
        { id: 'top', x: a.cx, y: a.cy - a.radius, type: 'quadrant' },   // 上
        { id: 'right', x: a.cx + a.radius, y: a.cy, type: 'quadrant' }, // 右
        { id: 'bottom', x: a.cx, y: a.cy + a.radius, type: 'quadrant' },// 下
        { id: 'left', x: a.cx - a.radius, y: a.cy, type: 'quadrant' }, // 左
      ];
    }
    case 'curve': {
      const c = el as CurveElement;
      return c.points.map((p, i) => ({
        id: `cp-${i}`,
        x: p.x,
        y: p.y,
        type: 'control' as const,
      }));
    }
    case 'text': {
      const t = el as TextElement;
      return [
        { id: 'nw', x: t.x, y: t.y, type: 'corner' },
        { id: 'ne', x: t.x + (t.width || 100), y: t.y, type: 'corner' },
        { id: 'sw', x: t.x, y: t.y + (t.height || 30), type: 'corner' },
        { id: 'se', x: t.x + (t.width || 100), y: t.y + (t.height || 30), type: 'corner' },
      ];
    }
    default:
      return [];
  }
}

/** 控制点半径（世界坐标） */
const HANDLE_R = 4.5;

/** 绘制选中元素的辅助线（不含控制点，独立层） */
export function drawElementGuidelines(
  ctx: CanvasRenderingContext2D,
  el: GraphElement,
  zoom = 1
) {
  ctx.save();

  // 线段：两端点之间的连线指示（虚线）
  if (el.type === 'line') {
    const l = el as LineElement;
    ctx.setLineDash([4 / zoom, 3 / zoom]);
    ctx.strokeStyle = 'rgba(22, 119, 255, 0.25)';
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
  }

  // 圆弧：圆心到各特征点的辅助线（淡色）
  if (el.type === 'arc') {
    const a = el as ArcElement;
    const startRad = (a.startAngle * Math.PI) / 180;
    const endRad = (a.endAngle * Math.PI) / 180;
    const sx = a.cx + a.radius * Math.cos(startRad);
    const sy = a.cy + a.radius * Math.sin(startRad);
    const ex = a.cx + a.radius * Math.cos(endRad);
    const ey = a.cy + a.radius * Math.sin(endRad);

    ctx.setLineDash([3 / zoom, 3 / zoom]);
    ctx.strokeStyle = 'rgba(255, 77, 79, 0.15)';
    ctx.lineWidth = 1 / zoom;

    // 圆心 → 弧起点
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    // 圆心 → 弧终点
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // 圆心 → 四象限点（更淡）
    ctx.strokeStyle = 'rgba(255, 77, 79, 0.08)';
    ['top', 'right', 'bottom', 'left'].forEach(dir => {
      const dx = dir === 'right' ? a.radius : dir === 'left' ? -a.radius : 0;
      const dy = dir === 'bottom' ? a.radius : dir === 'top' ? -a.radius : 0;
      ctx.beginPath();
      ctx.moveTo(a.cx, a.cy);
      ctx.lineTo(a.cx + dx, a.cy + dy);
      ctx.stroke();
    });
  }

  // 文字：淡虚线边框
  if (el.type === 'text') {
    const bb = getBoundingBox(el);
    ctx.setLineDash([4 / zoom, 3 / zoom]);
    ctx.strokeStyle = 'rgba(22, 119, 255, 0.35)';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(bb.x - 2 / zoom, bb.y - 2 / zoom, bb.width + 4 / zoom, bb.height + 4 / zoom);
  }

  ctx.restore();
}

/** 绘制元素特征控制点圆点（不含辅助线，独立层） */
export function drawElementHandlesOnly(
  ctx: CanvasRenderingContext2D,
  el: GraphElement,
  zoom = 1
) {
  const points = getElementHandlePoints(el);
  if (points.length === 0) return;

  ctx.save();

  for (const pt of points) {
    const r = HANDLE_R / zoom;

    // 根据类型决定样式
    switch (pt.type) {
      case 'endpoint':
        ctx.fillStyle = '#1677ff';     // 端点：实心蓝
        ctx.strokeStyle = '#0958d9';
        break;
      case 'center':
        ctx.fillStyle = '#ff4d4f';     // 圆心：实心红（十字形）
        ctx.strokeStyle = '#cf1322';
        break;
      case 'quadrant':
        ctx.fillStyle = '#52c41a';     // 圆上象限点：实心绿
        ctx.strokeStyle = '#389e0d';
        break;
      case 'control':
        ctx.fillStyle = '#faad14';     // 中点/控制点：实心橙
        ctx.strokeStyle = '#d48806';
        break;
      case 'corner':
        ctx.fillStyle = '#ffffff';     // 角点：白底蓝框（文字/图片保留）
        ctx.strokeStyle = '#1677ff';
        break;
    }

    // 圆心用十字标记
    if (pt.type === 'center') {
      const cr = r * 1.6; // 十字臂长
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      ctx.moveTo(pt.x - cr, pt.y);
      ctx.lineTo(pt.x + cr, pt.y);
      ctx.moveTo(pt.x, pt.y - cr);
      ctx.lineTo(pt.x, pt.y + cr);
      ctx.stroke();
      // 中心小圆点
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 普通控制点：圆点
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      if (pt.type === 'corner') {
        ctx.fill(); // 白底
        ctx.stroke();
      } else {
        ctx.fill();
        // 外圈细边
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r + 0.5 / zoom, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 0.5 / zoom;
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/** 兼容接口：同时绘制辅助线 + 控制点（供非分层场景使用） */
export function drawElementHandles(
  ctx: CanvasRenderingContext2D,
  el: GraphElement,
  zoom = 1
) {
  drawElementGuidelines(ctx, el, zoom);
  drawElementHandlesOnly(ctx, el, zoom);
}

/** 测试点击是否命中某个特征控制点 */
export function hitTestHandle(
  el: GraphElement,
  px: number, py: number,
  threshold = 8
): string | null {
  const points = getElementHandlePoints(el);
  for (const pt of points) {
    if (Math.abs(px - pt.x) <= threshold && Math.abs(py - pt.y) <= threshold) {
      return pt.id;
    }
  }
  return null;
}

/** 绘制选中控制点（通用包围盒——保留用于多选场景） */
export function drawSelectionHandle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  zoom = 1
) {
  ctx.save();
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 3 / zoom]);
  ctx.strokeRect(x - 4 / zoom, y - 4 / zoom, w + 8 / zoom, h + 8 / zoom);

  const hs = 4 / zoom;
  const handles = [
    [x - hs, y - hs], [x + w / 2, y - hs], [x + w + hs, y - hs],
    [x - hs, y + h / 2], [x + w + hs, y + h / 2],
    [x - hs, y + h + hs], [x + w / 2, y + h + hs], [x + w + hs, y + h + hs],
  ];
  ctx.setLineDash([]);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 1.5 / zoom;
  const hw = 8 / zoom;
  for (const [hx, hy] of handles) {
    ctx.beginPath();
    ctx.rect(hx - hw / 2, hy - hw / 2, hw, hw);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** 绘制框选矩形 */
export function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  zoom = 1
) {
  ctx.save();
  ctx.strokeStyle = '#1677ff';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([5 / zoom, 3 / zoom]);
  ctx.fillStyle = 'rgba(22, 119, 255, 0.06)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/** ──────────────── 包围盒计算 ──────────────── */

/** 获取元素包围盒 */
export function getBoundingBox(
  el: GraphElement,
  ctx?: CanvasRenderingContext2D
): { x: number; y: number; width: number; height: number } {
  switch (el.type) {
    case 'text': {
      const t = el as TextElement;
      let w = t.width || (t.fontSize * t.text.length * 0.55);
      if (ctx && t.text) {
        ctx.save();
        let fontStr = '';
        if (t.fontStyle === 'bold' || t.fontStyle === 'bold-italic') fontStr += 'bold ';
        if (t.fontStyle === 'italic' || t.fontStyle === 'bold-italic') fontStr += 'italic ';
        fontStr += `${t.fontSize}px ${t.fontFamily || 'Arial'}`;
        ctx.font = fontStr;
        const lines = t.text.split('\n');
        w = Math.max(...lines.map(l => ctx.measureText(l).width));
        ctx.restore();
      }
      const lineH = t.fontSize * 1.3;
      const h = (t.text.split('\n').length) * lineH;
      return { x: t.x, y: t.y, width: w, height: h };
    }
    case 'arc': {
      const a = el as ArcElement;
      return { x: a.cx - a.radius, y: a.cy - a.radius, width: a.radius * 2, height: a.radius * 2 };
    }
    case 'line': {
      const l = el as LineElement;
      return {
        x: Math.min(l.x1, l.x2),
        y: Math.min(l.y1, l.y2),
        width: Math.abs(l.x2 - l.x1) || 1,
        height: Math.abs(l.y2 - l.y1) || 1,
      };
    }
    case 'curve': {
      const c = el as CurveElement;
      if (c.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
      const xs = c.points.map(p => p.x);
      const ys = c.points.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) - minX || 1,
        height: Math.max(...ys) - minY || 1,
      };
    }
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}

/** 点到线段的最短距离（世界坐标） */
function pointToSegmentDist(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearX = x1 + t * dx;
  const nearY = y1 + t * dy;
  return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
}

/** 角度归一化到 [0, 360) */
function normalizeAngle(deg: number): number {
  deg = deg % 360;
  if (deg < 0) deg += 360;
  return deg;
}

/** 判断角度是否在弧的起止范围内（考虑跨 0°） */
function angleInRange(angleDeg: number, startDeg: number, endDeg: number): boolean {
  let a = normalizeAngle(angleDeg);
  let s = normalizeAngle(startDeg);
  let e = normalizeAngle(endDeg);
  if (e <= s) e += 360; // 跨 0° 处理
  if (a < s) a += 360;
  return a >= s && a <= e;
}

/** 点到圆弧曲线的最短距离（世界坐标） */
function pointToArcDist(
  px: number, py: number,
  cx: number, cy: number, r: number,
  startDeg: number, endDeg: number
): number {
  // 到圆心的距离
  const dx = px - cx;
  const dy = py - cy;
  const d = Math.sqrt(dx * dx + dy * dy);

  // 端点距离（兜底）
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const sx = cx + r * Math.cos(startRad);
  const sy = cy + r * Math.sin(startRad);
  const ex = cx + r * Math.cos(endRad);
  const ey = cy + r * Math.sin(endRad);
  const dStart = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
  const dEnd = Math.sqrt((px - ex) ** 2 + (py - ey) ** 2);

  // 如果点几乎在圆上，判断角度是否在范围内
  if (Math.abs(d - r) < Math.max(dStart, dEnd)) {
    const ptAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angleInRange(ptAngle, startDeg, endDeg)) {
      return Math.abs(d - r); // 到圆弧曲线的垂直距离
    }
  }

  // 不在圆弧范围内 → 返回到端点的最近距离
  return Math.min(dStart, dEnd);
}

/** 点是否在元素上（精确线上命中测试） */
export function hitTest(el: GraphElement, px: number, py: number,
  ctx?: CanvasRenderingContext2D): boolean {
  const threshold = 6; // 命中阈值（世界坐标像素）

  switch (el.type) {
    case 'line': {
      const l = el as LineElement;
      return pointToSegmentDist(px, py, l.x1, l.y1, l.x2, l.y2) <= threshold;
    }
    case 'arc': {
      const a = el as ArcElement;
      // 圆（完整360°）：用圆周距离
      if (Math.abs(a.endAngle - a.startAngle) >= 359.9 ||
        (a.startAngle === 0 && a.endAngle === 360)) {
        const d = Math.sqrt((px - a.cx) ** 2 + (py - a.cy) ** 2);
        return Math.abs(d - a.radius) <= threshold;
      }
      // 弧：用精确弧距
      return pointToArcDist(px, py, a.cx, a.cy, a.radius, a.startAngle, a.endAngle) <= threshold;
    }
    case 'curve': {
      const c = el as CurveElement;
      if (c.points.length < 2) return false;
      let minDist = Infinity;
      for (let i = 0; i < c.points.length - 1; i++) {
        const d = pointToSegmentDist(
          px, py,
          c.points[i].x, c.points[i].y,
          c.points[i + 1].x, c.points[i + 1].y
        );
        if (d < minDist) minDist = d;
      }
      return minDist <= threshold;
    }
    case 'text': {
      // 文字保持包围盒测试（区域型元素）
      const bb = getBoundingBox(el, ctx);
      return px >= bb.x && px <= bb.x + bb.width
        && py >= bb.y && py <= bb.y + bb.height;
    }
    default:
      return false;
  }
}

/** 元素是否与矩形相交 */
export function intersects(
  el: GraphElement,
  rx: number, ry: number, rw: number, rh: number,
  ctx?: CanvasRenderingContext2D
): boolean {
  const bb = getBoundingBox(el, ctx);
  return !(
    bb.x + bb.width < rx ||
    bb.x > rx + rw ||
    bb.y + bb.height < ry ||
    bb.y > ry + rh
  );
}

// ──────────── 交点计算 ───────────—

/** 线段与线段的交点（返回 null 或交点坐标） */
function lineLineIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { x: number; y: number } | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-9) return null; // 平行或共线
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  // 参数范围 [0,1] 表示在线段上
  if (t >= -0.001 && t <= 1.001 && u >= -0.001 && u <= 1.001) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }
  return null;
}

/** 线段与圆的交点（最多2个） */
function lineCircleIntersections(
  x1: number, y1: number, x2: number, y2: number,
  cx: number, cy: number, r: number
): Array<{ x: number; y: number }> {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0 || Math.abs(a) < 1e-9) return [];

  const sqrtD = Math.sqrt(discriminant);
  const results: Array<{ x: number; y: number }> = [];
  for (const sign of [-1, 1]) {
    const t = (-b + sign * sqrtD) / (2 * a);
    if (t >= -0.001 && t <= 1.001) {
      results.push({ x: x1 + t * dx, y: y1 + t * dy });
    }
  }
  return results;
}

/** 两圆的交点（最多2个） */
function circleCircleIntersections(
  c1x: number, c1y: number, r1: number,
  c2x: number, c2y: number, r2: number
): Array<{ x: number; y: number }> {
  const dx = c2x - c1x;
  const dy = c2y - c1y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > r1 + r2 + 1e-6 || d < Math.abs(r1 - r2) - 1e-6 || d < 1e-9) return [];

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hSq = r1 * r1 - a * a;
  if (hSq < 0) return [];
  const h = Math.sqrt(hSq);

  const px = c1x + a * dx / d;
  const py = c1y + a * dy / d;

  const results: Array<{ x: number; y: number }> = [
    { x: px + h * dy / d, y: py - h * dx / d },
    { x: px - h * dy / d, y: py + h * dx / d },
  ];
  return results;
}

/** 计算所有线/弧元素两两之间的交点 */
export function computeElementIntersections(
  elements: GraphElement[]
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const linesAndArcs = elements.filter(el => el.type === 'line' || el.type === 'arc');

  for (let i = 0; i < linesAndArcs.length; i++) {
    for (let j = i + 1; j < linesAndArcs.length; j++) {
      const e1 = linesAndArcs[i];
      const e2 = linesAndArcs[j];
      let rawPts: Array<{ x: number; y: number }>;

      if (e1.type === 'line' && e2.type === 'line') {
        const l1 = e1 as LineElement;
        const l2 = e2 as LineElement;
        const hit = lineLineIntersection(l1.x1, l1.y1, l1.x2, l1.y2, l2.x1, l2.y1, l2.x2, l2.y2);
        rawPts = hit ? [hit] : [];
      } else if (e1.type === 'line' && e2.type === 'arc') {
        const l = e1 as LineElement;
        const a = e2 as ArcElement;
        rawPts = lineCircleIntersections(l.x1, l.y1, l.x2, l.y2, a.cx, a.cy, a.radius)
          .filter(p => angleInRange(Math.atan2(p.y - a.cy, p.x - a.cx) * 180 / Math.PI, a.startAngle, a.endAngle));
      } else if (e1.type === 'arc' && e2.type === 'line') {
        const a = e1 as ArcElement;
        const l = e2 as LineElement;
        rawPts = lineCircleIntersections(l.x1, l.y1, l.x2, l.y2, a.cx, a.cy, a.radius)
          .filter(p => angleInRange(Math.atan2(p.y - a.cy, p.x - a.cx) * 180 / Math.PI, a.startAngle, a.endAngle));
      } else {
        // arc × arc
        const a1 = e1 as ArcElement;
        const a2 = e2 as ArcElement;
        rawPts = circleCircleIntersections(a1.cx, a1.cy, a1.radius, a2.cx, a2.cy, a2.radius)
          .filter(p =>
            angleInRange(Math.atan2(p.y - a1.cy, p.x - a1.cx) * 180 / Math.PI, a1.startAngle, a1.endAngle) &&
            angleInRange(Math.atan2(p.y - a2.cy, p.x - a2.cx) * 180 / Math.PI, a2.startAngle, a2.endAngle)
          );
      }

      // 去重（避免同一位置重复）
      for (const rp of rawPts) {
        const dup = pts.find(ep => Math.abs(ep.x - rp.x) < 0.5 && Math.abs(ep.y - rp.y) < 0.5);
        if (!dup) pts.push(rp);
      }
    }
  }
  return pts;
}

/** ──────────────── 尺寸标注系统 ──────────────── */

/** 标注配置 */
interface DimensionConfig {
  showDimensions: boolean;
  annotationColor: string;
  annotationFontSize: number;
  annotationBgColor: string;
}

/** 计算线段长度 */
function calculateLineLength(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 计算两点之间的角度（弧度） */
function calculateAngle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** 格式化弧度为度（°） */
function formatAngle(rad: number): string {
  const deg = (rad * 180) / Math.PI;
  const normalized = deg >= 0 ? deg : deg + 360;
  return `${Math.round(normalized * 100) / 100}°`;
}

/** 格式化距离 */
function formatDistance(d: number): string {
  return `${Math.round(d * 100) / 100}`;
}

/** 计算曲线的总长度 */
function calculateCurveLength(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateLineLength(
      points[i].x, points[i].y,
      points[i + 1].x, points[i + 1].y
    );
  }
  return total;
}

/** 绘制引线（带端点装饰） */
function drawLeaderLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  zoom: number
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([]);

  // 绘制引线
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 绘制端点标记（斜线装饰）
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const markerSize = 6 / zoom;

  // 起点的垂直短线
  const perpAngle1 = angle + Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(x1 + markerSize * Math.cos(perpAngle1), y1 + markerSize * Math.sin(perpAngle1));
  ctx.lineTo(x1 - markerSize * Math.cos(perpAngle1), y1 - markerSize * Math.sin(perpAngle1));
  ctx.stroke();

  ctx.restore();
}

/** 绘制尺寸标注文字框 */
function drawAnnotationBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string,
  color: string,
  bgColor: string,
  zoom: number
) {
  ctx.save();
  ctx.font = `${11 / zoom}px "Consolas", "Monaco", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const padding = 4 / zoom;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = 14 / zoom;

  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2;

  // 绘制背景框（带圆角效果）
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 / zoom;

  const radius = 3 / zoom;
  ctx.beginPath();
  ctx.moveTo(x - boxWidth / 2 + radius, y - boxHeight / 2);
  ctx.lineTo(x + boxWidth / 2 - radius, y - boxHeight / 2);
  ctx.quadraticCurveTo(x + boxWidth / 2, y - boxHeight / 2, x + boxWidth / 2, y - boxHeight / 2 + radius);
  ctx.lineTo(x + boxWidth / 2, y + boxHeight / 2 - radius);
  ctx.quadraticCurveTo(x + boxWidth / 2, y + boxHeight / 2, x + boxWidth / 2 - radius, y + boxHeight / 2);
  ctx.lineTo(x - boxWidth / 2 + radius, y + boxHeight / 2);
  ctx.quadraticCurveTo(x - boxWidth / 2, y + boxHeight / 2, x - boxWidth / 2, y + boxHeight / 2 - radius);
  ctx.lineTo(x - boxWidth / 2, y - boxHeight / 2 + radius);
  ctx.quadraticCurveTo(x - boxWidth / 2, y - boxHeight / 2, x - boxWidth / 2 + radius, y - boxHeight / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 绘制文字
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  ctx.restore();
}

/** 绘制线段尺寸标注 */
function drawLineDimension(
  ctx: CanvasRenderingContext2D,
  el: LineElement,
  config: DimensionConfig,
  zoom: number
) {
  const length = calculateLineLength(el.x1, el.y1, el.x2, el.y2);
  if (length < 1) return;

  const angle = calculateAngle(el.x1, el.y1, el.x2, el.y2);
  const midX = (el.x1 + el.x2) / 2;
  const midY = (el.y1 + el.y2) / 2;

  // 计算标注位置（在选中框外侧偏移一定距离）
  const offset = 25 / zoom;
  const perpAngle = angle + Math.PI / 2;
  const offsetX = Math.cos(perpAngle) * offset;
  const offsetY = Math.sin(perpAngle) * offset;

  const annotX = midX + offsetX;
  const annotY = midY + offsetY;

  // 绘制引线
  drawLeaderLine(ctx, midX, midY, annotX, annotY, config.annotationColor, zoom);

  // 绘制尺寸文字
  const sizeText = formatDistance(length);
  drawAnnotationBox(ctx, annotX, annotY, sizeText, config.annotationColor, config.annotationBgColor, zoom);

  // 绘制角度标注（在起点附近）
  const angleOffset = 35 / zoom;
  const angleAnnotX = el.x1 + Math.cos(angle) * angleOffset;
  const angleAnnotY = el.y1 + Math.sin(angle) * angleOffset;

  // 引线指向起点
  drawLeaderLine(ctx, el.x1, el.y1, angleAnnotX, angleAnnotY, config.annotationColor, zoom);

  // 角度文字
  const angleText = formatAngle(angle);
  drawAnnotationBox(ctx, angleAnnotX, angleAnnotY, angleText, config.annotationColor, config.annotationBgColor, zoom);
}

/** 绘制圆弧/圆尺寸标注 */
function drawArcDimension(
  ctx: CanvasRenderingContext2D,
  el: ArcElement,
  config: DimensionConfig,
  zoom: number
) {
  // 半径标注
  const radiusOffset = el.radius + 20 / zoom;
  const annotX = el.cx + radiusOffset;
  const annotY = el.cy;

  drawLeaderLine(ctx, el.cx + el.radius * 0.7, el.cy, annotX, annotY, config.annotationColor, zoom);
  drawAnnotationBox(ctx, annotX, annotY, `r=${formatDistance(el.radius)}`, config.annotationColor, config.annotationBgColor, zoom);

  // 直径标注（在另一侧）
  const diaOffset = el.radius + 35 / zoom;
  const diaAnnotX = el.cx - diaOffset;
  const diaAnnotY = el.cy - diaOffset;

  drawLeaderLine(ctx, el.cx - el.radius * 0.7, el.cy - el.radius * 0.7, diaAnnotX, diaAnnotY, config.annotationColor, zoom);
  drawAnnotationBox(ctx, diaAnnotX, diaAnnotY, `D=${formatDistance(el.radius * 2)}`, config.annotationColor, config.annotationBgColor, zoom);

  // 角度范围标注（对于非完整圆）
  if (Math.abs(el.endAngle - el.startAngle) < 359.9) {
    // 在弧中点位置显示角度范围
    const midAngle = ((el.startAngle + el.endAngle) / 2) * Math.PI / 180;
    const arcMidX = el.cx + el.radius * Math.cos(midAngle);
    const arcMidY = el.cy + el.radius * Math.sin(midAngle);

    const arcAnnotX = arcMidX + Math.cos(midAngle) * 25 / zoom;
    const arcAnnotY = arcMidY + Math.sin(midAngle) * 25 / zoom;

    // 计算角度范围
    const angleRange = Math.abs(el.endAngle - el.startAngle);

    drawLeaderLine(ctx, arcMidX, arcMidY, arcAnnotX, arcAnnotY, config.annotationColor, zoom);
    drawAnnotationBox(ctx, arcAnnotX, arcAnnotY, `${el.startAngle.toFixed(1)}°~${el.endAngle.toFixed(1)}° (${angleRange.toFixed(1)}°)`, config.annotationColor, config.annotationBgColor, zoom);
  }
}

/** 绘制矩形（文字/图片）尺寸标注 */
function drawRectDimension(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, height: number,
  config: DimensionConfig,
  zoom: number
) {
  // 宽度标注（在元素上方）
  const widthAnnotX = x + width / 2;
  const widthAnnotY = y - 20 / zoom;

  drawLeaderLine(ctx, x + width / 2, y, widthAnnotX, widthAnnotY, config.annotationColor, zoom);
  drawAnnotationBox(ctx, widthAnnotX, widthAnnotY, `W=${formatDistance(width)}`, config.annotationColor, config.annotationBgColor, zoom);

  // 高度标注（在元素左侧）
  const heightAnnotX = x - 20 / zoom;
  const heightAnnotY = y + height / 2;

  drawLeaderLine(ctx, x, y + height / 2, heightAnnotX, heightAnnotY, config.annotationColor, zoom);
  drawAnnotationBox(ctx, heightAnnotX, heightAnnotY, `H=${formatDistance(height)}`, config.annotationColor, config.annotationBgColor, zoom);
}

/** 绘制曲线尺寸标注 */
function drawCurveDimension(
  ctx: CanvasRenderingContext2D,
  el: CurveElement,
  config: DimensionConfig,
  zoom: number
) {
  if (el.points.length < 2) return;

  const length = calculateCurveLength(el.points);
  if (length < 1) return;

  // 计算曲线包围盒中心
  const xs = el.points.map(p => p.x);
  const ys = el.points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // 在包围盒上方标注总长度
  const annotX = centerX;
  const annotY = minY - 20 / zoom;

  drawLeaderLine(ctx, centerX, minY, annotX, annotY, config.annotationColor, zoom);

  const typeText = el.bezier ? '贝塞尔' : '折线';
  drawAnnotationBox(ctx, annotX, annotY, `${typeText} L=${formatDistance(length)}`, config.annotationColor, config.annotationBgColor, zoom);

  // 标注点数
  const countAnnotX = maxX + 30 / zoom;
  const countAnnotY = centerY;
  drawLeaderLine(ctx, maxX, centerY, countAnnotX, countAnnotY, config.annotationColor, zoom);
  drawAnnotationBox(ctx, countAnnotX, countAnnotY, `点数=${el.points.length}`, config.annotationColor, config.annotationBgColor, zoom);
}

/** 绘制尺寸标注 */
export function drawDimensionAnnotations(
  ctx: CanvasRenderingContext2D,
  el: GraphElement,
  config: {
    enabled: boolean;
    showAllElements: boolean;
    color: string;
    fontSize: number;
    bgColor: string;
    showDistance: boolean;
    showAngle: boolean;
    showDimensions: boolean;
  },
  zoom = 1,
  isSelected = false
) {
  if (!config.enabled) return;
  if (!config.showAllElements && !isSelected) return;

  // 标注配置
  const dimensionConfig: DimensionConfig = {
    showDimensions: config.showDimensions,
    annotationColor: config.color,
    annotationFontSize: config.fontSize,
    annotationBgColor: config.bgColor,
  };

  switch (el.type) {
    case 'line': {
      const l = el as LineElement;
      if (config.showDistance) {
        drawLineDimension(ctx, l, dimensionConfig, zoom);
      }
      break;
    }
    case 'arc': {
      const a = el as ArcElement;
      if (config.showDistance) {
        drawArcDimension(ctx, a, dimensionConfig, zoom);
      }
      break;
    }
    case 'text': {
      const t = el as TextElement;
      if (config.showDimensions) {
        drawRectDimension(ctx, t.x, t.y, t.width || 100, t.height || 30, dimensionConfig, zoom);
      }
      break;
    }
    case 'curve': {
      const c = el as CurveElement;
      if (config.showDistance) {
        drawCurveDimension(ctx, c, dimensionConfig, zoom);
      }
      break;
    }
  }
}

/** 绘制交点标记 */
export function drawIntersectionPoints(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  zoom = 1
) {
  if (points.length === 0) return;
  ctx.save();
  ctx.fillStyle = '#555555';
  for (const pt of points) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3 / zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** ──────────────── 主渲染函数 ──────────────── */

/**
 * 主绘制函数（支持视口偏移 + 缩放 + 悬停预览 + 绘制预览）
 * @param canvas 画布元素
 * @param elements 图形元素列表
 * @param viewportOffset 视口左上角在世界坐标中的偏移
 * @param selectionRect 框选矩形（世界坐标）
 * @param bgColor 背景色
 * @param showGrid 是否显示点格
 * @param gridSize 点格间距
 * @param zoom 缩放比例（默认 1.0）
 * @param hoveredElementId 鼠标悬停的元素ID（用于显示半透明特征点预览）
 * @param linePreviewEnd 线段绘制预览终点（dragStart→此点，解决鼠标静止时预览消失）
 * @param arcPhase 圆/圆弧绘制阶段：'idle' | 'center_set' | 'radius_set'
 * @param arcCenterPt 圆心坐标
 * @param arcRadiusVal 当前半径
 * @arcStartPt 圆弧起点（仅 arc 模式 radius_set 阶段有效）
 * @param dimensionConfig 尺寸标注配置
 */
export async function renderAll(
  canvas: HTMLCanvasElement,
  elements: GraphElement[],
  viewportOffset: { x: number; y: number },
  selectionRect?: { x: number; y: number; width: number; height: number } | null,
  bgColor = '#ffffff',
  showGrid = true,
  gridSize = 20,
  zoom = 1,
  hoveredElementId?: string | null,
  arcPhase?: string,
  arcCenterPt?: { x: number; y: number },
  arcRadiusVal?: number,
  arcStartPt?: { x: number; y: number } | null,
  arcMousePosPt?: { x: number; y: number } | null,
  dimensionConfig?: {
    enabled: boolean;
    showAllElements: boolean;
    color: string;
    fontSize: number;
    bgColor: string;
    showDistance: boolean;
    showAngle: boolean;
    showDimensions: boolean;
  }
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { x: offX, y: offY } = viewportOffset;

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 点格在屏幕坐标系中绘制，传入 zoom 以便调整间距
  if (showGrid) {
    drawDotGrid(ctx, canvas.width, canvas.height, offX, offY, gridSize, 1.2, '#c0c0c0', zoom);
  }

  // 应用视口变换：先缩放，再偏移（以画布左上角为缩放中心已转换到世界坐标）
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-offX, -offY);

  // 按 zIndex 排序
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  // ── 第3层：绘制所有元素本体 ──
  for (const el of sorted) {
    switch (el.type) {
      case 'text':
        drawText(ctx, el as TextElement);
        break;
      case 'arc':
        drawArc(ctx, el as ArcElement, zoom);
        break;
      case 'line':
        drawLine(ctx, el as LineElement, zoom);
        break;
      case 'curve':
        drawCurve(ctx, el as CurveElement, zoom);
        break;
    }
  }

  // ── 第4层：交点标记（线/弧相交处） ──
  const intersections = computeElementIntersections(sorted);
  drawIntersectionPoints(ctx, intersections, zoom);

  // ── 第5层：选中元素的辅助线（统一绘制） ──
  for (const el of sorted) {
    if (el.selected) {
      drawElementGuidelines(ctx, el, zoom);
    }
  }

  // ── 第6层：选中元素的特征控制点（统一绘制，在辅助线之上） ──
  for (const el of sorted) {
    if (el.selected) {
      drawElementHandlesOnly(ctx, el, zoom);
    }
  }

  // ── 第10层：尺寸标注（距离和角度） ──
  if (dimensionConfig) {
    for (const el of sorted) {
      if (dimensionConfig.showAllElements || el.selected) {
        drawDimensionAnnotations(ctx, el, dimensionConfig, zoom, el.selected);
      }
    }
  }

  // ── 第6.5层：悬停元素的半透明特征控制点预览（未选中时显示） ──
  if (hoveredElementId) {
    const hovered = sorted.find(el => el.id === hoveredElementId);
    if (hovered && !hovered.selected) {
      ctx.globalAlpha = 0.5;
      drawElementGuidelines(ctx, hovered, zoom);
      drawElementHandlesOnly(ctx, hovered, zoom);
      ctx.globalAlpha = 1;
    }
  }

  // 多选时绘制通用包围框
  const selectedEls = sorted.filter(el => el.selected);
  if (selectedEls.length > 1) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of selectedEls) {
      const bb = getBoundingBox(el, ctx);
      minX = Math.min(minX, bb.x);
      minY = Math.min(minY, bb.y);
      maxX = Math.max(maxX, bb.x + bb.width);
      maxY = Math.max(maxY, bb.y + bb.height);
    }
    drawSelectionHandle(ctx, minX, minY, maxX - minX, maxY - minY, zoom);
  }

  // 绘制框选矩形
  if (selectionRect && (Math.abs(selectionRect.width) > 2 || Math.abs(selectionRect.height) > 2)) {
    const { x, y, width, height } = selectionRect;
    drawSelectionBox(
      ctx,
      width < 0 ? x + width : x,
      height < 0 ? y + height : y,
      Math.abs(width),
      Math.abs(height),
      zoom
    );
  }

  // ── 第8层：线段绘制预览（通过 __preview_line__ 伪元素渲染，鼠标静止不消失） ──
  {
    const previewLine = elements.find(el => el.id === '__preview_line__');
    if (previewLine) {
      const pl = previewLine as LineElement;
      ctx.strokeStyle = '#1677ff';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 3 / zoom]);
      ctx.beginPath();
      ctx.moveTo(pl.x1, pl.y1);
      ctx.lineTo(pl.x2, pl.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── 第9层：圆/圆弧点击式绘制预览（鼠标静止不消失） ──
  if (arcPhase && arcPhase !== 'idle' && arcCenterPt) {
    const cx = arcCenterPt.x;
    const cy = arcCenterPt.y;

    ctx.strokeStyle = '#1677ff';
    ctx.lineWidth = 2 / zoom;

    if (arcPhase === 'center_set') {
      // 已选圆心：显示圆心十字 + 到鼠标位置的半径预览圆
      const r = arcRadiusVal || 0;
      // 圆心十字标记
      ctx.save();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cx - 6 / zoom, cy);
      ctx.lineTo(cx + 6 / zoom, cy);
      ctx.moveTo(cx, cy - 6 / zoom);
      ctx.lineTo(cx, cy + 6 / zoom);
      ctx.stroke();
      // 预览圆（虚线）
      if (r > 3) {
        ctx.setLineDash([5 / zoom, 3 / zoom]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // 半径标注
        ctx.fillStyle = '#1677ff';
        ctx.font = `${12 / zoom}px monospace`;
        ctx.fillText(`r=${Math.round(r)}`, cx + r / 2, cy - 6 / zoom);
      }
      ctx.restore();
    } else if (arcPhase === 'radius_set') {
      const r = arcRadiusVal || 0;
      const sp = arcStartPt;
      if (sp && r > 0) {
        const startAngle = Math.atan2(sp.y - cy, sp.x - cx);
        // 用鼠标位置计算终点角度
        let endAngle = startAngle + Math.PI; // 默认半圆
        if (arcMousePosPt) {
          endAngle = Math.atan2(arcMousePosPt.y - cy, arcMousePosPt.x - cx);
        }

        ctx.setLineDash([5 / zoom, 3 / zoom]);
        // 淡色完整圆（参考）
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // 圆心→起点连线
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sp.x, sp.y);
        ctx.stroke();
        // 预览弧（粗虚线，从起点到鼠标方向）
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([5 / zoom, 3 / zoom]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle, false);
        ctx.stroke();
        // 终点半径线
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([3 / zoom, 2 / zoom]);
        const ex = cx + r * Math.cos(endAngle);
        const ey = cy + r * Math.sin(endAngle);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}

/**
 * 导出画布内容为图片（用于保存）
 * @param elements 图形元素列表
 * @param bgColor 背景色
 * @param paddingScale 内边距倍率（默认1.2 = 120%）
 * @returns Base64 编码的 PNG 图片数据
 */
export async function exportCanvasToImage(
  elements: GraphElement[],
  bgColor = '#ffffff',
  paddingScale = 1.2
): Promise<string> {
  if (elements.length === 0) {
    // 无元素时返回空白画布
    const c = document.createElement('canvas');
    c.width = 400; c.height = 300;
    return c.toDataURL('image/png');
  }

  // 计算所有元素的包围盒
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const bb = getBoundingBox(el);
    minX = Math.min(minX, bb.x);
    minY = Math.min(minY, bb.y);
    maxX = Math.max(maxX, bb.x + bb.width);
    maxY = Math.max(maxY, bb.y + bb.height);
  }

  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const padX = contentW * (paddingScale - 1) / 2;
  const padY = contentH * (paddingScale - 1) / 2;

  const exportW = Math.max(1, contentW * paddingScale);
  const exportH = Math.max(1, contentH * paddingScale);
  const exportOffX = minX - padX;
  const exportOffY = minY - padY;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(exportW);
  canvas.height = Math.ceil(exportH);
  const ctx = canvas.getContext('2d')!;

  // 填充背景
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 将世界坐标系偏移，使内容居中于导出画布
  ctx.save();
  ctx.translate(-exportOffX, -exportOffY);

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  for (const el of sorted) {
    switch (el.type) {
      case 'text': drawText(ctx, el as TextElement); break;
      case 'arc': drawArc(ctx, el as ArcElement); break;
      case 'line': drawLine(ctx, el as LineElement); break;
      case 'curve': drawCurve(ctx, el as CurveElement); break;
    }
  }
  ctx.restore();

  return canvas.toDataURL('image/png');
}
