/**
 * 协同绘图 WebSocket 封装模块
 * 基于 SockJS + STOMP 协议，封装连接管理、消息收发、自动重连
 *
 * 使用方式：
 *   import { wsClient } from './websocket';
 *   wsClient.connect(canvasId, token);
 *   wsClient.sendDrawMessage({ type: 'ELEMENT_ADD', payload: element });
 *   wsClient.onRemoteElement((msg) => { ... });  // 接收远程元素变更
 *   wsClient.onCursorMove((msg) => { ... });      // 接收远程光标
 *   wsClient.disconnect();
 */

import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { GraphElement } from '../types';

// ── 类型定义 ──

export interface CollaborativeMessage {
  type: 'ELEMENT_ADD' | 'ELEMENT_UPDATE' | 'ELEMENT_DELETE' | 'CURSOR_MOVE' | 'HISTORY_UNDO';
  canvasId: number;
  userId: number;
  username: string;
  timestamp: string;
  payload: Record<string, any>;
}

export type RemoteElementHandler = (msg: CollaborativeMessage) => void;
export type CursorMoveHandler = (userId: number, username: string, x: number, y: number) => void;
export type HistorySyncHandler = (payload: {
  elements: string,
  currentIndex: number,
  historySize: number,
  canUndo: boolean
}) => void;
export type ConnectionChangeHandler = (connected: boolean) => void;

// ── WebSocket 客户端单例 ──

class CollaborativeWSClient {
  private stompClient: Client | null = null;
  private currentCanvasId: number | null = null;
  private localUserId: number | null = null;
  private token: string | null = null; // 保存 token 用于发送消息时使用

  // 回调注册
  private remoteElementHandlers: RemoteElementHandler[] = [];
  private cursorMoveHandlers: CursorMoveHandler[] = [];
  private historySyncHandlers: HistorySyncHandler[] = [];
  private connectionHandlers: ConnectionChangeHandler[] = [];

