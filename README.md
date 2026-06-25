# 矢量图形编辑器

> 三层架构前后端分离矢量图形编辑器  
> 前端：React + TypeScript + Canvas API  
> 后端：Java + Spring + SpringMVC + MyBatis

---

## 功能特性

### 图形元素
| 元素 | 属性 |
|------|------|
| **文字** | 位置、字符串、字体、字号、颜色、字形（普通/加粗/倾斜/加粗倾斜） |
| **图片** | 显示位置、初始大小、PNG文件名（每次显示时实时从文件读取） |
| **圆弧/圆** | 圆心位置、半径、起止角度、画笔（颜色/宽度/线型） |
| **线段** | 起止位置、画笔（颜色/宽度/线型） |

### 核心功能
- ✅ 图形绘制：文字（点击输入框写字）、图片（上传PNG）、圆弧、圆、线段
- ✅ JSON 文件存储与加载（保存到本地 `~/vector_editor_files/`）
- ✅ 鼠标框选（虚线矩形）选中多个图形元素
- ✅ 拖动移动选中元素
- ✅ 缩放选中元素（画笔宽度、字体大小同步放缩）
- ✅ 属性面板实时编辑所有属性
- ✅ 撤销/重做（最多50步）
- ✅ 填充颜色（圆弧的封闭区域）

### 快捷键
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Ctrl+S` | 保存 |
| `Delete` | 删除选中 |
| `Esc` | 取消/回到选择工具 |
| `Shift+Click` | 多选 |

---

## 快速启动

### 1. 启动后端

需要：**Java 11+** 和 **Maven 3.6+**

```bash
cd backend
mvn tomcat7:run
```

后端启动在 `http://localhost:8080/api`

### 2. 启动前端

需要：**Node.js 16+**

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
├── backend/                    # Java SSM 后端
│   ├── pom.xml
│   └── src/main/java/com/vectoreditor/
│       ├── controller/         # SpringMVC 控制层
│       │   ├── GraphFileController.java  # 图形文件 CRUD API
│       │   ├── ImageController.java      # 图片上传/读取 API
│       │   └── HealthController.java
│       ├── service/            # 业务逻辑层
│       │   ├── GraphFileService.java
│       │   ├── ImageService.java
│       │   └── impl/
│       ├── entity/             # 实体类
│       │   ├── GraphElement.java   # 抽象基类（多态JSON）
│       │   ├── TextElement.java
│       │   ├── ImageElement.java
│       │   ├── ArcElement.java
│       │   └── LineElement.java
│       └── util/
│           ├── GraphFileStorage.java  # JSON文件存储
│           └── CorsFilter.java
│
└── frontend/                   # React 前端
    └── src/
        ├── types/index.ts      # TypeScript 类型定义
        ├── api/index.ts        # 后端 API 客户端
        ├── engine/
        │   ├── renderer.ts     # Canvas 绘图引擎
        │   └── transform.ts    # 缩放/平移变换
        ├── store/
        │   └── useEditorStore.ts  # 状态管理
        ├── components/
        │   ├── canvas/CanvasEditor.tsx   # 核心画布组件
        │   ├── toolbar/Toolbar.tsx       # 工具栏
        │   ├── panel/PropertyPanel.tsx   # 属性面板
        │   └── dialogs/FileDialog.tsx    # 文件管理对话框
        └── App.tsx
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/files` | 获取所有文件列表 |
| POST | `/api/files` | 新建/保存图形文件 |
| GET | `/api/files/{id}` | 加载图形文件 |
| PUT | `/api/files/{id}` | 更新图形文件 |
| DELETE | `/api/files/{id}` | 删除图形文件 |
| POST | `/api/images/upload` | 上传PNG图片 |
| GET | `/api/images/{filename}` | 实时读取图片（无缓存） |

## 数据格式示例（JSON）

```json
{
  "id": "uuid-xxxx",
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
      "anticlockwise": false,
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
