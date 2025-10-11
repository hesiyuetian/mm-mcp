# MM-MCP 重构后项目结构

## 📁 项目结构

```
mm-mcp/
├── src/
│   ├── tools/                    # 工具模块（参考 binance-mcp-server 格式）
│   │   ├── index.ts             # 统一导出文件
│   │   ├── projects.ts          # 项目相关工具
│   │   ├── tokens.ts            # Token 相关工具
│   │   ├── wallets.ts           # 钱包相关工具
│   │   └── strategies.ts        # 策略相关工具
│   ├── utils/
│   │   └── logger.ts            # 日志工具（TypeScript 版本）
│   ├── index-refactored.ts      # 重构后的主入口文件
│   └── server-refactored.ts     # 重构后的服务器文件
├── utils/                       # 原有工具文件
│   ├── api-client.js
│   ├── logger.js
│   └── validator.js
├── config/
│   └── index.js
└── 其他文件...
```

## 🔧 重构内容

### 1. 工具模块化
- **projects.ts**: 项目列表查询工具
- **tokens.ts**: Token 列表查询工具
- **wallets.ts**: 钱包列表查询工具
- **strategies.ts**: 所有策略创建工具
  - 限价策略 (createPriceStrategy)
  - 定时策略 (createTimeStrategy)
  - 拉砸策略 (createMarketManipulationStrategy)
  - 拆分策略 (createPortfolioExchangeStrategy)
  - 刷量策略 (createBundleSwapStrategy)
  - PumpSwap狙击策略 (createPumpSniperStrategy)
  - Raydium狙击策略 (createRaydiumSniperStrategy)

### 2. 统一的工具接口
每个工具文件都包含：
- `createXXXTools()`: 创建工具定义
- `handleXXXTool()`: 处理工具调用

### 3. 改进的错误处理
- 统一的错误返回格式
- 详细的日志记录
- 更好的错误信息

### 4. TypeScript 支持
- 添加了 TypeScript 类型定义
- 改进了类型安全性
- 更好的 IDE 支持

## 🚀 使用方法

### 启动服务器

```bash
# 使用重构后的文件
node src/index-refactored.js

# 或者使用 HTTP 模式
SERVER_MODE=sse node src/server-refactored.js
```

### 工具调用示例

```javascript
// 获取项目列表
{
  "name": "getProjects",
  "arguments": {}
}

// 获取 Token 列表
{
  "name": "getTokens",
  "arguments": {
    "projectId": "proj_1234567890"
  }
}

// 创建限价策略
{
  "name": "createPriceStrategy",
  "arguments": {
    "tokenId": "token_1234567890",
    "side": "buy",
    "targetPrice": 0.001,
    "walletIds": ["wallet_1", "wallet_2"],
    "tradingType": "inside",
    "amountType": "fixed",
    "amount": 1.0
  }
}
```

## 📋 工具列表

### 项目管理
- `getProjects`: 获取项目列表

### Token 管理
- `getTokens`: 获取 Token 列表

### 钱包管理
- `getWallets`: 获取钱包列表

### 策略管理
- `createPriceStrategy`: 创建限价策略
- `createTimeStrategy`: 创建定时策略
- `createMarketManipulationStrategy`: 创建拉砸策略
- `createPortfolioExchangeStrategy`: 创建拆分策略
- `createBundleSwapStrategy`: 创建刷量策略
- `createPumpSniperStrategy`: 创建 PumpSwap 狙击策略
- `createRaydiumSniperStrategy`: 创建 Raydium 狙击策略

## 🔄 迁移指南

### 从旧版本迁移

1. **备份现有文件**
   ```bash
   cp src/index.js src/index-backup.js
   cp src/server.js src/server-backup.js
   ```

2. **使用新文件**
   ```bash
   # 替换入口文件
   mv src/index-refactored.js src/index-new.js
   mv src/server-refactored.js src/server-new.js
   ```

3. **更新启动脚本**
   ```bash
   # 更新 package.json 中的启动脚本
   "start": "node src/index-new.js"
   ```

### 配置更新

确保以下配置正确：
- API Token 配置
- 服务器端口配置
- 日志路径配置

## 🎯 优势

1. **模块化设计**: 每个功能模块独立，便于维护
2. **类型安全**: TypeScript 支持，减少运行时错误
3. **统一接口**: 所有工具使用相同的接口模式
4. **更好的错误处理**: 统一的错误格式和日志记录
5. **易于扩展**: 新增工具只需添加对应模块
6. **代码复用**: 公共逻辑可以轻松复用

## 📝 注意事项

1. 新文件使用 `.ts` 扩展名，需要 TypeScript 编译
2. 导入路径已更新，确保所有依赖正确
3. 日志系统已升级，支持更好的调试
4. 错误处理更加完善，提供更详细的错误信息

## 🔧 开发建议

1. 新增工具时，按照现有模式创建对应的工具文件
2. 使用 TypeScript 类型定义，提高代码质量
3. 遵循统一的错误处理和日志记录模式
4. 保持工具接口的一致性
