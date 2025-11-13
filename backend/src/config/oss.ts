import OSS from 'ali-oss';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// OSS配置 - 从环境变量读取，避免密钥泄露
const ossConfig = {
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  endpoint: process.env.OSS_ENDPOINT || 'oss-ap-southeast-5.aliyuncs.com',
  bucket: process.env.OSS_BUCKET || '998file',
  bucketDomain: process.env.OSS_BUCKET_DOMAIN || `https://${process.env.OSS_BUCKET || '998file'}.oss-ap-southeast-5.aliyuncs.com`
};

// 验证必需的配置项
if (!ossConfig.accessKeyId || !ossConfig.accessKeySecret) {
  throw new Error('OSS配置缺失：请设置环境变量 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET');
}

// 创建OSS客户端
export const ossClient = new OSS({
  ...ossConfig,
  timeout: 120000 // 120秒超时
});

const generateFileName = (folder: string, extension: string) => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const timestamp = date.getTime();
  const randomStr = Math.random().toString(36).substring(2, 10);
  return path.posix.join(folder, `${yyyy}/${mm}/${dd}/${timestamp}_${randomStr}${extension.startsWith('.') ? extension : `.${extension}`}`);
};

// 上传文件到OSS（针对multer file）
export const uploadToOSS = async (file: Express.Multer.File, folder: string = 'content') => {
  const ext = path.extname(file.originalname) || '.bin';
  return uploadBufferToOSS(file.buffer, ext, folder, file.mimetype);
};

// 以Buffer上传到OSS
export const uploadBufferToOSS = async (buffer: Buffer, extension: string, folder: string = 'content', mimeType = 'application/octet-stream'): Promise<string> => {
  try {
    const fileName = generateFileName(folder, extension);
    const result = await ossClient.put(fileName, buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000'
      }
    });

    try {
      await ossClient.putACL(fileName, 'public-read');
    } catch (aclError) {
      console.warn('设置OSS文件ACL失败:', aclError);
    }

    return result.url || `${ossConfig.bucketDomain}/${fileName}`;
  } catch (error: any) {
    console.error('OSS上传失败:', error);
    throw new Error(`文件上传失败: ${error?.message || 'Unknown error'}`);
  }
};

// 删除OSS文件
export const deleteFromOSS = async (url: string): Promise<boolean> => {
  try {
    const fileName = url.replace(`${ossConfig.bucketDomain}/`, '');
    await ossClient.delete(fileName);
    return true;
  } catch (error) {
    console.error('OSS delete error:', error);
    return false;
  }
};

export default ossConfig;
