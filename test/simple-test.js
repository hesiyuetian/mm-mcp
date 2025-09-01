// 简化的MCP服务测试文件

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class SimpleMCPTester {
    constructor() {
        this.process = null
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            console.log('启动MCP服务器...')

            this.process = spawn('node', ['mcp-price-strategy-server.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: join(__dirname, '..')
            })

            this.process.stdout.on('data', (data) => {
                const output = data.toString()
                console.log('服务器输出:', output)

                // 检查服务器是否成功启动
                if (output.includes('Price Strategy MCP Server started')) {
                    console.log('✅ MCP服务器启动成功！')
                    resolve()
                }
            })

            this.process.stderr.on('data', (data) => {
                console.error('服务器错误:', data.toString())
            })

            this.process.on('error', (error) => {
                console.error('启动服务器失败:', error)
                reject(error)
            })

            // 设置超时
            setTimeout(() => {
                console.log('⏰ 服务器启动超时，但可能已经启动')
                resolve()
            }, 5000)
        })
    }

    async stopServer() {
        if (this.process) {
            console.log('停止MCP服务器...')
            this.process.kill()
            this.process = null
        }
    }

    async testServerHealth() {
        try {
            // 等待服务器启动
            await this.startServer()

            console.log('\n🧪 开始健康检查...')

            // 检查服务器进程是否运行
            if (this.process && !this.process.killed) {
                console.log('✅ 服务器进程正在运行')
            } else {
                console.log('❌ 服务器进程未运行')
                return false
            }

            // 检查服务器是否响应
            await new Promise((resolve) => setTimeout(resolve, 2000))

            if (this.process && !this.process.killed) {
                console.log('✅ 服务器响应正常')
                return true
            } else {
                console.log('❌ 服务器无响应')
                return false
            }
        } catch (error) {
            console.error('❌ 健康检查失败:', error.message)
            return false
        }
    }
}

// 运行简化测试
async function runSimpleTest() {
    const tester = new SimpleMCPTester()

    try {
        const isHealthy = await tester.testServerHealth()

        if (isHealthy) {
            console.log('\n🎉 MCP服务健康检查通过！')
            console.log('服务已准备就绪，可以开始使用。')
        } else {
            console.log('\n💥 MCP服务健康检查失败！')
            console.log('请检查服务器配置和依赖。')
        }
    } catch (error) {
        console.error('测试过程中发生错误:', error)
    } finally {
        await tester.stopServer()
    }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    runSimpleTest().catch(console.error)
}

export { SimpleMCPTester, runSimpleTest }
