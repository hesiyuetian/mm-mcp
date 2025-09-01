# MCP 限价策略服务测试指南

## 测试类型

### 1. 简化测试 (推荐)

快速验证 MCP 服务是否正常工作：

```bash
cd mcp
npm run test:simple
```

或者直接运行：

```bash
cd mcp
node test/simple-test.js
```

### 2. 完整测试

运行所有 Jest 测试套件：

```bash
cd mcp
npm test
```

### 3. 测试脚本

使用提供的测试脚本：

```bash
cd mcp
./test.sh
```

## 测试内容

### 简化测试

-   ✅ 服务器启动检查
-   ✅ 进程运行状态检查
-   ✅ 服务器响应检查

### 完整测试

-   ✅ 服务器启动测试
-   ✅ 登录工具存在性测试
-   ✅ 获取项目列表工具测试
-   ✅ 创建策略工具测试
-   ✅ 参数验证测试
-   ✅ 错误处理测试

## 常见问题

### Q: 测试失败 "Your test suite must contain at least one test"

A: 确保 Jest 配置文件正确，并且测试文件包含有效的测试用例。

### Q: 服务器启动超时

A: 检查依赖是否正确安装，确保所有必要的文件存在。

### Q: 测试过程中服务器崩溃

A: 检查服务器代码是否有语法错误或运行时错误。

## 测试环境要求

-   Node.js >= 18
-   npm 或 pnpm
-   所有依赖已安装

## 测试输出示例

### 成功输出

```
启动MCP服务器...
服务器输出: Price Strategy MCP Server started
✅ MCP服务器启动成功！

🧪 开始健康检查...
✅ 服务器进程正在运行
✅ 服务器响应正常

🎉 MCP服务健康检查通过！
服务已准备就绪，可以开始使用。
```

### 失败输出

```
启动MCP服务器...
❌ 启动服务器失败: ENOENT: no such file or directory, open 'mcp-price-strategy-server.js'
💥 MCP服务健康检查失败！
请检查服务器配置和依赖。
```

## 调试技巧

1. **查看详细日志**：

    ```bash
    npm test -- --verbose
    ```

2. **运行单个测试**：

    ```bash
    npm test -- --testNamePattern="服务器应该能够启动"
    ```

3. **生成覆盖率报告**：

    ```bash
    npm run test:coverage
    ```

4. **监视模式**：
    ```bash
    npm run test:watch
    ```
