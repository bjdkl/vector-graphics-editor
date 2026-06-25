# Vector Editor 协作白板 — 前端功能逻辑文档

> **技术栈**: React 19 + TypeScript + HTML5 Canvas + SockJS/STOMP + Zustand-style 自定义 Hook
>
> **构建工具**: Create React App (CRA)

---

## 目录

1. [项目架构概览](#1-项目架构概览)
2. [类型系统 (TypeScript)](#2-类型系统-typescript)
3. [状态管理 (useEditorStore)](#3-状态管理-useeditorstore)
4. [核心画布组件 (CanvasEditor)](#4-核心画布组件-canvaseditor)
5. [渲染引擎 renderer](#5-渲染引擎-renderer)
6. [几何变换工具 (transform.ts)](#6-几何变换工具-transformts)
7. [API 通信层](#7-api-通信层)
8. [UI 组件库](#8-ui-组件库)
9. [协同绘图客户端](#9-协同绘图客户端)
10. [路由与应用入口](#10-路由与应用入口)
11. [键盘快捷键](#11-键盘快捷键)

---

## 1. 项目架构概览

### 1.1 技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架（函数组件 + Hooks） |
| TypeScript | 5.x | 类型安全 |
| HTML5 Canvas API | - | 图形绘制（非 DOM/SVG 方案） |
| SockJS + @stomp/stompjs | v7+ | WebSocket 实时通信 |
| Axios | - | HTTP REST API 客户端 |

### 1.2 目录结构

```
frontend/src/
├── index.tsx                          # 应用入口
├── App.tsx                            # 根组件（路由编排 + 全局状态）
├── types/
│   └── index.ts                       # 所有 TypeScript 类型定义
├── store/
│   └── useEditorStore.ts              # 编辑器全局状态管理
├── api/
│   ├── index.ts                       # Axios 配置 + REST API 封装
│   └── websocket.ts                   # WebSocket 协同客户端（SockJS+STOMP）
├── engine/
│   ├── renderer.ts                    # Canvas 绘图引擎
│   └── transform.ts                   # 几何变换工具（缩放/平移/包围盒）
├── components/
│   ├── canvas/CanvasEditor.tsx         # 核心画布编辑器组件
│   ├── toolbar/Toolbar.tsx            # 工具栏组件
│   ├── panel/PropertyPanel.tsx        # 属性面板（按元素类型动态渲染）
│   ├── sidebar/Sidebar.tsx            # 左侧边栏（文件列表）
│   ├── home/HomePage.tsx              # 首页（画布卡片网格）
│   ├── auth/LoginPage.tsx             # 登录/注册页面
│   └── dialogs/FileDialog.tsx         # 打开文件对话框
```

### 1.3 架构特点

- **无第三方状态管理库**: 使用自定义 `useEditorStore` Hook（基于 `useState` + `useRef`），无 Redux/Zustand
- **无路由库**: 通过 `page: 'home' | 'editor'` 状态变量做条件渲染
- **Canvas 渲染**: 全部图形使用 HTML5 Canvas 2D Context 绘制，非 DOM 元素或 SVG
- **无限画布**: 通过视口偏移 (`viewportOffset`) + 缩放 (`zoom`) 实现世界坐标系

---

## 2. 类型系统 (TypeScript)

### 2.1 工具类型枚举

```typescript
type ToolType =
  | 'select'    // 选择/移动/缩放工具
  | 'text'      // 文字工具
  | 'arc'       // 圆弧工具
  | 'circle'    // 圆形工具
  | 'line'      // 线段工具
  | 'curve'     // 折线工具
  | 'bezier';   // 贝塞尔曲线工具
```

### 2.2 图形元素类型体系

所有元素继承自基础接口 `BaseElement`：

```
BaseElement (基接口)
├── id: string          // 唯一标识 (UUID)
├── type: ElementType   // 元素类型判别
└── zIndex: number       // 层叠顺序
    │
    ├── TextElement        // 文字
    │   ├── text, x, y, width, height
    │   ├── fontFamily, fontSize, color, fontStyle
    │   └── selected?
    │
    ├── ArcElement         // 圆弧/圆
    │   ├── cx, cy, radius           // 圆心和半径
    │   ├── startAngle, endAngle     // 起止角度（角度制）
    │   ├── anticlockwise            // 是否逆时针
    │   ├── strokeColor, strokeWidth, strokeStyle
    │   ├── fillColor?               // 可选填充色
    │   └── selected?
    │
    ├── LineElement        // 线段
    │   ├── x1, y1, x2, y2           // 起止点坐标
    │   ├── strokeColor, strokeWidth, strokeStyle
    │   └── selected?
    │
    └── CurveElement        // 曲线/折线
        ├── points: Array<{x, y}>    // 控制点数组
        ├── bezier: boolean          // true=贝塞尔曲线, false=折线
        ├── strokeColor, strokeWidth, strokeStyle
        ├── fillColor?               // 封闭填充色
        ├── closed?                  // 是否封闭
        └── selected?
```

**联合类型**:
```typescript
type ElementType = 'text' | 'arc' | 'line' | 'curve';
type GraphElement = TextElement | ArcElement | LineElement | CurveElement;
```

### 2.3 辅助类型

| 类型名 | 用途 |
|--------|------|
| `GraphFile` | 画布完整数据（id, name, 尺寸, 背景色, elements[], roomId?） |
| `GraphFileMeta` | 画布列表元数据（不含 elements，含 elementCount 计数） |
| `CollaboratorCursor` | 协作者光标（userId, username, x, y, color, lastUpdateTime） |
| `SelectionRect` | 框选矩形（x, y, width, height） |
| `Point` | 二维坐标点（x, y） |
| `ApiResult<T>` | 后端统一响应包装（code, message, data） |

### 2.4 样式相关枚举

```typescript
type FontStyle = 'normal' | 'bold' | 'italic' | 'bold-italic';
type StrokeStyle = 'solid' | 'dashed' | 'dotted';  // 线型：实线 / 虚线 / 点线
```

---

## 3. 状态管理 (useEditorStore)

### 3.1 核心状态字段 (`EditorState`)

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `currentFile` | `GraphFile \| null` | `null` | 当前打开的画布数据 |
| `elements` | `GraphElement[]` | `[]` | 当前画布上所有图形元素 |
| `selectedIds` | `Set<string>` | `new Set()` | 当前选中元素的 ID 集合 |
| `activeTool` | `ToolType` | `'select'` | 当前活动绘图工具 |
| `history` | `GraphElement[][]` | `[[]]` | 撤销历史栈（快照数组） |
| `historyIndex` | `number` | `0` | 当前在历史栈中的位置指针 |
| `isSaving` | `boolean` | `false` | 保存操作进行中标志 |
| `isLoading` | `boolean` | `false` | 加载操作进行中标志 |
| `error` | `string \| null` | `null` | 错误信息 |
| `collaborationEnabled` | `boolean` | `false` | 协同模式是否已开启 |
| `wsConnected` | `boolean` | `false` | WebSocket 连接状态 |
| `collaboratorCursors` | `CollaboratorCursor[]` | `[]` | 其他协作者的光标位置列表 |
| `roomId` | `string \| null` | `null` | 当前画室的 UUID 邀请码 |
| `autoSaveTimer` | `number \| null` | `null` | 自动保存计时器句柄 |
| `lastSavedElements` | `string` | `'[]'` | 上次保存的元素 JSON 字符串，用于检测变化 |

### 3.2 历史记录（撤销）

#### 数据结构

采用**快照模式**：每次修改元素时，将完整的 `elements[]` 数组压入历史栈。

```
history: [
  [],                        // index 0: 初始空状态
  [{line元素}],             // index 1: 第一次操作后的快照
  [{line元素}, {arc元素}],  // index 2: 第二次操作后的快照
  ...                        // 最多保留 50 个快照
]
historyIndex = 2             // 当前指向的快照位置
```

#### 历史记录时机

| 操作 | 记录时机 | 说明 |
|------|---------|------|
| 拖拽平移 | mouseUp | mousemove 期间静默更新，释放鼠标时一次性记录 |
| 控制点拖拽 | mouseUp | 同上 |
| 缩放 (resize) | mouseUp | 同上 |
| 创建元素 | mouseUp/click 完成时 | 通过 `addElement()` 记录 |
| 删除元素 | 按键/按钮触发时 | 通过 `deleteSelected()` 记录 |
| 属性面板编辑 | 每次修改时 | 通过 `updateElements()` 记录 |
| 浮动工具栏操作 | 每次点击时 | 通过 `updateElements()` 记录 |

#### 撤销方法

| 方法 | 功能 | 协同模式 |
|------|------|---------|
| `undo()` | 撤销 | 发送 UNDO 到后端（由后端锁控制），广播 `HISTORY_UNDO` 给所有协作者 |
| 本地模式 | `historyIndex--` → 恢复到前一个快照 |

#### 静默更新

| 方法 | 用途 |
|------|------|
| `updateElementSilent(id, patch)` | 单个元素更新，不记录历史（已废弃，新代码使用批量方法） |
| `updateElementsSilentBatch(updater)` | 批量元素更新，不记录历史（mousemove 拖拽时使用） |

### 3.3 元素 CRUD 操作

| 方法 | 功能 | 参数 | 历史记录 | 协同广播 |
|------|------|------|---------|---------|
| `addElement(el)` | 添加新元素 | 完整 GraphElement | ✅ push + pushHistorySnapshot | ❌（由 CanvasEditor wrapper 处理） |
| `updateElements(updater)` | 批量更新 | `(prev[]) => new[]` 函数 | ✅ push + pushHistorySnapshot | ❌（由 CanvasEditor wrapper 处理） |
| `updateElementsSilentBatch(updater)` | 批量静默更新 | `(prev[]) => new[]` 函数 | ❌ | ❌（由 CanvasEditor wrapper 处理） |
| `deleteSelected()` | 删除所有选中 | 无 | ✅ push + pushHistorySnapshot | ✅ sendElementDelete + pushHistorySnapshot |

### 3.4 选中管理

| 方法 | 功能 | 参数 | 说明 |
|------|------|------|------|
| `selectElement(id, multi?)` | 点击选中 | 元素ID, 是否多选(Shift) | 单击=替换选中；Shift+单击=追加/取消 |
| `selectElements(ids)` | 批量选中 | ID字符串数组 | 用于框选操作 |
| `clearSelection()` | 清空选中 | 无 | 重置为空 Set |

### 3.5 文件操作

| 方法 | 功能 | 实现细节 |
|------|------|---------|
| `newFile(name?)` | 创建新画布 | 默认尺寸 1200×800，白色背景，空 elements 数组 |
| `openFile(id)` | 从后端加载画布 | GET `/api/files/{id}` → 反序列化 elements JSON → 设置 currentFile + elements |
| `saveCurrentFile()` | 保存当前画布 | 有 ID → PUT 更新；无 ID → POST 新建。自动去除 `selected` 字段后序列化 |
| `setFileName(name)` | 修改画布名称 | 直接更新 currentFile.name |
| `setCanvasSize(w, h)` | 修改画布尺寸 | 更新 currentFile 的宽高 |
| `setBackgroundColor(color)` | 修改背景色 | 更新 currentFile.backgroundColor |

### 3.6 元素工厂方法

| 方法 | 创建的元素 | 默认参数 |
|------|-----------|---------|
| `createTextElement(x, y, w, h)` | 文字元素 | text="双击编辑", fontFamily="Arial", fontSize=20, color="#000000" |
| `createArcElement(cx, cy, radius, start, end)` | 圆弧元素 | 默认黑色描边、宽度2、实线 |
| `createLineElement(x1, y1, x2, y2)` | 线段元素 | 默认黑色描边、宽度2、实线 |

### 3.7 协同绘图方法

#### 广播方法（本地操作后调用）

| 方法 | 发送的消息类型 | 触发场景 |
|------|---------------|---------|
| `broadcastElementAdd(el)` | `ELEMENT_ADD` | 新元素创建后 |
| `broadcastElementUpdate(el)` | `ELEMENT_UPDATE` | 元素拖动/缩放/属性修改后 |
| `broadcastElementDelete(elementId)` | `ELEMENT_DELETE` | 元素删除后 |
| `broadcastCursorMove(x, y)` | `CURSOR_MOVE` | 鼠标移动（100ms 节流） |

#### 画室操作

| 方法 | 功能 |
|------|------|
| `createCanvasRoom()` | 调用 POST `/api/files/{id}/create-room` 生成 UUID 邀请码 |
| `joinCollaborativeRoom(roomId)` | 调用 GET `/api/files/join?roomId=xxx` 加入画室，加载数据后延迟 300ms 开启协同 |
| `clearRoom()` | 清除 roomId 和协同状态 |

---

## 4. 核心画布组件 (CanvasEditor)

### 4.1 组件职责

`CanvasEditor.tsx` 是整个应用的**核心交互组件**，负责：

1. **鼠标事件处理**: 所有绘图工具的交互逻辑（点击、拖动、释放、双击、右键）
2. **坐标转换与吸附**: 屏幕坐标 ↔ 世界坐标转换，三级吸附系统
3. **视口控制**: 平移（中键拖动）、缩放（滚轮）
4. **元素操作代理**: 将用户操作转化为 store 中的状态变更
5. **协同广播桥接**: 在本地操作完成后调用广播方法通知远程
6. **键盘快捷键**: 委托给 App.tsx 全局处理

### 4.2 坐标系统

```
屏幕像素坐标 (Screen PX)
    │  getCanvasPoint() 反转换
    ▼
Canvas 坐标 (Canvas PX) = screenPX / zoom
    │  + viewportOffset
    ▼
世界坐标 (World Units) ← 所有元素的存储坐标
```

### 4.3 吸附系统 (Snap System)

三级吸附链式调用：

```
原始坐标 (px, py)
    │  第一级：网格吸附 → 四舍五入到最近的 grid point（间距=gridSize*zoom）
    │  第二级：特征点吸附 → 遍历所有元素的特征控制点，距离≤8px时吸附
    │  第三级：交点吸附 → 遍历线段/圆弧之间的计算交点，距离≤8px时吸附
    ▼
最终吸附后坐标
```

### 4.4 拖拽操作历史记录机制

为避免撤销过于细碎，拖拽操作分为两阶段：

| 阶段 | 调用 | 行为 |
|------|------|------|
| mousemove 期间 | `handleElementsUpdateSilentWrapper` | 静默更新本地元素 + 广播给协作者，**不记录历史** |
| mouseup 释放 | `onElementsUpdate(els => els)` | 仅在 `dragMoved=true` 时记录一次历史快照 |

受影响的拖拽操作：元素平移、特征控制点拖拽、缩放(resize)。

### 4.5 缩放实现 (Zoom)

- **触发方式**: 鼠标滚轮事件 (`wheel`)
- **缩放因子**: 放大 ×1.1，缩小 ÷1.1
- **缩放中心**: 以鼠标所在**世界坐标**为中心（调整 viewportOffset 补偿）
- **限制范围**: 0.1 ~ 8.0

### 4.6 视口平移 (Pan)

- **触发方式**: 鼠标中键按下并拖动（`button === 1`）
- **实现**: 根据鼠标位移直接调整 `viewportOffset`，重新渲染 Canvas

---

## 5. 渲染引擎 renderer（无 React 依赖），负责将数据驱动的元素数组渲染到 Canvas 2D Context 上。

### 5.1 渲染层级

`renderAll()` 按照以下从底到顶的顺序分层渲染：

| 层级 | 内容 | 条件 |
|------|------|------|
| 1 | 清空画布 + 填充背景色 | 始终 |
| 2 | 点格背景（dot grid） | zoom ≥ 阈值时可见 |
| 3 | 所有图形元素本体（按 zIndex 排序） | 始终 |
| 4 | 交点标记（红色小圆点） | 存在计算出的交点时 |
| 5 | 选中元素的辅助虚线框 | 有选中元素时 |
| 6 | 选中元素的特征控制点 | 有选中元素时 |
| 7 | 悬停元素的半透明控制点 | 有悬停元素时 |
| 8 | 多选时的通用包围框 | 选中多个元素时 |
| 9 | 线段/圆/圆弧绘制预览 | 正在拖拽绘制时 |

### 5.2 各元素绘制函数

| 函数 | 元素类型 | 要点 |
|------|---------|------|
| `drawText` | 文字 | 多行文本、fontStyle、Canvas fillText() |
| `drawArc` | 圆弧/圆 | 角度制、填充色、线宽缩放补偿 |
| `drawLine` | 线段 | 实线/虚线/点线、线宽缩放补偿 |
| `drawCurve` | 曲线 | 折线模式 lineTo、贝塞尔模式 quadraticCurveTo、封闭填充 |

### 5.3 命中测试 (Hit Testing)

| 元素类型 | 测试算法 | 阈值 |
|---------|---------|------|
| 线段 | 点到线段最短距离公式 | ≤ 6px |
| 圆弧 | 圆环带判断 + 角度范围 | ≤ 6px |
| 曲线 | 遍历每段取点到线段最小距离 | ≤ 6px |
| 文字 | AABB 包围盒包含测试 | — |

### 5.4 特征控制点系统

| 元素类型 | 控制点 | 数量 |
|---------|--------|------|
| 线段 | p1(起点), p2(终点), mid(中点) | 3 |
| 圆弧 | center(圆心), arc-start(弧起点), arc-end(弧终点), top/right/bottom/left(象限点) | 7 |
| 曲线 | 每个控制点 (cp-0, cp-1, ..., cp-n) | n |
| 文字 | nw(左上), ne(右上), sw(左下), se(右下) | 4 |

### 5.5 导出功能 (`exportCanvasToImage`)

- 计算所有元素的整体包围盒
- 添加内边距
- 创建离屏 Canvas，以 PNG 格式输出 DataURL

---

## 6. 几何变换工具 (transform.ts)

纯数学工具模块。

| 函数 | 功能 |
|------|------|
| `scaleElement(el, sx, sy, ox, oy)` | 以指定原点对元素非均匀缩放 |
| `translateElement(el, dx, dy)` | 元素位移 |
| `getGroupBoundingBox(elements)` | 计算多个元素的最小外接矩形 |

---

## 7. API 通信层

### 7.1 REST API 客户端 (`api/index.ts`)

**配置**:
- **BaseURL**: `process.env.REACT_APP_API_URL || 'http://localhost:8080/api'`
- **超时**: 30 秒
- **请求拦截器**: 自动从 `localStorage.getItem('ve_token')` 读取 JWT 并注入 `Authorization: Bearer` 头
- **响应拦截器**: HTTP 401 → 清除 localStorage → 派发自定义事件 `ve:unauthorized`

**API 函数映射表**:

| 前端函数 | HTTP 方法 | 后端端点 | 说明 |
|---------|-----------|---------|------|
| `login(req)` | POST | `/auth/login` | 登录认证 |
| `register(req)` | POST | `/auth/register` | 用户注册 |
| `listFiles()` | GET | `/files` | 画布列表 |
| `saveFile(file)` | POST | `/files` | 新建画布 |
| `loadFile(id)` | GET | `/files/{id}` | 加载画布 |
| `updateFile(id, file)` | PUT | `/files/{id}` | 更新画布 |
| `deleteFile(id)` | DELETE | `/files/{id}` | 删除画布 |
| `createRoom(fileId)` | POST | `/files/{fileId}/create-room` | 创建画室 → 返回完整 `GraphFile` |
| `joinRoom(roomId)` | GET | `/files/join?roomId=` | 加入画室 → 返回完整 `GraphFile` |

### 7.2 WebSocket 客户端 (`api/websocket.ts`)

基于 **@stomp/stompjs v7** + **SockJS** 的 STOMP 协议客户端。

#### 连接管理

```
connect(canvasId, token, userId):
  1. 创建 STOMP Client:
     ├── webSocketFactory: () => new SockJS(baseUrl + '/api/ws')
     ├── reconnectDelay: 3000ms
     └── connectHeaders: { Authorization: 'Bearer ${token}' }
  2. 订阅频道: /topic/canvas/{canvasId}
```

#### 消息发送

| 方法 | 目标 destination | 消息 type |
|------|-----------------|-----------|
| `sendElementAdd(el)` | `/app/canvas/{canvasId}/draw` | `ELEMENT_ADD` |
| `sendElementUpdate(el)` | 同上 | `ELEMENT_UPDATE` |
| `sendElementDelete(id)` | 同上 | `ELEMENT_DELETE` |
| `sendCursorMove(x, y)` | 同上 | `CURSOR_MOVE` |
| `sendHistoryOperation('UNDO')` | `/app/canvas/{canvasId}/history` | — |
| `pushHistorySnapshot(json)` | `/app/canvas/{canvasId}/push-history` | — |

#### 消息接收与分发

```
STOMP 消息到达 → onMessage(body):
  1. JSON.parse(body) → CollaborativeMessage
  2. HISTORY_UNDO → historySyncHandlers（不过滤自己，广播回自己）
  3. 其他消息：过滤 userId === localUserId（避免回显）
  4. ELEMENT_ADD/UPDATE/DELETE → remoteElementHandlers
  5. CURSOR_MOVE → cursorMoveHandlers
```

---

## 8. UI 组件库

### 8.1 Toolbar (工具栏)

**布局**: 水平排列的工具按钮组

**绘图工具按钮**: 选择 ↖ / 文字 T / 线段 ╱ / 折线 ∿ / 贝塞尔曲线 ⌒ / 圆弧 ◠ / 圆形 ○

**操作按钮**:
| 按钮 | 功能 | 快捷键 | 启用条件 |
|------|------|--------|---------|
| ↩ 撤销 | undo() | Ctrl+Z | historyIndex > 0 |
| 🗑 删除 | deleteSelected() | Del/Backspace | 有选中元素 |
| 📏/📐 标注 | toggleDimensionAnnotations() | — | — |
| 📁 打开 | 弹出 FileDialog | — | — |
| 💾 保存 | saveCurrentFile() | Ctrl+S | — |
| 📄 新建 | newFile() | — | — |
| 📤 导出 | exportCanvasToImage() | — | 有元素时 |

### 8.2 PropertyPanel (属性面板)

根据当前选中元素的**数量和类型**动态渲染不同的编辑界面：

| 选中情况 | 渲染内容 |
|---------|---------|
| 无选中 | 仅显示**画布背景色**选择器 |
| 单个文字元素 | 内容、位置、宽高、字体、字号、颜色、字形 |
| 单个圆弧元素 | 圆心、半径、起止角度、逆时针、画笔、填充色 |
| 单个线段元素 | 端点坐标、长度、角度(只读)、画笔线型 |
| 单个曲线元素 | 折线/贝塞尔切换、控制点数、封闭、画笔、填充 |
| 多个选中 | 不显示元素属性（仅支持单独编辑） |

### 8.3 Sidebar (侧边栏)

- **顶部**: Logo + 返回首页链接
- **新建画布按钮**: 调用 `store.newFile()` 并切换到编辑器页面
- **画布列表**: 从 API 加载当前用户的画布列表（高亮当前画布，点击切换）
- **底部**: 刷新按钮 + 当前用户信息 + **登出**按钮

### 8.4 LoginPage (登录/注册页)

**Tab 切换**: 登录 / 注册

**表单验证规则**:
| 字段 | 登录规则 | 注册规则 |
|------|---------|---------|
| 用户名 | 必填 | 必填，3-20位 |
| 密码 | 必填，≥6位 | 必填，6-32位 |
| 邮箱 | — | 必填，合法 email 格式 |
| 昵称 | — | 可选 |
| 确认密码 | — | 必填，必须与密码一致 |

**成功处理**: 将 token、username、nickname、email、userId 存入 `localStorage`，触发页面切换到首页。

---

## 9. 协同绘图客户端

### 9.1 协同生命周期

```
用户打开画布
    │
    ├── 画布有 roomId → 自动尝试 enableCollaboration()
    │   ├── WebSocket 连接 + STOMP 订阅
    │   └── 注册消息处理器（元素变更/光标/历史同步）
    │
    └── 画布无 roomId → 先 createRoom() 获取 UUID
        └── 分享给他人 → 其他人 joinRoom() → enableCollaboration()
```

### 9.2 撤销的协同同步

协同模式下的撤销由后端统一处理：
- `ReentrantLock(true)` 公平锁保证 FIFO 顺序
- 前端发送 UNDO 操作到后端 → 后端执行 → 广播 `HISTORY_UNDO` 给所有协作者
- 所有客户端（包括操作者本人）收到后同步更新本地状态
- 历史栈限制 50 步

### 9.3 定时自动保存

协同模式下每 30 秒自动保存，仅在有变化时实际写数据库（对比 `lastSavedElements` JSON）。

### 9.4 冲突处理策略

前端采用 **Last-Writer-Wins** 策略：
- 远程消息到达时直接应用
- 对于同时编辑同一元素的场景，后到达的消息覆盖先到的

---

## 10. 路由与应用入口

### 10.1 页面路由

无 React Router，通过 `App.tsx` 中的 `page` 状态变量实现条件渲染：

```
App.tsx
├─ !authUser (未登录) → <LoginPage />
└─ authUser (已登录)
   ├─ page === 'home' → <Sidebar /> + <HomePage />
   └─ page === 'editor'
       ├─ <Sidebar />
       ├─ <Toolbar />
       ├─ <CanvasEditor />
       ├─ <PropertyPanel />
       └─ 状态栏 (缩放比/坐标/元素数/协同状态)
```

### 10.2 App.tsx 全局职责

- **认证状态管理**: `authUser`（从 localStorage 恢复）
- **页面切换**: `page` state ('home' | 'editor')
- **Toast 提示**: 自动消失的全局提示消息（2.5秒）
- **模态框状态**: 新建画布 / 加入画室
- **键盘快捷键**: 全局监听 keydown 事件（仅在 editor 模式生效）
- **协同整合**: 定期清理过期光标（每5秒）、加入画室后延迟 300ms 开启协同
- **401 监听**: 监听 `ve:unauthorized` 自定义事件 → 清除认证 → 回到登录页

---

## 11. 键盘快捷键

| 快捷键 | 功能 | 生效条件 |
|--------|------|---------|
| `Ctrl+Z` | 撤销 | 编辑器页面 |
| `Ctrl+S` | 保存画布 | 编辑器页面 |
| `Delete` / `Backspace` | 删除选中元素 | 编辑器页面 + 有选中元素 |
| `Escape` | 切换回选择工具 + 清除选中 | 编辑器页面 |
