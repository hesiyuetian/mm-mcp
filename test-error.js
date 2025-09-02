// #!/usr/bin/env node

// import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
// import ApiClient from './utils/api-client.js';
// import Validator from './utils/validator.js';
// import config from './config/index.js';

// // 日志工具类
// // class Logger {
// //     static log(level, message, data = null) {
// //         const timestamp = new Date().toISOString();
// //         const logEntry = {
// //             timestamp,
// //             level,
// //             message,
// //             data,
// //         };

// //         // 输出到stderr，避免影响MCP协议
// //         // console.error(`[${timestamp}] [${level}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
// //     }

// //     // static info(message, data = null) {
// //     //     this.log('INFO', message, data);
// //     // }

// //     // static debug(message, data = null) {
// //     //     this.log('DEBUG', message, data);
// //     // }

// //     // static warn(message, data = null) {
// //     //     this.log('WARN', message, data);
// //     // }

// //     // static error(message, data = null) {
// //     //     this.log('ERROR', message, data);
// //     // }
// // }

// class PriceStrategyMCPServer extends Server {
//     constructor() {
//         super({
//             name: config.server.name,
//             version: config.server.version,
//         });

//         this.apiClient = new ApiClient();
//         this.token = null;
//         this.userInfo = null;
//         this.tools = new Map();

//         // Logger.info('MCP服务器初始化开始');
//         this.registerTools();
//         this.registerHandlers();
//         // Logger.info('MCP服务器初始化完成');
//     }

//     registerTools() {
//         // Logger.info('开始注册工具');

//         // 注册登录工具
//         this.tools.set('login', {
//             description: '用户账户登录',
//             inputSchema: {
//                 type: 'object',
//                 properties: {
//                     email: {
//                         type: 'string',
//                         description: '用户邮箱',
//                     },
//                     password: {
//                         type: 'string',
//                         description: '用户密码',
//                     },
//                 },
//                 required: ['email', 'password'],
//             },
//             handler: async args => {
//                 // Logger.info('收到登录请求', { args });
//                 try {
//                     // Logger.debug('验证登录参数', args);
//                     Validator.validateLoginParams(args);

//                     // Logger.info('调用API登录', { email: args.email });
//                     const response = await this.apiClient.login(args.email, args.password);
//                     // Logger.debug('API登录响应', response);

//                     if (response.accessToken) {
//                         this.token = response.accessToken;
//                         this.userInfo = response.user;
//                         this.apiClient.setToken(response.accessToken);
//                         // Logger.info('登录成功', { user: response.user });

//                         return {
//                             content: [
//                                 {
//                                     type: 'text',
//                                     text: config.messages.login.success,
//                                 },
//                                 {
//                                     type: 'text',
//                                     text: `用户: ${JSON.stringify(response.user)}`,
//                                 },
//                             ],
//                         };
//                     } else {
//                         // Logger.warn('登录失败', { message: response.message });
//                         return {
//                             content: [
//                                 {
//                                     type: 'text',
//                                     text: response.message || config.messages.login.failed,
//                                 },
//                             ],
//                         };
//                     }
//                 } catch (error) {
//                     // Logger.error('登录异常', { error: error.message, stack: error.stack });
//                     return {
//                         content: [
//                             {
//                                 type: 'text',
//                                 text: error.message || config.messages.login.failed,
//                             },
//                         ],
//                     };
//                 }
//             },
//         });

//         // 注册获取项目列表工具
//         this.tools.set('getProjects', {
//             description: '获取用户的项目列表',
//             inputSchema: {
//                 type: 'object',
//                 properties: {},
//             },
//             handler: async args => {
//                 // Logger.info('收到获取项目列表请求', { args });
//                 try {
//                     if (!this.token) {
//                         // Logger.warn('未登录状态尝试获取项目列表');
//                         return {
//                             content: [
//                                 {
//                                     type: 'text',
//                                     text: config.messages.login.required,
//                                 },
//                             ],
//                         };
//                     }

//                     // Logger.info('调用API获取项目列表');
//                     const response = await this.apiClient.getProjects();
//                     // Logger.debug('API项目列表响应', response);

//                     const projects = (response || []).filter(item => item.status === 'active');
//                     return {
//                         content: [
//                             {
//                                 type: 'text',
//                                 text: `获取项目列表成功，共 ${projects.length} 个项目`,
//                             },
//                             {
//                                 type: 'text',
//                                 text: `项目列表: ${JSON.stringify(projects, null, 2)}`,
//                             },
//                         ],
//                     };
//                 } catch (error) {
//                     // Logger.error('获取项目列表异常', { error: error.message, stack: error.stack });
//                     return {
//                         content: [
//                             {
//                                 type: 'text',
//                                 text: error.message || config.messages.projects.failed,
//                             },
//                         ],
//                     };
//                 }
//             },
//         });

