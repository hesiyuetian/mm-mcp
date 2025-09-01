#!/bin/bash

# MCP 限价策略服务启动脚本

echo "启动 MCP 限价策略服务..."

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

# 检查配置文件
if [ ! -f ".env" ]; then
    echo "警告: 未找到.env文件，将使用默认配置"
    echo "建议创建.env文件并设置API_BASE_URL"
fi

# 启动服务
echo "启动服务..."
node mcp-price-strategy-server.js
