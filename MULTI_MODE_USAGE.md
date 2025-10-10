# MM MCP 多模式使用指南

MM MCP 服务器现在支持多种运行模式，包括 STDIO、SSE 和 Streamable HTTP 模式。

## 支持的模式

### 1. STDIO 模式（默认）
传统的标准输入输出模式，适用于 Claude Desktop 的本地配置。

**启动方式：**
```bash
npm start
# 或
npm run dev
```

**Claude Desktop 配置：**
```json
{
  "mcpServers": {
    "mm-strategy": {
      "command": "node",
      "args": ["/path/to/mm-mcp/src/index.js"],
      "env": {
        "SERVER_MODE": "stdio"
      }
    }
  }
}
```

### 2. SSE 模式
Server-Sent Events 模式，支持 HTTP 连接。

**启动方式：**
```bash
npm run start:sse
# 或
npm run dev:sse
```

**环境变量：**
- `SERVER_MODE=sse`
- `PORT=3000` (可选，默认 3000)
- `HOST=0.0.0.0` (可选，默认 0.0.0.0)

**Claude Desktop 配置：**
```json
{
  "mcpServers": {
    "mm-strategy": {
      "url": "http://localhost:3000/sse",
      "headers": {
        "Authorization": "your_token_here"
      }
    }
  }
}
```

### 3. Streamable HTTP 模式
基于 HTTP 的流式传输模式。

**启动方式：**
```bash
npm run start:streamable-http
# 或
npm run dev:streamable-http
```

**环境变量：**
- `SERVER_MODE=streamable-http`
- `PORT=3000` (可选，默认 3000)
- `HOST=0.0.0.0` (可选，默认 0.0.0.0)

**Claude Desktop 配置：**
```json
{
  "mcpServers": {
    "mm-strategy": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "your_token_here"
      }
    }
  }
}
```

### 4. 多模式（Multi-Mode）
同时支持 SSE 和 Streamable HTTP 模式。

**启动方式：**
```bash
npm run start:multi-mode
# 或
npm run dev:multi-mode
```

**环境变量：**
- `SERVER_MODE=multi-mode`
- `PORT=3000` (可选，默认 3000)
- `HOST=0.0.0.0` (可选，默认 0.0.0.0)

**访问路径：**
- SSE: `http://localhost:3000/sse`
- Streamable HTTP: `http://localhost:3000/mcp`

## Authorization Token 格式

对于 HTTP 模式，支持以下两种 Authorization Token 格式：

1. **Bearer Token 格式：**
   ```
   Authorization: Bearer your_token_here
   ```

2. **直接 Token 格式：**
   ```
   Authorization: your_token_here
   ```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `SERVER_MODE` | `stdio` | 服务器模式：stdio, sse, streamable-http, multi-mode |
| `PORT` | `3000` | HTTP 服务器端口（仅 HTTP 模式） |
| `HOST` | `0.0.0.0` | HTTP 服务器主机（仅 HTTP 模式） |

## 功能特性

- ✅ 保持原有 STDIO 模式功能不变
- ✅ 新增 SSE 模式支持
- ✅ 新增 Streamable HTTP 模式支持
- ✅ 新增多模式支持（同时提供 SSE 和 Streamable HTTP）
- ✅ 完整的 CORS 支持
- ✅ 详细的日志记录
- ✅ 优雅的错误处理
- ✅ 会话管理和清理

## 测试

所有模式都已通过测试：

```bash
# 测试 STDIO 模式
npm start

# 测试 SSE 模式
npm run start:sse

# 测试 Streamable HTTP 模式
npm run start:streamable-http

# 测试多模式
npm run start:multi-mode
```

## 注意事项

1. HTTP 模式需要提供有效的 Authorization Token
2. 不同模式使用不同的端口，避免冲突
3. 多模式可以同时处理 SSE 和 Streamable HTTP 请求
4. 所有模式都保持相同的功能接口，只是传输方式不同
