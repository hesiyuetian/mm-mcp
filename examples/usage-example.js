// MCP 限价策略服务使用示例

// 1. 账户登录
async function login() {
    const result = await mcp.callTool('login', {
        email: 'user@example.com',
        password: 'password123'
    })

    if (result.success) {
        console.log('登录成功:', result.user)
        return result.user
    } else {
        console.error('登录失败:', result.message)
        throw new Error(result.message)
    }
}

// 2. 获取项目列表
async function getProjects() {
    const result = await mcp.callTool('getProjects', {
        page: 1,
        limit: 100
    })

    if (result.success) {
        console.log('项目列表:', result.projects)
        return result.projects
    } else {
        console.error('获取项目列表失败:', result.message)
        throw new Error(result.message)
    }
}

// 3. 获取Token列表
async function getTokens(projectId) {
    const result = await mcp.callTool('getTokens', {
        projectId: projectId,
        page: 1,
        limit: 100,
        status: 'active'
    })

    if (result.success) {
        console.log('Token列表:', result.tokens)
        return result.tokens
    } else {
        console.error('获取Token列表失败:', result.message)
        throw new Error(result.message)
    }
}

// 4. 获取钱包列表
async function getWallets(projectId, tokenId) {
    const result = await mcp.callTool('getWallets', {
        projectId: projectId,
        tokenId: tokenId,
        limit: 100000
    })

    if (result.success) {
        console.log('钱包列表:', result.wallets)
        return result.wallets
    } else {
        console.error('获取钱包列表失败:', result.message)
        throw new Error(result.message)
    }
}

// 5. 创建限价策略 - 固定数量买入
async function createFixedBuyStrategy(tokenId, walletIds, targetPrice, amount) {
    const result = await mcp.callTool('createPriceStrategy', {
        tokenId: tokenId,
        side: 'buy',
        targetPrice: targetPrice,
        walletIds: walletIds,
        amountType: 'fixed',
        fixedAmount: amount,
        minInterval: 1,
        maxInterval: 2,
        tipAmount: 0.001
    })

    if (result.success) {
        console.log('限价策略创建成功:', result.strategyId)
        return result.strategyId
    } else {
        console.error('限价策略创建失败:', result.message)
        throw new Error(result.message)
    }
}

// 6. 创建限价策略 - 范围比例买入
async function createRangeBuyStrategy(tokenId, walletIds, targetPrice, minRatio, maxRatio) {
    const result = await mcp.callTool('createPriceStrategy', {
        tokenId: tokenId,
        side: 'buy',
        targetPrice: targetPrice,
        walletIds: walletIds,
        amountType: 'range',
        minRatio: minRatio,
        maxRatio: maxRatio,
        minInterval: 1,
        maxInterval: 2
    })

    if (result.success) {
        console.log('限价策略创建成功:', result.strategyId)
        return result.strategyId
    } else {
        console.error('限价策略创建失败:', result.message)
        throw new Error(result.message)
    }
}

// 7. 创建限价策略 - 随机数量卖出
async function createRandomSellStrategy(tokenId, walletIds, targetPrice, minAmount, maxAmount) {
    const result = await mcp.callTool('createPriceStrategy', {
        tokenId: tokenId,
        side: 'sell',
        targetPrice: targetPrice,
        walletIds: walletIds,
        amountType: 'random',
        minAmount: minAmount,
        maxAmount: maxAmount,
        minInterval: 1,
        maxInterval: 2,
        slippageBps: 100
    })

    if (result.success) {
        console.log('限价策略创建成功:', result.strategyId)
        return result.strategyId
    } else {
        console.error('限价策略创建失败:', result.message)
        throw new Error(result.message)
    }
}

// 8. 获取策略列表
async function getStrategies(projectId) {
    const result = await mcp.callTool('getStrategies', {
        projectId: projectId,
        page: 1,
        limit: 20
    })

    if (result.success) {
        console.log('策略列表:', result.strategies)
        return result.strategies
    } else {
        console.error('获取策略列表失败:', result.message)
        throw new Error(result.message)
    }
}

// 9. 删除策略
async function deleteStrategy(strategyId) {
    const result = await mcp.callTool('deleteStrategy', {
        strategyId: strategyId
    })

    if (result.success) {
        console.log('策略删除成功')
        return true
    } else {
        console.error('策略删除失败:', result.message)
        throw new Error(result.message)
    }
}

// 完整流程示例
async function completeWorkflow() {
    try {
        // 1. 登录
        const user = await login()

        // 2. 获取项目列表
        const projects = await getProjects()
        const projectId = projects[0]?.id

        if (!projectId) {
            throw new Error('没有可用的项目')
        }

        // 3. 获取Token列表
        const tokens = await getTokens(projectId)
        const tokenId = tokens[0]?.id

        if (!tokenId) {
            throw new Error('没有可用的Token')
        }

        // 4. 获取钱包列表
        const wallets = await getWallets(projectId, tokenId)
        const walletIds = wallets.slice(0, 3).map((w) => w.id) // 选择前3个钱包

        if (walletIds.length === 0) {
            throw new Error('没有可用的钱包')
        }

        // 5. 创建限价策略
        const strategyId = await createFixedBuyStrategy(
            tokenId,
            walletIds,
            0.5, // 目标价格
            1.0 // 固定数量
        )

        console.log('完整流程执行成功，策略ID:', strategyId)

        // 6. 查看策略列表
        const strategies = await getStrategies(projectId)

        // 7. 删除策略（可选）
        // await deleteStrategy(strategyId);
    } catch (error) {
        console.error('流程执行失败:', error.message)
    }
}

// 导出函数供其他模块使用
module.exports = {
    login,
    getProjects,
    getTokens,
    getWallets,
    createFixedBuyStrategy,
    createRangeBuyStrategy,
    createRandomSellStrategy,
    getStrategies,
    deleteStrategy,
    completeWorkflow
}