//         // 注册获取Token列表工具
//         this.tools.set('getTokens', {
//             description: '获取指定项目里的Token列表',
//             inputSchema: {
//                 type: 'object',
//                 properties: {
//                     projectId: {
//                         type: 'string',
//                         description: '项目ID',
//                     },
//                     page: {
//                         type: 'number',
//                         description: '页码',
//                         default: 1,
//                     },
//                     limit: {
//                         type: 'number',
//                         description: '每页数量',
//                         default: 10000,
//                     },
//                 },
//                 required: ['projectId'],
//             },
//             handler: async args => {
//                 // Logger.info('收到获取Token列表请求', { args });
//                 try {
//                     if (!this.token) {
//                         // Logger.warn('未登录状态尝试获取Token列表');
//                         return {
//                             content: [
//                                 {
//                                     type: 'text',
//                                     text: config.messages.login.required,
//                                 },
//                             ],
//                         };
//                     }

//                     // Logger.debug('验证分页参数', args);
//                     Validator.validatePaginationParams(args);

//                     // Logger.info('调用API获取Token列表', { projectId: args.projectId, page: args.page, limit: args.limit });
//                     const response = await this.apiClient.getTokens(args.projectId, args.page, args.limit);
//                     // Logger.debug('APIToken列表响应', response);

//                     const tokens = response.items || [];
//                     return {
//                         content: [
//                             {
//                                 type: 'text',
//                                 text: `获取Token列表成功，项目ID: ${args.projectId}，共 ${tokens.length} 个Token`,
//                             },
//                             {
//                                 type: 'text',
//                                 text: `Token列表: ${JSON.stringify(tokens, null, 2)}`,
//                             },
//                         ],
//                     };
//                 } catch (error) {
//                     // Logger.error('获取Token列表异常', { error: error.message, stack: error.stack });
//                     return {
//                         content: [
//                             {
//                                 type: 'text',
//                                 text: error.message || config.messages.tokens.failed,
//                             },
//                         ],
//                     };
//                 }
//             },
//         });

//         // 注册获取钱包列表工具
//         this.tools.set('getWallets', {
//             description: '获取指定Token的钱包列表',
//             inputSchema: {
//                 type: 'object',
//                 properties: {
//                     projectId: {
//                         type: 'string',
//                         description: '项目ID',
//                     },
//                     tokenId: {
//                         type: 'string',
//                         description: 'Token ID',
//                     },
//                     page: {
//                         type: 'number',
//                         description: '页码',
//                         default: 1,
//                     },
//                     limit: {
//                         type: 'number',
//                         description: '每页数量',
//                         default: 10000,
//                     },
//                 },
//                 required: ['projectId', 'tokenId'],
//             },
//             handler: async args => {
//                 // Logger.info('收到获取钱包列表请求', { args });
//                 try {
//                     if (!this.token) {
//                         // Logger.warn('未登录状态尝试获取钱包列表');
//                         return {
//                             content: [
//                                 {
//                                     type: 'text',
//                                     text: config.messages.login.required,
//                                 },
//                             ],
//                         };
//                     }

//                     // Logger.debug('验证分页参数', args);
//                     Validator.validatePaginationParams(args);

//                     const response = await this.apiClient.getWallets(args.projectId, args.tokenId, args.page, args.limit);
//                     // Logger.debug('API钱包列表响应', response);

//                     const wallets = (response.items || []).filter(item => Number(item.balance) > 0 || Number(item.tokenBalance) > 0);
//                     return {
//                         content: [
//                             {
//                                 type: 'text',
//                                 text: `获取钱包列表成功，Token ID: ${args.tokenId}，共 ${wallets.length} 个钱包`,
//                             },
//                             {
//                                 type: 'text',
//                                 text: `钱包列表: ${JSON.stringify(wallets, null, 2)}`,
//                             },
//                         ],
//                     };
//                 } catch (error) {
//                     // Logger.error('获取钱包列表异常', { error: error.message, stack: error.stack });
//                     return {
//                         content: [
//                             {
//                                 type: 'text',
//                                 text: error.message || config.messages.wallets.failed,
//                             },
//                         ],
//                     };
//                 }
//             },
//         });

//         // 注册创建策略工具
//         this.tools.set('createPriceStrategy', {
//             description: '创建限价策略订单',
//             inputSchema: {
//                 type: 'object',
//                 properties: {
//                     tokenId: {
//                         type: 'string',
//                         description: 'Token ID',
//                     },
//                     side: {
//                         type: 'string',
//                         description: '交易方向',
//                         enum: ['buy', 'sell'],
//                         default: 'buy',
//                     },
//                     targetPrice: {
//                         type: 'number',
//                         description: '目标价格',
//                     },
//                     walletIds: {
//                         type: 'array',
//                         items: {
//                             type: 'string',
//                         },
//                         description: '钱包ID列表',
//                     },
//                     fixedAmount: {
//                         type: 'number',
//                         description: '下单价值(单位: SOL)',
//                     },
//                     tradingType: {
//                         type: 'string',
//                         description: '交易类型',
//                         enum: ['inside', 'outside'],
//                         default: 'outside',
//                     },
//                     minInterval: {
//                         type: 'number',
//                         description: '最小交易间隔（秒）',
//                         default: 1000,
//                     },
//                     maxInterval: {
//                         type: 'number',
//                         description: '最大交易间隔（秒）',
//                         default: 2000,
//                     },
//                     tipAmount: {
//                         type: 'number',
//                         description: '小费金额',
//                         default: 0.0001,
//                     },
//                     slippageBps: {
//                         type: 'number',
//                         description: '滑点（基点）',
//                         default: 5,
//                     },
//                 },
//                 required: ['tokenId', 'targetPrice', 'walletIds', 'tradingType', 'fixedAmount'],
//             },
//             handler: async args => {
//                 try {
//                     if (!this.token) {
//                         return {
//                             content: [
//                                 {
//                                     type: 'text',
//                                     text: config.messages.login.required,
//                                 },
//                             ],
//                         };
//                     }

