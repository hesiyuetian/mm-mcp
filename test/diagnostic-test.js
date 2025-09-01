// MCP 登录诊断测试

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class MCPDiagnosticClient {
    constructor() {
        this.process = null
        this.requestId = 0
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.process = spawn('node', ['mcp-price-strategy-server.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: join(__dirname, '..')
            })

            this.process.stdout.on('data', (data) => {
                console.log('📤 MCP Server Output:', data.toString())
            })

            this.process.stderr.on('data', (data) => {
                console.log('⚠️  MCP Server Error:', data.toString())
            })

            this.process.on('error', (error) => {
                console.error('❌ MCP Server Error Event:', error)
                reject(error)
            })

            // 等待服务器启动
            setTimeout(resolve, 2000)
        })
    }

    async stop() {
        if (this.process) {
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

            console.log(`🔍 发送请求: ${name}`, args)
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

// 诊断测试
async function runDiagnosticTests() {
    const client = new MCPDiagnosticClient()

    try {
        console.log('🚀 启动MCP服务器进行诊断...')
        await client.start()

        console.log('\n🔍 开始登录诊断测试...')

        // 测试1: 检查API连接
        console.log('\n📡 测试1: 检查API连接')
        try {
            const loginResult = await client.callTool('login', {
                email: 'hesiyuetian@gmail.com',
                password: 'Aa123456'
            })
            console.log('📊 登录结果:', JSON.stringify(loginResult, null, 2))

            if (loginResult.success === false) {
                console.log('❌ 登录失败原因分析:')
                console.log('   - 消息:', loginResult.message)
                console.log('   - 可能的原因:')
                console.log('     1. API服务器未运行 (http://localhost:3000)')
                console.log('     2. 网络连接问题')
                console.log('     3. 用户名或密码错误')
                console.log('     4. API端点不存在')
            }
        } catch (error) {
            console.log('❌ 登录请求异常:', error.message)
        }

        // 测试2: 检查环境变量
        console.log('\n🔧 测试2: 检查环境变量')
        console.log('   - API_BASE_URL:', process.env.API_BASE_URL || 'http://localhost:3000 (默认)')
        console.log('   - REQUEST_TIMEOUT:', process.env.REQUEST_TIMEOUT || '30000 (默认)')
        console.log('   - LOG_LEVEL:', process.env.LOG_LEVEL || 'info (默认)')

        // 测试3: 检查网络连接
        console.log('\n🌐 测试3: 检查网络连接')
        try {
            const axios = (await import('axios')).default
            const response = await axios.get('http://localhost:3000', { timeout: 5000 })
            console.log('✅ API服务器响应正常:', response.status)
        } catch (error) {
            console.log('❌ API服务器连接失败:', error.message)
            console.log('   建议:')
            console.log('   1. 确保API服务器在 http://localhost:3000 运行')
            console.log('   2. 检查防火墙设置')
            console.log('   3. 检查API服务器日志')
        }

        console.log('\n📋 诊断总结:')
        console.log('1. 检查API服务器是否运行在 http://localhost:3000')
        console.log('2. 确认用户名和密码是否正确')
        console.log('3. 检查网络连接和防火墙设置')
        console.log('4. 查看API服务器日志获取详细错误信息')
    } catch (error) {
        console.error('❌ 诊断过程中发生错误:', error)
    } finally {
        console.log('\n🛑 停止MCP服务器...')
        await client.stop()
    }
}

// 运行诊断
runDiagnosticTests().catch(console.error)
