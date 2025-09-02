#!/bin/bash

echo "🚀 开始发布MCP包到npm..."
echo "📦 包名: mcp-price-strategy-server"
echo "🔧 功能: 限价策略交易MCP服务"
echo ""

# 检查npm登录状态
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ 请先登录npm账户:"
    echo "   npm login"
    echo ""
    echo "💡 如果没有npm账户，请先访问 https://www.npmjs.com/signup 注册"
    exit 1
fi

echo "✅ npm已登录: $(npm whoami)"
echo ""

# 检查包名可用性
echo "🔍 检查包名: mcp-price-strategy-server"
if npm view mcp-price-strategy-server > /dev/null 2>&1; then
    echo "⚠️  包已存在，将更新现有包"
    EXISTING_VERSION=$(npm view mcp-price-strategy-server version)
    echo "📋 现有版本: $EXISTING_VERSION"
else
    echo "✅ 包名可用"
fi
echo ""

# 检查当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 当前版本: $CURRENT_VERSION"

# 检查文件完整性
echo ""
echo "📁 检查发布文件..."
if [ ! -f "mcp-price-strategy-server.js" ]; then
    echo "❌ 错误: 主文件 mcp-price-strategy-server.js 不存在"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ 错误: package.json 不存在"
    exit 1
fi

if [ ! -f "README.md" ]; then
    echo "❌ 错误: README.md 不存在"
    exit 1
fi

echo "✅ 所有必要文件存在"
echo ""

# 确认发布
echo "📋 发布信息确认:"
echo "   包名: mcp-price-strategy-server"
echo "   版本: $CURRENT_VERSION"
echo "   描述: MCP服务 - 限价策略交易"
echo "   文件: mcp-price-strategy-server.js, utils/, config/, examples/, README.md, LICENSE"
echo ""
read -p "是否继续发布? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 发布已取消"
    exit 1
fi

# 发布到npm
echo ""
echo "📤 发布中..."
if npm publish; then
    echo ""
    echo "🎉 发布成功!"
    echo "📦 包名: mcp-price-strategy-server"
    echo "🏷️  版本: $CURRENT_VERSION"
    echo "🌐 npm: https://www.npmjs.com/package/mcp-price-strategy-server"
    echo ""
    echo "📖 使用方式:"
    echo "   # 直接运行"
    echo "   npx mcp-price-strategy-server@latest"
    echo ""
    echo "   # 全局安装"
    echo "   npm install -g mcp-price-strategy-server"
    echo "   mcp-price-strategy-server"
    echo ""
    echo "🔧 在Cursor MCP配置中使用:"
    echo "   {"
    echo "     \"mcpServers\": {"
    echo "       \"price-strategy\": {"
    echo "         \"command\": \"npx mcp-price-strategy-server@latest\","
    echo "         \"env\": {}"
    echo "       }"
    echo "     }"
    echo "   }"
    echo ""
    echo "🎯 下一步:"
    echo "   1. 在Cursor中添加MCP配置"
    echo "   2. 测试工具是否正常显示"
    echo "   3. 验证工具功能"
else
    echo ""
    echo "❌ 发布失败"
    echo "💡 可能的原因:"
    echo "   - 网络连接问题"
    echo "   - npm权限不足"
    echo "   - 包名冲突"
    echo "   - 依赖问题"
    exit 1
fi
