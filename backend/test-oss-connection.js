const OSS = require('ali-oss');
require('dotenv').config();

// OSS配置 - 从环境变量读取
const ossConfig = {
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  endpoint: process.env.OSS_ENDPOINT || 'oss-ap-southeast-5.aliyuncs.com',
  bucket: process.env.OSS_BUCKET || 'pilih-kredit-2025-backend-test',
  bucketDomain: process.env.OSS_BUCKET_DOMAIN || 'https://pilih-kredit-2025-backend-test.oss-ap-southeast-5.aliyuncs.com'
};

async function testOSSConnection() {
  try {
    console.log('开始测试OSS连接...');
    console.log('配置信息:', {
      accessKeyId: ossConfig.accessKeyId.substring(0, 10) + '...',
      endpoint: ossConfig.endpoint,
      bucket: ossConfig.bucket
    });

    // 创建OSS客户端
    const ossClient = new OSS(ossConfig);
    
    // 测试连接
    console.log('测试OSS连接...');
    const result = await ossClient.getBucketInfo();
    console.log('OSS连接成功!');
    console.log('Bucket信息:', {
      name: result.bucket.name,
      location: result.bucket.location,
      creationDate: result.bucket.creationDate
    });

    // 测试上传一个小文件到cpi_logo目录
    console.log('测试文件上传到cpi_logo目录...');
    const testContent = 'test file content for OSS connection test';
    const testFileName = `cpi_logo/test-connection-${Date.now()}.txt`;
    
    const uploadResult = await ossClient.put(testFileName, Buffer.from(testContent), {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
    
    console.log('文件上传成功!');
    console.log('上传结果:', {
      name: uploadResult.name,
      url: uploadResult.url,
      res: uploadResult.res.status
    });

    // 设置公开读权限
    await ossClient.putACL(testFileName, 'public-read');
    console.log('权限设置成功!');

    // 测试访问URL
    const publicUrl = `${ossConfig.bucketDomain}/${testFileName}`;
    console.log('公开访问URL:', publicUrl);

    // 清理测试文件
    await ossClient.delete(testFileName);
    console.log('测试文件已清理');

    console.log('✅ OSS连接测试完成，所有功能正常!');
    
  } catch (error) {
    console.error('❌ OSS连接测试失败:');
    console.error('错误类型:', error.name);
    console.error('错误信息:', error.message);
    console.error('错误代码:', error.code);
    console.error('状态码:', error.status);
    
    if (error.code === 'InvalidAccessKeyId') {
      console.error('🔑 AccessKeyId 无效，请检查配置');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('🔐 AccessKeySecret 无效，请检查配置');
    } else if (error.code === 'NoSuchBucket') {
      console.error('🪣 Bucket不存在，请检查bucket名称');
    } else if (error.code === 'AccessDenied') {
      console.error('🚫 访问被拒绝，请检查权限配置');
    }
  }
}

testOSSConnection();
