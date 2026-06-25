# 矢量图形编辑器

> 三层架构前后端分离的实时协同矢量图形编辑器  
> 前端：React + TypeScript + Canvas API + STOMP WebSocket  
> 后端：Spring Boot + SpringMVC + Spring Security + JPA + MySQL

---

## 功能特性

### 图形元素
| 元素 | 属性 |
|------|------|
| **文字** | 位置、字符串、字体、字号、颜色、字形（普通/加粗/倾斜/加粗倾斜） |
| **图片** | 显示位置、初始大小、PNG 文件名（实时从文件读取） |
| **圆弧/圆** | 圆心位置、半径、起止角度、画笔（颜色/宽度/线型）、填充色 |
| **线段** | 起止位置、画笔（颜色/宽度/线型） |

### 核心功能
- 图形绘制：文字（点击画布输入）、图片（上传 PNG）、圆弧、圆、线段
- 鼠标框选（虚线矩形）选中多个图形元素
- 拖动移动选中元素
- 缩放选中元素（画笔宽度、字体大小同步缩放）
- 属性面板实时编辑所有属性
- 撤销 / 重做（最多 50 步）
- 填充颜色（圆弧封闭区域）

### 用户系统
- 注册 / 登录（JWT 认证）
- 画布归属管理（每个用户拥有独立的画布列表）
- Token 自动续期与 401 自动登出

### 实时协同
- **画室机制**：创建画室生成 UUID 邀请码，其他用户凭码加入
- **实时同步**：基于 SockJS + STOMP WebSocket 的多用户协作绘图
- **元素同步**：新增、修改、删除操作实时广播给房间内所有用户
- **光标追踪**：远程用户光标实时显示
- **协同撤销**：共享历史栈，任意用户可撤销操作并同步给所有协作者

### 快捷键
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` | 撤销 |
| `Ctrl+S` | 保存 |
| `Delete` | 删除选中 |
| `Esc` | 取消 / 回到选择工具 |
| `Shift+Click` | 多选 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | React 18 + TypeScript |
| **绘图引擎** | HTML5 Canvas API |
| **状态管理** | Zustand |
| **HTTP 客户端** | Axios（JWT 拦截器） |
| **实时通信** | SockJS + STOMP over WebSocket |
| **后端框架** | Spring Boot 3 + SpringMVC |
| **安全** | Spring Security + JWT 无状态认证 |
| **持久层** | Spring Data JPA + Hibernate |
| **数据库** | MySQL 8.0（HikariCP 连接池） |
| **构建** | Maven（后端）+ Create React App（前端） |

---

## 快速启动

### 环境要求

| 依赖 | 版本 |
|------|------|
| Java | 17+ |
| Maven | 3.6+ |
| Node.js | 16+ |
| MySQL | 8.0+ |

### 1. 初始化数据库

```sql
-- 执行建表 SQL
mysql -u root -p < backend/sql/schema.sql
```

或在 MySQL 客户端中直接运行 `backend/sql/schema.sql`。

### 2. 配置后端

编辑 `backend/src/main/resources/application.properties`：

```properties
spring.datasource.url=jdbc:mysql://***:3306/vectoreditor?...
spring.datasource.username=你的用户名
spring.datasource.password=你的密码
```

### 3. 启动后端

```bash
cd backend
mvn spring-boot:run
```

后端启动在 `http://localhost:8080/api`

### 4. 启动前端

```bash
cd frontend
npm install
npm start
```

前端启动在 `http://localhost:3000`

---

## 项目结构

