#!/bin/bash

# ========================================
# 清理Git历史中的阿里云密钥
# ========================================

set -e

echo "🔒 开始清理Git历史中的密钥..."

cd /Users/kanlina/IdeaProjects/admin-backend-system

# 1. 创建密钥替换配置
echo "📝 创建密钥替换配置..."
cat > .git-filter-secrets.txt << 'EOF'
literal:YOUR_OLD_ACCESS_KEY_ID==>process.env.OSS_ACCESS_KEY_ID
literal:YOUR_OLD_ACCESS_KEY_SECRET==>process.env.OSS_ACCESS_KEY_SECRET
EOF

# 2. 备份当前分支
echo "💾 创建备份分支..."
git branch backup-before-filter-$(date +%Y%m%d_%H%M%S)

# 3. 使用git filter-repo清理密钥（需要先安装）
if command -v git-filter-repo &> /dev/null; then
    echo "🧹 使用git-filter-repo清理历史..."
    git filter-repo --replace-text .git-filter-secrets.txt --force
    
    # 重新添加远程仓库
    git remote add origin https://github.com/kanlina/admin-backend-system.git
    
    echo "✅ 历史清理完成！"
    echo "📤 现在可以推送: git push origin main --force"
else
    echo "❌ 未找到git-filter-repo工具"
    echo "📦 请先安装: pip install git-filter-repo"
    echo ""
    echo "或者使用方案2：手动重置历史"
    exit 1
fi

# 清理临时文件
rm -f .git-filter-secrets.txt

echo ""
echo "⚠️  重要提醒："
echo "1. 历史已重写，需要使用 --force 推送"
echo "2. 推送后立即禁用旧密钥"
echo "3. 创建新密钥并更新.env文件"

