# 管理后台系统

一个功能完整的管理后台系统，包含用户管理、文章管理、标签管理等功能。

## 技术栈

### 后端
- **Node.js** - JavaScript 运行时
- **Express** - Web 框架
- **TypeScript** - 类型安全的 JavaScript
- **Prisma** - 现代化 ORM
- **SQLite** - 轻量级数据库（可切换到 MySQL/PostgreSQL）
- **JWT** - 身份认证
- **bcryptjs** - 密码加密

### 前端
- **React** - 用户界面库
- **TypeScript** - 类型安全的 JavaScript
- **Ant Design** - 企业级 UI 组件库
- **Vite** - 快速构建工具
- **React Router** - 路由管理
- **Axios** - HTTP 客户端

## 功能特性

- ✅ **用户认证** - 登录、注册、JWT 认证
- ✅ **权限管理** - 基于角色的访问控制（RBAC）
- ✅ **用户管理** - 用户列表、编辑、删除（管理员）
- ✅ **文章管理** - 创建、编辑、发布、归档文章
- ✅ **标签管理** - 标签的创建和管理
- ✅ **仪表盘** - 数据统计和概览
- ✅ **响应式设计** - 支持移动端和桌面端
- ✅ **API 文档** - RESTful API 设计

## 用户角色

### 管理员 (ADMIN)
- 管理所有用户
- 管理所有文章
- 管理系统设置
- 拥有最高权限

### 版主 (MODERATOR)
- 管理文章
- 管理标签
- 查看用户信息

### 普通用户 (USER)
- 创建和管理自己的文章
- 查看公开内容

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0

### 安装和运行

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd admin-backend-system
   ```

2. **安装后端依赖**
   ```bash
   cd backend
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp env.example .env
   # 编辑 .env 文件，配置数据库连接等信息
   ```

4. **初始化数据库**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **启动后端服务**
   ```bash
   npm run dev
   ```

6. **安装前端依赖**
   ```bash
   cd ../frontend
   npm install
   ```

7. **配置前端环境变量**
   ```bash
   cp env.example .env
   # 编辑 .env 文件，配置 API 地址
   ```

8. **启动前端服务**
   ```bash
   npm run dev
   ```

9. **访问应用**
   - 前端: http://localhost:5173
   - 后端 API: http://localhost:3001
   - 数据库管理: `npm run db:studio`

### 默认账户

**管理员账户:**
- 用户名: `admin`
- 密码: `admin123`
- 邮箱: `admin@example.com`

**测试用户账户:**
- 用户名: `testuser`
- 密码: `user123`
- 邮箱: `user@example.com`

## API 文档

### 认证接口

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/profile` - 获取用户信息

### 用户管理接口

- `GET /api/users` - 获取用户列表（管理员）
- `GET /api/users/:id` - 获取用户详情
- `PUT /api/users/:id` - 更新用户信息
- `DELETE /api/users/:id` - 删除用户（管理员）
- `GET /api/users/stats` - 获取用户统计（管理员）

### 文章管理接口

- `GET /api/posts` - 获取文章列表
- `GET /api/posts/:id` - 获取文章详情
- `POST /api/posts` - 创建文章（需认证）
- `PUT /api/posts/:id` - 更新文章（作者或管理员）
- `DELETE /api/posts/:id` - 删除文章（作者或管理员）
- `GET /api/posts/stats` - 获取文章统计（需认证）

### 标签管理接口

- `GET /api/tags` - 获取标签列表
- `GET /api/tags/all` - 获取所有标签
- `GET /api/tags/:id` - 获取标签详情
- `POST /api/tags` - 创建标签（需认证）
- `PUT /api/tags/:id` - 更新标签（需认证）
- `DELETE /api/tags/:id` - 删除标签（管理员）
- `GET /api/tags/popular` - 获取热门标签

## 项目结构

```
admin-backend-system/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由
│   │   ├── services/       # 业务逻辑
│   │   ├── types/          # 类型定义
│   │   ├── utils/          # 工具函数
│   │   └── index.ts        # 入口文件
│   ├── prisma/             # 数据库相关
│   │   ├── schema.prisma   # 数据库模式
│   │   └── seed.ts         # 数据种子
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── services/       # API 服务
│   │   ├── types/          # 类型定义
│   │   ├── contexts/       # React Context
│   │   ├── hooks/          # 自定义 Hooks
│   │   └── utils/          # 工具函数
│   └── package.json
└── README.md
```

## 部署指南

### 生产环境部署

1. **构建前端**
   ```bash
   cd frontend
   npm run build
   ```

2. **构建后端**
   ```bash
   cd backend
   npm run build
   ```

3. **配置生产环境变量**
   - 设置 `NODE_ENV=production`
   - 配置生产数据库连接
   - 设置安全的 JWT 密钥

4. **启动生产服务**
   ```bash
   npm start
   ```

### Docker 部署

```dockerfile
# Dockerfile 示例
FROM node:18-alpine

WORKDIR /app

# 复制后端代码
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

## 开发指南

### 添加新功能

1. **后端开发**
   - 在 `src/services/` 中添加业务逻辑
   - 在 `src/controllers/` 中添加控制器
   - 在 `src/routes/` 中添加路由
   - 更新数据库模式（如需要）

2. **前端开发**
   - 在 `src/pages/` 中添加新页面
   - 在 `src/components/` 中添加组件
   - 在 `src/services/` 中添加 API 调用

### 数据库迁移

```bash
# 创建迁移
npm run db:migrate

# 应用迁移
npm run db:push

# 重置数据库
npx prisma migrate reset
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如果您遇到任何问题或有任何建议，请：

1. 查看 [Issues](../../issues) 页面
2. 创建新的 Issue
3. 联系维护者

---

**注意**: 这是一个示例项目，请根据实际需求进行修改和扩展。
