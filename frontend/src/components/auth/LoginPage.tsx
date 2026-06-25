import React, { useState } from 'react';
import { login, register, AuthResponse } from '../../api';
import './LoginPage.css';

interface LoginPageProps {
  onSuccess: (user: AuthResponse) => void;
}

type Mode = 'login' | 'register';

const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 登录表单
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  // 注册表单
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', confirm: '', nickname: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginForm.username || !loginForm.password) {
      setError('请填写用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const resp = await login({ username: loginForm.username, password: loginForm.password });
      localStorage.setItem('ve_token', resp.token);
      localStorage.setItem('ve_user', JSON.stringify(resp));
      onSuccess(resp);
    } catch (err: any) {
      setError(err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regForm.username || !regForm.email || !regForm.password) {
      setError('请填写所有必填项');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(regForm.username)) {
      setError('用户名只能包含字母、数字和下划线，长度 3-20 位');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regForm.email)) {
      setError('邮箱格式不正确');
      return;
    }
    if (regForm.password.length < 6) {
      setError('密码长度至少 6 位');
      return;
    }
    if (regForm.password !== regForm.confirm) {
      setError('两次密码输入不一致');
      return;
    }
    setLoading(true);
    try {
      const resp = await register({
        username: regForm.username,
        email: regForm.email,
        password: regForm.password,
        nickname: regForm.nickname || undefined,
      });
      localStorage.setItem('ve_token', resp.token);
      localStorage.setItem('ve_user', JSON.stringify(resp));
      onSuccess(resp);
    } catch (err: any) {
      setError(err.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <span className="login-logo-icon">🎨</span>
          <span className="login-logo-text">矢量绘图编辑器</span>
        </div>

        {/* Tab 切换 */}
        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'login-tab--active' : ''}`}
            onClick={() => { setMode('login'); setError(null); }}
          >登录</button>
          <button
            className={`login-tab ${mode === 'register' ? 'login-tab--active' : ''}`}
            onClick={() => { setMode('register'); setError(null); }}
          >注册</button>
        </div>

        {/* 错误提示 */}
        {error && <div className="login-error">⚠ {error}</div>}

        {/* 登录表单 */}
        {mode === 'login' && (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label>用户名</label>
              <input
                type="text"
                placeholder="请输入用户名"
                value={loginForm.username}
                onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="login-field">
              <label>密码</label>
              <input
                type="password"
                placeholder="请输入密码"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? '登录中...' : '登 录'}
            </button>
            <div className="login-switch">
              还没有账号？<span onClick={() => { setMode('register'); setError(null); }}>立即注册</span>
            </div>
          </form>
        )}

        {/* 注册表单 */}
        {mode === 'register' && (
          <form className="login-form" onSubmit={handleRegister}>
            <div className="login-field">
              <label>用户名 <span className="required">*</span></label>
              <input
                type="text"
                placeholder="3-20 位字母/数字"
                value={regForm.username}
                onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="login-field">
              <label>昵称</label>
              <input
                type="text"
                placeholder="留空则使用用户名"
                value={regForm.nickname}
                onChange={e => setRegForm(f => ({ ...f, nickname: e.target.value }))}
              />
            </div>
            <div className="login-field">
              <label>邮箱 <span className="required">*</span></label>
              <input
                type="email"
                placeholder="请输入邮箱"
                value={regForm.email}
                onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="login-field">
              <label>密码 <span className="required">*</span></label>
              <input
                type="password"
                placeholder="6-32 位"
                value={regForm.password}
                onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="login-field">
              <label>确认密码 <span className="required">*</span></label>
              <input
                type="password"
                placeholder="再次输入密码"
                value={regForm.confirm}
                onChange={e => setRegForm(f => ({ ...f, confirm: e.target.value }))}
              />
            </div>
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? '注册中...' : '注 册'}
            </button>
            <div className="login-switch">
              已有账号？<span onClick={() => { setMode('login'); setError(null); }}>立即登录</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
