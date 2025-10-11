#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import ApiClient from './utils/api-client';
import config from './config/index';
import { Logger } from './utils/logger';
import { createProjectTools, handleProjectTool, createTokenTools, handleTokenTool, createWalletTools, handleWalletTool, createStrategyTools, handleStrategyTool } from './tools/index';

class StrategyMCPServer extends Server {
    private apiClient: ApiClient;
    private token: string;
    private tools: Map<string, any>;

    constructor() {
        super(
            {
                name: config.server.name,
                version: config.server.version,
                implementation: `该服务主要用于帮助用户管理加密货币交易策略，包括限价策略、定时策略、拉砸策略、拆分策略和刷量策略。请仔细理解用户的意图，并按以下指引选择合适的接口：
        **原则：**
        *   **优先理解意图**：判断用户的真实需求，是创建策略、查询项目、Token还是钱包信息。
        *   **参数准确性**：确保传递给每个接口的参数格式和类型都正确，特别是价格、数量、时间格式等。
        *   **必要时追问**：如果用户信息不足以调用接口，请向用户追问缺失的信息。
        *   **清晰呈现结果**：将接口返回的信息以用户易于理解的方式进行呈现。
        *   **策略类型选择**：根据用户需求选择合适的策略类型：
            - 限价策略(PRICE_BASED)：当价格达到目标价格时执行交易
            - 定时策略(TIME_BASED)：在指定时间执行交易
            - 拉砸策略(MARKET_MANIPULATION)：拉升或砸盘操作
            - 拆分策略(PORTFOLIO_EXCHANGE)：在不同钱包间转移资产
            - 刷量策略(BUNDLE_SWAP)：在两个钱包间进行循环交易
            - Raydium狙击策略(RAYDIUM_SNIPER)：狙击raydium上的加池
            - PumpSwap狙击(PUMP_MIGRATE): 狙击PumpSwap上的外盘发射,只有当前Token是内盘才可以狙击
        *   **交易方向判断**：
            - 限价策略、定时策略、拉砸策略需要用户选择交易方向(buy/sell)
            - 拆分策略、刷量策略默认为sell方向
            - Raydium狙击策略、PumpSwap狙击策略不需要交易方向, 默认为buy方向
        *   **钱包选择限制**：
            - 限价、定时、拉砸策略：可选择多个钱包
            - 拆分策略：需要选择拆分地址和目标地址，不能有交集 
            - 刷量策略：只能选择一个买入钱包和一个卖出钱包，且不能相同 
            - Raydium狙击策略、PumpSwap狙击策略只能选择一个钱包
        请根据上述指引选择接口。
        `,
            },
            {
                capabilities: {
                    tools: {
                        listChanged: true,
                    },
                },
            }
        );

        this.apiClient = new ApiClient();
        this.token = config.api.token;
        this.tools = new Map();

        Logger.info('MCP服务器初始化开始');
        this.registerTools();
        this.registerHandlers();
        Logger.info('MCP服务器初始化完成');
    }

