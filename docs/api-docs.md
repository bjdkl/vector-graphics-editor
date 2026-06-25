# Vector Editor 协作白板 — 前后端接口文档

> **Base URL**: `http://localhost:8080/api`（通过 `server.servlet.context-path=/api` 配置）
>
> **认证方式**: 除注册/登录外，所有请求需携带 `Authorization: Bearer <jwt_token>` 请求头

---

## 目录

1. [REST API 接口总览](#1-rest-api-接口总览)
2. [认证接口 (Auth)](#2-认证接口-auth)
3. [画布管理接口 (Canvas)](#3-画布管理接口-canvas)
4. [协同画室接口 (Room)](#4-协同画室接口-room)
5. [WebSocket STOMP 协议](#5-websocket-stomp-协议)
6. [错误码规范](#6-错误码规范)

---

## 1. REST API 接口总览

| # | 方法 | 端点路径 | 认证 | 功能 | 分组 |
|---|------|---------|:----:|------|------|
| 1 | POST | `/api/auth/register` | ❌ | 用户注册 | 认证 |
| 2 | POST | `/api/auth/login` | ❌ | 用户登录 | 认证 |
| 3 | GET | `/api/auth/me` | ✅ | 验证 Token 有效性 | 认证 |
| 4 | GET | `/api/files` | ✅ | 查询当前用户的画布列表 | 画布 |
| 5 | GET | `/api/files/{id}` | ✅ | 加载单个画布详情 | 画布 |
| 6 | POST | `/api/files` | ✅ | 新建画布 | 画布 |
| 7 | PUT | `/api/files/{id}` | ✅ | 更新画布 | 画布 |
| 8 | DELETE | `/api/files/{id}` | ✅ | 删除画布 | 画布 |
| 9 | POST | `/api/files/{id}/create-room` | ✅ | 创建画室（生成 UUID） | 画室 |
| 10 | GET | `/api/files/join?roomId=xxx` | ✅ | 通过邀请码加入画室 | 画室 |
| 11 | GET | `/api/files/{id}/history-state` | ✅ | 获取历史栈状态 | 画室 |

---

## 2. 认证接口 (Auth)

### 2.1 用户注册

**`POST /api/auth/register`**

**请求头**:
```
Content-Type: application/json
```

**请求体**:

```json
{
  "username": "zhangsan",      // 必填，3~20字符，仅字母数字下划线
  "email": "zhangsan@example.com", // 必填，合法邮箱格式
  "password": "123456",         // 必填，6~32字符
  "nickname": "张三"            // 可选，为空则默认取 username
}
```

**成功响应** (HTTP 200):

```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "username": "zhangsan",
    "nickname": "张三",
    "email": "zhangsan@example.com",
    "userId": 1
  }
}
```

**错误响应** (HTTP 400):

```json
// 用户名已存在
{ "code": 400, "message": "用户名已被占用", "data": null }

// 邮箱已被注册
{ "code": 400, "message": "邮箱已被注册", "data": null }

// 字段校验失败
{ "code": 400, "message": "用户名长度需在3到20个字符之间; 邮箱格式不合法", "data": null }
```

---

### 2.2 用户登录

**`POST /api/auth/login`**

**请求体**:

```json
{
  "username": "zhangsan",
  "password": "123456"
}
```

**成功响应** (HTTP 200): 格式同注册响应 `AuthResponse`

**错误响应** (HTTP 400):

```json
{ "code": 400, "message": "用户名或密码错误", "data": null }
```

---

### 2.3 验证 Token

**`GET /api/auth/me`**

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

**成功响应** (HTTP 200):

```json
{ "code": 200, "message": "已登录", "data": null }
```

---

## 3. 画布管理接口 (Canvas)

> 所有画布接口需要 JWT 认证，后端通过 `@AuthenticationPrincipal` 注入当前登录的 `User` 对象。

### 3.1 查询画布列表

**`GET /api/files`**

**功能**: 获取当前登录用户的所有画布（元数据摘要，不含完整元素数据）

**成功响应** (HTTP 200):

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "我的设计图",
      "canvasWidth": 1200,
      "canvasHeight": 800,
      "backgroundColor": "#ffffff",
      "elements": null,
      "elementCount": 5,
      "createdAt": "2026-05-24T10:00:00",
      "updatedAt": "2026-05-24T12:30:00",
      "roomId": null
    },
    {
      "id": 2,
      "name": "未命名图形",
      "canvasWidth": 1200,
      "canvasHeight": 800,
      "backgroundColor": "#ffffff",
      "elements": null,
      "elementCount": 0,
      "createdAt": "2026-05-24T08:00:00",
      "updatedAt": "2026-05-24T08:00:00",
      "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  ]
}
```

> **注意**: `elementCount` 是服务端解析 JSON 后统计的元素数量；`elements` 在列表接口中为 `null`。

---

### 3.2 加载单个画布

**`GET /api/files/{id}`**

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| id | Long | 画布 ID |

**成功响应** (HTTP 200):

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "name": "我的设计图",
    "canvasWidth": 1200,
    "canvasHeight": 800,
    "backgroundColor": "#ffffff",
    "elements": "[{\"type\":\"line\",\"id\":\"el-1\",\"x1\":10,\"y1\":20,\"x2\":200,\"y2\":150,...}]",
    "elementCount": null,
    "createdAt": "2026-05-24T10:00:00",
    "updatedAt": "2026-05-24T12:30:00",
    "roomId": null
  }
}
```

> **注意**: 此接口返回完整的 `elements` JSON 字符串。前端需用 `JSON.parse()` 反序列化为 `GraphElement[]`。

**错误响应** (HTTP 400):

```json
// 画布不存在或无权限
{ "code": 400, "message": "画布不存在或无权访问", "data": null }
```

---

### 3.3 新建画布

**`POST /api/files`**

**请求体** (`CanvasSaveRequest`):

```json
{
  "name": "新画布",              // 可选，默认 "未命名图形"
  "canvasWidth": 1920,            // 可选，默认 1200
  "canvasHeight": 1080,           // 可选，默认 800
  "backgroundColor": "#f0f0f0",   // 可选，默认 "#ffffff"
  "elements": "[]"                // 可选，默认 "[]"（空数组JSON）
}
```

**成功响应** (HTTP 200): 返回创建后的完整画布数据（含数据库生成的 `id` 和时间戳），格式同 **3.2 加载单个画布**。

---

### 3.4 更新画布

**`PUT /api/files/{id}`**

**请求体**: 同 `CanvasSaveRequest`（部分更新，`null` 字段不覆盖原值）

**成功响应** (HTTP 200): 更新后的完整画布数据。

---

### 3.5 删除画布

**`DELETE /api/files/{id}`**

**成功响应** (HTTP 200):

```json
{ "code": 200, "message": "success", "data": null }
```

---

## 4. 协同画室接口 (Room)

### 4.1 创建画室

**`POST /api/files/{id}/create-room`**

**功能**: 为指定画布生成一个 UUID 邀请码（roomId）。如果该画布已有 roomId，直接返回现有的（幂等操作）。返回完整画布数据。

**成功响应** (HTTP 200):

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 2,
    "name": "未命名图形",
    "canvasWidth": 1200,
    "canvasHeight": 800,
    "backgroundColor": "#ffffff",
    "elements": "[...]",
    "elementCount": null,
    "createdAt": "2026-05-24T08:00:00",
    "updatedAt": "2026-05-24T09:00:00",
    "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

**前端流程**:
```
1. POST /api/files/2/create-room → 获得完整画布数据（含 roomId）
2. 提取 roomId 展示给用户作为邀请码
3. 其他人在"加入画室"对话框输入此 UUID
```

---

### 4.2 加入画室

**`GET /api/files/join?roomId={uuid}`**

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| roomId | String | 画室 UUID 邀请码 |

**成功响应** (HTTP 200): 返回画布完整数据（含 elements），格式同 **3.2 加载单个画布**。

**错误响应** (HTTP 400):

```json
// 无效的邀请码
{ "code": 400, "message": "画室不存在，请检查邀请码是否正确", "data": null }
```

**前端流程**:
```
1. 输入 UUID → GET /api/files/join?roomId=xxx
2. 获得画布数据 → 加载到编辑器
3. 延迟 300ms → 建立 WebSocket 连接 → 开始协同绘图
```

---

### 4.3 获取历史栈状态

**`GET /api/files/{id}/history-state`**

**功能**: 获取画室的撤销历史栈状态

**成功响应** (HTTP 200):

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "history": ["[]", "[{...}]", "[{...},{...}]"],
    "currentIndex": 2,
    "canUndo": true
  }
}
```

---

## 5. WebSocket STOMP 协议

### 5.1 连接建立

#### SockJS 端点

```
GET /api/ws
```

前端使用 SockJS 客户端连接此端点。

#### STOMP 握手

客户端在 STOMP **CONNECT 帧**中携带 JWT Token：

```
CONNECT
Accept-Version: 1.1,1.0
Heartbeat:10000,10000
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...   ← JWT Token

^@
```

#### 服务端认证流程

```
STOMP CONNECT 到达
  → WebSocketAuthInterceptor.preSend() 拦截
  → 从 header 提取 Token (优先 Authorization > token)
  → JwtUtil.getUsernameFromToken() 解析
  → UserRepository.findByUsername() 查找 User
  → 返回 CONNECTED 帧
```

### 5.2 频道订阅与消息收发

#### 频道列表

| 频道路径 | 方向 | 说明 |
|---------|------|------|
| `/app/canvas/{canvasId}/draw` | 客户端 → 服务端 | 发送绘图消息（`@MessageMapping`） |
| `/app/canvas/{canvasId}/history` | 客户端 → 服务端 | 发送撤销操作 |
| `/app/canvas/{canvasId}/push-history` | 客户端 → 服务端 | 推送历史快照 |
| `/topic/canvas/{canvasId}` | 服务端 → 客户端 | 接收广播消息（`SimpMessagingTemplate`） |

#### 订阅示例（前端）

```javascript
// 连接成功后订阅频道
stompClient.subscribe('/topic/canvas/' + canvasId, (message) => {
  const body = JSON.parse(message.body);
  // 处理远程协作消息...
});
```

### 5.3 绘图消息格式

#### 客户端发送的消息 (`→ /app/canvas/{canvasId}/draw`)

```json
{
  "type": "ELEMENT_ADD",
  "payload": {
    "type": "line",
    "id": "el-abc123",
    "zIndex": 1,
    "x1": 100,
    "y1": 200,
    "x2": 300,
    "y2": 400,
    "strokeColor": "#000000",
    "strokeWidth": 2,
    "strokeStyle": "solid"
  }
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| type | String | ✅ | 消息类型枚举（见下表） |
| payload | Object | ✅ | 消息载荷（根据 type 不同而不同） |

以下字段由**服务端自动补全**（客户端无需发送）：

| 字段 | 类型 | 来源 |
|------|------|------|
| canvasId | Long | 路径变量 `{canvasId}` |
| userId | Long | 当前登录用户 ID |
| username | String | 当前登录用户名 |
| timestamp | Instant | 服务端生成的时间戳 (ISO-8601) |

#### 服务端广播的消息 (`← /topic/canvas/{canvasId}`)

```json
{
  "type": "ELEMENT_ADD",
  "canvasId": 1,
  "userId": 2,
  "username": "zhangsan",
  "timestamp": "2026-05-24T10:30:00Z",
  "payload": {
    "type": "line",
    "id": "el-abc123",
    "zIndex": 1,
    "x1": 100,
    "y1": 200,
    "x2": 300,
    "y2": 400,
    "strokeColor": "#000000",
    "strokeWidth": 2,
    "strokeStyle": "solid"
  }
}
```

### 5.4 消息类型详解

#### ELEMENT_ADD — 元素添加

| 字段 | 说明 |
|------|------|
| type | `"ELEMENT_ADD"` |
| payload | **完整的** GraphElement JSON 对象 |

**触发场景**: 用户绘制了新的图形元素（线段、圆弧、文字、曲线等）

**payload 示例**:

```json
// 线段
{ "type": "line", "id": "el-1", "zIndex": 1, "x1": 10, "y1": 20, "x2": 200, "y2": 150, "strokeColor": "#000000", "strokeWidth": 2, "strokeStyle": "solid" }

// 圆弧
{ "type": "arc", "id": "el-2", "zIndex": 2, "cx": 200, "cy": 200, "radius": 80, "startAngle": 0, "endAngle": 3.14159, "anticlockwise": false, "strokeColor": "#ff0000", "strokeWidth": 2, "strokeStyle": "solid" }

// 文字
{ "type": "text", "id": "el-3", "zIndex": 3, "text": "Hello", "x": 50, "y": 50, "width": 100, "height": 30, "fontFamily": "sans-serif", "fontSize": 16, "color": "#000000", "fontStyle": "normal" }
```

---

#### ELEMENT_UPDATE — 元素更新

| 字段 | 说明 |
|------|------|
| type | `"ELEMENT_UPDATE"` |
| payload | 完整的更新后 GraphElement JSON 对象 |

**触发场景**: 用户拖动元素、缩放元素、或在属性面板中修改了元素的属性后发送元素最新状态

---

#### ELEMENT_DELETE — 元素删除

| 字段 | 说明 |
|------|------|
| type | `"ELEMENT_DELETE"` |
| payload | `{ "elementId": "<要删除的元素ID>" }` |

**payload 示例**:

```json
{ "elementId": "el-1" }
```

---

#### CURSOR_MOVE — 光标移动

| 字段 | 说明 |
|------|------|
| type | `"CURSOR_MOVE"` |
| payload | `{ "x": 100, "y": 200 }` （世界坐标） |

**特殊行为**:
- 前端以 **100ms 节流**频率发送（避免消息洪泛）
- 仅用于渲染协作者的光标位置，不影响元素数据
- 光标 5 秒未更新则视为离线并清理

---

#### HISTORY_UNDO — 撤销同步

| 字段 | 说明 |
|------|------|
| type | `"HISTORY_UNDO"` |
| payload | `{ "elements": "[...]", "currentIndex": 2, "historySize": 5, "canUndo": true }` |

**触发场景**: 某用户执行撤销操作时，服务端处理后广播给所有协作者，确保所有人状态一致。

**特殊行为**:
- 即使是操作者本人也会收到此消息并更新本地状态
- 协同模式下撤销由后端统一处理，使用 `ReentrantLock` 公平锁保证顺序

---

### 5.5 消息交互序列图

#### 新用户加入同步

```
用户A（已在线绘制中）          服务端                    用户B（新加入）
     │                         │                          │
     │  ~~~ 正常绘图 ~~~       │                          │
     │                         │                          │  1. GET /api/files/join?roomId=xxx
     │                         │  ◄───────────────────────│
     │                         │  └─ 返回画布完整数据(elements)
     │                         │                          │
     │                         │                          │  2. 加载画布到编辑器(渲染已有元素)
     │                         │                          │
     │                         │                          │  3. SockJS CONNECT (带JWT)
     │                         │  ◄───────────────────────│
     │                         │  └─ 认证成功
     │                         │                          │
     │                         │                          │  4. SUBSCRIBE /topic/canvas/{id}
     │                         │  ◄───────────────────────│
     │                         │                          │
     │  5. SEND ELEMENT_ADD    │                          │
     │ ══════════════════════>│                          │
     │                         │  6. 广播到 /topic/...    │
     │                         │ ──────────────────────────>│
     │                         │                          │  7. 收到 → 本地添加元素
```

---

## 6. 错误码规范

### 6.1 HTTP 状态码

| 状态码 | 含义 | 触发场景 |
|--------|------|---------|
| 200 | 成功 | 请求正确处理 |
| 400 | 客户端请求错误 | 参数校验失败、业务规则违反（如画布不存在）、非法参数 |
| 401 | 未认证 | 缺少/无效 JWT Token |
| 500 | 服务器内部错误 | 未预期的异常（兜底处理） |

### 6.2 业务错误码（ApiResult.code）

| code | message 含义 | 典型场景 |
|------|-------------|---------|
| 200 | success | 操作成功（无自定义消息时） |
| 400 | 各种业务错误信息 | 用户名已存在 / 邮箱已被注册 / 画布不存在 / 画室不存在等 |
| 401 | 未认证或认证已过期，请重新登录 | JWT 过期或缺失 |
| 500 | 服务器内部错误：{异常信息} | 未预期的 RuntimeException |

### 6.3 统一响应结构

```typescript
interface ApiResult<T> {
  code: number;       // 业务状态码
  message: string;    // 提示信息（可直接展示给用户）
  data: T | null;     // 业务数据（错误时为 null）
}
```
