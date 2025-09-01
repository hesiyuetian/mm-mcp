// MCP 限价策略服务手动测试文件

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class MCPClient {
    constructor() {
        this.process = null
        this.requestId = 0
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.process = spawn('node', ['mcp-price-strategy-server.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: join(__dirname, '..') // 确保在正确的目录运行
            })

            this.process.stdout.on('data', (data) => {
                console.log('MCP Server Output:', data.toString())
            })

            this.process.stderr.on('data', (data) => {
                console.error('MCP Server Error:', data.toString())
            })

            this.process.on('error', (error) => {
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
        console.log('callTool=====', name, args)
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
                        this.process.stdout.removeListener('data', responseHandler)
                        resolve(response.result)
                    }
                } catch (error) {
                    // 忽略非JSON数据
                }
            }

            this.process.stdout.on('data', responseHandler)

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

// 手动测试用例
async function runManualTests() {
    const client = new MCPClient()

    try {
        console.log('启动MCP服务器...')
        await client.start()

        console.log('开始手动测试...')

        // 测试1: 登录功能
        console.log('\n测试1: 登录功能')
        try {
            const loginResult = await client.callTool('login', {
                email: 'hesiyuetian@gmail.com',
                password: 'Aa123456'
            })
            console.log('登录结果:', loginResult)
            console.log('✅ 登录测试通过')
        } catch (error) {
            console.log('❌ 登录测试失败:', error.message)
        }

        // 测试2: 获取项目列表
        // console.log('\n测试2: 获取项目列表')
        // try {
        //     const projectsResult = await client.callTool('getProjects', {
        //         page: 1,
        //         limit: 10
        //     })
        //     console.log('项目列表结果:', projectsResult)
        //     console.log('✅ 获取项目列表测试通过')
        // } catch (error) {
        //     console.log('❌ 获取项目列表测试失败:', error.message)
        // }

        // // 测试3: 创建限价策略（参数验证）
        // console.log('\n测试3: 创建限价策略参数验证')
        // try {
        //     const strategyResult = await client.callTool('createPriceStrategy', {
        //         tokenId: 'test-token-id',
        //         side: 'buy',
        //         targetPrice: 0.5,
        //         walletIds: ['wallet-1', 'wallet-2'],
        //         amountType: 'fixed',
        //         fixedAmount: 1.0,
        //         minInterval: 1,
        //         maxInterval: 2
        //     })
        //     console.log('策略创建结果:', strategyResult)
        //     console.log('✅ 创建策略测试通过')
        // } catch (error) {
        //     console.log('❌ 创建策略测试失败:', error.message)
        // }

        // // 测试4: 测试无效参数
        // console.log('\n测试4: 无效参数测试')
        // try {
        //     const invalidResult = await client.callTool('createPriceStrategy', {
        //         // 缺少必需参数
        //         side: 'buy'
        //     })
        //     console.log('无效参数结果:', invalidResult)
        //     console.log('❌ 无效参数测试应该失败但没有')
        // } catch (error) {
        //     console.log('✅ 无效参数测试通过:', error.message)
        // }

        // // 测试5: 测试参数验证
        // console.log('\n测试5: 参数验证测试')
        // try {
        //     const validationResult = await client.callTool('createPriceStrategy', {
        //         tokenId: 'test-token-id',
        //         side: 'invalid-side', // 无效的交易方向
        //         targetPrice: -1, // 无效的价格
        //         walletIds: [], // 空的钱包列表
        //         amountType: 'fixed',
        //         fixedAmount: 1.0
        //     })
        //     console.log('参数验证结果:', validationResult)
        //     console.log('❌ 参数验证测试应该失败但没有')
        // } catch (error) {
        //     console.log('✅ 参数验证测试通过:', error.message)
        // }

        console.log('\n🎉 所有手动测试完成！')
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error)
    } finally {
        console.log('停止MCP服务器...')
        await client.stop()
    }
}

// 运行测试
runManualTests().catch(console.error)
