import axios from 'axios';
import { GraphFile, GraphFileMeta, GraphElement, ApiResult } from '../types';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── 请求拦截器：自动携带 JWT ──
http.interceptors.request.use(config => {
  const token = localStorage.getItem('ve_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── 响应拦截器：统一错误处理 + 401 自动登出 ──
http.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ve_token');
      localStorage.removeItem('ve_user');
      window.dispatchEvent(new Event('ve:unauthorized'));
    }
    // 将后端 message 透传到 err.message，方便业务层直接显示
    const backendMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message;
    if (backendMsg) err.message = backendMsg;
    return Promise.reject(err);
  }
);

// ======================== 认证 API ========================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  nickname?: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  nickname: string;
  email: string;
  userId: number;
}

export async function login(req: LoginRequest): Promise<AuthResponse> {
  const res = await http.post<ApiResult<AuthResponse>>('/auth/login', req);
  return res.data.data;
}

export async function register(req: RegisterRequest): Promise<AuthResponse> {
  const res = await http.post<ApiResult<AuthResponse>>('/auth/register', req);
  return res.data.data;
}

// ======================== 图形文件 API ========================

// 后端返回的 canvas 格式（含 JSON 字符串 elements）
interface BackendCanvas {
  id: number;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  elements: string;      // JSON 字符串
  elementCount?: number;
  createdAt: string;
  updatedAt: string;
  roomId?: string;       // 画室 UUID
}

// 前端 GraphFile 使用的 elements 格式（GraphElement[]）
function parseCanvas(raw: BackendCanvas): GraphFile {
  let elements: GraphElement[] = [];
  if (raw.elements && raw.elements !== '[]') {
    try { elements = JSON.parse(raw.elements); } catch {}
  }
  return {
    id: String(raw.id),
    name: raw.name,
    canvasWidth: raw.canvasWidth,
    canvasHeight: raw.canvasHeight,
    backgroundColor: raw.backgroundColor,
    elements,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    roomId: raw.roomId ?? undefined,
  };
}

function toBackendFormat(file: GraphFile): Record<string, unknown> {
  return {
    name: file.name,
    canvasWidth: file.canvasWidth,
    canvasHeight: file.canvasHeight,
    backgroundColor: file.backgroundColor,
    elements: JSON.stringify(file.elements ?? []),
  };
}

/** 获取所有文件列表 */
export async function listFiles(): Promise<GraphFileMeta[]> {
  const res = await http.get<ApiResult<BackendCanvas[]>>('/files');
  return (res.data.data ?? []).map(raw => ({
    id: String(raw.id),
    name: raw.name,
    canvasWidth: raw.canvasWidth,
    canvasHeight: raw.canvasHeight,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    elementCount: raw.elementCount ?? 0,
    roomId: raw.roomId ?? undefined,
  }));
}

/** 保存（新建）图形文件 */
export async function saveFile(file: GraphFile): Promise<GraphFile> {
  const res = await http.post<ApiResult<BackendCanvas>>('/files', toBackendFormat(file));
  return parseCanvas(res.data.data);
}

/** 加载图形文件（含所有元素） */
export async function loadFile(id: string): Promise<GraphFile> {
  const res = await http.get<ApiResult<BackendCanvas>>(`/files/${id}`);
  return parseCanvas(res.data.data);
}

/** 更新图形文件 */
export async function updateFile(id: string, file: GraphFile): Promise<GraphFile> {
  const res = await http.put<ApiResult<BackendCanvas>>(`/files/${id}`, toBackendFormat(file));
  return parseCanvas(res.data.data);
}

/** 删除图形文件 */
export async function deleteFile(id: string): Promise<void> {
  await http.delete(`/files/${id}`);
}

// ======================== 画室（协同房间）API ========================

/** 创建画室：为指定画布生成 UUID 邀请码，后端返回完整画布数据 */
export async function createRoom(fileId: string): Promise<GraphFile> {
  const res = await http.post<ApiResult<BackendCanvas>>(`/files/${fileId}/create-room`);
  return parseCanvas(res.data.data);
}

/** 通过 UUID 加入画室，返回画布完整数据 */
export async function joinRoom(roomId: string): Promise<GraphFile> {
  const res = await http.get<ApiResult<BackendCanvas>>(`/files/join`, { params: { roomId } });
  return parseCanvas(res.data.data);
}
