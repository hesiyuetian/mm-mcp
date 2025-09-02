#!/bin/bash

# 快速发布脚本
echo "🚀 MCP包快速发布"

# 检查npm登录状态
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ 请先登录npm: npm login"
    exit 1
fi

echo "✅ npm已登录"

# 检查包名
echo "🔍 检查包名: mcp-price-strategy-server"
if npm view mcp-price-strategy-server > /dev/null 2>&1; then
    echo "⚠️  包已存在，将更新"
else
    echo "✅ 包名可用"
fi

# 发布
echo "📤 发布中..."
npm publish

echo "🎉 发布完成!"
echo "📦 使用方式: npx mcp-price-strategy-server@latest"
echo "🌐 查看: https://www.npmjs.com/package/mcp-price-strategy-server"
