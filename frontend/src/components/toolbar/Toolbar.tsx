import React from 'react';
import { ToolType } from '../../types';
import './Toolbar.css';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onDelete: () => void;
  onSave: () => void;
  onOpen: () => void;
  onNew: () => void;
  onExport: () => void;
  onToggleDimensions: () => void;
  isSaving: boolean;
  hasSelection: boolean;
  showDimensions: boolean;
}

interface ToolButton {
  tool?: ToolType;
  icon: string;
  label: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  activeTool, onToolChange,
  onUndo, onDelete, onSave, onOpen, onNew, onExport,
  onToggleDimensions,
  isSaving, hasSelection, showDimensions,
}) => {
  const drawTools: ToolButton[] = [
    { tool: 'select', icon: '↖', label: '选择' },
    { tool: 'text', icon: 'T', label: '文字' },
    { tool: 'line', icon: '╱', label: '线段' },
    { tool: 'curve', icon: '∿', label: '折线' },
    { tool: 'bezier', icon: '⌒', label: '贝塞尔曲线' },
    { tool: 'arc', icon: '◠', label: '圆弧' },
    { tool: 'circle', icon: '○', label: '圆形' },
  ];

  const actionTools: ToolButton[] = [
    { icon: '↩', label: '撤销 (Ctrl+Z)', action: onUndo },
    { icon: '🗑', label: '删除', action: onDelete, disabled: !hasSelection },
    { divider: true, icon: '', label: '' },
    {
      icon: showDimensions ? '📏' : '📐',
      label: showDimensions ? '隐藏标注' : '显示标注',
      action: onToggleDimensions,
    },
    { icon: '📁', label: '打开', action: onOpen },
    { icon: '💾', label: isSaving ? '保存中...' : '保存 (Ctrl+S)', action: onSave, disabled: isSaving },
    { icon: '📄', label: '新建', action: onNew },
    { divider: true, icon: '', label: '' },
    { icon: '📤', label: '导出图片', action: onExport },
  ];

  const renderBtn = (btn: ToolButton, idx: number) => {
    if (btn.divider) {
      return <div key={idx} className="toolbar-divider" />;
    }
    const isActive = btn.tool && activeTool === btn.tool;
    return (
      <button
        key={idx}
        className={`toolbar-btn ${isActive ? 'active' : ''} ${btn.disabled ? 'disabled' : ''}`}
        title={btn.label}
        disabled={btn.disabled}
        onClick={() => {
          if (btn.action) btn.action();
          else if (btn.tool) onToolChange(btn.tool);
        }}
      >
        <span className="toolbar-icon">{btn.icon}</span>
        <span className="toolbar-label">{btn.label}</span>
      </button>
    );
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-group-title">绘图工具</span>
        {drawTools.map(renderBtn)}
      </div>
      <div className="toolbar-group">
        <span className="toolbar-group-title">操作</span>
        {actionTools.map(renderBtn)}
      </div>
    </div>
  );
};

export default Toolbar;
