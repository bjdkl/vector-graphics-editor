import React, { useRef, useEffect, useState, useCallback } from 'react';
import CanvasEditor, { CanvasEditorRef } from './components/canvas/CanvasEditor';
import Toolbar from './components/toolbar/Toolbar';
import PropertyPanel from './components/panel/PropertyPanel';
import Sidebar from './components/sidebar/Sidebar';
import HomePage from './components/home/HomePage';
import LoginPage from './components/auth/LoginPage';
import { AuthResponse } from './api';
import { useEditorStore } from './store/useEditorStore';
import { GraphElement } from './types';
import './App.css';

type Page = 'home' | 'editor';

function App() {
  const store = useEditorStore();
  const { state } = store;
  const canvasRef = useRef<CanvasEditorRef>(null);

  // ── 认证状态 ──
  const [authUser, setAuthUser] = useState<AuthResponse | null>(() => {
    try {
      const raw = localStorage.getItem('ve_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  // ── 页面状态 ──
  const [page, setPage] = useState<Page>('home');
  const [sidebarRefresh, setSidebarRefresh] = useState(0);

  // ── Toast 提示 ──
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ── 新建画布模态框 ──
  const [newModal, setNewModal] = useState(false);
  const [newName, setNewName] = useState('未命名图形');

  // ── 加入画室模态框 ──
  const [joinModal, setJoinModal] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [roomLinkCopied, setRoomLinkCopied] = useState(false);

  // ── 监听 401 ──
  useEffect(() => {
    const handle = () => {
      setAuthUser(null);
      showToast('登录已过期，请重新登录', 'error');
    };
    window.addEventListener('ve:unauthorized', handle);
    return () => window.removeEventListener('ve:unauthorized', handle);
  }, [showToast]);

  // ── 登录成功 ──
  const handleLoginSuccess = useCallback((user: AuthResponse) => {
    setAuthUser(user);
  }, []);

  // ── 登出 ──
  const handleLogout = useCallback(() => {
    localStorage.removeItem('ve_token');
    localStorage.removeItem('ve_user');
    setAuthUser(null);
    setPage('home');
  }, []);

  const selectedElements = state.elements.filter(el => state.selectedIds.has(el.id));
  const bgColor = state.currentFile?.backgroundColor ?? '#ffffff';

  // ── 打开文件 ──
  const handleOpen = useCallback(async (id: string) => {
    await store.openFile(id);
    setPage('editor');
  }, [store]);

  // ── 触发新建弹框 ──
  const handleNew = useCallback(() => {
    if (page === 'editor' && state.elements.length > 0 &&
      !window.confirm('新建将清空当前画布，确认继续？')) return;
    setNewName('未命名图形');
    setNewModal(true);
  }, [page, state.elements.length]);

  // ── 确认新建 ──
  const handleConfirmNew = useCallback(() => {
    const name = newName.trim() || '未命名图形';
    store.newFile(name);
    setNewModal(false);
    setPage('editor');
  }, [newName, store]);

  // ── 保存 ──
  const handleSave = useCallback(async () => {
    try {
      await store.saveCurrentFile();
      setSidebarRefresh(n => n + 1);
      showToast('保存成功 ✓');
    } catch {
      showToast('保存失败，请重试', 'error');
    }
  }, [store, showToast]);

  // ── 导出图片 ──
  const handleExport = useCallback(async () => {
    const data = await canvasRef.current?.exportImage();
    if (!data) return;
    const a = document.createElement('a');
    a.href = data;
    a.download = `${state.currentFile?.name || '画布'}_${Date.now()}.png`;
    a.click();
    showToast('导出成功 ✓');
  }, [state.currentFile?.name, showToast]);

  // ── 创建画室 ──
  const handleCreateRoom = useCallback(async () => {
    const roomId = await store.createCanvasRoom();
    if (roomId) showToast(`画室已创建，邀请码：${roomId}`);
    else showToast(state.error || '创建画室失败，请先保存画布', 'error');
  }, [store, showToast, state.error]);

  // ── 复制邀请码 ──
  const handleCopyRoomId = useCallback(() => {
    if (state.roomId) {
      navigator.clipboard.writeText(state.roomId).then(() => {
        setRoomLinkCopied(true);
        showToast('邀请码已复制 ✓');
        setTimeout(() => setRoomLinkCopied(false), 2000);
      });
    }
  }, [state.roomId, showToast]);

  // ── 加入画室（从编辑器状态栏）──
  const handleJoinFromEditor = useCallback(async () => {
    setJoinInput('');
    setJoinModal(true);
  }, []);

  // ── 确认加入画室 ──
  const handleConfirmJoin = useCallback(async () => {
    const id = joinInput.trim();
    if (!id) { showToast('请输入邀请码', 'error'); return; }
    setJoinModal(false);
    const ok = await store.joinCollaborativeRoom(id);
    if (ok) {
      setPage('editor');
      // 延迟开启协同模式，确保 canvas 已渲染
      setTimeout(() => store.enableCollaboration(), 300);
      showToast('已加入画室 ✓');
    } else {
      showToast(state.error || '加入失败，请检查邀请码', 'error');
    }
  }, [joinInput, store, state.error, showToast]);

  // ── 键盘快捷键 ──
  useEffect(() => {
    if (page !== 'editor' || !authUser) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); store.undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); store.deleteSelected(); }
      if (e.key === 'Escape') { store.setActiveTool('select'); store.clearSelection(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [page, authUser, store, handleSave]);

  // ── 协同：定期清理过期光标（每5秒） ──
  useEffect(() => {
    if (!state.collaborationEnabled) return;
    const timer = setInterval(() => {
      store.cleanupStaleCursors();
    }, 5000);
    return () => clearInterval(timer);
  }, [state.collaborationEnabled, store.cleanupStaleCursors]);

  const handlePropertyUpdate = useCallback((id: string, patch: Partial<GraphElement>) => {
    store.updateElements(els =>
      els.map(el => el.id === id ? { ...el, ...patch } as GraphElement : el)
    );
  }, [store]);

  // ── 未登录 ──
  if (!authUser) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      {/* Toast */}
      {toast && (
        <div className={`app-toast app-toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {/* 新建画布模态框 */}
      {newModal && (
        <div className="modal-overlay" onClick={() => setNewModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">新建画布</div>
            <input
              className="modal-input"
              value={newName}
              autoFocus
              placeholder="输入画布名称"
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirmNew(); if (e.key === 'Escape') setNewModal(false); }}
            />
            <div className="modal-actions">
              <button className="modal-btn modal-btn--cancel" onClick={() => setNewModal(false)}>取消</button>
              <button className="modal-btn modal-btn--ok" onClick={handleConfirmNew}>创建</button>
            </div>
          </div>
        </div>
      )}

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
                disabled={!joinInput.trim()}
                style={{ opacity: joinInput.trim() ? 1 : 0.5 }}
              >
                加入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 侧边栏 */}
      <Sidebar
        currentFileId={state.currentFile?.id}
        onOpen={handleOpen}
        onNew={handleNew}
        onHome={() => setPage('home')}
        refreshTrigger={sidebarRefresh}
        user={authUser}
        onLogout={handleLogout}
      />

      {/* 右侧内容区 */}
      <div className="app-content">
        {page === 'home' ? (
          <HomePage onOpen={handleOpen} onNew={handleNew} onJoinRoom={(file) => {
            // 通过 UUID 加入画室成功 → 加载数据到 store 并跳转编辑器
            store.joinCollaborativeRoom(file.roomId || '').then(ok => {
              if (ok) { setPage('editor'); setTimeout(() => store.enableCollaboration(), 300); }
            });
          }} />
        ) : (
          <>
            {/* 标题栏 */}
            <div className="title-bar">
              <span className="app-title">
                {state.currentFile?.name || '未命名图形'}
                {state.isSaving && <span className="saving-indicator"> · 保存中...</span>}
              </span>
              {state.error && (
                <span className="error-indicator" title={state.error}>⚠ 错误</span>
              )}
              <span className="shortcut-hint">
                Ctrl+Z 撤销 · Ctrl+S 保存 · Delete 删除 · 滚轮缩放
              </span>
            </div>

            {/* 工具栏 */}
            <Toolbar
              activeTool={state.activeTool}
              onToolChange={store.setActiveTool}
              onUndo={store.undo}
              onDelete={store.deleteSelected}
              onSave={handleSave}
              onOpen={() => {}}
              onNew={handleNew}
              onExport={handleExport}
              onToggleDimensions={store.toggleDimensionAnnotations}
              isSaving={state.isSaving}
              hasSelection={state.selectedIds.size > 0}
              showDimensions={state.dimensionConfig.enabled}
            />

            {/* 主编辑区 */}
            <div className="main-area">
              <div className="canvas-area">
                {state.isLoading ? (
                  <div className="loading-overlay">加载中...</div>
                ) : (
                  <CanvasEditor
                    ref={canvasRef}
                    elements={state.elements}
                    selectedIds={state.selectedIds}
                    activeTool={state.activeTool}
                    backgroundColor={bgColor}
                    dimensionConfig={state.dimensionConfig}
                    onSelectionChange={store.selectElements}
                    onElementAdd={store.addElement}
                    onElementsUpdate={store.updateElements}
                    onElementsUpdateSilent={store.updateElementsSilentBatch}
                    // ── 协同绘图 ──
                    collaboratorCursors={state.collaboratorCursors}
                    collaborationEnabled={state.collaborationEnabled}
                    onBroadcastElementAdd={store.broadcastElementAdd}
                    onBroadcastElementUpdate={store.broadcastElementUpdate}
                    onBroadcastElementDelete={store.broadcastElementDelete}
                    onBroadcastCursorMove={store.broadcastCursorMove}
                  />
                )}
              </div>
              <PropertyPanel
                selectedElements={selectedElements}
                onUpdate={handlePropertyUpdate}
                backgroundColor={bgColor}
                onBgColorChange={store.setBackgroundColor}
              />
            </div>

            {/* 状态栏 */}
            <div className="status-bar">
              <span>元素: {state.elements.length}</span>
              <span>选中: {state.selectedIds.size}</span>
              {/* 显示选中元素的尺寸信息 */}
              {state.selectedIds.size === 1 && (
                <span className="dimension-info">
                  {(() => {
                    const selectedEl = state.elements.find(el => state.selectedIds.has(el.id));
                    if (!selectedEl) return null;
                    if (selectedEl.type === 'line') {
                      const l = selectedEl as any;
                      const dx = l.x2 - l.x1;
                      const dy = l.y2 - l.y1;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                      return `长度: ${len.toFixed(2)} | 角度: ${angle.toFixed(2)}°`;
                    }
                    if (selectedEl.type === 'arc') {
                      const a = selectedEl as any;
                      const angleRange = Math.abs(a.endAngle - a.startAngle);
                      return `半径: ${a.radius} | 角度: ${a.startAngle.toFixed(1)}°~${a.endAngle.toFixed(1)}° (${angleRange.toFixed(1)}°)`;
                    }
                    if (selectedEl.type === 'text') {
                      const r = selectedEl as any;
                      return `W: ${r.width || r.width} × H: ${r.height || r.height}`;
                    }
                    return null;
                  })()}
                </span>
              )}
              {state.selectedIds.size > 1 && (
                <span className="dimension-info">多选模式</span>
              )}
              <span>滚轮缩放 · 中键平移</span>
              {state.currentFile?.id && (
                <span className="file-id">ID: {state.currentFile.id}</span>
              )}
              {/* 协同 / 画室 指示器 */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                {state.collaborationEnabled ? (
                  <>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: state.wsConnected ? '#52c41a' : '#ff4d4f',
                      display: 'inline-block',
                    }} title={state.wsConnected ? 'WebSocket 已连接' : 'WebSocket 未连接'} />
                    {/* 显示画室邀请码 */}
                    {state.roomId && (
                      <span
                        onClick={handleCopyRoomId}
                        style={{
                          color: roomLinkCopied ? '#52c41a' : '#8c8c8c',
                          cursor: 'pointer',
                          fontSize: 11,
                          fontFamily: 'monospace',
                          background: '#f5f5f5',
                          padding: '1px 6px',
                          borderRadius: 3,
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          userSelect: 'none',
                        }}
                        title={roomLinkCopied ? '已复制！' : '点击复制邀请码'}
                      >
                        🏠 {roomLinkCopied ? '已复制!' : state.roomId.slice(0, 8) + '...'}
                      </span>
                    )}
                    <span
                      onClick={() => store.disableCollaboration()}
                      style={{ color: '#1677ff', cursor: 'pointer', fontSize: 12 }}
                      title="点击关闭协同模式"
                    >
                      🔗 协同中 ({state.collaboratorCursors.length})
                    </span>
                  </>
                ) : state.currentFile?.id ? (
                  <>
                    {/* 有画室但未开启协同 → 显示邀请码 + 开启按钮 */}
                    {state.roomId ? (
                      <>
                        <span
                          onClick={handleCopyRoomId}
                          style={{
                            color: roomLinkCopied ? '#52c41a' : '#8c8c8c',
                            cursor: 'pointer',
                            fontSize: 11,
                            fontFamily: 'monospace',
                            background: '#f5f5f5',
                            padding: '1px 6px',
                            borderRadius: 3,
                            maxWidth: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                          }}
                          title={roomLinkCopied ? '已复制！' : '点击复制邀请码'}
                        >
                          🏠 {roomLinkCopied ? '已复制!' : state.roomId.slice(0, 8) + '...'}
                        </span>
                        <span
                          onClick={() => store.enableCollaboration()}
                          style={{ color: '#1677ff', cursor: 'pointer', fontSize: 12 }}
                          title="开启协同绘图"
                        >
                          ▶️ 开始协同
                        </span>
                      </>
                    ) : (
                      <>
                        {/* 无画室 → 创建 / 加入 */}
                        <span
                          onClick={handleCreateRoom}
                          style={{ color: '#1677ff', cursor: 'pointer', fontSize: 12 }}
                          title="创建画室，生成邀请码"
                        >
                          🏠 创建画室
                        </span>
                        <span style={{ color: '#d9d9d9' }}>|</span>
                        <span
                          onClick={handleJoinFromEditor}
                          style={{ color: '#999', cursor: 'pointer', fontSize: 12 }}
                          title="输入邀请码加入他人的画室"
                        >
                          🔗 加入画室
                        </span>
                      </>
                    )}
                  </>
                ) : null}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
