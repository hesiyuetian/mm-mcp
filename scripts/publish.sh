#!/bin/bash

# MCP包发布脚本
# 使用方法: ./scripts/publish.sh [patch|minor|major]

set -e

echo "🚀 开始发布MCP包..."

# 检查参数
VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "❌ 错误: 版本类型必须是 patch, minor, 或 major"
    echo "使用方法: ./scripts/publish.sh [patch|minor|major]"
    exit 1
fi

echo "📦 版本类型: $VERSION_TYPE"

# 检查是否在正确的分支
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "⚠️  警告: 当前不在main分支 (当前分支: $CURRENT_BRANCH)"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查工作目录是否干净
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ 错误: 工作目录不干净，请先提交所有更改"
    git status --short
    exit 1
fi

# 检查是否已登录npm
echo "🔐 检查npm登录状态..."
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ 错误: 未登录npm，请先运行 'npm login'"
    exit 1
fi

echo "✅ npm登录状态正常"

# 检查包名可用性
echo "🔍 检查包名可用性..."
if npm view mcp-price-strategy-server > /dev/null 2>&1; then
    echo "⚠️  警告: 包名已存在，将更新现有包"
else
    echo "✅ 包名可用"
fi

# 更新版本号
echo "📝 更新版本号..."
npm version $VERSION_TYPE --no-git-tag-version

# 获取新版本号
NEW_VERSION=$(node -p "require('./package.json').version")
echo "🆕 新版本: $NEW_VERSION"

# 提交版本更新
echo "💾 提交版本更新..."
git add package.json
git commit -m "chore: bump version to $NEW_VERSION"

# 创建标签
echo "🏷️  创建版本标签..."
git tag "v$NEW_VERSION"

# 发布到npm
echo "📤 发布到npm..."
npm publish

# 推送到GitHub
echo "📤 推送到GitHub..."
git push origin main
git push origin "v$NEW_VERSION"

echo "🎉 发布完成!"
echo "📦 包名: mcp-price-strategy-server"
echo "🏷️  版本: $NEW_VERSION"
echo "🌐 npm: https://www.npmjs.com/package/mcp-price-strategy-server"
echo "📖 使用方式: npx mcp-price-strategy-server@latest"
