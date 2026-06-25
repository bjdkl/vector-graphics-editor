import React, { useCallback } from 'react';
import {
  GraphElement, TextElement,
  ArcElement, LineElement, CurveElement, FontStyle, StrokeStyle
} from '../../types';
import './PropertyPanel.css';

interface PropertyPanelProps {
  selectedElements: GraphElement[];
  onUpdate: (id: string, patch: Partial<GraphElement>) => void;
  backgroundColor: string;
  onBgColorChange: (color: string) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedElements, onUpdate,
  backgroundColor, onBgColorChange,
}) => {
  const single = selectedElements.length === 1 ? selectedElements[0] : null;

  const update = useCallback((patch: Partial<GraphElement>) => {
    if (single) onUpdate(single.id, patch);
  }, [single, onUpdate]);

  const renderTextProps = (el: TextElement) => (
    <div className="prop-section">
      <div className="prop-title">文字属性</div>
      <PropRow label="内容">
        <textarea
          className="prop-textarea"
          value={el.text}
          onChange={e => update({ text: e.target.value } as any)}
          rows={3}
        />
      </PropRow>
      <PropRow label="位置 X">
        <NumberInput value={el.x} onChange={v => update({ x: v } as any)} />
      </PropRow>
      <PropRow label="位置 Y">
        <NumberInput value={el.y} onChange={v => update({ y: v } as any)} />
      </PropRow>
      <PropRow label="宽度">
        <NumberInput value={el.width || 0} onChange={v => update({ width: v } as any)} min={10} />
      </PropRow>
      <PropRow label="高度">
        <NumberInput value={el.height || 0} onChange={v => update({ height: v } as any)} min={10} />
      </PropRow>

      <PropRow label="字体">
        <select
          className="prop-select"
          value={el.fontFamily}
          onChange={e => update({ fontFamily: e.target.value } as any)}
        >
          {['Arial', 'Times New Roman', '宋体', '黑体', '微软雅黑', 'Courier New'].map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </PropRow>

      <PropRow label="字号">
        <NumberInput value={el.fontSize} onChange={v => update({ fontSize: v } as any)} min={4} max={200} />
      </PropRow>

      <PropRow label="颜色">
        <input
          type="color"
          className="prop-color"
          value={el.color}
          onChange={e => update({ color: e.target.value } as any)}
        />
        <span className="prop-color-text">{el.color}</span>
      </PropRow>

      <PropRow label="字形">
        <select
          className="prop-select"
          value={el.fontStyle}
          onChange={e => update({ fontStyle: e.target.value as FontStyle } as any)}
        >
          <option value="normal">普通</option>
          <option value="bold">加粗</option>
          <option value="italic">倾斜</option>
          <option value="bold-italic">加粗+倾斜</option>
        </select>
      </PropRow>
    </div>
  );

  const renderArcProps = (el: ArcElement) => (
    <div className="prop-section">
      <div className="prop-title">圆弧属性</div>
      <div className="prop-title prop-title-sm">几何</div>
      <PropRow label="圆心 X">
        <NumberInput value={el.cx} onChange={v => update({ cx: v } as any)} step={1} />
      </PropRow>
      <PropRow label="圆心 Y">
        <NumberInput value={el.cy} onChange={v => update({ cy: v } as any)} step={1} />
      </PropRow>
      <PropRow label="半径">
        <NumberInput value={el.radius} onChange={v => update({ radius: v } as any)} min={1} step={1} />
      </PropRow>
      <PropRow label="起始角度">
        <NumberInput value={el.startAngle} onChange={v => update({ startAngle: v } as any)} min={0} max={360} step={1} />
      </PropRow>
      <PropRow label="结束角度">
        <NumberInput value={el.endAngle} onChange={v => update({ endAngle: v } as any)} min={0} max={360} step={1} />
      </PropRow>
      <PropRow label="逆时针">
        <input
          type="checkbox"
          checked={el.anticlockwise}
          onChange={e => update({ anticlockwise: e.target.checked } as any)}
        />
      </PropRow>
      <div className="prop-title prop-title-sm">画笔</div>
      <PropRow label="颜色">
        <input type="color" className="prop-color" value={el.strokeColor}
          onChange={e => update({ strokeColor: e.target.value } as any)} />
        <span className="prop-color-text">{el.strokeColor}</span>
      </PropRow>
      <PropRow label="宽度"><NumberInput value={el.strokeWidth} onChange={v => update({ strokeWidth: v } as any)} min={0.5} step={0.5} /></PropRow>
      <PropRow label="线型"><StrokeStyleSelect value={el.strokeStyle} onChange={v => update({ strokeStyle: v } as any)} /></PropRow>
      <div className="prop-title prop-title-sm">填充（选做）</div>
      <PropRow label="填充色">
        <input
          type="color"
          className="prop-color"
          value={el.fillColor || '#ffffff'}
          onChange={e => update({ fillColor: e.target.value } as any)}
        />
        <button
          className="prop-clear-btn"
          onClick={() => update({ fillColor: undefined } as any)}
          title="清除填充"
        >✕</button>
        {el.fillColor && <span className="prop-color-text">{el.fillColor}</span>}
        {!el.fillColor && <span className="prop-color-text muted">无填充</span>}
      </PropRow>
    </div>
  );

  const renderLineProps = (el: LineElement) => {
    // 计算当前线段长度
    const dx = el.x2 - el.x1;
    const dy = el.y2 - el.y1;
    const currentLength = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx); // 当前方向角（弧度）

    // 修改长度时，以起点为锚点，保持方向不变，调整终点
    const handleLengthChange = (newLen: number) => {
      if (newLen <= 0) return;
      update({
        x2: el.x1 + Math.cos(angle) * newLen,
        y2: el.y1 + Math.sin(angle) * newLen,
      } as any);
    };

    return (
      <div className="prop-section">
        <div className="prop-title">线段属性</div>
        <div className="prop-title prop-title-sm">端点坐标</div>
        <PropRow label="起点 X"><NumberInput value={el.x1} onChange={v => update({ x1: v } as any)} /></PropRow>
        <PropRow label="起点 Y"><NumberInput value={el.y1} onChange={v => update({ y1: v } as any)} /></PropRow>
        <PropRow label="终点 X"><NumberInput value={el.x2} onChange={v => update({ x2: v } as any)} /></PropRow>
        <PropRow label="终点 Y"><NumberInput value={el.y2} onChange={v => update({ y2: v } as any)} /></PropRow>
        <div className="prop-title prop-title-sm">几何</div>
        <PropRow label="长度">
          <NumberInput
            value={Math.round(currentLength * 100) / 100}
            onChange={handleLengthChange}
            min={1}
            step={1}
          />
        </PropRow>
        <PropRow label="角度°">
          <span className="prop-text">{Math.round(angle * 180 / Math.PI * 100) / 100}°</span>
        </PropRow>
        <div className="prop-title prop-title-sm">画笔</div>
        <PropRow label="颜色">
          <input type="color" className="prop-color" value={el.strokeColor}
            onChange={e => update({ strokeColor: e.target.value } as any)} />
          <span className="prop-color-text">{el.strokeColor}</span>
        </PropRow>
        <PropRow label="宽度"><NumberInput value={el.strokeWidth} onChange={v => update({ strokeWidth: v } as any)} min={0.5} step={0.5} /></PropRow>
        <PropRow label="线型"><StrokeStyleSelect value={el.strokeStyle} onChange={v => update({ strokeStyle: v } as any)} /></PropRow>
      </div>
    );
  };

  const renderCurveProps = (el: CurveElement) => (
    <div className="prop-section">
      <div className="prop-title">曲线属性</div>
      <PropRow label="类型">
        <select
          className="prop-select"
          value={el.bezier ? 'bezier' : 'polyline'}
          onChange={e => update({ bezier: e.target.value === 'bezier' } as any)}
        >
          <option value="polyline">折线</option>
          <option value="bezier">贝塞尔曲线</option>
        </select>
      </PropRow>
      <PropRow label="点数"><span className="prop-text">{el.points.length} 个控制点</span></PropRow>
      <PropRow label="封闭">
        <input
          type="checkbox"
          checked={el.closed || false}
          onChange={e => update({ closed: e.target.checked } as any)}
        />
      </PropRow>
      <div className="prop-title prop-title-sm">画笔</div>
      <PropRow label="颜色">
        <input type="color" className="prop-color" value={el.strokeColor}
          onChange={e => update({ strokeColor: e.target.value } as any)} />
        <span className="prop-color-text">{el.strokeColor}</span>
      </PropRow>
      <PropRow label="宽度"><NumberInput value={el.strokeWidth} onChange={v => update({ strokeWidth: v } as any)} min={0.5} step={0.5} /></PropRow>
      <PropRow label="线型"><StrokeStyleSelect value={el.strokeStyle} onChange={v => update({ strokeStyle: v } as any)} /></PropRow>
      <div className="prop-title prop-title-sm">填充（封闭曲线）</div>
      <PropRow label="填充色">
        <input
          type="color"
          className="prop-color"
          value={el.fillColor || '#ffffff'}
          onChange={e => update({ fillColor: e.target.value } as any)}
        />
        <button
          className="prop-clear-btn"
          onClick={() => update({ fillColor: undefined } as any)}
          title="清除填充"
        >✕</button>
        {el.fillColor && <span className="prop-color-text">{el.fillColor}</span>}
        {!el.fillColor && <span className="prop-color-text muted">无填充</span>}
      </PropRow>
    </div>
  );

  return (
    <div className="property-panel">
      <div className="panel-header">属性面板</div>

      {/* 画布属性 */}
      <div className="prop-section">
        <div className="prop-title">画布</div>
        <PropRow label="背景色">
          <input type="color" className="prop-color" value={backgroundColor}
            onChange={e => onBgColorChange(e.target.value)} />
          <span className="prop-color-text">{backgroundColor}</span>
        </PropRow>
      </div>

      {/* 选中元素属性 */}
      {selectedElements.length === 0 && (
        <div className="prop-empty">
          点击选择元素<br />以编辑其属性<br /><br />
          <span className="hint">文字：先画框再输入<br />曲线：点击添加点·双击完成</span>
        </div>
      )}
      {selectedElements.length > 1 && (
        <div className="prop-section">
          <div className="prop-title">多选</div>
          <div className="prop-empty">已选中 {selectedElements.length} 个元素<br />可拖动或缩放</div>
        </div>
      )}
      {single && single.type === 'text' && renderTextProps(single as TextElement)}
      {single && single.type === 'arc' && renderArcProps(single as ArcElement)}
      {single && single.type === 'line' && renderLineProps(single as LineElement)}
      {single && single.type === 'curve' && renderCurveProps(single as CurveElement)}
    </div>
  );
};

// ── 子组件 ──

const PropRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="prop-row">
    <span className="prop-label">{label}</span>
    <div className="prop-value">{children}</div>
  </div>
);

const NumberInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ value, onChange, min, max, step = 1 }) => (
  <input
    type="number"
    className="prop-input"
    value={Math.round(value * 100) / 100}
    min={min}
    max={max}
    step={step}
    onChange={e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) onChange(v);
    }}
  />
);

const StrokeStyleSelect: React.FC<{
  value: StrokeStyle;
  onChange: (v: StrokeStyle) => void;
}> = ({ value, onChange }) => (
  <select
    className="prop-select"
    value={value}
    onChange={e => onChange(e.target.value as StrokeStyle)}
  >
    <option value="solid">实线</option>
    <option value="dashed">虚线</option>
    <option value="dotted">点线</option>
  </select>
);

export default PropertyPanel;
