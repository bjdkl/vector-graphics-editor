// 图形元素类型定义

export type FontStyle = 'normal' | 'bold' | 'italic' | 'bold-italic';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type ElementType = 'text' | 'arc' | 'line' | 'curve';

/** 基础图形元素 */
export interface BaseElement {
  id: string;
  type: ElementType;
  zIndex: number;
  selected?: boolean;
}

/** 文字元素 */
export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  x: number;
  y: number;
  width: number;   // 文字框宽度（用于框选和缩放）
  height: number;  // 文字框高度
  fontFamily: string;
  fontSize: number;
  color: string;
  fontStyle: FontStyle;
}

/** 圆弧/圆元素 */
export interface ArcElement extends BaseElement {
  type: 'arc';
  cx: number;
  cy: number;
  radius: number;
  startAngle: number; // 度
  endAngle: number;   // 度
  anticlockwise: boolean;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillColor?: string;
}

/** 线段元素 */
export interface LineElement extends BaseElement {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
}

/** 曲线元素（贝塞尔曲线 / 多段线）*/
export interface CurveElement extends BaseElement {
  type: 'curve';
  /** 控制点数组（≥2个点）*/
  points: Array<{ x: number; y: number }>;
  /** true = 贝塞尔曲线（控制点=4时用三次贝塞尔），false = 多段折线 */
  bezier: boolean;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillColor?: string;
  closed?: boolean; // 封闭曲线（首尾相连）
}

export type GraphElement = TextElement | ArcElement | LineElement | CurveElement;

/** 图形文件 */
export interface GraphFile {
  id?: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  createdAt?: string;
  updatedAt?: string;
  elements: GraphElement[];
  /** 画室邀请码 UUID */
  roomId?: string;
}

/** 文件列表元数据 */
export interface GraphFileMeta {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  createdAt: string;
  updatedAt: string;
  elementCount: number;
  /** 画室邀请码 UUID */
  roomId?: string;
}

/** 工具类型 */
export type ToolType =
  | 'select'
  | 'text'
  | 'arc'
  | 'circle'
  | 'line'
  | 'curve'        // 多段线/折线
  | 'bezier';     // 贝塞尔曲线

/** 尺寸标注配置 */
export interface DimensionConfig {
  enabled: boolean;           // 是否显示标注
  showAllElements: boolean;   // 是否显示所有元素的标注（默认只显示选中元素）
  color: string;             // 标注颜色
  fontSize: number;          // 标注字体大小
  bgColor: string;           // 标注背景色
  showDistance: boolean;      // 显示距离
  showAngle: boolean;        // 显示角度
  showDimensions: boolean;    // 显示尺寸
}

/** 默认标注配置 */
export const DEFAULT_DIMENSION_CONFIG: DimensionConfig = {
  enabled: true,
  showAllElements: false,      // 默认只显示选中元素的标注
  color: '#1677ff',
  fontSize: 11,
  bgColor: 'rgba(255, 255, 255, 0.92)',
  showDistance: true,
  showAngle: true,
  showDimensions: true,
};

/** 选择框矩形 */
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 点 */
export interface Point {
  x: number;
  y: number;
}

/** 协同光标信息 */
export interface CollaboratorCursor {
  userId: number;
  username: string;
  x: number;
  y: number;
  color: string;     // 该用户的光标颜色
  lastUpdateTime: number;
}

/** API响应 */
export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}
