# 构建阶段
FROM node:18-alpine as builder

# 设置时区为上海
ENV TZ=Asia/Shanghai
RUN apk add --no-cache tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 设置生产环境变量
ENV VITE_API_URL=http://147.139.188.108:3001/api

# 构建应用
RUN npm run build

# 生产阶段 - 使用简单的静态文件服务器
FROM node:18-alpine

# 设置时区为上海
ENV TZ=Asia/Shanghai
RUN apk add --no-cache tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone

# 安装serve包用于静态文件服务
RUN npm install -g serve

# 复制构建结果
COPY --from=builder /app/dist /app/dist

# 设置工作目录
WORKDIR /app

# 暴露端口
EXPOSE 3000

# 启动静态文件服务器
CMD ["serve", "-s", "dist", "-l", "3000"]
