import { Tool } from '@modelcontextprotocol/sdk/types.js';
import ApiClient from '../utils/api-client';
import Validator from '../utils/validator';
import { logger } from '../utils/logger';
import config from '../config/index';

export function createWalletTools(): Tool[] {
    return [
        {
            name: 'getWallets',
            description: `💰 钱包列表查询 - 获取Token对应的钱包信息

🔍 功能说明：
获取指定Token的钱包列表，只返回钱包地址、SOL余额、当前Token的余额、别名(name)和对应的钱包组，然后引导创建对应的策略。用户必须先选择要执行的策略类型，根据策略类型判断需要用户的交易方向，先选择交易方向，再返回钱包列表。


⚠️ 重要提醒：
  在执行获取钱包列表工具的操作时候,必须要先根据选择的策略类型,判断需要用户的交易方向,先选择交易方向,再返回钱包列表;
• 策略类型选择：必须先选择策略类型（限价、定时、拉砸、拆分、刷量、狙击等）
• 交易方向判断：不同策略对应不同的交易方向规则
• 余额过滤：根据交易方向过滤钱包（买入(buy)需要SOL余额，卖出(sell)需要Token和SOL余额）
• 钱包组信息：钱包组为type和tag字段拼接（type-tag格式）
• 如果没有Token ID, 则提示用户先获取Token列表;

🎯 策略类型和交易方向规则：
• 限价策略(PRICE_BASED)、定时策略(TIME_BASED),则必须要先引导用户选择交易方向,buy或者sell, 先选择交易方向,再返回钱包列表;
• 拉砸策略(MARKET_MANIPULATION),则必须要先引导用户选择交易方向,拉升或者砸盘, (拉升为buy, 砸盘为sell), 先选择交易方向,再返回钱包列表;
• Raydium狙击策略(RAYDIUM_SNIPER),PumpSwap狙击策略(PUMP_MIGRATE),不需要选择交易方向,也不需要提示给用户, 默认设置为buy;
• 拆分策略, 需要调用两次钱包列表, 引导用户选择拆分地址和目标地址(拆分地址交易方向为sell, 目标地址交易方向为buy),然后返回钱包列表;
• 刷量策略, 需要调用两次钱包列表, 分别引导用户选择买入地址和卖出地址(买入地址交易方向为buy, 卖出地址交易方向为sell),然后返回钱包列表;
• PumpSwap狙击策略, 需要用户选择是否仅狙击买入, 如果选择 "是否仅狙击买入", 如果选择为否, 则需要用户选择发射账号, 否则不需要用户选择发射账号;

🎯 钱包选择限制：
• 限价策略、定时策略、拉砸策略, 可以选择一个或者多个钱包来创建策略;
• 拆分策略, 用户需要选择拆分地址和目标地址,都可以选择一个或者多个钱包,但是拆分地址和目标地址不能有交集;
• 刷量策略, 用户需要选择买入地址和卖出地址,只能选择一个钱包地址, 买入地址和卖出地址不能相同;
• Raydium狙击策略, 只能选择一个钱包地址狙击;
• PumpSwap狙击策略, 如果选择 "是否仅狙击买入", 如果选择为否, 则需要用户选择发射账号, 否则不需要用户选择发射账号;发射账号和狙击账号不能相同, 狙击地址和发射账号只能选择一个钱包地址;


📋 输出示例：
查询成功后将返回：
\`\`\`
💰 钱包列表查询结果

✅ 查询成功：
Token ID：token_1234567890
策略类型：PRICE_BASED（限价策略）
交易方向：buy（买入）
钱包总数：8个可用钱包

📊 钱包详情：

【1】钱包地址：7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
别名：Main Trading Wallet
钱包组：premium-vip
SOL余额：15.75000000 SOL
Token余额：0.00000000 TOKEN


【2】钱包地址：9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
别名：Secondary Wallet
钱包组：standard-user
SOL余额：8.25000000 SOL
Token余额：0.00000000 TOKEN

【3】钱包地址：5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1
别名：Arbitrage Bot
钱包组：bot-trading
SOL余额：25.00000000 SOL
Token余额：0.00000000 TOKEN

【4】钱包地址：3xJ3MoUVFPNFEbUka3t3n4mGppzg8t3H1vQ3tJvJvJvJ
别名：DeFi Strategy
钱包组：defi-strategy
SOL余额：12.50000000 SOL
Token余额：0.00000000 TOKEN

💡 下一步操作：
请选择一个或多个钱包ID，然后使用相应的策略创建工具。
\`\`\``,
            inputSchema: {
                type: 'object',
                properties: {
                    projectId: {
                        type: 'string',
                        description: '项目ID',
                    },
                    tokenId: {
                        type: 'string',
                        description: 'Token ID',
                    },
                    strategyType: {
                        type: 'string',
                        description: '策略类型',
                        enum: ['PRICE_BASED', 'TIME_BASED', 'MARKET_MANIPULATION', 'PORTFOLIO_EXCHANGE', 'BUNDLE_SWAP', 'PUMP_MIGRATE', 'RAYDIUM_SNIPER'],
                    },
                    side: {
                        type: 'string',
                        description: '交易方向',
                        enum: ['buy', 'sell'],
                    },
                    page: {
                        type: 'number',
                        description: '页码',
                        default: 1,
                    },
                    limit: {
                        type: 'number',
                        description: '每页数量',
                        default: 10000,
                    },
                },
                required: ['projectId', 'tokenId', 'side', 'strategyType'],
            },
        },
    ];
}

export async function handleWalletTool(name: string, args: any, apiClient: ApiClient, token: string): Promise<any> {
    try {
        switch (name) {
            case 'getWallets':
                // logger.info('开始获取钱包列表', { args });

                if (!token) {
                    logger.warn('未登录状态尝试获取钱包列表');
                    return {
                        success: false,
                        error: config.messages.login.required,
                    };
                }

                // if (!args.side) {
                //     return {
                //         success: false,
                //         error: '请先选择交易方向',
                //     };
                // }

                // logger.debug('验证分页参数', args);
                Validator.validatePaginationParams(args);

                const response = await apiClient.getWallets(args.projectId, args.tokenId, args.page, args.limit);
                // logger.debug('API钱包列表响应', response);

                // 根据交易方向过滤钱包
                const wallets = (response.items || []).filter(item => (args.side === 'buy' ? Number(item.balance) > 0 : Number(item.balance) > 0 && Number(item.tokenBalance) > 0));
                // const wallets = response.items || [];

                return {
                    success: true,
                    data: {
                        wallets: wallets,
                        total: wallets.length,
                        tokenId: args.tokenId,
                        strategyType: args.strategyType,
                        side: args.side,
                        message: `获取钱包列表成功，Token ID: ${args.tokenId}，共 ${wallets.length} 个钱包`,
                    },
                };

            default:
                throw new Error(`未知的钱包工具: ${name}`);
        }
    } catch (error) {
        logger.error(`钱包工具执行失败 ${name}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        };
    }
}
