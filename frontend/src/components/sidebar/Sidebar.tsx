import React, { useEffect, useState, useCallback } from 'react';
import { GraphFileMeta } from '../../types';
import { AuthResponse, listFiles } from '../../api';
import './Sidebar.css';

interface SidebarProps {
  currentFileId?: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onHome: () => void;
  refreshTrigger?: number;
  user: AuthResponse;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentFileId, onOpen, onNew, onHome, refreshTrigger, user, onLogout,
}) => {
  const [files, setFiles] = useState<GraphFileMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    listFiles()
      .then(setFiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh, refreshTrigger]);

  return (
    <div className="sidebar">
      {/* Logo + 首页 */}
      <div className="sidebar-header" onClick={onHome} title="返回首页">
        <span className="sidebar-logo">🎨</span>
        <span className="sidebar-title">矢量绘图</span>
      </div>

      {/* 新建按钮 */}
      <button className="sidebar-new-btn" onClick={onNew}>
        <span>＋</span> 新建画布
      </button>

      <div className="sidebar-divider" />

      {/* 画布列表 */}
      <div className="sidebar-list-label">画布列表</div>

      <div className="sidebar-list">
        {loading && (
          <div className="sidebar-loading">
            <div className="sidebar-spinner" />
          </div>
        )}
        {!loading && files.length === 0 && (
          <div className="sidebar-empty">暂无画布</div>
        )}
        {!loading && files.map(f => (
          <div
            key={f.id}
            className={`sidebar-item ${f.id === currentFileId ? 'sidebar-item--active' : ''}`}
            onClick={() => onOpen(f.id)}
            title={f.name}
          >
            <span className="sidebar-item-icon">📐</span>
            <span className="sidebar-item-name">{f.name}</span>
            {f.id === currentFileId && <span className="sidebar-item-dot" />}
          </div>
        ))}
      </div>

      {/* 底部：用户信息 + 登出 */}
      <div className="sidebar-footer">
        <button className="sidebar-refresh-btn" onClick={refresh} title="刷新列表">
          ↻ 刷新列表
        </button>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {(user.nickname || user.username).charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.nickname || user.username}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={onLogout} title="退出登录">
            ⎋
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
