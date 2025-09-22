#!/bin/bash

# 管理后台系统启动脚本

echo "🚀 启动管理后台系统..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 和 npm 已安装"

# 进入后端目录
cd backend

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 创建环境变量文件..."
    cp env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
fi

# 生成 Prisma 客户端
echo "🔧 生成 Prisma 客户端..."
npm run db:generate
if [ $? -ne 0 ]; then
    echo "❌ Prisma 客户端生成失败"
    exit 1
fi

# 推送数据库模式
echo "🗄️ 初始化数据库..."
npm run db:push
if [ $? -ne 0 ]; then
    echo "❌ 数据库初始化失败"
    exit 1
fi

# 运行数据种子
echo "🌱 运行数据种子..."
npm run db:seed
if [ $? -ne 0 ]; then
    echo "❌ 数据种子运行失败"
    exit 1
fi

# 启动后端服务（后台运行）
echo "🔄 启动后端服务..."
npm run dev &
BACKEND_PID=$!

# 等待后端服务启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查后端服务是否启动成功
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ 后端服务启动成功 (PID: $BACKEND_PID)"

# 进入前端目录
cd ../frontend

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
fi

# 检查前端环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 创建前端环境变量文件..."
    cp env.example .env
    echo "✅ 已创建前端 .env 文件"
fi

# 启动前端服务
echo "🔄 启动前端服务..."
npm run dev &
FRONTEND_PID=$!

# 等待前端服务启动
echo "⏳ 等待前端服务启动..."
sleep 5

echo ""
echo "🎉 管理后台系统启动成功！"
echo ""
echo "📱 前端地址: http://localhost:5173"
echo "🔗 后端 API: http://localhost:3001"
echo "📊 健康检查: http://localhost:3001/health"
echo ""
echo "👤 默认管理员账户:"
echo "   用户名: admin"
echo "   密码: admin123"
echo ""
echo "👤 测试用户账户:"
echo "   用户名: testuser"
echo "   密码: user123"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户中断
wait

# 清理进程
echo ""
echo "🛑 正在停止服务..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null
echo "✅ 服务已停止"