  /**
   * 建立 WebSocket 连接并订阅画布房间
   * @param canvasId 画布 ID（房间号）
   * @param token JWT 认证令牌
   * @param userId 当前用户 ID（用于过滤自己的消息）
   */
  connect(canvasId: number, token: string, userId: number): void {
    this.disconnect(); // 先断开旧连接

    this.currentCanvasId = canvasId;
    this.localUserId = userId;
    this.token = token; // 保存 token

    const baseUrl = process.env.REACT_APP_WS_URL || 'http://localhost:8080/api';
    const wsUrl = `${baseUrl}/ws`;  // 移除 URL 中的 token，改为 STOMP connectHeaders 传递

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectHeaders: {
        Authorization: `Bearer ${token}`,  // token 放在 STOMP CONNECT frame 的 Authorization header 中
      },
      onConnect: () => {
        console.log(`[协同WS] 已连接到画布房间 canvas=${canvasId}`);
        // 订阅该画布的广播频道
        this.stompClient?.subscribe(`/topic/canvas/${canvasId}`, (message: IMessage) => {
          this.onMessage(message.body);
        });
        this.connectionHandlers.forEach(h => h(true));
      },
      onDisconnect: () => {
        console.log('[协同WS] 已断开连接');
        this.connectionHandlers.forEach(h => h(false));
      },
      onStompError: (frame) => {
        console.error('[协同WS] STOMP 错误:', frame.headers?.message);
      },
      onWebSocketError: (event) => {
        console.error('[协同WS] WebSocket 错误:', event);
      },
    });

    this.stompClient.activate();
  }

  /** 断开连接 */
  disconnect(): void {
    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }
    this.stompClient = null;
    this.currentCanvasId = null;
  }

  /** 是否已连接 */
  get isConnected(): boolean {
    return this.stompClient?.active ?? false;
  }

  /**
   * 发送绘制消息到服务端
   * 服务端收到后会广播给房间内其他用户
   */
  sendDrawMessage(message: Omit<CollaborativeMessage, 'canvasId' | 'userId' | 'username' | 'timestamp'>): void {
    if (!this.stompClient?.connected || !this.currentCanvasId) {
      console.warn('[协同WS] 未连接，无法发送消息');
      return;
    }

    const fullMessage: CollaborativeMessage = {
      ...message,
      canvasId: this.currentCanvasId,
      userId: this.localUserId!,
      username: '', // 由后端根据认证信息填充
      timestamp: new Date().toISOString(),
    };

    // 在消息头中包含 token，确保后端可以验证
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    this.stompClient.publish({
      destination: `/app/canvas/${this.currentCanvasId}/draw`,
      body: JSON.stringify(fullMessage),
      headers: headers,
    });
  }

  // ── 快捷发送方法 ──

  /** 发送新增元素 */
  sendElementAdd(element: GraphElement): void {
    this.sendDrawMessage({
      type: 'ELEMENT_ADD',
      payload: element as unknown as Record<string, any>,
    });
  }

  /** 发送元素更新 */
  sendElementUpdate(element: GraphElement): void {
    this.sendDrawMessage({
      type: 'ELEMENT_UPDATE',
      payload: element as unknown as Record<string, any>,
    });
  }

  /** 发送元素删除 */
  sendElementDelete(elementId: string): void {
    this.sendDrawMessage({
      type: 'ELEMENT_DELETE',
      payload: { elementId },
    });
  }

  /** 发送光标移动 */
  sendCursorMove(x: number, y: number): void {
    this.sendDrawMessage({
      type: 'CURSOR_MOVE',
      payload: { x, y },
    });
  }

  /** 发送历史操作（撤销） */
  sendHistoryOperation(operation: 'UNDO'): void {
    if (!this.stompClient?.connected || !this.currentCanvasId) {
      console.warn('[历史] WebSocket 未连接，无法发送操作');
      return;
    }

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    this.stompClient.publish({
      destination: `/app/canvas/${this.currentCanvasId}/history`,
      body: JSON.stringify({ operation }),
      headers: headers,
    });
  }

  /** 推入新快照到历史栈 */
  pushHistorySnapshot(elementsJson: string): void {
    if (!this.stompClient?.connected || !this.currentCanvasId) {
      return;
    }

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    this.stompClient.publish({
      destination: `/app/canvas/${this.currentCanvasId}/push-history`,
      body: JSON.stringify({ elements: elementsJson }),
      headers: headers,
    });
  }

  // ── 事件监听注册 ──

  /** 监听远程元素变更消息 */
  onRemoteElement(handler: RemoteElementHandler): () => void {
    this.remoteElementHandlers.push(handler);
    return () => {
      this.remoteElementHandlers = this.remoteElementHandlers.filter(h => h !== handler);
    };
  }

  /** 监听远程光标移动 */
  onCursorMove(handler: CursorMoveHandler): () => void {
    this.cursorMoveHandlers.push(handler);
    return () => {
      this.cursorMoveHandlers = this.cursorMoveHandlers.filter(h => h !== handler);
    };
  }

  /** 监听历史同步消息 */
  onHistorySync(handler: HistorySyncHandler): () => void {
    this.historySyncHandlers.push(handler);
    return () => {
      this.historySyncHandlers = this.historySyncHandlers.filter(h => h !== handler);
    };
  }

  /** 监听连接状态变化 */
  onConnectionChange(handler: ConnectionChangeHandler): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  // ── 内部方法 ──

  /** 处理收到的 STOMP 消息，分发给对应处理器 */
  private onMessage(body: string): void {
    try {
      const msg: CollaborativeMessage = JSON.parse(body);

      // 对于历史同步消息，即使是自己发的也要处理（撤销操作需要同步到自己的画布）
      if (msg.type === 'HISTORY_UNDO') {
        this.historySyncHandlers.forEach(h => h({
          elements: msg.payload.elements,
          currentIndex: msg.payload.currentIndex,
          historySize: msg.payload.historySize,
          canUndo: msg.payload.canUndo,
        }));
        return;
      }

      // 其他消息防回环：忽略自己发的
      if (msg.userId === this.localUserId) return;

      switch (msg.type) {
        case 'ELEMENT_ADD':
        case 'ELEMENT_UPDATE':
        case 'ELEMENT_DELETE':
          this.remoteElementHandlers.forEach(h => h(msg));
          break;
        case 'CURSOR_MOVE':
          const { x, y } = msg.payload;
          this.cursorMoveHandlers.forEach(h => h(msg.userId, msg.username, x, y));
          break;
        default:
          console.warn('[协同WS] 未知消息类型:', msg.type);
      }
    } catch (e) {
      console.error('[协同WS] 消息解析失败:', e, body);
    }
  }
}

/** 导出单例 */
export const wsClient = new CollaborativeWSClient();
