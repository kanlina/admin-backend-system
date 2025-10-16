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

async function testSimpleUpload() {
  try {
    console.log('开始简化OSS上传测试...');
    
    // 创建简化的OSS客户端
    const client = new OSS({
      ...ossConfig,
      timeout: 120000, // 120秒超时
    });
    
    // 创建测试文件 (500KB)
    const testContent = 'A'.repeat(500 * 1024);
    const testBuffer = Buffer.from(testContent);
    
    console.log('测试文件大小:', testBuffer.length, '字节');
    
    const testFileName = `cpi_logo/simple-test-${Date.now()}.txt`;
    console.log('开始上传测试文件:', testFileName);
    
    const startTime = Date.now();
    
    // 使用简化配置上传
    const result = await client.put(testFileName, testBuffer, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
    
    const uploadTime = Date.now() - startTime;
    console.log('✅ 上传成功！');
    console.log('   耗时:', uploadTime, 'ms');
    console.log('   速度:', Math.round(testBuffer.length / uploadTime * 1000), '字节/秒');
    console.log('   URL:', result.url);
    
    // 设置权限
    try {
      await client.putACL(testFileName, 'public-read');
      console.log('✅ 权限设置成功');
    } catch (aclError) {
      console.log('⚠️ 权限设置失败:', aclError.message);
    }
    
    // 测试访问URL
    const publicUrl = `${ossConfig.bucketDomain}/${testFileName}`;
    console.log('公开访问URL:', publicUrl);
    
    // 清理测试文件
    console.log('清理测试文件...');
    await client.delete(testFileName);
    console.log('✅ 测试文件已删除');
    
    console.log('\n🎉 简化上传测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误类型:', error.name);
    console.error('错误代码:', error.code);
  }
}

// 运行测试
testSimpleUpload();
