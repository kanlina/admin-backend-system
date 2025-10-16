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

async function testOptimizedUpload() {
  try {
    console.log('开始优化后的OSS上传测试...');
    
    // 创建优化的OSS客户端
    const client = new OSS({
      ...ossConfig,
      timeout: 60000, // 60秒超时
      secure: true, // 使用HTTPS
      cname: false, // 不使用自定义域名
    });
    
    // 创建不同大小的测试文件
    const testSizes = [
      { size: 100 * 1024, name: '100KB' },    // 100KB
      { size: 500 * 1024, name: '500KB' },   // 500KB
      { size: 1024 * 1024, name: '1MB' },    // 1MB
    ];
    
    for (const test of testSizes) {
      console.log(`\n测试 ${test.name} 文件上传...`);
      
      // 创建测试文件
      const testContent = 'A'.repeat(test.size);
      const testBuffer = Buffer.from(testContent);
      
      const testFileName = `cpi_logo/optimized-test-${test.name}-${Date.now()}.txt`;
      
      const startTime = Date.now();
      
      try {
        // 使用优化配置上传
        const result = await client.put(testFileName, testBuffer, {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=31536000'
          },
          timeout: 60000, // 60秒超时
          partSize: 1024 * 1024, // 1MB分片大小
          parallel: 4, // 4个并发上传
        });
        
        const uploadTime = Date.now() - startTime;
        const speed = Math.round(testBuffer.length / uploadTime * 1000);
        
        console.log(`✅ ${test.name} 上传成功`);
        console.log(`   耗时: ${uploadTime}ms`);
        console.log(`   速度: ${speed} 字节/秒`);
        console.log(`   URL: ${result.url}`);
        
        // 设置权限
        try {
          await client.putACL(testFileName, 'public-read');
          console.log(`   权限设置成功`);
        } catch (aclError) {
          console.log(`   ⚠️ 权限设置失败: ${aclError.message}`);
        }
        
        // 清理测试文件
        await client.delete(testFileName);
        console.log(`   测试文件已清理`);
        
        // 性能评估
        if (uploadTime < 2000) {
          console.log(`   🚀 性能优秀 (< 2秒)`);
        } else if (uploadTime < 5000) {
          console.log(`   ✅ 性能良好 (2-5秒)`);
        } else if (uploadTime < 10000) {
          console.log(`   ⚠️ 性能一般 (5-10秒)`);
        } else {
          console.log(`   ❌ 性能较差 (> 10秒)`);
        }
        
      } catch (error) {
        console.error(`❌ ${test.name} 上传失败:`, error.message);
        
        // 清理可能存在的文件
        try {
          await client.delete(testFileName);
        } catch (cleanupError) {
          // 忽略清理错误
        }
      }
    }
    
    console.log('\n🎉 优化上传测试完成！');
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testOptimizedUpload();
