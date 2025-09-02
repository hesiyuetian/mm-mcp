// #!/usr/bin/env node

// // 正确的MCP服务器实现

// import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// // 日志工具类
// class Logger {
//     static log(level, message, data = null) {
//         const timestamp = new Date().toISOString();
//         const logEntry = {
//             timestamp,
//             level,
//             message,
//             data,
//         };

//         // 输出到stderr，避免影响MCP协议
//         process.stderr.write(`[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}\n`);
//     }

//     static info(message, data = null) {
//         this.log('INFO', message, data);
//     }

//     static debug(message, data = null) {
//         this.log('DEBUG', message, data);
//     }

//     static warn(message, data = null) {
//         this.log('WARN', message, data);
//     }

//     static error(message, data = null) {
//         this.log('ERROR', message, data);
//     }
// }

// class PriceStrategyMCPServer extends Server {
//     constructor() {
//         super({
//             name: 'price-strategy-server',
//             version: '1.0.0',
//         });

//         this.tools = new Map();

//         Logger.info('MCP服务器初始化开始');
//         this.registerTools();
//         this.registerHandlers();
//         Logger.info('MCP服务器初始化完成');
//     }

//     registerTools() {
//         Logger.info('开始注册工具');

//         // 注册测试工具
//         this.tools.set('test', {
//             description: '测试工具',
//             inputSchema: {
//                 type: 'object',
//                 properties: {
//                     message: {
//                         type: 'string',
//                         description: '测试消息',
//                     },
//                 },
//             },
//             handler: async args => {
//                 Logger.info('收到测试请求', { args });
//                 return {
//                     success: true,
//                     message: `测试成功: ${args?.message || 'Hello MCP!'}`,
//                 };
//             },
//         });

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
//                 Logger.info('收到登录请求', { args });
//                 try {
//                     // 模拟登录成功
//                     return {
//                         success: true,
//                         message: '登录成功',
//                         user: { email: args.email },
//                     };
//                 } catch (error) {
//                     Logger.error('登录失败', { error: error.message });
//                     return {
//                         success: false,
//                         message: '登录失败: ' + error.message,
//                     };
//                 }
//             },
//         });

//         // 注册获取项目列表工具
//         this.tools.set('getProjects', {
//             description: '获取项目列表',
//             inputSchema: {
//                 type: 'object',
//                 properties: {
//                     page: {
//                         type: 'number',
//                         description: '页码',
//                     },
//                     limit: {
//                         type: 'number',
//                         description: '每页数量',
//                     },
//                 },
//             },
//             handler: async args => {
//                 Logger.info('收到获取项目列表请求', { args });
//                 try {
//                     // 模拟返回项目列表
//                     return {
//                         success: true,
//                         message: '获取项目列表成功',
//                         data: {
//                             projects: [
//                                 { id: 'project-1', name: '示例项目1' },
//                                 { id: 'project-2', name: '示例项目2' },
//                             ],
//                             total: 2,
//                         },
//                     };
//                 } catch (error) {
//                     Logger.error('获取项目列表失败', { error: error.message });
//                     return {
//                         success: false,
//                         message: '获取项目列表失败: ' + error.message,
//                     };
//                 }
//             },
//         });

//         Logger.info('工具注册完成，共注册 ' + this.tools.size + ' 个工具');
//     }

//     registerHandlers() {
//         Logger.info('开始注册请求处理器');

//         // 注册工具列表请求处理器
//         this.setRequestHandler(ListToolsRequestSchema, request => {
//             Logger.info('收到工具列表请求', { request });
//             const tools = Array.from(this.tools.entries()).map(([name, tool]) => ({
//                 name,
//                 description: tool.description,
//                 inputSchema: tool.inputSchema,
//             }));

//             Logger.debug('返回工具列表', { tools });
//             return {
//                 tools: tools,
//             };
//         });

//         // 注册工具调用请求处理器
//         this.setRequestHandler(CallToolRequestSchema, async request => {
//             Logger.info('收到工具调用请求', {
//                 method: request.method,
//                 params: request.params,
//                 id: request.id,
//             });

//             const { name, arguments: args } = request.params;
//             Logger.debug('解析请求参数', { toolName: name, arguments: args });

//             const tool = this.tools.get(name);
//             if (!tool) {
//                 Logger.error('工具不存在', { toolName: name, availableTools: Array.from(this.tools.keys()) });
//                 throw new Error(`Tool '${name}' not found`);
//             }

//             Logger.info('开始执行工具', { toolName: name });
//             const result = await tool.handler(args || {});
//             Logger.info('工具执行完成', { toolName: name, result });

//             return result;
//         });

//         Logger.info('请求处理器注册完成');
//     }
// }

// // 启动服务器
// async function main() {
//     try {
//         Logger.info('MCP服务器启动开始');

//         const server = new PriceStrategyMCPServer();
//         const transport = new StdioServerTransport();

//         Logger.info('连接传输层');
//         await server.connect(transport);

//         Logger.info('MCP服务器启动完成，等待请求...');
//         process.stderr.write('Price Strategy MCP Server started successfully\n');
//     } catch (error) {
//         Logger.error('MCP服务器启动失败', { error: error.message, stack: error.stack });
//         process.stderr.write(`MCP Server failed to start: ${error.message}\n`);
//         process.exit(1);
//     }
// }

// main().catch(error => {
//     Logger.error('MCP服务器启动失败', { error: error.message, stack: error.stack });
//     process.stderr.write(`MCP Server failed to start: ${error.message}\n`);
//     process.exit(1);
// });