    private registerTools() {
        Logger.info('开始注册工具');

        // 注册项目工具
        const projectTools = createProjectTools();
        projectTools.forEach(tool => {
            this.tools.set(tool.name, {
                description: tool.description,
                inputSchema: tool.inputSchema,
                handler: async (args: any) => {
                    const result = await handleProjectTool(tool.name, args, this.apiClient, this.token);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: result.success ? result.data.message : result.error,
                            },
                            ...(result.success && result.data.projects
                                ? [
                                      {
                                          type: 'text',
                                          text: `项目列表: ${JSON.stringify(result.data.projects, null, 2)}`,
                                      },
                                  ]
                                : []),
                        ],
                    };
                },
            });
        });

        // 注册Token工具
        const tokenTools = createTokenTools();
        tokenTools.forEach(tool => {
            this.tools.set(tool.name, {
                description: tool.description,
                inputSchema: tool.inputSchema,
                handler: async (args: any) => {
                    const result = await handleTokenTool(tool.name, args, this.apiClient, this.token);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: result.success ? result.data.message : result.error,
                            },
                            ...(result.success && result.data.tokens
                                ? [
                                      {
                                          type: 'text',
                                          text: `Token列表: ${JSON.stringify(result.data.tokens, null, 2)}`,
                                      },
                                  ]
                                : []),
                        ],
                    };
                },
            });
        });

        // 注册钱包工具
        const walletTools = createWalletTools();
        walletTools.forEach(tool => {
            this.tools.set(tool.name, {
                description: tool.description,
                inputSchema: tool.inputSchema,
                handler: async (args: any) => {
                    const result = await handleWalletTool(tool.name, args, this.apiClient, this.token);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: result.success ? result.data.message : result.error,
                            },
                            ...(result.success && result.data.wallets
                                ? [
                                      {
                                          type: 'text',
                                          text: `钱包列表: ${JSON.stringify(result.data.wallets, null, 2)}`,
                                      },
                                  ]
                                : []),
                        ],
                    };
                },
            });
        });

        // 注册策略工具
        const strategyTools = createStrategyTools(this.apiClient);
        strategyTools.forEach(tool => {
            this.tools.set(tool.name, {
                description: tool.description,
                inputSchema: tool.inputSchema,
                handler: async (args: any) => {
                    const result = await handleStrategyTool(tool.name, args, this.apiClient, this.token);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: result.success ? result.data.message : result.error,
                            },
                            ...(result.success && result.data.strategyParams
                                ? [
                                      {
                                          type: 'text',
                                          text: `策略参数: ${JSON.stringify(result.data.strategyParams, null, 2)}`,
                                      },
                                  ]
                                : []),
                        ],
                    };
                },
            });
        });
    }

    private registerHandlers() {
        Logger.info('开始注册请求处理器');

        // 注册工具列表请求处理器
        this.setRequestHandler(ListToolsRequestSchema, request => {
            // Logger.info('收到工具列表请求', { request });
            const tools = Array.from(this.tools.entries()).map(([name, tool]) => ({
                name,
                description: tool.description,
                inputSchema: tool.inputSchema,
            }));

            Logger.debug('返回工具列表', { tools });
            return {
                tools: tools,
            };
        });

        // 注册工具调用请求处理器
        this.setRequestHandler(CallToolRequestSchema, async (request: any) => {
            Logger.info('收到工具调用请求', {
                method: request.method,
                params: request.params,
                id: request.id,
            });

            const { name, arguments: args } = request.params;
            Logger.debug('解析请求参数', { toolName: name, arguments: args });

            const tool = this.tools.get(name);
            if (!tool) {
                Logger.error('工具不存在', { toolName: name, availableTools: Array.from(this.tools.keys()) });
                throw new Error(`Tool '${name}' not found`);
            }

            Logger.info('开始执行工具', { toolName: name });
            const result = await tool.handler(args || {});
            Logger.info('工具执行完成', { toolName: name, result });

            return result;
        });

        Logger.info('请求处理器注册完成');
    }
}

// 启动服务器
async function main() {
    const serverMode = process.env.SERVER_MODE || 'stdio';
    Logger.info(`启动MM MCP服务器 - 模式: ${serverMode}`);

    if (serverMode === 'stdio') {
        // stdio模式
        await startStdioServer();
    } else if (serverMode === 'sse' || serverMode === 'streamable-http' || serverMode === 'multi-mode') {
        // HTTP模式 - 导入并启动HTTP服务器
        const { startHttpServer } = await import('./server');
        await startHttpServer();
    } else {
        Logger.error(`不支持的服务器模式: ${serverMode}`);
        Logger.error('支持的模式: stdio, sse, streamable-http, multi-mode');
        process.exit(1);
    }
}

async function startStdioServer() {
    try {
        Logger.info('MCP服务器启动开始 (stdio模式)');

        const server = new StrategyMCPServer();
        const transport = new StdioServerTransport();

        Logger.info('连接传输层');
        await server.connect(transport);

        Logger.info('MCP服务器启动完成，等待请求...');
        process.stderr.write('MM Strategy MCP Server started successfully (stdio mode)\n');
    } catch (error) {
        Logger.error('MCP服务器启动失败', { error: error.message, stack: error.stack });
        process.stderr.write(`MCP Server failed to start: ${error.message}\n`);
        process.exit(1);
    }
}

main().catch(error => {
    Logger.error('MCP服务器启动失败', { error: error.message, stack: error.stack });
    process.stderr.write(`MCP Server failed to start: ${error.message}\n`);
    process.exit(1);
});
