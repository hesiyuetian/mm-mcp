#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

class SimpleMCPServer extends Server {
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
            return {
                tools: [
                    {
                        name: 'test',
                        description: '测试工具',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    description: '测试消息',
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

            if (name === 'test') {
                return {
                    success: true,
                    message: `测试成功: ${args?.message || 'Hello MCP!'}`,
                };
            }

            throw new Error(`Tool '${name}' not found`);
        });
    }
}

// 启动服务器
async function main() {
    try {
        const server = new SimpleMCPServer();
        const transport = new StdioServerTransport();

        await server.connect(transport);

        // 输出到stderr表示服务器已启动
        process.stderr.write('Simple MCP Server started successfully\n');
    } catch (error) {
        process.stderr.write(`MCP Server failed to start: ${error.message}\n`);
        process.exit(1);
    }
}

main();
