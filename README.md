# MCP 限价策略服务

这是一个基于 Model Context Protocol (MCP)的限价策略交易服务，实现了完整的策略下单流程。

## 功能特性

该 MCP 服务提供以下工具：

1. **账户登录** (`login`) - 用户身份验证
2. **获取项目列表** (`getProjects`) - 获取用户的项目列表
3. **获取 Token 列表** (`getTokens`) - 根据项目 ID 获取 Token 列表
4. **获取钱包列表** (`getWallets`) - 根据 TokenId 获取可用钱包
5. **创建限价策略** (`createPriceStrategy`) - 限价策略下单
6. **获取策略列表** (`getStrategies`) - 查看已创建的策略
7. **删除策略** (`deleteStrategy`) - 删除指定策略

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
API_BASE_URL=http://your-api-server.com
```

### 3. 运行服务

```bash
npm start
```

## 使用示例

### 1. 账户登录

```javascript
// 用户登录
const loginResult = await mcp.callTool('login', {
    email: 'user@example.com',
    password: 'password123'
})
```

### 2. 获取项目列表

```javascript
// 获取项目列表
const projectsResult = await mcp.callTool('getProjects', {
    page: 1,
    limit: 100
})
```

### 3. 获取 Token 列表

```javascript
// 根据项目ID获取Token列表
const tokensResult = await mcp.callTool('getTokens', {
    projectId: 'project-id-123',
    page: 1,
    limit: 100,
    status: 'active'
})
```

### 4. 获取钱包列表

```javascript
// 根据TokenId获取可用钱包
const walletsResult = await mcp.callTool('getWallets', {
    projectId: 'project-id-123',
    tokenId: 'token-id-456',
    limit: 100000
})
```

### 5. 创建限价策略

```javascript
// 创建限价策略订单
const strategyResult = await mcp.callTool('createPriceStrategy', {
    tokenId: 'token-id-456',
    side: 'buy', // 'buy' 或 'sell'
    targetPrice: 0.5, // 目标价格
    priceThresholdPercent: 0, // 价格阈值百分比
    walletIds: ['wallet-id-1', 'wallet-id-2'], // 钱包ID列表
    amountType: 'fixed', // 'fixed', 'range', 'random'
    fixedAmount: 1.0, // 固定数量
    minInterval: 1, // 最小交易间隔（秒）
    maxInterval: 2, // 最大交易间隔（秒）
    tipAmount: 0.001, // 小费金额（可选）
    slippageBps: 100 // 滑点（基点，可选）
})
```

### 6. 获取策略列表

```javascript
// 获取策略列表
const strategiesResult = await mcp.callTool('getStrategies', {
    projectId: 'project-id-123',
    page: 1,
    limit: 20
})
```

### 7. 删除策略

```javascript
// 删除策略
const deleteResult = await mcp.callTool('deleteStrategy', {
    strategyId: 'strategy-id-789'
})
```

## 策略参数说明

### 交易方向 (side)

-   `buy`: 买入
-   `sell`: 卖出

### 数量类型 (amountType)

-   `fixed`: 固定数量 - 使用 `fixedAmount` 参数
-   `range`: 范围比例 - 使用 `minRatio` 和 `maxRatio` 参数
-   `random`: 随机数量 - 使用 `minAmount` 和 `maxAmount` 参数

### 交易间隔

-   `minInterval`: 最小交易间隔（秒）
-   `maxInterval`: 最大交易间隔（秒）

### 可选参数

-   `tipAmount`: 小费金额
-   `slippageBps`: 滑点（基点）
-   `priceThresholdPercent`: 价格阈值百分比

## 错误处理

所有工具调用都会返回统一格式的响应：

```javascript
{
    success: true/false,
    message: "操作结果描述",
    data: {} // 具体数据（成功时）
}
```

## 注意事项

1. 使用前必须先调用 `login` 工具进行身份验证
2. 确保 API 服务器地址配置正确
3. 钱包必须有足够的余额才能创建策略
4. 策略创建后会自动开始监控和执行

## 开发

### 开发模式运行

```bash
npm run dev
```

### 日志

服务运行时会输出详细日志到控制台，便于调试和监控。

## 许可证

MIT License
