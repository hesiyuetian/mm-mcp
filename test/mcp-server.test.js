// MCP 限价策略服务测试文件

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
                reject(new Error('🛑 进程退出'))
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
            // setTimeout(() => {
            //     this.process.stdout.removeListener('data', responseHandler)
            //     reject(new Error('Request timeout'))
            // }, 15000)
        })
    }
}

// 测试用例
async function runTests() {
    const client = new MCPClient()

    try {
        console.log('启动MCP服务器...')
        await client.start()

        console.log('开始测试...')

        // 测试1: 登录功能
        console.log('\n测试1: 登录功能')
        try {
            const loginResult = await client.callTool('login', {
                email: 'hesiyuetian@gmail.com',
                password: 'Aa123456'
            })
            console.log('登录结果:', loginResult)
        } catch (error) {
            console.log('登录测试失败:', error.message)
        }

        // 测试2: 获取项目列表
        console.log('\n测试2: 获取项目列表')
        let projectId = ''
        try {
            const { success, projects } = await client.callTool('getProjects', {
                // page: 1,
                // limit: 10
            })
            console.log('项目列表结果:', projects)

            if (projects.length > 0) projectId = projects[0].id
        } catch (error) {
            console.log('获取项目列表测试失败:', error.message)
        }

        if (!projectId) return

        // 测试3: 获取Token列表
        console.log('\n测试3: 获取Token列表')
        let tokenInfo = {}
        try {
            const { success, tokens } = await client.callTool('getTokens', {
                projectId: projectId,
                page: 1,
                limit: 10000
            })
            console.log('Token列表结果:', tokens)

            if (tokens.length > 0) tokenInfo = tokens[0]
        } catch (error) {
            console.log('获取Token列表测试失败:', error.message)
        }

        if (!tokenInfo.id) return

        let walletId = ''

        // 测试4: 获取钱包列表
        console.log('\n测试4: 获取钱包列表')
        try {
            const { success, wallets } = await client.callTool('getWallets', {
                projectId: tokenInfo.projectId,
                tokenId: tokenInfo.id,
                page: 1,
                limit: 10000
            })
            console.log('钱包列表结果:', wallets)

            if (wallets.length > 0) walletId = wallets[0].id
        } catch (error) {
            console.log('获取钱包列表测试失败:', error.message)
        }

        if (!walletId) return

        // 测试5: 创建限价策略
        console.log('\n测试5: 创建限价策略')
        try {
            const strategyResult = await client.callTool('createPriceStrategy', {
                tokenId: tokenInfo.id,
                side: 'buy',
                targetPrice: 0.00001,
                walletIds: [walletId],
                amount: 0.01,
                tradingType: tokenInfo.poolType === 'pump' ? 'inside' : 'outside',
                minInterval: 1000,
                maxInterval: 2000
            })
            console.log('策略创建结果:', strategyResult)
        } catch (error) {
            console.log('创建策略测试失败:', error.message)
        }

        // // 测试4: 测试无效参数
        // console.log('\n测试4: 无效参数测试')
        // try {
        //     const invalidResult = await client.callTool('createPriceStrategy', {
        //         // 缺少必需参数
        //         side: 'buy'
        //     })
        //     console.log('无效参数结果:', invalidResult)
        // } catch (error) {
        //     console.log('无效参数测试通过:', error.message)
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
        // } catch (error) {
        //     console.log('参数验证测试通过:', error.message)
        // }

        console.log('\n所有测试完成！')
    } catch (error) {
        console.error('测试过程中发生错误:', error)
    } finally {
        console.log('停止MCP服务器...')
        await client.stop()
    }
}

runTests().catch(console.error)

// Jest测试套件
// describe('MCP Price Strategy Server', () => {
//     let client

//     beforeAll(async () => {
//         client = new MCPClient()
//         await client.start()
//     })

//     afterAll(async () => {
//         await client.stop()
//     })

//     test('服务器应该能够启动', () => {
//         expect(client.process).toBeTruthy()
//     })

//     test('登录工具应该存在', async () => {
//         try {
//             const result = await client.callTool('login', {
//                 email: 'test@example.com',
//                 password: 'testpassword'
//             })
//             expect(result).toBeDefined()
//         } catch (error) {
//             // 预期错误，因为没有真实API
//             expect(error.message).toContain('登录')
//         }
//     })

//     test('获取项目列表工具应该存在', async () => {
//         try {
//             const result = await client.callTool('getProjects', {
//                 page: 1,
//                 limit: 10
//             })
//             expect(result).toBeDefined()
//         } catch (error) {
//             // 预期错误，因为没有真实API
//             expect(error.message).toContain('项目')
//         }
//     })

//     test('创建策略工具应该存在', async () => {
//         try {
//             const result = await client.callTool('createPriceStrategy', {
//                 tokenId: 'test-token-id',
//                 side: 'buy',
//                 targetPrice: 0.5,
//                 walletIds: ['wallet-1'],
//                 amountType: 'fixed',
//                 fixedAmount: 1.0
//             })
//             expect(result).toBeDefined()
//         } catch (error) {
//             // 预期错误，因为没有真实API
//             expect(error.message).toContain('策略')
//         }
//     })
// })

// 运行测试
// if (import.meta.url === `file://${process.argv[1]}`) {
//     runTests().catch(console.error)
// }

// export { MCPClient, runTests }
