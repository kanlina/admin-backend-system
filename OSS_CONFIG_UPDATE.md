# OSS配置更新说明

## 更新内容

### 1. OSS配置信息
已更新为新的OSS配置（通过环境变量配置）：
```javascript
{
  "accessKeyId": process.env.OSS_ACCESS_KEY_ID,
  "accessKeySecret": process.env.OSS_ACCESS_KEY_SECRET,
  "endpoint": process.env.OSS_ENDPOINT || "oss-ap-southeast-5.aliyuncs.com",
  "bucketName": process.env.OSS_BUCKET || "pilih-kredit-2025-backend-test",
  "bucketDomain": process.env.OSS_BUCKET_DOMAIN || "https://pilih-kredit-2025-backend-test.oss-ap-southeast-5.aliyuncs.com"
}
```

**安全说明**：AccessKey和Secret现在从环境变量读取，请在`.env`文件中配置实际值。

### 2. 上传目录
- **原目录**: `cpi-partners/logos/`
- **新目录**: `cpi_logo/`
- **完整路径**: `oss://pilih-kredit-2025-backend-test/cpi_logo/`

### 3. 文件命名规则
上传的文件将按以下规则命名：
```
cpi_logo/{timestamp}_{randomString}.{extension}
```

示例：
```
cpi_logo/1703123456789_abc123def456.jpg
cpi_logo/1703123456790_xyz789uvw012.png
```

### 4. 访问URL格式
上传成功后的访问URL格式：
```
https://pilih-kredit-2025-backend-test.oss-ap-southeast-5.aliyuncs.com/cpi_logo/{filename}
```

示例：
```
https://pilih-kredit-2025-backend-test.oss-ap-southeast-5.aliyuncs.com/cpi_logo/1703123456789_abc123def456.jpg
```

## 修改的文件

### 1. 后端配置文件
- **文件**: `/backend/src/config/oss.ts`
- **修改**: 更新OSS配置信息和默认目录

### 2. 上传控制器
- **文件**: `/backend/src/controllers/uploadController.ts`
- **修改**: 更新上传目录为 `cpi_logo`

### 3. 测试脚本
- **文件**: `/backend/test-oss-connection.js`
- **修改**: 更新测试文件上传目录

## 功能特性

### 1. 文件上传
- ✅ 支持多种图片格式 (JPEG, PNG, GIF, WebP, SVG)
- ✅ 文件大小限制: 5MB
- ✅ 自动生成唯一文件名
- ✅ 设置公开读权限

### 2. 目录结构
```
pilih-kredit-2025-backend-test/
└── cpi_logo/
    ├── 1703123456789_abc123def456.jpg
    ├── 1703123456790_xyz789uvw012.png
    └── ...
```

### 3. 权限设置
- ✅ 自动设置 `public-read` 权限
- ✅ 支持直接访问URL
- ✅ 设置缓存策略 (1年)

## 测试步骤

### 1. 测试OSS连接
```bash
cd backend
node test-oss-connection.js
```

### 2. 测试文件上传
1. 启动后端服务
2. 打开前端页面
3. 尝试上传Logo文件
4. 检查返回的URL格式

### 3. 验证上传结果
- 检查OSS控制台中的 `cpi_logo` 目录
- 验证文件权限设置
- 测试URL直接访问

## 注意事项

### 1. 权限要求
- 确保AccessKey有OSS的读写权限
- 确保对 `pilih-kredit-2025-backend-test` bucket的访问权限

### 2. 目录管理
- 所有CPI合作伙伴Logo将存储在 `cpi_logo/` 目录
- 建议定期清理无用的文件
- 监控存储使用量

### 3. 安全考虑
- AccessKey和Secret已硬编码，生产环境建议使用环境变量
- 定期轮换AccessKey
- 监控异常访问

## 故障排除

### 1. 上传失败
- 检查OSS配置是否正确
- 验证AccessKey权限
- 查看后端控制台错误日志

### 2. 权限问题
- 确认bucket权限设置
- 检查AccessKey的权限范围
- 验证文件ACL设置

### 3. 网络问题
- 检查endpoint配置
- 验证网络连接
- 查看防火墙设置

## 监控建议

### 1. 上传成功率
- 监控上传成功/失败比例
- 记录错误日志
- 设置告警机制

### 2. 存储使用
- 监控存储空间使用量
- 定期清理过期文件
- 设置存储告警

### 3. 访问统计
- 监控文件访问频率
- 分析热门文件
- 优化缓存策略
