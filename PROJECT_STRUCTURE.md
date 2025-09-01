# MCP 限价策略服务项目结构

```
mcp-price-strategy-server/
├── mcp-price-strategy-server.js    # 主服务器文件
├── package.json                    # 项目依赖配置
├── README.md                       # 项目说明文档
├── start.sh                        # 启动脚本
├── Dockerfile                      # Docker配置文件
├── docker-compose.yml              # Docker Compose配置
├── .gitignore                      # Git忽略文件
├── .env.example                    # 环境变量示例
├── config/                         # 配置文件目录
│   └── index.js                    # 主配置文件
├── utils/                          # 工具类目录
│   ├── api-client.js               # API客户端
│   └── validator.js                # 参数验证工具
├── examples/                       # 使用示例目录
│   └── usage-example.js            # 使用示例
└── test/                           # 测试目录
    └── mcp-server.test.js          # 测试文件
```

## 文件说明

### 核心文件

-   `mcp-price-strategy-server.js`: MCP 服务器主文件，包含所有工具的实现
-   `package.json`: 项目依赖和脚本配置
-   `README.md`: 详细的使用说明和 API 文档

### 配置文件

-   `config/index.js`: 集中管理所有配置参数
-   `.env.example`: 环境变量配置示例

### 工具类

-   `utils/api-client.js`: 封装所有 API 调用逻辑
-   `utils/validator.js`: 参数验证工具

### 示例和测试

-   `examples/usage-example.js`: 完整的使用示例
-   `test/mcp-server.test.js`: 功能测试文件

### 部署文件

-   `start.sh`: 便捷启动脚本
-   `Dockerfile`: Docker 容器化配置
-   `docker-compose.yml`: Docker Compose 编排配置

## 工具列表

1. **login** - 用户账户登录
2. **getProjects** - 获取项目列表
3. **getTokens** - 获取 Token 列表
4. **getWallets** - 获取钱包列表
5. **createPriceStrategy** - 创建限价策略
6. **getStrategies** - 获取策略列表
7. **deleteStrategy** - 删除策略

## 技术栈

-   **Node.js**: 运行时环境
-   **MCP SDK**: Model Context Protocol SDK
-   **Axios**: HTTP 客户端
-   **Docker**: 容器化部署

## 开发流程

1. 安装依赖: `npm install`
2. 配置环境变量: 复制 `.env.example` 为 `.env` 并修改配置
3. 启动服务: `npm start` 或 `./start.sh`
4. 运行测试: `node test/mcp-server.test.js`

## 部署方式

### 本地部署

```bash
npm install
npm start
```

### Docker 部署

```bash
docker-compose up -d
```

### 手动 Docker 部署

```bash
docker build -t mcp-price-strategy .
docker run -d --name mcp-server mcp-price-strategy
```
