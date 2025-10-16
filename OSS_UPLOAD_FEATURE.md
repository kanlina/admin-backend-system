# CPI合作伙伴Logo OSS上传功能

## 功能概述
为CPI合作伙伴配置管理页面添加了Logo图片上传到阿里云OSS的功能，支持文件上传和URL输入两种方式。

## 技术架构

### 后端实现
1. **OSS配置** (`/backend/src/config/oss.ts`)
   - 阿里云OSS客户端配置
   - 文件上传到指定文件夹 (`cpi-partners/logos`)
   - 自动设置公开读权限
   - 支持文件删除功能

2. **文件上传中间件** (`/backend/src/middleware/upload.ts`)
   - 使用multer处理文件上传
   - 支持图片格式：JPEG, JPG, PNG, GIF, WebP, SVG
   - 文件大小限制：5MB
   - 内存存储模式

3. **上传控制器** (`/backend/src/controllers/uploadController.ts`)
   - Logo上传接口
   - 图片删除接口
   - 错误处理和响应

4. **上传路由** (`/backend/src/routes/upload.ts`)
   - `POST /api/upload/logo` - 上传Logo
   - `DELETE /api/upload/image` - 删除图片

### 前端实现
1. **API服务** (`/frontend/src/services/api.ts`)
   - `uploadLogo(file)` - 上传Logo文件
   - `deleteImage(url)` - 删除图片

2. **UI组件** (`/frontend/src/pages/CpiPartners.tsx`)
   - 文件上传组件
   - 实时预览功能
   - 上传状态管理

## OSS配置信息
```javascript
{
  "accessKeyId": process.env.OSS_ACCESS_KEY_ID,
  "accessKeySecret": process.env.OSS_ACCESS_KEY_SECRET,
  "endpoint": process.env.OSS_ENDPOINT,
  "bucketName": process.env.OSS_BUCKET,
  "bucketDomain": process.env.OSS_BUCKET_DOMAIN
}
```

**注意**：所有敏感信息已移至环境变量，请在`.env`文件中配置实际值。

## 功能特性

### 1. 文件上传
- **支持格式**: JPEG, JPG, PNG, GIF, WebP, SVG
- **文件大小**: 最大5MB
- **存储路径**: `cpi-partners/logos/`
- **文件命名**: `时间戳_随机字符串.扩展名`
- **权限设置**: 自动设置为公开读

### 2. 实时预览
- **预览尺寸**: 100px × 60px
- **实时更新**: 上传后立即显示预览
- **错误处理**: 图片加载失败时显示占位符
- **状态管理**: 上传中显示加载状态

### 3. 双重输入方式
- **URL输入**: 直接输入图片URL
- **文件上传**: 选择本地文件上传
- **自动同步**: 两种方式数据自动同步

## API接口

### 上传Logo
```http
POST /api/upload/logo
Content-Type: multipart/form-data

FormData:
- logo: File (图片文件)
```

**响应示例**:
```json
{
  "success": true,
  "message": "图片上传成功",
  "data": {
    "url": "https://pilih-kredit-2025.oss-ap-southeast-5.aliyuncs.com/cpi-partners/logos/1703123456789_abc123.jpg",
    "filename": "logo.jpg",
    "size": 12345,
    "mimetype": "image/jpeg"
  }
}
```

### 删除图片
```http
DELETE /api/upload/image
Content-Type: application/json

{
  "url": "https://pilih-kredit-2025.oss-ap-southeast-5.aliyuncs.com/cpi-partners/logos/1703123456789_abc123.jpg"
}
```

## 使用流程

### 1. 新增合作伙伴
1. 点击"添加配置"按钮
2. 在Logo字段选择上传文件或输入URL
3. 实时预览Logo效果
4. 填写其他信息并保存

### 2. 编辑合作伙伴
1. 点击"编辑"按钮
2. 自动加载现有Logo
3. 可以重新上传或修改URL
4. 保存更新

### 3. 文件管理
- 上传的文件自动存储到OSS
- 生成唯一的访问URL
- 支持文件删除功能
- 自动设置公开读权限

## 安全特性
- ✅ 文件类型验证
- ✅ 文件大小限制
- ✅ 唯一文件名生成
- ✅ 公开读权限控制
- ✅ 错误处理机制

## 性能优化
- ✅ 内存存储模式
- ✅ 异步上传处理
- ✅ 实时预览更新
- ✅ 上传状态反馈
- ✅ 错误重试机制

## 测试建议
1. 测试各种图片格式上传
2. 测试大文件上传限制
3. 测试无效文件类型处理
4. 测试网络异常情况
5. 测试文件删除功能
6. 验证OSS权限设置
7. 测试URL输入和文件上传的同步

## 注意事项
- OSS配置信息已硬编码，生产环境建议使用环境变量
- 文件上传使用内存存储，适合小文件
- 建议定期清理无用的图片文件
- 确保OSS账户有足够的存储空间
- 监控上传成功率和错误日志
