import React, { useEffect, useState } from 'react';
import { GraphFileMeta } from '../../types';
import { listFiles, deleteFile } from '../../api';
import './FileDialog.css';

interface FileDialogProps {
  visible: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
}

const FileDialog: React.FC<FileDialogProps> = ({ visible, onOpen, onClose }) => {
  const [files, setFiles] = useState<GraphFileMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    listFiles()
      .then(setFiles)
      .catch(e => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [visible]);

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确认删除「${name}」？`)) return;
    await deleteFile(id);
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  if (!visible) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <span>打开图形文件</span>
          <button className="dialog-close" onClick={onClose}>✕</button>
        </div>
        <div className="dialog-body">
          {loading && <div className="dialog-loading">加载中...</div>}
          {error && <div className="dialog-error">⚠ {error}<br/><small>请确认后端服务已启动</small></div>}
          {!loading && !error && files.length === 0 && (
            <div className="dialog-empty">暂无保存的图形文件</div>
          )}
          {!loading && files.map(f => (
            <div key={f.id} className="file-item" onClick={() => { onOpen(f.id); onClose(); }}>
              <div className="file-icon">📐</div>
              <div className="file-info">
                <div className="file-name">{f.name}</div>
                <div className="file-meta">
                  {f.elementCount} 个元素 · {f.canvasWidth}×{f.canvasHeight} ·{' '}
                  {f.updatedAt ? new Date(f.updatedAt).toLocaleString('zh-CN') : '--'}
                </div>
              </div>
              <button
                className="file-delete"
                onClick={e => handleDelete(f.id, f.name, e)}
                title="删除"
              >🗑</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileDialog;
