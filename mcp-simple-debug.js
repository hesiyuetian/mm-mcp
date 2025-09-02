#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

class DebugMCPServer extends Server {
    constructor() {
        super({
            name: 'price-strategy-server',
            version: '1.0.0',
        });

        this.registerHandlers();
    }

    registerHandlers() {
        // 注册工具列表请求处理器
        this.setRequestHandler(ListToolsRequestSchema, request => {
            // 输出到stderr用于调试
            process.stderr.write(`DEBUG: Received ListTools request\n`);

            return {
                tools: [
                    {
                        name: 'hello',
                        description: '简单的问候工具',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: '你的名字',
                                },
                            },
                        },
                    },
                    {
                        name: 'echo',
                        description: '回显工具',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    description: '要回显的消息',
                                },
                            },
                        },
                    },
                ],
            };
        });

        // 注册工具调用请求处理器
        this.setRequestHandler(CallToolRequestSchema, async request => {
            const { name, arguments: args } = request.params;

            process.stderr.write(`DEBUG: Received CallTool request for: ${name}\n`);

            if (name === 'hello') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `你好，${args?.name || '世界'}！`,
                        },
                    ],
                };
            }

            if (name === 'echo') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `回显: ${args?.message || '没有消息'}`,
                        },
                    ],
                };
            }

            throw new Error(`Tool '${name}' not found`);
        });
    }
}

// 启动服务器
async function main() {
    try {
        process.stderr.write('DEBUG: Starting MCP server...\n');

        const server = new DebugMCPServer();
        const transport = new StdioServerTransport();

        process.stderr.write('DEBUG: Connecting transport...\n');
        await server.connect(transport);

        process.stderr.write('DEBUG: MCP server started successfully\n');
    } catch (error) {
        process.stderr.write(`ERROR: MCP server failed to start: ${error.message}\n`);
        process.exit(1);
    }
}

main();
