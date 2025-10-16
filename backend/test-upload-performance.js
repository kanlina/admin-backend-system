const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// OSS配置 - 从环境变量读取
const ossConfig = {
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  endpoint: process.env.OSS_ENDPOINT || 'oss-ap-southeast-5.aliyuncs.com',
  bucket: process.env.OSS_BUCKET || 'pilih-kredit-2025-backend-test',
  bucketDomain: process.env.OSS_BUCKET_DOMAIN || 'https://pilih-kredit-2025-backend-test.oss-ap-southeast-5.aliyuncs.com'
};

async function testUploadPerformance() {
  try {
    console.log('开始OSS上传性能测试...');
    const client = new OSS(ossConfig);
    
    // 创建一个测试文件
    const testContent = 'A'.repeat(500 * 1024); // 500KB测试文件
    const testBuffer = Buffer.from(testContent);
    
    console.log('测试文件大小:', testBuffer.length, '字节');
    
    // 测试上传性能
    const testFileName = `cpi_logo/performance-test-${Date.now()}.txt`;
    console.log('开始上传测试文件:', testFileName);
    
    const startTime = Date.now();
    
    const result = await client.put(testFileName, testBuffer, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
    
    const uploadTime = Date.now() - startTime;
    console.log('上传完成，耗时:', uploadTime, 'ms');
    console.log('上传速度:', Math.round(testBuffer.length / uploadTime * 1000), '字节/秒');
    console.log('上传结果:', result.url);
    
    // 设置公开读权限
    console.log('设置公开读权限...');
    await client.putACL(testFileName, 'public-read');
    console.log('权限设置完成');
    
    // 测试访问URL
    const publicUrl = `${ossConfig.bucketDomain}/${testFileName}`;
    console.log('公开访问URL:', publicUrl);
    
    // 清理测试文件
    console.log('清理测试文件...');
    await client.delete(testFileName);
    console.log('测试文件已删除');
    
    console.log('OSS上传性能测试完成！');
    
    // 性能评估
    if (uploadTime < 5000) {
      console.log('✅ 上传速度良好 (< 5秒)');
    } else if (uploadTime < 10000) {
      console.log('⚠️ 上传速度一般 (5-10秒)');
    } else {
      console.log('❌ 上传速度较慢 (> 10秒)');
    }
    
  } catch (error) {
    console.error('OSS性能测试失败:', error);
    console.error('错误详情:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status
    });
  }
}

// 运行测试
testUploadPerformance();
