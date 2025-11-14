import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// 导入路由
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import tagRoutes from './routes/tags';
import internalTransferRoutes from './routes/internalTransfer';
import attributionDataRoutes from './routes/attributionData';
import apiPartnerRoutes from './routes/apiPartner';
import contentRoutes from './routes/content';
import pushConfigRoutes from './routes/pushConfig';
import pushAudienceRoutes from './routes/pushAudience';
import pushTemplateRoutes from './routes/pushTemplate';
import pushTaskRoutes from './routes/pushTask';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS 配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://147.139.188.108:3000', 'https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// 请求限制 - 为登录接口设置更宽松的限制
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP每15分钟最多100个请求
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试',
  },
});

// 登录接口专用限流器 - 更宽松的限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 20, // 限制每个IP每15分钟最多20次登录尝试
  message: {
    success: false,
    error: '登录尝试过于频繁，请稍后再试',
  },
  skipSuccessfulRequests: true, // 成功的请求不计入限制
});

// 应用限流器
app.use(generalLimiter);

// 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString(),
  });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api', internalTransferRoutes);
app.use('/api', attributionDataRoutes);
app.use('/api/api-partner-configs', apiPartnerRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/push-configs', pushConfigRoutes);
app.use('/api', pushAudienceRoutes);
app.use('/api/push-templates', pushTemplateRoutes);
app.use('/api/push-tasks', pushTaskRoutes);

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
  });
});

// 全局错误处理
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : error.message,
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`🔗 API 文档: http://localhost:${PORT}/api`);
});

export default app;
