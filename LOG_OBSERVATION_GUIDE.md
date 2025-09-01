# MCP 服务器日志观察指南

## 📋 日志系统说明

MCP 服务器现在包含完整的日志系统，可以帮助你观察：

-   请求接收和处理过程
-   参数验证和错误处理
-   API 调用和响应
-   工具执行状态

## 🔍 日志级别

### INFO 级别

-   服务器启动和初始化
-   请求接收和工具执行
-   成功操作的结果

### DEBUG 级别

-   详细的参数信息
-   API 响应数据
-   内部处理步骤

### WARN 级别

-   非致命错误
-   预期但需要注意的情况

### ERROR 级别

-   异常和错误
-   完整的错误堆栈

## 📊 从刚才的测试中观察到的信息

### ✅ 成功的登录流程

```
[INFO] 收到工具调用请求
[DEBUG] 解析请求参数
[INFO] 开始执行工具
[INFO] 收到登录请求
[DEBUG] 验证登录参数
[INFO] 调用API登录
[DEBUG] API登录响应
[INFO] 登录成功
[INFO] 工具执行完成
```

### ❌ 参数验证错误

```
[ERROR] 登录异常 {
  "error": "密码不能为空",
  "stack": "Error: 密码不能为空..."
}
```

### 🚫 无效工具错误

```
[ERROR] 工具不存在 {
  "toolName": "invalidTool",
  "availableTools": ["login", "getProjects", "createPriceStrategy"]
}
```

## 🛠️ 如何观察日志

### 1. 运行详细诊断测试

```bash
npm run test:detailed
```

### 2. 直接启动服务器观察

```bash
# 设置日志级别
export LOG_LEVEL=debug
node mcp-price-strategy-server.js
```

### 3. 使用环境变量控制日志

```bash
# 只显示INFO及以上级别
export LOG_LEVEL=info
npm run test:detailed

# 显示所有日志
export LOG_LEVEL=debug
npm run test:detailed
```

## 📝 关键观察点

### 请求处理流程

1. **请求接收**: `收到工具调用请求`
2. **参数解析**: `解析请求参数`
3. **工具查找**: 检查工具是否存在
4. **参数验证**: 验证输入参数
5. **API 调用**: 调用外部 API
6. **响应处理**: 处理 API 响应
7. **结果返回**: 返回最终结果

### 错误处理

-   **参数验证错误**: 在验证阶段捕获
-   **API 调用错误**: 在 API 调用阶段捕获
-   **工具不存在**: 在工具查找阶段捕获

### 成功案例

从测试结果可以看到登录成功：

-   API 返回了有效的 token 和用户信息
-   服务器正确设置了认证状态
-   返回了成功的响应

## 🔧 调试技巧

1. **观察请求参数**: 检查传入的参数是否正确
2. **验证 API 响应**: 确认 API 返回的数据格式
3. **检查错误堆栈**: 了解错误发生的具体位置
4. **对比成功和失败**: 找出差异点

## 📋 常用命令

```bash
# 基础诊断
npm run test:diagnostic

# 详细诊断（推荐）
npm run test:detailed

# 手动测试
npm run test:manual

# 直接运行服务器
npm start
```
