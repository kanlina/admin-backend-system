import OSS from 'ali-oss';
import dotenv from 'dotenv';

dotenv.config();

// OSS配置 - 从环境变量读取，避免密钥泄露
const ossConfig = {
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  endpoint: process.env.OSS_ENDPOINT || 'oss-ap-southeast-5.aliyuncs.com',
  bucket: process.env.OSS_BUCKET || 'pilih-kredit-2025-backend-test',
  bucketDomain: process.env.OSS_BUCKET_DOMAIN || 'https://pilih-kredit-2025-backend-test.oss-ap-southeast-5.aliyuncs.com'
};

// 创建OSS客户端，简化配置
export const ossClient = new OSS({
  ...ossConfig,
  timeout: 120000, // 120秒超时
});

// 上传文件到OSS
export const uploadToOSS = async (file: Express.Multer.File, folder: string = 'cpi_logo', appId?: string): Promise<string> => {
  try {
    console.log('开始上传到OSS:', {
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      folder: folder,
      appId: appId
    });

    // 生成文件名
    let fileName: string;
    if (appId) {
      // 使用appId作为文件名
      const fileExtension = file.originalname.split('.').pop();
      fileName = `${folder}/${appId}.${fileExtension}`;
    } else {
      // 使用时间戳和随机字符串
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.originalname.split('.').pop();
      fileName = `${folder}/${timestamp}_${randomStr}.${fileExtension}`;
    }
    
    console.log('生成的文件名:', fileName);
    
    // 上传文件，简化配置
    const result = await ossClient.put(fileName, file.buffer, {
      headers: {
        'Content-Type': file.mimetype,
        'Cache-Control': 'public, max-age=31536000', // 1年缓存
      }
    });
    
    console.log('OSS上传结果:', result);
    
    // 设置文件为公开读权限
    try {
      await ossClient.putACL(fileName, 'public-read');
      console.log('文件权限设置成功');
    } catch (aclError: any) {
      console.warn('设置文件权限失败，但上传成功:', aclError?.message || 'Unknown error');
      // 权限设置失败不影响上传成功
    }
    
    // 返回完整的访问URL
    const finalUrl = `${ossConfig.bucketDomain}/${fileName}`;
    console.log('最终URL:', finalUrl);
    
    return finalUrl;
  } catch (error: any) {
    console.error('OSS upload error:', error);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      status: error?.status
    });
    throw new Error(`文件上传失败: ${error?.message || 'Unknown error'}`);
  }
};

// 删除OSS文件
export const deleteFromOSS = async (url: string): Promise<boolean> => {
  try {
    // 从URL中提取文件名
    const fileName = url.replace(`${ossConfig.bucketDomain}/`, '');
    await ossClient.delete(fileName);
    return true;
  } catch (error) {
    console.error('OSS delete error:', error);
    return false;
  }
};

export default ossConfig;
