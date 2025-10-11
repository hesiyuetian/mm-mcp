import { Tool } from '@modelcontextprotocol/sdk/types.js';
import ApiClient from '../utils/api-client';
import { logger } from '../utils/logger';
import config from '../config/index';

export function createProjectTools(): Tool[] {
    return [
        {
            name: 'getProjects',
            description: `📋 项目列表查询 - 获取用户所有活跃项目

🔍 功能说明：
获取用户的项目列表，只返回项目名称，然后提示用户选择一个项目，再获取Token列表。如果没有项目列表，则提示用户需要在MM管理后台(https://onchain.wired.fund)先创建一个项目。

⚠️ 重要提醒：
• 项目状态：只返回状态为 'active' 的活跃项目
• 权限要求：需要有效的API Token才能访问项目列表
• 管理后台：新项目需要在MM管理后台创建后才能在此处看到

🎯 适用场景：
• 新用户首次使用需要查看可用项目
• 选择特定项目进行Token管理
• 验证项目配置和权限状态

📋 输出示例：
查询成功后将返回：
\`\`\`
📋 项目列表查询结果

✅ 查询成功：
项目总数：3个活跃项目
更新时间：2024-01-15 15:30:25

📊 项目详情：

【1】项目名称：My Trading Project
项目ID：proj_1234567890
状态：✅ 活跃
创建时间：2024-01-10 10:00:00
描述：主要交易项目

【2】项目名称：DeFi Strategy
项目ID：proj_0987654321  
状态：✅ 活跃
创建时间：2024-01-12 14:30:00
描述：DeFi策略测试项目

【3】项目名称：Arbitrage Bot
项目ID：proj_1122334455
状态：✅ 活跃
创建时间：2024-01-14 09:15:00
描述：套利机器人项目

💡 下一步操作：
请选择一个项目ID，然后使用 getTokens 工具获取该项目的Token列表。
\`\`\``,
            inputSchema: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
    ];
}

export async function handleProjectTool(name: string, args: any, apiClient: ApiClient, token: string): Promise<any> {
    try {
        switch (name) {
            case 'getProjects':
                // logger.info('开始获取项目列表');

                if (!token) {
                    logger.warn('未登录状态尝试获取项目列表');
                    return {
                        success: false,
                        error: config.messages.login.required,
                    };
                }

                // logger.info('调用API获取项目列表');
                const response = await apiClient.getProjects();
                // logger.debug('API项目列表响应', response);

                const projects = (response || []).filter(item => item.status === 'active');

                return {
                    success: true,
                    data: {
                        projects: projects,
                        total: projects.length,
                        message: `获取项目列表成功，共 ${projects.length} 个项目`,
                    },
                };

            default:
                throw new Error(`未知的项目工具: ${name}`);
        }
    } catch (error) {
        logger.error(`项目工具执行失败 ${name}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        };
    }
}
