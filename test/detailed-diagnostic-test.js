// MCP 详细日志诊断测试

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class MCPDetailedClient {
    constructor() {
        this.process = null
        this.requestId = 0
    }

    async start() {
        return new Promise((resolve, reject) => {
            console.log('🚀 启动MCP服务器...')

            this.process = spawn('node', ['mcp-price-strategy-server.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: join(__dirname, '..'),
                env: {
                    ...process.env,
                    LOG_LEVEL: 'debug' // 启用详细日志
                }
            })

            this.process.stdout.on('data', (data) => {
                console.log('📤 STDOUT:', data.toString())
            })

            this.process.stderr.on('data', (data) => {
                const output = data.toString()
                // 解析日志格式
                if (output.includes('[INFO]') || output.includes('[DEBUG]') || output.includes('[WARN]') || output.includes('[ERROR]')) {
                    console.log('📋 LOG:', output.trim())
                } else {
                    console.log('⚠️  STDERR:', output.trim())
                }
            })

            this.process.on('error', (error) => {
                console.error('❌ 进程错误:', error)
                reject(error)
            })

            this.process.on('exit', (code, signal) => {
                console.log(`🛑 进程退出: code=${code}, signal=${signal}`)
            })

            // 等待服务器启动
            setTimeout(() => {
                console.log('✅ MCP服务器启动完成')
                resolve()
            }, 3000)
        })
    }

    async stop() {
        if (this.process) {
            console.log('🛑 停止MCP服务器...')
            this.process.kill()
            this.process = null
        }
    }

    async callTool(name, args) {
        this.requestId++

        const request = {
            jsonrpc: '2.0',
            id: this.requestId,
            method: 'tools/call',
            params: {
                name: name,
                arguments: args
            }
        }

        return new Promise((resolve, reject) => {
            if (!this.process || !this.process.stdin) {
                reject(new Error('MCP server not running'))
                return
            }

            const responseHandler = (data) => {
                try {
                    const response = JSON.parse(data.toString())
                    if (response.id === this.requestId) {
                        if (this.process && this.process.stdout) {
                            this.process.stdout.removeListener('data', responseHandler)
                        }
                        resolve(response.result)
                    }
                } catch (error) {
                    // 忽略非JSON数据
                }
            }

            this.process.stdout.on('data', responseHandler)

            console.log(`🔍 发送请求 #${this.requestId}:`, { name, args })
            this.process.stdin.write(JSON.stringify(request) + '\n')

            // 设置超时
            setTimeout(() => {
                if (this.process && this.process.stdout) {
                    this.process.stdout.removeListener('data', responseHandler)
                }
                reject(new Error('Request timeout'))
            }, 15000)
        })
    }

    async listTools() {
        const request = {
            jsonrpc: '2.0',
            id: 'list-tools',
            method: 'tools/list',
            params: {}
        }

        return new Promise((resolve, reject) => {
            if (!this.process || !this.process.stdin) {
                reject(new Error('MCP server not running'))
                return
            }

            const responseHandler = (data) => {
                try {
                    const response = JSON.parse(data.toString())
                    if (response.id === 'list-tools') {
                        if (this.process && this.process.stdout) {
                            this.process.stdout.removeListener('data', responseHandler)
                        }
                        resolve(response.result)
                    }
                } catch (error) {
                    // 忽略非JSON数据
                }
            }

            this.process.stdout.on('data', responseHandler)

            console.log('📋 请求工具列表...')
            this.process.stdin.write(JSON.stringify(request) + '\n')

            // 设置超时
            setTimeout(() => {
                if (this.process && this.process.stdout) {
                    this.process.stdout.removeListener('data', responseHandler)
                }
                reject(new Error('Request timeout'))
            }, 15000)
        })
    }
}

// 详细诊断测试
async function runDetailedDiagnosticTests() {
    const client = new MCPDetailedClient()

    try {
        await client.start()

        console.log('\n🔍 开始详细诊断测试...')

        // 测试1: 获取工具列表
        console.log('\n📋 测试1: 获取工具列表')
        try {
            const toolsResult = await client.listTools()
            console.log('📊 可用工具列表:', JSON.stringify(toolsResult, null, 2))
        } catch (error) {
            console.log('❌ 获取工具列表失败:', error.message)
        }

        // 测试2: 登录测试（带详细日志）
        console.log('\n🔐 测试2: 登录测试')
        try {
            const loginResult = await client.callTool('login', {
                email: 'hesiyuetian@gmail.com',
                password: 'Aa123456'
            })
            console.log('📊 登录结果:', JSON.stringify(loginResult, null, 2))
        } catch (error) {
            console.log('❌ 登录测试失败:', error.message)
        }

        // 测试3: 测试无效工具
        console.log('\n🚫 测试3: 测试无效工具')
        try {
            const invalidResult = await client.callTool('invalidTool', {})
            console.log('📊 无效工具结果:', JSON.stringify(invalidResult, null, 2))
        } catch (error) {
            console.log('✅ 无效工具测试通过:', error.message)
        }

        // 测试4: 测试无效参数
        console.log('\n⚠️ 测试4: 测试无效参数')
        try {
            const invalidParamsResult = await client.callTool('login', {
                // 缺少必需参数
                email: 'test@example.com'
                // 缺少 password
            })
            console.log('📊 无效参数结果:', JSON.stringify(invalidParamsResult, null, 2))
        } catch (error) {
            console.log('✅ 无效参数测试通过:', error.message)
        }

        console.log('\n📋 详细诊断总结:')
        console.log('1. 查看上面的日志输出，了解请求处理流程')
        console.log('2. 检查工具注册和参数验证过程')
        console.log('3. 观察API调用和响应处理')
        console.log('4. 分析错误处理和异常情况')
    } catch (error) {
        console.error('❌ 诊断过程中发生错误:', error)
    } finally {
        await client.stop()
    }
}

// 运行详细诊断
runDetailedDiagnosticTests().catch(console.error)
