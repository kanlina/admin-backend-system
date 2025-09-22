# 使用 Node.js 18 官方镜像（Debian基础）
FROM node:18-slim

# 安装必要的系统依赖（包括 OpenSSL）
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 创建非 root 用户
RUN groupadd -g 1001 nodejs
RUN useradd -r -u 1001 -g nodejs nodejs

# 创建上传目录
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["npm", "start"]
