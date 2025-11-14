# Content 内容管理功能迁移说明

## 概述

已成功将 id-998 项目中的 Content（内容管理）功能迁移到 admin-backend-system 项目中。

## 已完成的工作

### 1. 后端实现

#### 数据库连接
- ✅ 在 `backend/src/utils/database.ts` 中添加了 `createId998DbConnection()` 函数
- ✅ 支持通过环境变量 `ID998_DB_NAME` 配置数据库名（默认使用主数据库）

#### 服务层
- ✅ 创建了 `backend/src/services/contentService.ts`
  - 实现了内容的 CRUD 操作
  - 支持分页查询、筛选
  - 支持分类树形结构
  - 支持富文本内容保存
  - 支持启用/禁用状态切换

#### 控制器
- ✅ 创建了 `backend/src/controllers/contentController.ts`
  - GET `/api/content` - 获取内容列表
  - GET `/api/content/:id` - 获取内容详情
  - POST `/api/content` - 创建内容
  - PUT `/api/content/:id` - 更新内容
  - DELETE `/api/content/:id` - 删除内容
  - POST `/api/content/batch-delete` - 批量删除
  - GET `/api/content/categories` - 获取分类列表
  - POST `/api/content/:id/detail` - 保存内容详情（富文本）
  - POST `/api/content/:id/toggle-enabled` - 切换启用状态

#### 路由
- ✅ 创建了 `backend/src/routes/content.ts`
- ✅ 在 `backend/src/index.ts` 中注册了路由

### 2. 前端实现

#### API 服务
- ✅ 在 `frontend/src/services/api.ts` 中添加了 Content 相关的 API 方法

#### 页面组件
- ✅ 创建了 `frontend/src/pages/Content.tsx`
  - 内容列表展示（支持分页、筛选）
  - 新增/编辑内容
  - 内容详情编辑（富文本）
  - 批量删除
  - 启用/禁用状态切换
  - 图片上传（缩略图）

#### 路由和菜单
- ✅ 在 `frontend/src/components/AppContent.tsx` 中添加了路由
- ✅ 在 `frontend/src/components/Layout/Sidebar.tsx` 中添加了菜单项

### 3. 数据库

- ✅ 创建了 `backend/init_content_table.sql` 表结构脚本
- ✅ 更新了 `backend/env.example` 添加数据库配置说明

## 数据库配置

### 方式一：使用同一数据库（推荐）

如果 id-998 项目的 `content` 表已经在 `pk_credit_admin` 数据库中，无需额外配置，直接使用即可。

### 方式二：使用不同数据库

如果 id-998 项目的 `content` 表在其他数据库中：

1. 在 `.env` 文件中设置：
```env
ID998_DB_NAME="your_database_name"
```

2. 确保数据库连接配置正确（使用相同的 host、port、user、password）

## 功能特性

### 已实现功能

1. **内容列表管理**
   - 分页查询
   - 按标题搜索
   - 按状态筛选（启用/禁用）
   - 批量删除

2. **内容编辑**
   - 新增内容
   - 编辑内容基本信息（标题、副标题、作者、别名、缩略图）
   - 编辑内容详情（富文本 HTML）

3. **状态管理**
   - 启用/禁用切换
   - 自动设置发布时间和 URL 路径

4. **分类管理**
   - 获取分类树形结构（API 已实现，前端可扩展）

### 待完善功能

1. **图片上传**
   - 当前前端使用 base64，需要对接 OSS 上传接口
   - 参考 id-998 项目的 `ContentControl.php` 中的 `upload()` 方法

2. **富文本编辑器**
   - 当前使用简单的 TextArea，建议集成富文本编辑器（如 Quill、TinyMCE）

3. **分类选择**
   - 在新增/编辑时可以选择分类（parentId）

4. **内容预览**
   - 添加内容预览功能

## 使用说明

1. **启动后端服务**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **启动前端服务**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **访问内容管理**
   - 登录系统后，在侧边栏点击"内容管理"
   - 或直接访问 `/content` 路由

## 注意事项

1. **数据库连接**
   - 确保数据库连接配置正确
   - 如果 content 表不存在，需要执行 `init_content_table.sql` 创建表

2. **权限控制**
   - 当前所有 Content 接口都需要认证（`authenticateToken`）
   - 可根据需要添加角色权限控制

3. **数据兼容性**
   - 默认 `appId = 15`（id-998 项目的 appId）
   - 默认 `parentId = 10`（id-998 项目的固定父类）
   - 可根据实际需求调整

4. **图片上传**
   - 需要配置 OSS 相关环境变量
   - 需要实现图片上传接口（参考 id-998 项目的实现）

## API 接口文档

### 获取内容列表
```
GET /api/content?page=1&pageSize=10&title=搜索词&enabled=1&appId=15
```

### 获取内容详情
```
GET /api/content/:id
```

### 创建内容
```
POST /api/content
Body: {
  title: string,
  subtitle?: string,
  author?: string,
  alias?: string,
  titleImg01?: string,
  enabled?: number,
  appId?: number
}
```

### 更新内容
```
PUT /api/content/:id
Body: { ... }
```

### 删除内容
```
DELETE /api/content/:id
```

### 批量删除
```
POST /api/content/batch-delete
Body: { ids: [1, 2, 3] }
```

### 获取分类列表
```
GET /api/content/categories?appId=15
```

### 保存内容详情（富文本）
```
POST /api/content/:id/detail
Body: { content: "<html>...</html>" }
```

### 切换启用状态
```
POST /api/content/:id/toggle-enabled
Body: { enabled: 1 }
```

## 后续优化建议

1. 集成富文本编辑器
2. 实现图片上传到 OSS
3. 添加内容分类选择功能
4. 添加内容预览功能
5. 添加内容排序功能
6. 添加内容标签功能
7. 优化搜索功能（支持全文搜索）

