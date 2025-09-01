#!/bin/bash

# MCP 限价策略服务测试脚本

echo "运行 MCP 限价策略服务测试..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到npm，请先安装npm"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 运行测试
echo "开始运行测试..."
npm test

# 检查测试结果
if [ $? -eq 0 ]; then
    echo "✅ 所有测试通过！"
else
    echo "❌ 测试失败，请检查错误信息"
    exit 1
fi
