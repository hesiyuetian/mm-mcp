#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import * as http from 'node:http';
import * as url from 'node:url';
import ApiClient from './utils/api-client';
import config from './config/index';
import { Logger } from './utils/logger';
import { createProjectTools, handleProjectTool, createTokenTools, handleTokenTool, createWalletTools, handleWalletTool, createStrategyTools, handleStrategyTool } from './tools/index';

// 存储传输对象 - 使用对象而不是Map，与官方示例保持一致
const transports: Record<string, any> = {};

// 创建MCP服务器 - 为每个传输创建独立实例
function getMcpServer(token: string) {
    const server = new Server(
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

    const apiClient = new ApiClient();
    const tools = new Map();
    apiClient.setToken(token);

    Logger.info('MCP服务器初始化开始');
    registerTools(server, tools, apiClient, token);
    Logger.info('MCP服务器初始化完成');

    return server;
}

function registerTools(server: Server, tools: Map<string, any>, apiClient: ApiClient, token: string) {
    Logger.info('开始注册工具');

    // 注册项目工具
    const projectTools = createProjectTools();
    projectTools.forEach(tool => {
        tools.set(tool.name, {
            description: tool.description,
            inputSchema: tool.inputSchema,
            handler: async (args: any) => {
                const result = await handleProjectTool(tool.name, args, apiClient, token);
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
        tools.set(tool.name, {
            description: tool.description,
            inputSchema: tool.inputSchema,
            handler: async (args: any) => {
                const result = await handleTokenTool(tool.name, args, apiClient, token);
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
        tools.set(tool.name, {
            description: tool.description,
            inputSchema: tool.inputSchema,
            handler: async (args: any) => {
                const result = await handleWalletTool(tool.name, args, apiClient, token);
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
    const strategyTools = createStrategyTools(apiClient);
    strategyTools.forEach(tool => {
        tools.set(tool.name, {
            description: tool.description,
            inputSchema: tool.inputSchema,
            handler: async (args: any) => {
                const result = await handleStrategyTool(tool.name, args, apiClient, token);
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

    // 注册工具列表请求处理器
    server.setRequestHandler(ListToolsRequestSchema, request => {
        // Logger.info('收到工具列表请求', { request });
        const toolsList = Array.from(tools.entries()).map(([name, tool]) => ({
            name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        }));

        return {
            tools: toolsList,
        };
    });

    // 注册工具调用请求处理器
    server.setRequestHandler(CallToolRequestSchema, async request => {
        const { name, arguments: args } = request.params;

        const tool = tools.get(name);
        if (!tool) {
            Logger.error('工具不存在', { toolName: name, availableTools: Array.from(tools.keys()) });
            throw new Error(`Tool '${name}' not found`);
        }

        // Logger.info('开始执行工具', { toolName: name });
        const result = await tool.handler(args || {});
        // Logger.info('工具执行完成', { toolName: name });

        return result;
    });
}

// 解析Authorization Token
function parseAuthToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
        return null;
    }

    // fixed: MCP Inspector tools Authentication
    if (authHeader.includes('ApiKey ')) {
        return `ApiKey ${authHeader.split('ApiKey ')[1]}`;
    }

    // 支持 Bearer token 格式
    if (authHeader.startsWith('Bearer ') || authHeader.startsWith('ApiKey ')) {
        return authHeader;
    }

    // 支持直接token格式
    return authHeader;
}

// 导出启动函数
export async function startHttpServer() {
    const serverMode = process.env.SERVER_MODE || 'stdio';
    const port = parseInt(process.env.PORT || '3010');
    const host = process.env.HOST || '0.0.0.0';

    Logger.info(`启动MM MCP服务器 - 模式: ${serverMode}, 端口: ${port}, 主机: ${host}`);

    if (serverMode === 'sse') {
        // SSE模式
        Logger.info('🌐 MM MCP SSE 服务器启动');

        const httpServer = http.createServer(async (req, res) => {
            // 设置CORS头部
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            if (req.url === '/sse') {
                if (req.method === 'GET') {
                    Logger.info('🔌 建立SSE连接');

                    // 处理authorization token
                    const authHeader = req.headers.authorization;
                    Logger.info('收到SSE连接请求，Authorization header:', authHeader ? '已提供' : '未提供');

                    if (!authHeader) {
                        Logger.warn('缺少authorization token');
                        res.writeHead(401);
                        res.end('Unauthorized: Missing authorization token');
                        return;
                    }

                    const token = parseAuthToken(authHeader);
                    if (!token) {
                        Logger.warn(`无效的authorization token格式，实际: ${authHeader}`);
                        res.writeHead(401);
                        res.end('Unauthorized: Invalid authorization token format');
                        return;
                    }

                    // Logger.info(`Authorization token已解析`);

                    try {
                        // 创建SSE传输
                        const transport = new SSEServerTransport('/messages', res);
                        transports[transport.sessionId] = transport;

                        // 连接关闭时清理
                        res.on('close', () => {
                            Logger.info(`🔌 SSE连接关闭，会话ID: ${transport.sessionId}`);
                            delete transports[transport.sessionId];
                        });

                        // 为每个传输创建独立的服务器实例，使用真实的API凭据
                        const server = getMcpServer(token);
                        await server.connect(transport);

                        // Logger.info(`✅ SSE连接建立，会话ID: ${transport.sessionId}`);
                    } catch (error) {
                        Logger.error('❌ SSE连接失败:', error);
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: 'SSE connection failed' }));
                    }
                } else {
                    Logger.warn(`❌ 不支持的HTTP方法: ${req.method} for /sse`);
                    res.writeHead(405);
                    res.end('Method Not Allowed');
                }
            } else if (req.url?.startsWith('/messages')) {
                // 处理POST消息 - 与官方示例完全一致
                if (req.method === 'POST') {
                    const parsedUrl = url.parse(req.url || '', true);
                    const sessionId = parsedUrl.query.sessionId as string;

                    const transport = transports[sessionId];

                    if (transport) {
                        // Logger.info(`✅ 找到传输对象，会话ID: ${sessionId}`);

                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });
                        req.on('end', async () => {
                            try {
                                const parsedBody = JSON.parse(body);

                                await transport.handlePostMessage(req, res, parsedBody);
                                // Logger.info(`✅ POST消息处理完成`);
                            } catch (error) {
                                Logger.error('❌ POST消息处理失败:', error);
                                res.writeHead(400);
                                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                            }
                        });
                    } else {
                        Logger.error(`❌ 未找到传输对象，会话ID: ${sessionId}`);
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'No transport found for sessionId' }));
                    }
                } else {
                    Logger.warn(`❌ 不支持的HTTP方法: ${req.method} for /messages`);
                    res.writeHead(405);
                    res.end('Method Not Allowed');
                }
            } else {
                Logger.warn(`❌ 未找到路由: ${req.url}`);
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        httpServer.listen(port, host, () => {
            Logger.info(`SSE 服务器启动在端口 ${port}，访问路径: http://${host}:${port}/sse`);
            Logger.info('💡 提示：请在Claude Desktop的MCP配置中使用以下配置：');
            Logger.info(`   "command": "sse",`);
            Logger.info(`   "args": ["http://${host}:${port}/sse"],`);
            Logger.info(`   "authorization_token": "ApiKey {API_KEY}:{SECRET}"`);
            Logger.info('');
            Logger.info('🔑 Authorization Token格式: ApiKey {API_KEY}:{SECRET}');
            Logger.info('📡 支持的协议: SSE (Server-Sent Events)');
            Logger.info('🌐 CORS已启用，支持跨域访问');
        });
    } else if (serverMode === 'streamable-http') {
        // Streamable HTTP模式
        Logger.info('🌐 MM MCP Streamable HTTP 服务器启动');

        const httpServer = http.createServer(async (req, res) => {
            // 设置CORS头部
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // 处理authorization token
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                Logger.warn('缺少authorization token');
                res.writeHead(401);
                res.end('Unauthorized: Missing authorization token');
                return;
            }

            const token = parseAuthToken(authHeader);
            if (!token) {
                Logger.warn(`无效的authorization token格式，实际: ${authHeader}`);
                res.writeHead(401);
                res.end('Unauthorized: Invalid authorization token format');
                return;
            }

            try {
                // 解析请求体
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });

                await new Promise(resolve => {
                    req.on('end', () => {
                        resolve(undefined);
                    });
                });

                let parsedBody;
                try {
                    parsedBody = JSON.parse(body);
                } catch (error) {
                    Logger.error('❌ 请求体解析失败:', error);
                    res.writeHead(400);
                    res.end(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            error: {
                                code: -32700,
                                message: 'Parse error',
                            },
                            id: null,
                        })
                    );
                    return;
                }

                const sessionId = req.headers['mcp-session-id'] as string;

                if (sessionId && transports[sessionId]) {
                    // 重用现有传输
                    // Logger.info(`🔄 重用现有传输，会话ID: ${sessionId}`);
                    const transport = transports[sessionId];
                    await transport.handleRequest(req, res, parsedBody);
                } else if (!sessionId && isInitializeRequest(parsedBody)) {
                    // 新的初始化请求
                    // Logger.info('🆕 处理新的初始化请求');

                    const transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => {
                            const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            // Logger.info(`📝 生成新会话ID: ${newSessionId}`);
                            return newSessionId;
                        },
                        onsessioninitialized: newSessionId => {
                            // Logger.info(`✅ 会话初始化完成: ${newSessionId}`);
                            // 存储传输对象，包含凭据信息
                            transports[newSessionId] = transport;
                        },
                        onsessionclosed: closedSessionId => {
                            // Logger.info(`🔌 会话关闭: ${closedSessionId}`);
                            delete transports[closedSessionId];
                        },
                    });

                    // 设置关闭处理器
                    transport.onclose = () => {
                        const sid = transport.sessionId;
                        if (sid && transports[sid]) {
                            // Logger.info(`🔌 传输关闭，会话ID: ${sid}`);
                            delete transports[sid];
                        }
                    };

                    // 为传输创建独立的服务器实例
                    const server = getMcpServer(token);
                    await server.connect(transport);

                    // 处理请求
                    await transport.handleRequest(req, res, parsedBody);
                } else {
                    // 无效请求 - 没有会话ID或不是初始化请求
                    Logger.warn('❌ 无效请求：没有会话ID或不是初始化请求');
                    res.writeHead(400);
                    res.end(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            error: {
                                code: -32000,
                                message: 'Bad Request: No valid session ID provided',
                            },
                            id: null,
                        })
                    );
                }
            } catch (error) {
                Logger.error('❌ Streamable HTTP请求处理失败:', error);
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            error: {
                                code: -32603,
                                message: 'Internal server error',
                            },
                            id: null,
                        })
                    );
                }
            }
        });

        httpServer.listen(port, host, () => {
            Logger.info(`Streamable HTTP 服务器启动在端口 ${port}，访问路径: http://${host}:${port}/mcp`);
            Logger.info('💡 提示：请在Claude Desktop的MCP配置中使用以下配置：');
            Logger.info(`   "command": "streamable-http",`);
            Logger.info(`   "args": ["http://${host}:${port}/mcp"],`);
            Logger.info(`   "authorization_token": "your_api_key:your_api_secret"`);
            Logger.info('');
            Logger.info('🔑 Authorization Token格式: apiKey:apiSecret');
            Logger.info('📡 支持的协议: Streamable HTTP (2025-03-26)');
            Logger.info('🌐 CORS已启用，支持跨域访问');
        });
    } else if (serverMode === 'multi-mode') {
        // 多模式：同时支持 SSE 和 Streamable HTTP
        Logger.info('🌐 MM MCP 多模式服务器启动 (SSE + Streamable HTTP)');

        const httpServer = http.createServer(async (req, res) => {
            // 设置CORS头部
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // 处理authorization token
            const authHeader = req.headers.authorization;
            // Logger.info('收到多模式请求，Authorization header:', authHeader ? '已提供' : '未提供');

            if (!authHeader) {
                Logger.warn('缺少authorization token');
                res.writeHead(401);
                res.end('Unauthorized: Missing authorization token');
                return;
            }

            const token = parseAuthToken(authHeader);
            if (!token) {
                Logger.warn(`无效的authorization token格式，实际: ${authHeader}`);
                res.writeHead(401);
                res.end('Unauthorized: Invalid authorization token format');
                return;
            }

            // Logger.info(`Authorization token已解析`);

            // 根据URL路径决定使用哪种模式
            if (req.url === '/sse') {
                // SSE模式处理
                if (req.method === 'GET') {
                    // Logger.info('🔌 建立SSE连接 (多模式)');

                    try {
                        // 创建SSE传输
                        const transport = new SSEServerTransport('/messages', res);
                        transports[transport.sessionId] = transport;

                        // Logger.info(`📝 存储SSE传输对象，会话ID: ${transport.sessionId}`);
                        // Logger.info(`📊 当前活跃会话数: ${Object.keys(transports).length}`);

                        // 连接关闭时清理
                        res.on('close', () => {
                            // Logger.info(`🔌 SSE连接关闭，会话ID: ${transport.sessionId}`);
                            delete transports[transport.sessionId];
                            // Logger.info(`📊 清理后活跃会话数: ${Object.keys(transports).length}`);
                        });

                        // 为每个传输创建独立的服务器实例
                        const server = getMcpServer(token);
                        await server.connect(transport);

                        // Logger.info(`✅ SSE连接建立，会话ID: ${transport.sessionId}`);
                    } catch (error) {
                        Logger.error('❌ SSE连接失败:', error);
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: 'SSE connection failed' }));
                    }
                } else {
                    Logger.warn(`❌ 不支持的HTTP方法: ${req.method} for /sse`);
                    res.writeHead(405);
                    res.end('Method Not Allowed');
                }
            } else if (req.url?.startsWith('/messages')) {
                // SSE POST消息处理
                if (req.method === 'POST') {
                    // Logger.info('📨 收到SSE POST消息请求');
                    const parsedUrl = url.parse(req.url || '', true);
                    const sessionId = parsedUrl.query.sessionId as string;
                    // Logger.info(`🔍 查找SSE会话ID: ${sessionId}`);

                    const transport = transports[sessionId];

                    if (transport) {
                        // Logger.info(`✅ 找到SSE传输对象，会话ID: ${sessionId}`);

                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });
                        req.on('end', async () => {
                            try {
                                // Logger.info(`📦 收到SSE请求体: ${body}`);
                                const parsedBody = JSON.parse(body);

                                // SSE 传输对象使用 handlePostMessage 方法
                                await transport.handlePostMessage(req, res, parsedBody);
                                // Logger.info('✅ SSE POST消息处理完成');
                            } catch (error) {
                                Logger.error('❌ SSE POST消息处理失败:', error);
                                res.writeHead(500);
                                res.end(JSON.stringify({ error: 'Failed to process message' }));
                            }
                        });
                    } else {
                        Logger.warn(`❌ 未找到SSE传输对象，会话ID: ${sessionId}`);
                        res.writeHead(404);
                        res.end(JSON.stringify({ error: 'Session not found' }));
                    }
                } else {
                    Logger.warn(`❌ 不支持的HTTP方法: ${req.method} for /messages`);
                    res.writeHead(405);
                    res.end('Method Not Allowed');
                }
            } else if (req.url === '/mcp') {
                // Streamable HTTP模式处理
                // Logger.info('🌐 处理Streamable HTTP请求 (多模式)');

                try {
                    // 解析请求体
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                    });

                    await new Promise(resolve => {
                        req.on('end', () => {
                            resolve(undefined);
                        });
                    });

                    let parsedBody;
                    try {
                        parsedBody = JSON.parse(body);
                    } catch (error) {
                        Logger.error('❌ Streamable HTTP请求体解析失败 error:', error);
                        Logger.error('❌ Streamable HTTP请求体解析失败 body :', body);
                        res.writeHead(400);
                        res.end(
                            JSON.stringify({
                                jsonrpc: '2.0',
                                error: {
                                    code: -32700,
                                    message: 'Parse error',
                                },
                                id: null,
                            })
                        );
                        return;
                    }

                    const sessionId = req.headers['mcp-session-id'] as string;

                    if (sessionId && transports[sessionId]) {
                        // 重用现有传输
                        // Logger.info(`🔄 重用现有Streamable HTTP传输，会话ID: ${sessionId}`);
                        const transport = transports[sessionId];
                        await transport.handleRequest(req, res, parsedBody);
                    } else if (!sessionId && isInitializeRequest(parsedBody)) {
                        // 新的初始化请求
                        // Logger.info('🆕 处理新的Streamable HTTP初始化请求');

                        const transport = new StreamableHTTPServerTransport({
                            sessionIdGenerator: () => {
                                const newSessionId = `streamable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                // Logger.info(`📝 生成新Streamable HTTP会话ID: ${newSessionId}`);
                                return newSessionId;
                            },
                            onsessioninitialized: async sessionId => {
                                // Logger.info(`🚀 Streamable HTTP会话初始化，会话ID: ${sessionId}`);
                                const server = getMcpServer(token);
                                await server.connect(transport);
                                // Logger.info(`✅ Streamable HTTP服务器连接完成，会话ID: ${sessionId}`);

                                // 在会话初始化后存储传输对象
                                transports[sessionId] = transport;
                                // Logger.info(`📝 存储Streamable HTTP传输对象，会话ID: ${sessionId}`);
                                // Logger.info(`📊 当前活跃会话数: ${Object.keys(transports).length}`);
                            },
                            onsessionclosed: async sessionId => {
                                // Logger.info(`🔌 Streamable HTTP会话关闭，会话ID: ${sessionId}`);
                                delete transports[sessionId];
                                // Logger.info(`📊 清理后活跃会话数: ${Object.keys(transports).length}`);
                            },
                        });

                        // 处理请求
                        await transport.handleRequest(req, res, parsedBody);
                    } else {
                        Logger.warn(`❌ 无效的Streamable HTTP请求，会话ID: ${sessionId}`);
                        res.writeHead(400);
                        res.end(
                            JSON.stringify({
                                jsonrpc: '2.0',
                                error: {
                                    code: -32600,
                                    message: 'Invalid Request',
                                },
                                id: parsedBody?.id || null,
                            })
                        );
                    }
                } catch (error) {
                    Logger.error('❌ Streamable HTTP请求处理失败:', error);
                    res.writeHead(500);
                    res.end(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            error: {
                                code: -32603,
                                message: 'Internal error',
                            },
                            id: null,
                        })
                    );
                }
            } else {
                // 其他路径返回404
                Logger.warn(`❌ 未找到路径: ${req.url}`);
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        httpServer.listen(port, host, () => {
            Logger.info(`多模式服务器启动在端口 ${port}`);
            Logger.info('📡 支持的协议: SSE + Streamable HTTP');
            Logger.info('🌐 访问路径:');
            Logger.info(`   SSE: http://${host}:${port}/sse`);
            Logger.info(`   Streamable HTTP: http://${host}:${port}/mcp`);
            Logger.info('');
            Logger.info('💡 Claude Desktop MCP 配置示例:');
            Logger.info('   SSE模式:');
            Logger.info(`     "url": "http://${host}:${port}/sse",`);
            Logger.info(`     "headers": {`);
            Logger.info(`       "Authorization": "ApiKey {API_KEY}:{SECRET}"`);
            Logger.info(`     }`);
            Logger.info('');
            Logger.info('   Streamable HTTP模式:');
            Logger.info(`     "url": "http://${host}:${port}/mcp",`);
            Logger.info(`     "headers": {`);
            Logger.info(`       "Authorization": "ApiKey {API_KEY}:{SECRET}"`);
            Logger.info(`     }`);
            Logger.info('');
            Logger.info('🔑 Authorization Token格式: ApiKey {API_KEY}:{SECRET}');
            Logger.info('🌐 CORS已启用，支持跨域访问');
        });
    } else {
        Logger.error(`不支持的服务器模式: ${serverMode}`);
        Logger.info('支持的模式: stdio, sse, streamable-http, multi-mode');
        process.exit(1);
    }
}

// 处理进程退出
process.on('SIGINT', async () => {
    Logger.info('收到 SIGINT 信号，正在关闭服务器...');

    // 关闭所有活跃的传输对象
    for (const sessionId in transports) {
        try {
            await transports[sessionId].close();
            delete transports[sessionId];
        } catch (error) {
            Logger.error(`关闭传输对象失败，会话ID: ${sessionId}:`, error);
        }
    }

    process.exit(0);
});

// 只有在直接运行此文件时才启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
    startHttpServer().catch(error => {
        Logger.error('服务器启动失败:', error);
        process.exit(1);
    });
}
