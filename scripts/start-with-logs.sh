# #!/bin/bash

# # 创建日志目录
# mkdir -p logs

# # 启动服务器并重定向日志
# /Users/april/workspace/work/dex/meme-hand/mm-mcp/mcp-price-strategy-server.js 2>&1 | tee logs/mcp-server-$(date +%Y%m%d-%H%M%S).log



#!/bin/bash
# 文件: /Users/april/workspace/work/dex/meme-hand/mm-mcp/logs/mcp-server-wrapper.sh

LOG_DIR="/Users/april/workspace/work/dex/meme-hand/mm-mcp/logs"
LOG_FILE="$LOG_DIR/mcp-server-$(date +%Y%m%d-%H%M%S).log"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 启动服务器并记录日志
exec node /Users/april/workspace/work/dex/meme-hand/mm-mcp/mcp-price-strategy-server.js 2>&1 | tee "$LOG_FILE"