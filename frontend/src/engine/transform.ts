/**
 * 变换工具：缩放、平移图形元素
 */
import {
  GraphElement, TextElement,
  ArcElement, LineElement, CurveElement
} from '../types';

/**
 * 缩放图形元素
 */
export function scaleElement(
  el: GraphElement,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number
): GraphElement {
  switch (el.type) {
    case 'text': {
      const t = { ...el } as TextElement;
      t.x = originX + (t.x - originX) * scaleX;
      t.y = originY + (t.y - originY) * scaleY;
      t.fontSize = Math.max(4, t.fontSize * ((scaleX + scaleY) / 2));
      t.width = Math.max(4, (t.width || 100) * scaleX);
      t.height = Math.max(4, (t.height || 20) * scaleY);
      return t;
    }
    case 'arc': {
      const a = { ...el } as ArcElement;
      a.cx = originX + (a.cx - originX) * scaleX;
      a.cy = originY + (a.cy - originY) * scaleY;
      a.radius = Math.max(1, a.radius * ((scaleX + scaleY) / 2));
      a.strokeWidth = Math.max(0.5, a.strokeWidth * ((scaleX + scaleY) / 2));
      return a;
    }
    case 'line': {
      const l = { ...el } as LineElement;
      l.x1 = originX + (l.x1 - originX) * scaleX;
      l.y1 = originY + (l.y1 - originY) * scaleY;
      l.x2 = originX + (l.x2 - originX) * scaleX;
      l.y2 = originY + (l.y2 - originY) * scaleY;
      l.strokeWidth = Math.max(0.5, l.strokeWidth * ((scaleX + scaleY) / 2));
      return l;
    }
    case 'curve': {
      const c = { ...el } as CurveElement;
      c.points = c.points.map(p => ({
        x: originX + (p.x - originX) * scaleX,
        y: originY + (p.y - originY) * scaleY,
      }));
      c.strokeWidth = Math.max(0.5, c.strokeWidth * ((scaleX + scaleY) / 2));
      return c;
    }
    default:
      return el;
  }
}

/**
 * 平移图形元素
 */
export function translateElement(
  el: GraphElement,
  dx: number,
  dy: number
): GraphElement {
  switch (el.type) {
    case 'text': {
      const t = { ...el } as TextElement;
      t.x += dx; t.y += dy;
      return t;
    }
    case 'arc': {
      const a = { ...el } as ArcElement;
      a.cx += dx; a.cy += dy;
      return a;
    }
    case 'line': {
      const l = { ...el } as LineElement;
      l.x1 += dx; l.y1 += dy;
      l.x2 += dx; l.y2 += dy;
      return l;
    }
    case 'curve': {
      const c = { ...el } as CurveElement;
      c.points = c.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
      return c;
    }
    default:
      return el;
  }
}

/**
 * 计算所有选中元素的整体包围盒
 */
export function getGroupBoundingBox(
  elements: GraphElement[]
): { x: number; y: number; width: number; height: number } | null {
  if (elements.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const el of elements) {
    let x: number, y: number, w: number, h: number;
    switch (el.type) {
      case 'text': {
        const t = el as TextElement;
        x = t.x; y = t.y;
        w = t.width || t.fontSize * t.text.length * 0.6;
        h = t.height || t.fontSize * 1.2;
        break;
      }
      case 'arc': {
        const a = el as ArcElement;
        x = a.cx - a.radius; y = a.cy - a.radius;
        w = a.radius * 2; h = a.radius * 2;
        break;
      }
      case 'line': {
        const l = el as LineElement;
        x = Math.min(l.x1, l.x2); y = Math.min(l.y1, l.y2);
        w = Math.abs(l.x2 - l.x1) || 1; h = Math.abs(l.y2 - l.y1) || 1;
        break;
      }
      case 'curve': {
        const c = el as CurveElement;
        if (c.points.length === 0) continue;
        const xs = c.points.map(p => p.x);
        const ys = c.points.map(p => p.y);
        x = Math.min(...xs); y = Math.min(...ys);
        w = Math.max(...xs) - x; h = Math.max(...ys) - y;
        break;
      }
      default: continue;
    }
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