```
project/
├── README.md
│
├── backend/                          # Spring Boot 后端
│   ├── pom.xml
│   ├── sql/schema.sql                # 数据库建表 DDL
│   └── src/main/java/com/vectoreditor/
│       ├── BackendApplication.java          # 启动入口
│       ├── config/
│       │   ├── CorsConfig.java              # CORS 跨域配置
│       │   ├── SecurityConfig.java          # Spring Security 配置
│       │   └── WebSocketConfig.java         # STOMP WebSocket 配置
│       ├── controller/
│       │   ├── AuthController.java          # 注册/登录 API
│       │   ├── CanvasController.java        # 画布 CRUD + 画室 API
│       │   ├── CanvasWSController.java      # WebSocket 协同绘图
│       │   └── GlobalExceptionHandler.java  # 全局异常处理
│       ├── dto/                             # 数据传输对象
│       ├── model/
│       │   ├── User.java                    # 用户实体
│       │   └── Canvas.java                  # 画布实体
│       ├── repository/                      # JPA 数据访问层
│       ├── security/
│       │   ├── JwtUtil.java                 # JWT 生成/验证
│       │   ├── JwtAuthFilter.java           # JWT 认证过滤器
│       │   ├── JwtAuthEntryPoint.java       # 未认证处理
│       │   ├── UserDetailsServiceImpl.java  # 用户加载服务
│       │   └── WebSocketAuthInterceptor.java# WS 认证拦截
│       └── service/
│           ├── AuthService.java             # 认证业务逻辑
│           ├── CanvasService.java           # 画布业务逻辑
│           ├── CollaborativeService.java    # 协同消息广播
│           └── RoomHistoryService.java      # 房间历史栈管理
│
├── frontend/                          # React 前端
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── types/index.ts                  # TypeScript 类型定义
│       ├── api/
│       │   ├── index.ts                    # HTTP API + JWT 拦截器
│       │   └── websocket.ts               # STOMP WebSocket 客户端
│       ├── engine/
│       │   ├── renderer.ts                 # Canvas 绘图引擎
│       │   └── transform.ts               # 缩放/平移变换
│       ├── store/
│       │   └── useEditorStore.ts           # Zustand 状态管理
│       ├── components/
│       │   ├── auth/LoginPage.tsx          # 登录/注册页面
│       │   ├── home/HomePage.tsx           # 画布列表首页
│       │   ├── canvas/CanvasEditor.tsx     # 核心画布组件
│       │   ├── toolbar/Toolbar.tsx         # 工具栏
│       │   ├── panel/PropertyPanel.tsx     # 属性编辑面板
│       │   ├── sidebar/Sidebar.tsx         # 侧边导航
│       │   └── dialogs/FileDialog.tsx      # 文件管理弹窗
│       └── App.tsx
│
├── docs/                              # 项目文档
│   ├── api-docs.md
│   ├── backend-docs.md
│   └── frontend-docs.md
│
└── slides/                            # PPT 生成脚本
    ├── compile.js
    └── slide-01.js ~ slide-09.js
```

---

## API 接口

### 认证
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 无 | 用户注册 |
| POST | `/api/auth/login` | 无 | 用户登录，返回 JWT |
| GET | `/api/auth/me` | JWT | 验证 Token 有效性 |

### 画布 CRUD
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/files` | JWT | 获取当前用户所有画布列表 |
| POST | `/api/files` | JWT | 新建画布 |
| GET | `/api/files/{id}` | JWT | 加载画布（含全部元素） |
| PUT | `/api/files/{id}` | JWT | 更新画布 |
| DELETE | `/api/files/{id}` | JWT | 删除画布 |

### 协同画室
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/files/{id}/create-room` | JWT | 创建画室，生成 UUID 邀请码 |
| GET | `/api/files/join?roomId=xxx` | JWT | 通过邀请码加入画室 |
| GET | `/api/files/{id}/history-state` | JWT | 获取历史栈状态 |

### WebSocket（STOMP）
| 客户端 → 服务端 | 说明 |
|------|------|
| `/app/canvas/{id}/draw` | 发送绘制消息（增/删/改/光标） |
| `/app/canvas/{id}/history` | 发送撤销操作 |
| `/app/canvas/{id}/push-history` | 推入历史快照 |

| 服务端 → 客户端 | 说明 |
|------|------|
| `/topic/canvas/{id}` | 订阅画布房间广播 |

---

## 协同架构

用户 A（浏览器）与用户 B（浏览器）分别通过 HTTP REST（JWT 认证）和 WebSocket/STOMP 连接到 Spring Boot Server，Server 通过 JPA/Hibernate 持久化数据到 MySQL。

消息流转：

1. 用户 A 操作画布，通过 STOMP 发送消息到 `/app/canvas/{id}/draw`
2. 服务端验证 JWT 后，将消息广播到 `/topic/canvas/{id}`
3. 订阅同一房间的用户 B 收到消息并更新画布
4. 关键操作（保存、新建等）由前端通过 REST API 持久化到 MySQL

---

## 数据格式（JSON）

```json
{
  "id": 1,
  "name": "示例图形",
  "canvasWidth": 1200,
  "canvasHeight": 800,
  "backgroundColor": "#ffffff",
  "elements": [
    {
      "type": "text",
      "id": "el-001",
      "zIndex": 0,
      "text": "Hello World",
      "x": 100, "y": 80,
      "fontFamily": "Arial",
      "fontSize": 32,
      "color": "#333333",
      "fontStyle": "bold"
    },
    {
      "type": "arc",
      "id": "el-002",
      "zIndex": 1,
      "cx": 400, "cy": 300, "radius": 80,
      "startAngle": 0, "endAngle": 360,
      "strokeColor": "#1677ff",
      "strokeWidth": 3,
      "strokeStyle": "solid",
      "fillColor": "#e6f4ff"
    },
    {
      "type": "line",
      "id": "el-003",
      "zIndex": 2,
      "x1": 50, "y1": 200, "x2": 350, "y2": 200,
      "strokeColor": "#ff4d4f",
      "strokeWidth": 2,
      "strokeStyle": "dashed"
    },
    {
      "type": "image",
      "id": "el-004",
      "zIndex": 3,
      "x": 600, "y": 100,
      "width": 300, "height": 200,
      "filename": "example.png"
    }
  ]
}
```
