import { Tool } from '@modelcontextprotocol/sdk/types.js';
import ApiClient from '../utils/api-client';
import Validator from '../utils/validator';
import { logger } from '../utils/logger';
import config from '../config/index';

export function createTokenTools(): Tool[] {
    return [
        {
            name: 'getTokens',
            description: `🪙 Token列表查询 - 获取项目中的所有Token

🔍 功能说明：
获取指定项目里的Token列表，只返回地址、名称和符号信息，然后提示用户选择一个Token，再提示获取钱包列表，然后选择一个钱包，再提示创建策略。如果没有项目ID，则提示用户先获取项目列表。

⚠️ 重要提醒：
• 项目依赖：必须先有有效的项目ID才能获取Token列表
• 交易类型：自动根据poolType判断交易类型（pump=inside, pool=outside）
• 分页支持：支持分页查询，默认每页10000条记录

🎯 适用场景：
• 选择特定Token进行交易策略配置
• 查看项目中的可用Token资产
• 验证Token配置和交易类型设置

📋 输出示例：
查询成功后将返回：
\`\`\`
🪙 Token列表查询结果

✅ 查询成功：
项目ID：proj_1234567890
Token总数：5个Token
更新时间：2024-01-15 15:30:25

📊 Token详情：

【1】Token名称：Solana Token
Token地址：So11111111111111111111111111111111111111112
符号：SOL
交易类型：outside（外盘交易）
池子类型：pool

【2】Token名称：USDC Token  
Token地址：EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
符号：USDC
交易类型：outside（外盘交易）
池子类型：pool

【3】Token名称：Custom Token
Token地址：CustomTokenAddress123456789012345678901234567890
符号：CUSTOM
交易类型：inside（内盘交易）
池子类型：pump

【4】Token名称：DeFi Token
Token地址：DeFiTokenAddress123456789012345678901234567890
符号：DEFI
交易类型：inside（内盘交易）
池子类型：pump

【5】Token名称：Meme Token
Token地址：MemeTokenAddress123456789012345678901234567890
符号：MEME
交易类型：inside（内盘交易）
池子类型：pump

💡 下一步操作：
请选择一个Token ID，然后使用 getWallets 工具获取该Token的钱包列表。
\`\`\``,
            inputSchema: {
                type: 'object',
                properties: {
                    projectId: {
                        type: 'string',
                        description: '项目ID',
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
                required: ['projectId'],
            },
        },
    ];
}

export async function handleTokenTool(name: string, args: any, apiClient: ApiClient, token: string): Promise<any> {
    try {
        switch (name) {
            case 'getTokens':
                // logger.info('开始获取Token列表', { args });

                if (!token) {
                    logger.warn('未登录状态尝试获取Token列表');
                    return {
                        success: false,
                        error: config.messages.login.required,
                    };
                }

                // logger.debug('验证分页参数', args);
                Validator.validatePaginationParams(args);

                // logger.info('调用API获取Token列表', {
                //     projectId: args.projectId,
                //     page: args.page,
                //     limit: args.limit,
                // });
                const response = await apiClient.getTokens(args.projectId, args.page, args.limit);
                // logger.debug('API Token列表响应', response);

                const tokens = (response.items || []).map(ele => ({
                    ...ele,
                    tradingType: ele.poolType === 'pump' ? 'inside' : 'outside',
                }));

                return {
                    success: true,
                    data: {
                        tokens: tokens,
                        total: tokens.length,
                        projectId: args.projectId,
                        message: `获取Token列表成功，项目ID: ${args.projectId}，共 ${tokens.length} 个Token`,
                    },
                };

            default:
                throw new Error(`未知的Token工具: ${name}`);
        }
    } catch (error) {
        logger.error(`Token工具执行失败 ${name}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        };
    }
}