//                     // console.log('handler createStrategy args ==============', args);

//                     // 验证策略参数
//                     const validationArgs = {
//                         ...args,
//                         amount: args.fixedAmount, // 将 fixedAmount 映射到 amount 用于验证
//                     };
//                     Validator.validateStrategyParams(validationArgs);

//                     const tradingParams = {
//                         side: args.side || 'buy',
//                         tradingType: args.tradingType || 'outside',
//                         targetPrice: args.targetPrice,
//                         priceThresholdPercent: args.priceThresholdPercent || 0,
//                         amount: args.fixedAmount,
//                         token: args.tokenId,
//                         walletIds: args.walletIds,
//                         minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
//                         maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
//                     };

//                     if (args.tipAmount) {
//                         tradingParams.tipAmount = args.tipAmount;
//                     }

//                     if (args.slippageBps) {
//                         tradingParams.slippageBps = args.slippageBps;
//                     }

//                     const strategyParams = {
//                         name: 'PRICE_BASED',
//                         type: 'PRICE_BASED',
//                         tokenId: args.tokenId,
//                         config: tradingParams,
//                     };

//                     const response = await this.apiClient.createStrategy(strategyParams);

//                     if (response.success) {
//                         return {
//                             content: [
//                                 {
//                                     type: 'text',
//                                     text: config.messages.strategy.success,
//                                 },
//                                 {
//                                     type: 'text',
//                                     text: `策略参数: ${JSON.stringify(strategyParams, null, 2)}`,
//                                 },
//                             ],
//                         };
//                     } else {
//                         return {
//                             content: [
//                                 {
//                                     type: 'text',
//                                     text: response.message || config.messages.strategy.failed,
//                                 },
//                             ],
//                         };
//                     }
//                 } catch (error) {
//                     return {
//                         content: [
//                             {
//                                 type: 'text',
//                                 text: error.message || config.messages.strategy.failed,
//                             },
//                         ],
//                     };
//                 }
//             },
//         });
//     }

//     registerHandlers() {
//         // Logger.info('开始注册请求处理器');

//         // 注册工具列表请求处理器
//         this.setRequestHandler(ListToolsRequestSchema, request => {
//             // Logger.info('收到工具列表请求', { request });
//             const tools = Array.from(this.tools.entries()).map(([name, tool]) => ({
//                 name,
//                 description: tool.description,
//                 inputSchema: tool.inputSchema,
//             }));

//             // Logger.debug('返回工具列表', { tools });
//             return {
//                 tools: tools,
//             };
//         });

//         // 注册工具调用请求处理器
//         this.setRequestHandler(CallToolRequestSchema, async request => {
//             // Logger.info('收到工具调用请求', {
//             //     method: request.method,
//             //     params: request.params,
//             //     id: request.id,
//             // });

//             const { name, arguments: args } = request.params;
//             // Logger.debug('解析请求参数', { toolName: name, arguments: args });

//             const tool = this.tools.get(name);
//             if (!tool) {
//                 // Logger.error('工具不存在', { toolName: name, availableTools: Array.from(this.tools.keys()) });
//                 throw new Error(`Tool '${name}' not found`);
//             }

//             // Logger.info('开始执行工具', { toolName: name });
//             const result = await tool.handler(args || {});
//             // Logger.info('工具执行完成', { toolName: name, result });

//             return result;
//         });

//         // Logger.info('请求处理器注册完成');
//     }
// }

// // 启动服务器
// async function main() {
//     // Logger.info('MCP服务器启动开始');

//     const server = new PriceStrategyMCPServer();
//     const transport = new StdioServerTransport();

//     // Logger.info('连接传输层');
//     await server.connect(transport);

//     // Logger.info('MCP服务器启动完成，等待请求...');
//     console.error('Price Strategy MCP Server started');
//     process.stderr.write('Price Strategy MCP Server started successfully\n');
// }

// // 导出类供测试使用
// export { PriceStrategyMCPServer };

// // 如果直接运行此文件，则启动服务器
// if (import.meta.url === `file://${process.argv[1]}`) {
//     main().catch(error => {
//         // Logger.error('MCP服务器启动失败', { error: error.message, stack: error.stack });
//         console.error(error);
//     });
// }
