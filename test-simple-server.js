// 简单的MCP服务器测试

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

class SimpleMCPServer extends Server {
    constructor() {
        super({
            name: 'simple-test-server',
            version: '1.0.0'
        })

        this.registerTools()
    }

    registerTools() {
        // 注册一个简单的工具
        this.tool(
            'hello',
            {
                description: '简单的问候工具',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: '姓名'
                        }
                    }
                }
            },
            async (args) => {
                return {
                    message: `Hello, ${args.name || 'World'}!`,
                    timestamp: new Date().toISOString()
                }
            }
        )
    }
}

// 启动服务器
async function main() {
    const server = new SimpleMCPServer()
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('Simple MCP Server started')
}

main().catch(console.error)
