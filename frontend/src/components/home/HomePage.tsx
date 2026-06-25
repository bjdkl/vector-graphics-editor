import React, { useEffect, useState } from 'react';
import { GraphFileMeta } from '../../types';
import { listFiles, deleteFile, joinRoom } from '../../api';
import './HomePage.css';

interface HomePageProps {
  onOpen: (id: string) => void;
  onNew: () => void;
  onJoinRoom?: (file: import('../../types').GraphFile) => void;  // 加入画室后回调
}

/** 友好时间格式化 */
function formatTime(isoStr?: string): string {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '--';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH} 小时前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `${diffD} 天前`;
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

const THUMB_COLORS = [
  '#1a1a3e','#1e3a1a','#3a1a1e','#1a2e3a','#2e1a3a','#3a2e1a',
];

const HomePage: React.FC<HomePageProps> = ({ onOpen, onNew, onJoinRoom }) => {
  const [files, setFiles] = useState<GraphFileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // ── 加入画室 ──
  const [joinModal, setJoinModal] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [joining, setJoining] = useState(false);

  const refresh = () => {
    setLoading(true);
    setError(null);
    listFiles()
      .then(setFiles)
      .catch(e => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确认删除「${name}」？此操作不可恢复。`)) return;
    setDeletingId(id);
    try {
      await deleteFile(id);
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      alert(err.message || '删除失败，请重试');
    } finally {
      setDeletingId(null);
    }
  };

  /** 确认加入画室 */
  const handleConfirmJoin = async () => {
    const id = joinInput.trim();
    if (!id) return;
    setJoining(true);
    try {
      const file = await joinRoom(id);
      setJoinModal(false);
      setJoinInput('');
      onJoinRoom?.(file);
    } catch (err: any) {
      alert(err.message || '画室不存在，请检查邀请码');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="home-page">
      {/* 顶部 Banner */}
      <div className="home-banner">
        <div className="home-banner-icon">🎨</div>
        <div>
          <h1 className="home-banner-title">矢量绘图编辑器</h1>
          <p className="home-banner-sub">创建、编辑并导出精美的矢量图形</p>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="home-actions">
        <button className="home-btn-primary" onClick={onNew}>
          <span className="btn-icon">＋</span> 新建画布
        </button>
        <button
          className="home-btn-secondary"
          onClick={() => { setJoinInput(''); setJoinModal(true); }}
        >
          <span className="btn-icon">🔗</span> 加入画室
        </button>
        <button className="home-btn-secondary" onClick={refresh} disabled={loading}>
          <span className="btn-icon">↻</span> 刷新
        </button>
      </div>

      {/* 文件列表区 */}
      <div className="home-section">
        <h2 className="home-section-title">
          最近的画布
          {!loading && !error && files.length > 0 && (
            <span className="home-section-count">{files.length} 个</span>
          )}
        </h2>

        {loading && (
          <div className="home-grid">
            {[1,2,3].map(i => (
              <div key={i} className="home-card home-card--skeleton">
                <div className="home-card-thumb home-card-thumb--skeleton" />
                <div className="home-card-info">
                  <div className="skeleton-line skeleton-line--name" />
                  <div className="skeleton-line skeleton-line--meta" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="home-state home-state--error">
            <span className="home-state-icon">⚠</span>
            <span>{error}</span>
            <small>请确认后端服务已启动（http://localhost:8080）</small>
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <div className="home-state home-state--empty">
            <span className="home-state-icon">📭</span>
            <span>还没有画布，点击「新建画布」开始创作</span>
          </div>
        )}

        {!loading && !error && files.length > 0 && (
          <div className="home-grid">
            {files.map((f, idx) => (
              <div
                key={f.id}
                className={`home-card ${deletingId === f.id ? 'home-card--deleting' : ''}`}
                onClick={() => deletingId !== f.id && onOpen(f.id)}
                title={`打开「${f.name}」`}
              >
                {/* 缩略图区域（用颜色区分） */}
                <div
                  className="home-card-thumb"
                  style={{ background: THUMB_COLORS[idx % THUMB_COLORS.length] }}
                >
                  <span className="home-card-thumb-icon">📐</span>
                  <span className="home-card-elem-count">{f.elementCount} 个元素</span>
                </div>
                <div className="home-card-info">
                  <div className="home-card-name" title={f.name}>{f.name}</div>
                  <div className="home-card-size">
                    {f.canvasWidth} × {f.canvasHeight}
                  </div>
                  <div className="home-card-time">
                    修改于 {formatTime(f.updatedAt)}
                  </div>
                </div>
                <button
                  className="home-card-delete"
                  title="删除此画布"
                  onClick={e => handleDelete(f.id, f.name, e)}
                  disabled={deletingId === f.id}
                >
                  {deletingId === f.id ? '⌛' : '🗑'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 加入画室模态框 */}
      {joinModal && (
        <div className="modal-overlay" onClick={() => setJoinModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🔗 加入画室</div>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}>
              输入他人分享的画室邀请码（UUID），即可加入协同绘图
            </p>
            <input
              className="modal-input"
              value={joinInput}
              autoFocus
              placeholder="粘贴邀请码，例如：a1b2c3d4-..."
              onChange={e => setJoinInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirmJoin(); if (e.key === 'Escape') setJoinModal(false); }}
            />
            <div className="modal-actions">
              <button className="modal-btn modal-btn--cancel" onClick={() => setJoinModal(false)}>取消</button>
              <button
                className="modal-btn modal-btn--ok"
                onClick={handleConfirmJoin}
                disabled={joining || !joinInput.trim()}
                style={{ opacity: (joining || !joinInput.trim()) ? 0.5 : 1 }}
              >
                {joining ? '加入中...' : '加入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
