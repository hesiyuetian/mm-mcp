#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dayjs from 'dayjs';
import ApiClient from './utils/api-client.js';
import Validator from './utils/validator.js';
import config from './config/index.js';

import fs from 'fs';
import path from 'path';

// 日志工具类
class Logger {
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
        };

        // 输出到stderr，避免影响MCP协议
        console.error(`[${timestamp}] [${level}] ${message}`, data ? JSON.stringify(data, null, 2) : '');

        // 同时写入文件
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logFile = path.join(logDir, `mcp-server-${new Date().toISOString().split('T')[0]}.log`);
        const logLine = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}\n`;

        fs.appendFileSync(logFile, logLine);
    }

    static info(message, data = null) {
        this.log('INFO', message, data);
    }

    static debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    static warn(message, data = null) {
        this.log('WARN', message, data);
    }

    static error(message, data = null) {
        this.log('ERROR', message, data);
    }
}

class StrategyMCPServer extends Server {
    constructor() {
        super({
            name: config.server.name,
            version: config.server.version,
        });

        this.apiClient = new ApiClient();
        this.token = config.api.token;
        // this.userInfo = null;
        this.tools = new Map();

        Logger.info('MCP服务器初始化开始');
        this.registerTools();
        this.registerHandlers();
        Logger.info('MCP服务器初始化完成');
    }

    registerTools() {
        Logger.info('开始注册工具');

        // 注册登录工具
        // this.tools.set('login', {
        //     description: '用户账户登录',
        //     inputSchema: {
        //         type: 'object',
        //         properties: {
        //             email: {
        //                 type: 'string',
        //                 description: '用户邮箱',
        //             },
        //             password: {
        //                 type: 'string',
        //                 description: '用户密码',
        //             },
        //         },
        //         required: ['email', 'password'],
        //     },
        //     handler: async args => {
        //         Logger.info('收到登录请求', { args });
        //         try {
        //             Logger.debug('验证登录参数', args);
        //             Validator.validateLoginParams(args);

        //             Logger.info('调用API登录', { email: args.email });
        //             const response = await this.apiClient.login(args.email, args.password);
        //             Logger.debug('API登录响应', response);

        //             if (response.accessToken) {
        //                 this.token = response.accessToken;
        //                 this.userInfo = response.user;
        //                 this.apiClient.setToken(response.accessToken);
        //                 Logger.info('登录成功', { user: response.user });

        //                 return {
        //                     content: [
        //                         {
        //                             type: 'text',
        //                             text: config.messages.login.success,
        //                         },
        //                         {
        //                             type: 'text',
        //                             text: `用户: ${JSON.stringify(response.user)}`,
        //                         },
        //                     ],
        //                 };
        //             } else {
        //                 Logger.warn('登录失败', { message: response.message });
        //                 return {
        //                     content: [
        //                         {
        //                             type: 'text',
        //                             text: response.message || config.messages.login.failed,
        //                         },
        //                     ],
        //                 };
        //             }
        //         } catch (error) {
        //             Logger.error('登录异常', { error: error.message, stack: error.stack });
        //             return {
        //                 content: [
        //                     {
        //                         type: 'text',
        //                         text: error.message || config.messages.login.failed,
        //                     },
        //                 ],
        //             };
        //         }
        //     },
        // });

        // 注册获取项目列表工具
        this.tools.set('getProjects', {
            description: `获取用户的项目列表,只需要返回项目名称, 然后提示用户选择一个项目,再获取Token列表; 如果没有项目列表,则提示用户需要再MM管理后台(https://onchain.wired.fund)先创建一个项目;`,
            inputSchema: {
                type: 'object',
                properties: {},
            },
            handler: async args => {
                Logger.info('收到获取项目列表请求', { args });
                try {
                    if (!this.token) {
                        Logger.warn('未登录状态尝试获取项目列表');
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.login.required,
                                },
                            ],
                        };
                    }

                    Logger.info('调用API获取项目列表');
                    const response = await this.apiClient.getProjects();
                    Logger.debug('API项目列表响应', response);

                    const projects = (response || []).filter(item => item.status === 'active');
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `获取项目列表成功，共 ${projects.length} 个项目`,
                            },
                            {
                                type: 'text',
                                text: `项目列表: ${JSON.stringify(projects, null, 2)}`,
                            },
                        ],
                    };
                } catch (error) {
                    Logger.error('获取项目列表异常', { error: error.message, stack: error.stack });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: error.message || config.messages.projects.failed,
                            },
                        ],
                    };
                }
            },
        });

        // 注册获取Token列表工具
        this.tools.set('getTokens', {
            description: `
            获取指定项目里的Token列表,只需要返回地址、名称、和符号 (注意:不要返回其他信息), 然后提示用户选择一个Token,再提示获取钱包列表, 然后选择一个钱包,再提示创建策略;
            如果没有项目ID, 则提示用户先获取项目列表, 需要把项目列表返回给用户,只需要返回项目名称, 然后提示用户选择一个项目,再获取Token列表; 
            `,
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
            handler: async args => {
                Logger.info('收到获取Token列表请求', { args });
                try {
                    if (!this.token) {
                        Logger.warn('未登录状态尝试获取Token列表');
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.login.required,
                                },
                            ],
                        };
                    }

                    Logger.debug('验证分页参数', args);
                    Validator.validatePaginationParams(args);

                    Logger.info('调用API获取Token列表', { projectId: args.projectId, page: args.page, limit: args.limit });
                    const response = await this.apiClient.getTokens(args.projectId, args.page, args.limit);
                    Logger.debug('APIToken列表响应', response);

                    const tokens = (response.items || []).map(ele => ({ ...ele, tradingType: ele.poolType === 'pump' ? 'inside' : 'outside' }));
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `获取Token列表成功，项目ID: ${args.projectId}，共 ${tokens.length} 个Token`,
                            },
                            {
                                type: 'text',
                                text: `Token列表: ${JSON.stringify(tokens, null, 2)}`,
                            },
                        ],
                    };
                } catch (error) {
                    Logger.error('获取Token列表异常', { error: error.message, stack: error.stack });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: error.message || config.messages.tokens.failed,
                            },
                        ],
                    };
                }
            },
        });

        // 注册获取钱包列表工具
        this.tools.set('getWallets', {
            description: `
            用户必须先选要执行的择策略类型: 限价策略(PRICE_BASED)、定时策略(TIME_BASED)、拉砸策略(MARKET_MANIPULATION)、拆分策略(PORTFOLIO_EXCHANGE)、刷量策略(BUNDLE_SWAP);

            在执行获取钱包列表工具的操作时候,必须要先根据选择的策略类型,判断需要用户的交易方向,先选择交易方向,再返回钱包列表;

            不同策略对应的交易方向判断规则:
            1:限价策略(PRICE_BASED)、定时策略(TIME_BASED),则必须要先引导用户选择交易方向,buy或者sell, 先选择交易方向,再返回钱包列表;
            2:拉砸策略(MARKET_MANIPULATION),则必须要先引导用户选择交易方向,拉升或者砸盘, (拉升为buy, 砸盘为sell), 先选择交易方向,再返回钱包列表;
            3:其他策略不需要选择交易方向,也不需要提示给用户, 都设置为sell;

            选择钱包限制:
            1: 限价策略、定时策略、拉砸策略, 可以选择一个或者多个钱包来创建策略;
            2: 拆分策略, 用户需要选择拆分地址和目标地址,都可以选择一个或者多个钱包,但是拆分地址和目标地址不能有交集;
            3: 刷量策略, 用户需要选择买入地址和卖出地址,只能选择一个钱包地址, 买入地址和卖出地址不能相同;

            获取指定Token的钱包列表,只需要返回钱包地址、SOL余额、当前Token的余额、别名(name)和对应的钱包组 (钱包组为 列表里的type和tag字段,拼接方式: type-tag), 然后引导创建对应的策略; 
            提示用户如果交易方向为买入, 则需要购买的钱包地址有SOL余额, 如果交易方向为卖出, 则需要卖出的钱包地址有当前Token余额和SOl余额;
            如果没有Token ID, 则提示用户先获取Token列表`,
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
                        enum: ['PRICE_BASED', 'TIME_BASED', 'MARKET_MANIPULATION', 'PORTFOLIO_EXCHANGE', 'BUNDLE_SWAP'],
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
            handler: async args => {
                Logger.info('收到获取钱包列表请求', { args });
                try {
                    if (!this.token) {
                        Logger.warn('未登录状态尝试获取钱包列表');
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.login.required,
                                },
                            ],
                        };
                    }
                    if (!args.side) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: '请先选择交易方向',
                                },
                            ],
                        };
                    }

                    Logger.debug('验证分页参数', args);
                    Validator.validatePaginationParams(args);

                    const response = await this.apiClient.getWallets(args.projectId, args.tokenId, args.page, args.limit);
                    Logger.debug('API钱包列表响应', response);

                    // const wallets = (response.items || []).filter(item => Number(item.balance) > 0 || Number(item.tokenBalance) > 0);
                    const wallets = (response.items || []).filter(item => (args.side === 'buy' ? Number(item.balance) > 0 : Number(item.balance) > 0 && Number(item.tokenBalance) > 0));
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `获取钱包列表成功，Token ID: ${args.tokenId}，共 ${wallets.length} 个钱包`,
                            },
                            {
                                type: 'text',
                                text: `钱包列表: ${JSON.stringify(wallets, null, 2)}`,
                            },
                        ],
                    };
                } catch (error) {
                    Logger.error('获取钱包列表异常', { error: error.message, stack: error.stack });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: error.message || config.messages.wallets.failed,
                            },
                        ],
                    };
                }
            },
        });

        // 注册限价策略
        this.tools.set('createPriceStrategy', {
            description: `
            创建限价策略订单,
            交易方向,不需要用户输入, 从获取钱包列表的参数里获取;
            交易类型,不需要用户输入, 也不需要告诉用户交易类型, 根据Token列表里的poolType字段来判断, 如果poolType为pump, 则交易类型为inside, 如果poolType为pool, 则交易类型为outside;
            如果没有钱包ID,则提示用户先获取钱包列表;
            如果没有Token ID,则提示用户先获取Token列表;
            如果没有项目ID,则提示用户先获取项目列表;
            `,
            inputSchema: {
                type: 'object',
                properties: {
                    tokenId: {
                        type: 'string',
                        description: 'Token ID',
                    },
                    side: {
                        type: 'string',
                        description: '交易方向',
                        enum: ['buy', 'sell'],
                        default: 'buy',
                    },
                    targetPrice: {
                        type: 'number',
                        description: '目标价格(单位: SOL)',
                    },
                    walletIds: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                        description: '钱包ID列表',
                    },
                    amountType: {
                        type: 'string',
                        description: '数量类型, fixed: 固定数量, range: 余额比例(1-100%), random: 随机数量; 需要先让用户选择数量类型',
                        enum: ['fixed', 'range', 'random'],
                        default: 'fixed',
                    },
                    amount: {
                        type: 'number',
                        description: '固定数量(单位: 买入为SOL, 卖出为Token数量, 注意: 是每个钱包地址的挂单数量, 如果数量类型为fixed, 则必须要输入;需要先让用户选择数量类型)',
                    },
                    minRatio: {
                        type: 'number',
                        description: '范围比例最小值(单位: %, 如果数量类型为range, 则需要输入范围比例最小值和最大值;需要先让用户选择数量类型)',
                    },
                    maxRatio: {
                        type: 'number',
                        description: '范围比例最大值(单位: %, 如果数量类型为range, 则需要输入范围比例最小值和最大值;需要先让用户选择数量类型)',
                    },
                    minAmount: {
                        type: 'number',
                        description: '随机数量最小值(单位:  买入为SOL, 卖出为Token数量, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                    },
                    maxAmount: {
                        type: 'number',
                        description: '随机数量最大值(单位:  买入为SOL, 卖出为Token数量, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                    },
                    tradingType: {
                        type: 'string',
                        description: '交易类型',
                        enum: ['inside', 'outside'],
                        default: 'outside',
                    },
                    minInterval: {
                        type: 'number',
                        description: '最小交易间隔（秒）',
                        default: 1,
                    },
                    maxInterval: {
                        type: 'number',
                        description: '最大交易间隔（秒）',
                        default: 2,
                    },
                    tipAmount: {
                        type: 'number',
                        description: '小费金额(单位: SOL)',
                        default: 0.0001,
                    },
                    slippageBps: {
                        type: 'number',
                        description: '滑点(单位: %)',
                        default: 5,
                    },
                },
                required: ['tokenId', 'targetPrice', 'side', 'walletIds', 'tradingType'],
            },
            handler: async args => {
                try {
                    if (!this.token) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.login.required,
                                },
                            ],
                        };
                    }

                    // console.log('handler createStrategy args ==============', args);

                    // 验证策略参数
                    const validationArgs = {
                        ...args,
                    };
                    Validator.validatePriceStrategyParams(validationArgs);

                    const tradingParams = {
                        side: args.side || 'buy',
                        tradingType: args.tradingType || 'inside',
                        targetPrice: args.targetPrice,
                        priceThresholdPercent: args.priceThresholdPercent || 0,
                        walletIds: args.walletIds,
                        minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
                        maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
                    };

                    if (args.amountType === 'fixed') {
                        tradingParams.amount = args.amount;
                    } else if (args.amountType === 'range') {
                        tradingParams.minRatio = args.minRatio;
                        tradingParams.maxRatio = args.maxRatio;
                    } else if (args.amountType === 'random') {
                        tradingParams.minAmount = args.minAmount;
                        tradingParams.maxAmount = args.maxAmount;
                    }

                    if (args.tipAmount) {
                        tradingParams.tipAmount = args.tipAmount;
                    }

                    if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                        tradingParams.slippageBps = args.slippageBps;
                    }

                    const strategyParams = {
                        name: 'PRICE_BASED',
                        type: 'PRICE_BASED',
                        tokenId: args.tokenId,
                        config: tradingParams,
                    };

                    const response = await this.apiClient.createStrategy(strategyParams);

                    if (response.success) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.strategy.priceStrategySuccess,
                                },
                                {
                                    type: 'text',
                                    text: `策略参数: ${JSON.stringify(strategyParams, null, 2)}`,
                                },
                            ],
                        };
                    } else {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: response.message || config.messages.strategy.priceStrategyFailed,
                                },
                            ],
                        };
                    }
                } catch (error) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: error.message || config.messages.strategy.priceStrategyFailed,
                            },
                        ],
                    };
                }
            },
        });

        // 注册定时策略
        this.tools.set('createTimeStrategy', {
            description: `
            创建定时策略订单,
            交易方向,不需要用户输入, 从获取钱包列表的参数里获取;
            策略执行时间,必须要大于当前时间+3分钟, 格式为: 2025-01-01 12:00:00;
            交易类型,不需要用户输入, 也不需要告诉用户交易类型, 根据Token列表里的poolType字段来判断, 如果poolType为pump, 则交易类型为inside, 如果poolType为pool, 则交易类型为outside;
            如果没有钱包ID,则提示用户先获取钱包列表;
            如果没有Token ID,则提示用户先获取Token列表;
            如果没有项目ID,则提示用户先获取项目列表;
            `,
            inputSchema: {
                type: 'object',
                properties: {
                    tokenId: {
                        type: 'string',
                        description: 'Token ID',
                    },
                    side: {
                        type: 'string',
                        description: '交易方向',
                        enum: ['buy', 'sell'],
                        // default: 'buy',
                    },
                    executeAt: {
                        type: 'string',
                        description: '策略执行时间(格式: 2025-01-01 12:00:00)',
                    },
                    walletIds: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                        description: '钱包ID列表',
                    },
                    amountType: {
                        type: 'string',
                        description: '数量类型, fixed: 固定数量, range: 余额比例(1-100%), random: 随机数量; 需要先让用户选择数量类型',
                        enum: ['fixed', 'range', 'random'],
                        default: 'fixed',
                    },
                    amount: {
                        type: 'number',
                        description: '固定数量(单位: 买入为SOL, 卖出为Token数量, 注意: 是每个钱包地址的挂单数量, 如果数量类型为fixed, 则必须要输入;需要先让用户选择数量类型)',
                    },
                    minRatio: {
                        type: 'number',
                        description: '范围比例最小值(单位: %, 如果数量类型为range, 则需要输入范围比例最小值和最大值;需要先让用户选择数量类型)',
                    },
                    maxRatio: {
                        type: 'number',
                        description: '范围比例最大值(单位: %, 如果数量类型为range, 则需要输入范围比例最小值和最大值;需要先让用户选择数量类型)',
                    },
                    minAmount: {
                        type: 'number',
                        description: '随机数量最小值(单位:  买入为SOL, 卖出为Token数量, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                    },
                    maxAmount: {
                        type: 'number',
                        description: '随机数量最大值(单位:  买入为SOL, 卖出为Token数量, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                    },
                    tradingType: {
                        type: 'string',
                        description: '交易类型',
                        enum: ['inside', 'outside'],
                        // default: 'outside',
                    },
                    minInterval: {
                        type: 'number',
                        description: '最小交易间隔（秒）',
                        default: 1,
                    },
                    maxInterval: {
                        type: 'number',
                        description: '最大交易间隔（秒）',
                        default: 2,
                    },
                    tipAmount: {
                        type: 'number',
                        description: '小费金额(单位: SOL)',
                        default: 0.0001,
                    },
                    slippageBps: {
                        type: 'number',
                        description: '滑点(单位: %)',
                        default: 5,
                    },
                },
                required: ['tokenId', 'executeAt', 'walletIds', 'tradingType', 'side'],
            },
            handler: async args => {
                try {
                    if (!this.token) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.login.required,
                                },
                            ],
                        };
                    }

                    // console.log('handler createStrategy args ==============', args);

                    // 验证策略参数
                    const validationArgs = {
                        ...args,
                    };
                    Validator.validateTimeStrategyParams(validationArgs);

                    const tradingParams = {
                        side: args.side,
                        tradingType: args.tradingType,
                        executeAt: dayjs(values.executeAt).toISOString(),
                        walletIds: args.walletIds,
                        minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
                        maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
                    };

                    if (args.amountType === 'fixed') {
                        tradingParams.amount = args.amount;
                    } else if (args.amountType === 'range') {
                        tradingParams.minRatio = args.minRatio;
                        tradingParams.maxRatio = args.maxRatio;
                    } else if (args.amountType === 'random') {
                        tradingParams.minAmount = args.minAmount;
                        tradingParams.maxAmount = args.maxAmount;
                    }

                    if (args.tipAmount) {
                        tradingParams.tipAmount = args.tipAmount;
                    }

                    if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                        tradingParams.slippageBps = args.slippageBps;
                    }

                    const strategyParams = {
                        name: 'TIME_BASED',
                        type: 'TIME_BASED',
                        tokenId: args.tokenId,
                        config: tradingParams,
                    };

                    const response = await this.apiClient.createStrategy(strategyParams);

                    if (response.success) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.strategy.timeStrategySuccess,
                                },
                                {
                                    type: 'text',
                                    text: `策略参数: ${JSON.stringify(strategyParams, null, 2)}`,
                                },
                            ],
                        };
                    } else {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: response.message || config.messages.strategy.timeStrategyFailed,
                                },
                            ],
                        };
                    }
                } catch (error) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: error.message || config.messages.strategy.timeStrategyFailed,
                            },
                        ],
                    };
                }
            },
        });

        // 注册拉砸策略
        this.tools.set('createMarketManipulationStrategy', {
            description: `
            创建拉砸策略订单,
            交易方向,不需要用户输入, 从获取钱包列表的参数里获取;
            策略执行时间,必须要大于当前时间+3分钟, 格式为: 2025-01-01 12:00:00;
            交易类型,不需要用户输入, 也不需要告诉用户交易类型, 根据Token列表里的poolType字段来判断, 如果poolType为pump, 则交易类型为inside, 如果poolType为pool, 则交易类型为outside;
            如果没有钱包ID,则提示用户先获取钱包列表;
            如果没有Token ID,则提示用户先获取Token列表;
            如果没有项目ID,则提示用户先获取项目列表;
            `,
            inputSchema: {
                type: 'object',
                properties: {
                    tokenId: {
                        type: 'string',
                        description: 'Token ID',
                    },
                    side: {
                        type: 'string',
                        description: '交易方向',
                        enum: ['buy', 'sell'],
                        // default: 'buy',
                    },
                    executeAt: {
                        type: 'string',
                        description: '策略执行时间(格式: 2025-01-01 12:00:00)',
                    },
                    walletIds: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                        description: '钱包ID列表',
                    },
                    amountType: {
                        type: 'string',
                        description: '数量类型, fixed: 固定数量, range: 余额比例(1-100%), random: 随机数量; 需要先让用户选择数量类型',
                        enum: ['fixed', 'range', 'random'],
                        default: 'fixed',
                    },
                    amount: {
                        type: 'number',
                        description: '固定数量(单位: 买入为SOL, 卖出为Token数量, 注意: 是每个钱包地址的挂单数量, 如果数量类型为fixed, 则必须要输入;需要先让用户选择数量类型)',
                    },
                    minRatio: {
                        type: 'number',
                        description: '范围比例最小值(单位: %, 如果数量类型为range, 则需要输入范围比例最小值和最大值;需要先让用户选择数量类型)',
                    },
                    maxRatio: {
                        type: 'number',
                        description: '范围比例最大值(单位: %, 如果数量类型为range, 则需要输入范围比例最小值和最大值;需要先让用户选择数量类型)',
                    },
                    minAmount: {
                        type: 'number',
                        description: '随机数量最小值(单位:  买入为SOL, 卖出为Token数量, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                    },
                    maxAmount: {
                        type: 'number',
                        description: '随机数量最大值(单位:  买入为SOL, 卖出为Token数量, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                    },
                    tradingType: {
                        type: 'string',
                        description: '交易类型',
                        enum: ['inside', 'outside'],
                        // default: 'outside',
                    },
                    minInterval: {
                        type: 'number',
                        description: '最小交易间隔（秒）',
                        default: 1,
                    },
                    maxInterval: {
                        type: 'number',
                        description: '最大交易间隔（秒）',
                        default: 2,
                    },
                    tipAmount: {
                        type: 'number',
                        description: '小费金额(单位: SOL)',
                        default: 0.0001,
                    },
                    slippageBps: {
                        type: 'number',
                        description: '滑点(单位: %)',
                        default: 5,
                    },
                },
                required: ['tokenId', 'executeAt', 'walletIds', 'tradingType', 'side'],
            },
            handler: async args => {
                try {
                    if (!this.token) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.login.required,
                                },
                            ],
                        };
                    }

                    // console.log('handler createStrategy args ==============', args);

                    // 验证策略参数
                    const validationArgs = {
                        ...args,
                    };
                    Validator.validateTimeStrategyParams(validationArgs);

                    const tradingParams = {
                        side: args.side,
                        tradingType: args.tradingType,
                        executeAt: dayjs(values.executeAt).toISOString(),
                        walletIds: args.walletIds,
                        minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
                        maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
                    };

                    if (args.amountType === 'fixed') {
                        tradingParams.amount = args.amount;
                    } else if (args.amountType === 'range') {
                        tradingParams.minRatio = args.minRatio;
                        tradingParams.maxRatio = args.maxRatio;
                    } else if (args.amountType === 'random') {
                        tradingParams.minAmount = args.minAmount;
                        tradingParams.maxAmount = args.maxAmount;
                    }

                    if (args.tipAmount) {
                        tradingParams.tipAmount = args.tipAmount;
                    }

                    if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                        tradingParams.slippageBps = args.slippageBps;
                    }

                    const strategyParams = {
                        name: 'TIME_BASED',
                        type: 'TIME_BASED',
                        tokenId: args.tokenId,
                        config: tradingParams,
                    };

                    const response = await this.apiClient.createStrategy(strategyParams);

                    if (response.success) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.strategy.marketManipulationStrategySuccess,
                                },
                                {
                                    type: 'text',
                                    text: `策略参数: ${JSON.stringify(strategyParams, null, 2)}`,
                                },
                            ],
                        };
                    } else {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: response.message || config.messages.strategy.marketManipulationStrategyFailed,
                                },
                            ],
                        };
                    }
                } catch (error) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: error.message || config.messages.strategy.marketManipulationStrategyFailed,
                            },
                        ],
                    };
                }
            },
        });

        // 注册拆分策略
        this.tools.set('createPortfolioExchangeStrategy', {
            description: `
            创建拆分策略订单,
            交易方向,不需要用户输入, 从获取钱包列表的参数里获取;
            策略执行时间,必须要大于当前时间+3分钟, 格式为: 2025-01-01 12:00:00;
            交易类型,不需要用户输入, 也不需要告诉用户交易类型, 根据Token列表里的poolType字段来判断, 如果poolType为pump, 则交易类型为inside, 如果poolType为pool, 则交易类型为outside;
            如果没有钱包ID,则提示用户先获取钱包列表;
            如果没有Token ID,则提示用户先获取Token列表;
            如果没有项目ID,则提示用户先获取项目列表;
            `,
            inputSchema: {
                type: 'object',
                properties: {
                    tokenId: {
                        type: 'string',
                        description: 'Token ID',
                    },
                    side: {
                        type: 'string',
                        description: '交易方向',
                        enum: ['buy', 'sell'],
                        // default: 'buy',
                    },
                    executeAt: {
                        type: 'string',
                        description: '策略执行时间(格式: 2025-01-01 12:00:00)',
                    },
                    walletIds: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                        description: '钱包ID列表',
                    },
                    amountType: {
                        type: 'string',
                        description: '数量类型, fixed: 固定数量, range: 余额比例(1-100%), random: 随机数量; 需要先让用户选择数量类型',
                        enum: ['fixed', 'range', 'random'],
                        default: 'fixed',
                    },
                    amount: {
                        type: 'number',
                        description: '固定数量(单位: 买入为SOL, 卖出为Token数量, 注意: 是每个钱包地址的挂单数量, 如果数量类型为fixed, 则必须要输入;需要先让用户选择数量类型)',
                    },
                    minRatio: {
                        type: 'number',
                        description: '范围比例最小值(单位: %, 如果数量类型为range, 则需要输入范围比例最小值和最大值;需要先让用户选择数量类型)',
                    },
                    maxRatio: {
                        type: 'number',
                        description: '范围比例最大值(单位: %, 如果数量类型为range, 则需要输入范围比例最小值和最大值;需要先让用户选择数量类型)',
                    },
                    minAmount: {
                        type: 'number',
                        description: '随机数量最小值(单位:  买入为SOL, 卖出为Token数量, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                    },
                    maxAmount: {
                        type: 'number',
                        description: '随机数量最大值(单位:  买入为SOL, 卖出为Token数量, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                    },
                    tradingType: {
                        type: 'string',
                        description: '交易类型',
                        enum: ['inside', 'outside'],
                        // default: 'outside',
                    },
                    minInterval: {
                        type: 'number',
                        description: '最小交易间隔（秒）',
                        default: 1,
                    },
                    maxInterval: {
                        type: 'number',
                        description: '最大交易间隔（秒）',
                        default: 2,
                    },
                    tipAmount: {
                        type: 'number',
                        description: '小费金额(单位: SOL)',
                        default: 0.0001,
                    },
                    slippageBps: {
                        type: 'number',
                        description: '滑点(单位: %)',
                        default: 5,
                    },
                },
                required: ['tokenId', 'executeAt', 'walletIds', 'tradingType', 'side'],
            },
            handler: async args => {
                try {
                    if (!this.token) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.login.required,
                                },
                            ],
                        };
                    }

                    // console.log('handler createStrategy args ==============', args);

                    // 验证策略参数
                    const validationArgs = {
                        ...args,
                    };
                    Validator.validateTimeStrategyParams(validationArgs);

                    const tradingParams = {
                        side: args.side,
                        tradingType: args.tradingType,
                        executeAt: dayjs(values.executeAt).toISOString(),
                        walletIds: args.walletIds,
                        minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
                        maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
                    };

                    if (args.amountType === 'fixed') {
                        tradingParams.amount = args.amount;
                    } else if (args.amountType === 'range') {
                        tradingParams.minRatio = args.minRatio;
                        tradingParams.maxRatio = args.maxRatio;
                    } else if (args.amountType === 'random') {
                        tradingParams.minAmount = args.minAmount;
                        tradingParams.maxAmount = args.maxAmount;
                    }

                    if (args.tipAmount) {
                        tradingParams.tipAmount = args.tipAmount;
                    }

                    if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                        tradingParams.slippageBps = args.slippageBps;
                    }

                    const strategyParams = {
                        name: 'TIME_BASED',
                        type: 'TIME_BASED',
                        tokenId: args.tokenId,
                        config: tradingParams,
                    };

                    const response = await this.apiClient.createStrategy(strategyParams);

                    if (response.success) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.strategy.portfolioExchangeStrategySuccess,
                                },
                                {
                                    type: 'text',
                                    text: `策略参数: ${JSON.stringify(strategyParams, null, 2)}`,
                                },
                            ],
                        };
                    } else {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: response.message || config.messages.strategy.portfolioExchangeStrategyFailed,
                                },
                            ],
                        };
                    }
                } catch (error) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: error.message || config.messages.strategy.marketManipulationStrategyFailed,
                            },
                        ],
                    };
                }
            },
        });

        // 注册刷量策略
        this.tools.set('createBundleSwapStrategy', {
            description: `
            创建刷量策略订单,
            交易类型,不需要用户输入, 也不需要告诉用户交易类型, 根据Token列表里的poolType字段来判断, 如果poolType为pump, 则交易类型为inside, 如果poolType为pool, 则交易类型为outside;
            如果没有钱包ID,则提示用户先获取钱包列表;
            如果没有Token ID,则提示用户先获取Token列表;
            如果没有项目ID,则提示用户先获取项目列表;
            `,
            inputSchema: {
                type: 'object',
                properties: {
                    tokenId: {
                        type: 'string',
                        description: 'Token ID',
                    },
                    side: {
                        type: 'string',
                        description: '交易方向',
                        enum: ['buy', 'sell'],
                    },
                    executeAt: {
                        type: 'string',
                        description: '策略执行时间, 可选参数, 如果为空,则立即执行 (格式: 2025-01-01 12:00:00)',
                    },
                    buyWalletId: {
                        type: 'string',
                        description: '买入钱包ID',
                    },
                    sellWalletId: {
                        type: 'string',
                        description: '卖出钱包ID',
                    },
                    minTradeAmount: {
                        type: 'number',
                        description: '最小交易金额(单位:SOL)',
                    },
                    maxTradeAmount: {
                        type: 'number',
                        description: '最大交易金额(单位:SOL)',
                    },
                    tradingType: {
                        type: 'string',
                        description: '交易类型',
                        enum: ['inside', 'outside'],
                    },
                    maxCycles: {
                        type: 'number',
                        description: '最大循环次数',
                    },
                    minInterval: {
                        type: 'number',
                        description: '最小交易间隔（秒）',
                        default: 1,
                    },
                    maxInterval: {
                        type: 'number',
                        description: '最大交易间隔（秒）',
                        default: 2,
                    },
                    tipAmount: {
                        type: 'number',
                        description: '小费金额(单位: SOL)',
                        default: 0.0001,
                    },
                    slippageBps: {
                        type: 'number',
                        description: '滑点(单位: %)',
                        default: 5,
                    },
                },
                required: ['tokenId', 'tradingType', 'buyWalletId', 'sellWalletId', 'maxCycles', 'minTradeAmount', 'maxTradeAmount'],
            },
            handler: async args => {
                try {
                    if (!this.token) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.login.required,
                                },
                            ],
                        };
                    }

                    // console.log('handler createStrategy args ==============', args);

                    // 验证策略参数
                    const validationArgs = {
                        ...args,
                    };
                    Validator.validateBundleSwapStrategyParams(validationArgs);

                    const tradingParams = {
                        wallet1Id: args.buyWalletId,
                        wallet2Id: args.sellWalletId,
                        tradingType: args.tradingType,
                        maxCycles: args.maxCycles,
                        minTradeAmount: args.minTradeAmount,
                        maxTradeAmount: args.maxTradeAmount,
                        minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
                        maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
                    };

                    if (args.executeAt) tradingParams.executeAt = dayjs(args.executeAt).toISOString();

                    if (args.tipAmount) {
                        tradingParams.tipAmount = args.tipAmount;
                    }

                    if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                        tradingParams.slippageBps = args.slippageBps;
                    }

                    const strategyParams = {
                        name: 'BUNDLE_SWAP',
                        type: 'BUNDLE_SWAP',
                        tokenId: args.tokenId,
                        config: tradingParams,
                    };

                    console.log('bundle swap strategyParams ==============', strategyParams);

                    const response = await this.apiClient.createStrategy(strategyParams);

                    if (response.success) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: config.messages.strategy.bundleSwapSuccess,
                                },
                                {
                                    type: 'text',
                                    text: `策略参数: ${JSON.stringify(strategyParams, null, 2)}`,
                                },
                            ],
                        };
                    } else {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: response.message || config.messages.strategy.bundleSwapFailed,
                                },
                            ],
                        };
                    }
                } catch (error) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: error.message || config.messages.strategy.bundleSwapFailed,
                            },
                        ],
                    };
                }
            },
        });
    }

    registerHandlers() {
        Logger.info('开始注册请求处理器');

        // 注册工具列表请求处理器
        this.setRequestHandler(ListToolsRequestSchema, request => {
            Logger.info('收到工具列表请求', { request });
            const tools = Array.from(this.tools.entries()).map(([name, tool]) => ({
                name,
                description: tool.description,
                inputSchema: tool.inputSchema,
            }));

            Logger.debug('返回工具列表', { tools });
            return {
                tools: tools,
            };
        });

        // 注册工具调用请求处理器
        this.setRequestHandler(CallToolRequestSchema, async request => {
            Logger.info('收到工具调用请求', {
                method: request.method,
                params: request.params,
                id: request.id,
            });

            const { name, arguments: args } = request.params;
            Logger.debug('解析请求参数', { toolName: name, arguments: args });

            const tool = this.tools.get(name);
            if (!tool) {
                Logger.error('工具不存在', { toolName: name, availableTools: Array.from(this.tools.keys()) });
                throw new Error(`Tool '${name}' not found`);
            }

            Logger.info('开始执行工具', { toolName: name });
            const result = await tool.handler(args || {});
            Logger.info('工具执行完成', { toolName: name, result });

            return result;
        });

        Logger.info('请求处理器注册完成');
    }
}

