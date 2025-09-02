# MCP 包发布指南

本指南将帮助你将这个 MCP 服务发布到 npm，让其他人可以通过`npx`命令使用。

## 发布前准备

### 1. 确保代码完整性

-   ✅ 所有功能已实现
-   ✅ 测试通过
-   ✅ 文档完整
-   ✅ 许可证文件存在

### 2. 检查 package.json

-   ✅ 包名唯一且可用
-   ✅ 版本号正确
-   ✅ 描述清晰
-   ✅ 关键词准确
-   ✅ 文件列表完整

## 发布步骤

### 步骤 1: 登录 npm 账户

```bash
# 如果没有npm账户，先创建
npm adduser

# 如果已有账户，直接登录
npm login
```

### 步骤 2: 检查包名可用性

```bash
npm view mcp-price-strategy-server
```

如果返回 404 错误，说明包名可用。

### 步骤 3: 发布包

```bash
npm publish
```

### 步骤 4: 验证发布

```bash
npm view mcp-price-strategy-server
```

## 使用方式

发布成功后，其他人可以通过以下方式使用：

### 方式 1: 直接运行

```bash
npx mcp-price-strategy-server
```

### 方式 2: 全局安装

```bash
npm install -g mcp-price-strategy-server
mcp-price-strategy-server
```

### 方式 3: 在 MCP 配置中使用

```json
{
    "mcpServers": {
        "price-strategy": {
            "command": "npx mcp-price-strategy-server@latest",
            "env": {}
        }
    }
}
```

## 版本更新

### 更新版本号

```bash
# 补丁版本 (1.0.0 -> 1.0.1)
npm version patch

# 次要版本 (1.0.0 -> 1.1.0)
npm version minor

# 主要版本 (1.0.0 -> 2.0.0)
npm version major
```

### 重新发布

```bash
npm publish
```

## 故障排除

### 常见问题

1. **包名冲突**: 更改 package.json 中的 name 字段
2. **权限不足**: 确保已登录正确的 npm 账户
3. **发布失败**: 检查网络连接和 npm 配置

### 获取帮助

-   npm 官方文档: https://docs.npmjs.com/
-   npm CLI 帮助: `npm help publish`

## 维护建议

1. **定期更新依赖**: `npm update`
2. **监控包使用情况**: npm 包页面统计
3. **及时响应用户反馈**: GitHub Issues
4. **保持文档更新**: README 和 CHANGELOG
