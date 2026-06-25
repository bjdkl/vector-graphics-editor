# Vector Editor 协作白板 — 后端 API 文档

> **技术栈**: Spring Boot 3.2.5 + Spring Security + JPA/Hibernate + MySQL + SockJS/STOMP WebSocket
> **基础路径**: `server.servlet.context-path=/api`，所有 REST 端点均以 `/api` 为前缀

---

## 目录

1. [统一响应格式](#1-统一响应格式)
2. [认证模块 (Auth)](#2-认证模块-auth)
3. [画布管理模块 (Canvas)](#3-画布管理模块-canvas)
4. [协同绘图 WebSocket 接口](#4-协同绘图-websocket-接口)

---

## 1. 统一响应格式

所有 API 响应均使用统一的 `ApiResult` 格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

**字段说明**：
- `code`: 状态码，200 表示成功，400 表示客户端错误，500 表示服务端错误
- `message`: 提示信息
- `data`: 业务数据，根据具体接口返回不同类型

**异常处理**:
- `IllegalArgumentException` → HTTP 400（业务错误）
- `MethodArgumentNotValidException` → HTTP 400（字段校验失败）
- `Exception` → HTTP 500（服务器内部错误）

---

## 2. 认证模块 (Auth)

### 2.1 用户注册

**端点**: `POST /api/auth/register`

**请求参数**:

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| username | String | 是 | 3-20 字符 | 用户名，唯一 |
| email | String | 是 | 邮箱格式 | 邮箱，唯一 |
| password | String | 是 | 6-32 字符 | 密码 |
| nickname | String | 否 | 可选 | 昵称，为空时默认使用用户名 |

**业务逻辑**:
1. 校验用户名是否已存在，存在则抛出异常 "用户名已被占用"
2. 校验邮箱是否已存在，存在则抛出异常 "邮箱已被注册"
3. 使用 BCrypt 对密码进行加密
4. 构建 User 实体并保存到数据库
5. 使用 JwtUtil 生成 JWT Token
6. 返回用户信息和 Token

**响应示例**:
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "username": "zhangsan",
    "nickname": "张三",
    "email": "zhangsan@example.com",
    "userId": 1
  }
}
```

---

### 2.2 用户登录

**端点**: `POST /api/auth/login`

**请求参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | String | 是 | 用户名 |
| password | String | 是 | 密码 |

**业务逻辑**:
1. 使用 AuthenticationManager 进行身份认证
2. 认证失败则抛出异常 "用户名或密码错误"
3. 认证成功后从数据库查询完整 User 对象
4. 使用 JwtUtil 生成 JWT Token
5. 返回用户信息和 Token

**响应示例**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "username": "zhangsan",
    "nickname": "张三",
    "email": "zhangsan@example.com",
    "userId": 1
  }
}
```

---

### 2.3 验证 Token 有效性

**端点**: `GET /api/auth/me`

**请求头**:
```
Authorization: Bearer <token>
```

**业务逻辑**:
1. 从请求头中提取并验证 JWT Token
2. 验证成功返回 "已登录" 提示

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": "已登录"
}
```

---

## 3. 画布管理模块 (Canvas)

### 3.1 查询画布列表

**端点**: `GET /api/files`

**请求头**:
```
Authorization: Bearer <token>
```

**业务逻辑**:
1. 从 SecurityContext 获取当前登录用户 ID
2. 查询该用户的所有画布，按更新时间倒序排列
3. 对每个画布进行转换，不返回完整的 elements JSON，只统计元素数量
4. 返回画布列表

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "我的画布",
      "canvasWidth": 1200,
      "canvasHeight": 800,
      "backgroundColor": "#ffffff",
      "elementCount": 5,
      "createdAt": "2024-05-20T10:30:00",
      "updatedAt": "2024-05-20T15:45:00",
      "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  ]
}
```

---

### 3.2 加载单个画布

**端点**: `GET /api/files/{id}`

**路径参数**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 画布 ID |

**请求头**:
```
Authorization: Bearer <token>
```

**业务逻辑**:
1. 验证画布归属权（画布必须属于当前登录用户）
2. 不存在或无权限则抛出异常 "画布不存在或无权访问"
3. 返回画布的完整信息，包括完整的 elements JSON

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "name": "我的画布",
    "canvasWidth": 1200,
    "canvasHeight": 800,
    "backgroundColor": "#ffffff",
    "elements": "[{\"id\":\"1\",\"type\":\"rectangle\",\"x\":100,\"y\":100,...}]",
    "createdAt": "2024-05-20T10:30:00",
    "updatedAt": "2024-05-20T15:45:00",
    "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

---

### 3.3 新建画布

**端点**: `POST /api/files`

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | String | 否 | "未命名图形" | 画布名称 |
| canvasWidth | Integer | 否 | 1200 | 画布宽度（像素） |
| canvasHeight | Integer | 否 | 800 | 画布高度（像素） |
| backgroundColor | String | 否 | "#ffffff" | 背景颜色 |
| elements | String | 否 | "[]" | 元素 JSON 数组字符串 |

**业务逻辑**:
1. 构建 Canvas 实体，设置 userId 为当前登录用户
2. 应用请求参数，null 字段使用默认值
3. 保存到数据库
4. 返回完整的画布信息

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 2,
    "name": "新画布",
    "canvasWidth": 1200,
    "canvasHeight": 800,
    "backgroundColor": "#ffffff",
    "elements": "[]",
    "createdAt": "2024-05-21T10:00:00",
    "updatedAt": "2024-05-21T10:00:00",
    "roomId": null
  }
}
```

---

### 3.4 更新画布

**端点**: `PUT /api/files/{id}`

**路径参数**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 画布 ID |

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | String | 否 | 画布名称 |
| canvasWidth | Integer | 否 | 画布宽度 |
| canvasHeight | Integer | 否 | 画布高度 |
| backgroundColor | String | 否 | 背景颜色 |
| elements | String | 否 | 元素 JSON 数组字符串 |

**业务逻辑**:
1. 验证画布归属权，不存在则抛出异常
2. 采用部分更新策略：仅更新非 null 字段
3. 自动更新 updatedAt 时间戳
4. 保存并返回完整的画布信息

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "name": "更新后的画布",
    "canvasWidth": 1920,
    "canvasHeight": 1080,
    "backgroundColor": "#f0f0f0",
    "elements": "[{...}]",
    "createdAt": "2024-05-20T10:30:00",
    "updatedAt": "2024-05-21T11:00:00",
    "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

---

### 3.5 删除画布

**端点**: `DELETE /api/files/{id}`

**路径参数**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 画布 ID |

**请求头**:
```
Authorization: Bearer <token>
```

**业务逻辑**:
1. 验证画布归属权，不存在则抛出异常
2. 从数据库删除该画布记录

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

---

### 3.6 创建画室（生成邀请码）

**端点**: `POST /api/files/{id}/create-room`

**路径参数**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 画布 ID |

**请求头**:
```
Authorization: Bearer <token>
```

**业务逻辑**:
1. 验证画布归属权，不存在则抛出异常
2. 检查是否已有 roomId，已有则直接返回
3. 没有则生成 UUID 作为邀请码
4. 保存 roomId 到数据库
5. 初始化该画室的历史栈
6. 返回完整画布信息（含 roomId）

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "name": "我的画布",
    "canvasWidth": 1200,
    "canvasHeight": 800,
    "backgroundColor": "#ffffff",
    "elements": "[{...}]",
    "createdAt": "2024-05-20T10:30:00",
    "updatedAt": "2024-05-21T12:00:00",
    "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

---

### 3.7 通过邀请码加入画室

**端点**: `GET /api/files/join?roomId={roomId}`

**查询参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | String | 是 | 画室邀请码（UUID） |

**请求头**:
```
Authorization: Bearer <token>
```

**业务逻辑**:
1. 通过 roomId 查询画布
2. 不存在则抛出异常 "画室不存在，请检查邀请码是否正确"
3. 初始化该画室的历史栈（如果尚未初始化）
4. 返回画布的完整信息

---

### 3.8 获取历史栈状态

**端点**: `GET /api/files/{id}/history-state`

**路径参数**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 画布 ID |

**请求头**:
```
Authorization: Bearer <token>
```

**业务逻辑**:
1. 验证画布归属权（轻量级存在性检查，不加载完整数据）
2. 获取该画室的历史栈状态

**响应示例**:
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

## 4. 协同绘图 WebSocket 接口

### 4.1 连接配置

**WebSocket 端点**: `/ws`（支持 SockJS 降级）

**连接时认证**:
- 在 STOMP CONNECT 帧的 header 中携带 JWT Token
- 支持两种方式：
  - `Authorization: Bearer <token>`
  - `token: <token>`
- JWT 认证逻辑委托给 `WebSocketAuthInterceptor.authenticate()`

---

### 4.2 绘图消息广播

**发送地址**: `/app/canvas/{canvasId}/draw`

**订阅地址**: `/topic/canvas/{canvasId}`

**消息格式** (`CanvasMessage`):

| 字段 | 类型 | 说明 |
|------|------|------|
| type | String | 消息类型：ELEMENT_ADD / ELEMENT_UPDATE / ELEMENT_DELETE / CURSOR_MOVE |
| canvasId | Long | 画布 ID |
| userId | Long | 发送者用户 ID（服务端补全） |
| username | String | 发送者用户名（服务端补全） |
| timestamp | Instant | 时间戳（服务端补全） |
| payload | Map | 消息载荷，根据 type 不同内容不同 |

**业务逻辑**:
1. 从 nativeHeaders 提取并验证 JWT Token（委托 `WebSocketAuthInterceptor.authenticate()`）
2. 验证失败则记录警告并返回
3. 补全消息字段（canvasId、userId、username、timestamp）
4. 将消息广播到 `/topic/canvas/{canvasId}`
5. 订阅该频道的所有客户端将收到消息

**type 说明**:

| type | payload 内容 | 触发场景 |
|------|-------------|---------|
| ELEMENT_ADD | 完整的 GraphElement JSON 对象 | 用户绘制新元素 |
| ELEMENT_UPDATE | 更新后的完整 GraphElement JSON 对象 | 用户拖动/缩放/修改属性后 |
| ELEMENT_DELETE | `{"elementId": "xxx"}` | 用户删除选中元素 |
| CURSOR_MOVE | `{"x": 100, "y": 200}` | 用户鼠标移动 |

> **注意**: 元素增删改的数据库持久化由前端在关键节点主动调用 REST API 完成，WebSocket 仅做实时同步广播。

---

### 4.3 撤销操作

**发送地址**: `/app/canvas/{canvasId}/history`

**订阅地址**: `/topic/canvas/{canvasId}`

**请求格式** (`HistoryOperationRequest`):

| 字段 | 类型 | 说明 |
|------|------|------|
| operation | String | 操作类型：UNDO |

**业务逻辑**:
1. 从 nativeHeaders 提取并验证 JWT Token
2. 验证操作类型（仅支持 UNDO）
3. 获取公平锁，执行撤销操作
4. 构造历史同步消息并广播给所有用户
5. 释放锁

**响应消息类型**:
- `HISTORY_UNDO`: 撤销操作结果

**响应格式** (`HistoryOperationResponse`):

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 操作是否成功 |
| operation | String | 操作类型：UNDO |
| elements | String | 操作后的元素 JSON 字符串 |
| currentIndex | int | 当前历史索引 |
| historySize | int | 历史栈大小 |
| canUndo | boolean | 是否还能继续撤销 |

---

### 4.4 推送历史快照

**发送地址**: `/app/canvas/{canvasId}/push-history`

**请求格式** (`PushHistoryRequest`):

| 字段 | 类型 | 说明 |
|------|------|------|
| elements | String | 元素 JSON 字符串 |

**业务逻辑**:
1. 从 nativeHeaders 提取并验证 JWT Token
2. 获取公平锁
3. 截断当前位置之后的历史（撤销后做新操作会丢弃后续历史）
4. 添加新快照到历史栈，最多保留 50 步
5. 释放锁