// 启动服务器
// async function main() {
//     Logger.info('MCP服务器启动开始');

//     const server = new PriceStrategyMCPServer();
//     const transport = new StdioServerTransport();

//     Logger.info('连接传输层');
//     await server.connect(transport);

//     Logger.info('MCP服务器启动完成，等待请求...');
//     console.error('Price Strategy MCP Server started');
//     process.stderr.write('Price Strategy MCP Server started successfully\n');
// }

// // 导出类供测试使用
// export { PriceStrategyMCPServer };

// // 如果直接运行此文件，则启动服务器
// if (import.meta.url === `file://${process.argv[1]}`) {
//     main().catch(error => {
//         Logger.error('MCP服务器启动失败', { error: error.message, stack: error.stack });
//         console.error(error);
//     });
// }

// 启动服务器
async function main() {
    try {
        Logger.info('MCP服务器启动开始');

        const server = new StrategyMCPServer();
        const transport = new StdioServerTransport();

        Logger.info('连接传输层');
        await server.connect(transport);

        Logger.info('MCP服务器启动完成，等待请求...');
        process.stderr.write('Price Strategy MCP Server started successfully\n');
    } catch (error) {
        Logger.error('MCP服务器启动失败', { error: error.message, stack: error.stack });
        process.stderr.write(`MCP Server failed to start: ${error.message}\n`);
        process.exit(1);
    }
}

main().catch(error => {
    Logger.error('MCP服务器启动失败', { error: error.message, stack: error.stack });
    process.stderr.write(`MCP Server failed to start: ${error.message}\n`);
    process.exit(1);
});
