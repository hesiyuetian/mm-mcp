// MCP 限价策略服务配置文件

const config = {
    // 服务器配置
    server: {
        name: 'price-strategy-server',
        version: '1.0.0',
        description: 'MCP服务 - 限价策略交易'
    },

    // API配置
    api: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
        timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
        retries: 3
    },

    // 日志配置
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json'
    },

    // 策略配置
    strategy: {
        defaultInterval: {
            min: 1, // 秒
            max: 2 // 秒
        },
        defaultTipAmount: 0.001,
        defaultSlippageBps: 100,
        maxWalletCount: 100000
    },

    // 错误消息
    messages: {
        login: {
            required: '请先登录',
            failed: '登录失败',
            success: '登录成功'
        },
        projects: {
            failed: '获取项目列表失败',
            empty: '没有可用的项目'
        },
        tokens: {
            failed: '获取Token列表失败',
            empty: '没有可用的Token'
        },
        wallets: {
            failed: '获取钱包列表失败',
            empty: '没有可用的钱包',
            insufficient: '钱包余额不足'
        },
        strategy: {
            failed: '限价策略创建失败',
            success: '限价策略创建成功',
            deleteFailed: '策略删除失败',
            deleteSuccess: '策略删除成功'
        }
    },

    // 验证规则
    validation: {
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: '邮箱格式不正确'
        },
        price: {
            min: 0,
            message: '价格必须大于0'
        },
        amount: {
            min: 0,
            message: '数量必须大于0'
        },
        ratio: {
            min: 0,
            max: 100,
            message: '比例必须在0-100之间'
        },
        interval: {
            min: 1,
            max: 3600,
            message: '交易间隔必须在1-3600秒之间'
        }
    }
}

export default config
