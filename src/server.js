#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import * as http from 'node:http';
import * as url from 'node:url';
import dayjs from 'dayjs';
import ApiClient from '../utils/api-client.js';
import Validator from '../utils/validator.js';
import config from '../config/index.js';

import fs from 'fs';
import path from 'path';

console.log('process.env::', process.env);
console.log('process.env.PORT::', process.env.PORT);
console.log('process.env.PORT::', config);

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

// 存储传输对象 - 使用对象而不是Map，与官方示例保持一致
const transports = {};

// 创建MCP服务器 - 为每个传输创建独立实例
function getMcpServer(token) {
    const server = new Server(
        {
            name: config.server.name,
            version: config.server.version,
            implementation: `该服务主要用于帮助用户管理加密货币交易策略，包括限价策略、定时策略、拉砸策略、拆分策略和刷量策略。请仔细理解用户的意图，并按以下指引选择合适的接口：
        **原则：**
        *   **优先理解意图**：判断用户的真实需求，是创建策略、查询项目、Token还是钱包信息。
        *   **参数准确性**：确保传递给每个接口的参数格式和类型都正确，特别是价格、数量、时间格式等。
        *   **必要时追问**：如果用户信息不足以调用接口，请向用户追问缺失的信息。
        *   **清晰呈现结果**：将接口返回的信息以用户易于理解的方式进行呈现。
        *   **策略类型选择**：根据用户需求选择合适的策略类型：
            - 限价策略(PRICE_BASED)：当价格达到目标价格时执行交易
            - 定时策略(TIME_BASED)：在指定时间执行交易
            - 拉砸策略(MARKET_MANIPULATION)：拉升或砸盘操作
            - 拆分策略(PORTFOLIO_EXCHANGE)：在不同钱包间转移资产
            - 刷量策略(BUNDLE_SWAP)：在两个钱包间进行循环交易
            - Raydium狙击策略(RAYDIUM_SNIPER)：狙击raydium上的加池
            - PumpSwap狙击(PUMP_MIGRATE): 狙击PumpSwap上的外盘发射,只有当前Token是内盘才可以狙击
        *   **交易方向判断**：
            - 限价策略、定时策略、拉砸策略需要用户选择交易方向(buy/sell)
            - 拆分策略、刷量策略默认为sell方向
            - Raydium狙击策略、PumpSwap狙击策略不需要交易方向, 默认为buy方向
        *   **钱包选择限制**：
            - 限价、定时、拉砸策略：可选择多个钱包
            - 拆分策略：需要选择拆分地址和目标地址，不能有交集 
            - 刷量策略：只能选择一个买入钱包和一个卖出钱包，且不能相同 
            - Raydium狙击策略、PumpSwap狙击策略只能选择一个钱包
        请根据上述指引选择接口。
        `,
        },
        {
            capabilities: {
                tools: {
                    listChanged: true,
                },
            },
        }
    );

    const apiClient = new ApiClient();
    const tools = new Map();
    apiClient.setToken(token);

    // Logger.info('MCP服务器初始化开始::', token);
    registerTools(server, tools, apiClient, token);
    // Logger.info('MCP服务器初始化完成');

    return server;
}

function registerTools(server, tools, apiClient, token) {
    Logger.info('开始注册工具');

    // 注册获取项目列表工具
    tools.set('getProjects', {
        description: `获取用户的项目列表,只需要返回项目名称, 然后提示用户选择一个项目,再获取Token列表; 如果没有项目列表,则提示用户需要再MM管理后台(https://onchain.wired.fund)先创建一个项目;`,
        inputSchema: {
            type: 'object',
            properties: {},
        },
        handler: async args => {
            Logger.info('收到获取项目列表请求', { args });
            try {
                if (!token) {
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
                Logger.info('调用API获取项目列表::', token);
                Logger.info('调用API获取项目列表apiClient::', apiClient.token);
                const response = await apiClient.getProjects();
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
    tools.set('getTokens', {
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
            // Logger.info('收到获取Token列表请求', { args });
            try {
                if (!token) {
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

                // Logger.debug('验证分页参数', args);
                Validator.validatePaginationParams(args);

                // Logger.info('调用API获取Token列表', { projectId: args.projectId, page: args.page, limit: args.limit });
                const response = await apiClient.getTokens(args.projectId, args.page, args.limit);
                // Logger.debug('APIToken列表响应', response);

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
    tools.set('getWallets', {
        description: `
            用户必须先选要执行的择策略类型: 限价策略(PRICE_BASED)、定时策略(TIME_BASED)、拉砸策略(MARKET_MANIPULATION)、拆分策略(PORTFOLIO_EXCHANGE)、刷量策略(BUNDLE_SWAP);

            在执行获取钱包列表工具的操作时候,必须要先根据选择的策略类型,判断需要用户的交易方向,先选择交易方向,再返回钱包列表;

            不同策略对应的交易方向判断规则:
            1:限价策略(PRICE_BASED)、定时策略(TIME_BASED),则必须要先引导用户选择交易方向,buy或者sell, 先选择交易方向,再返回钱包列表;
            2:拉砸策略(MARKET_MANIPULATION),则必须要先引导用户选择交易方向,拉升或者砸盘, (拉升为buy, 砸盘为sell), 先选择交易方向,再返回钱包列表;
            3:Raydium狙击策略(RAYDIUM_SNIPER),PumpSwap狙击策略(PUMP_MIGRATE),不需要选择交易方向,也不需要提示给用户, 默认设置为buy;
            4:刷量策略、拆分策略,不需要选择交易方向,也不需要提示给用户, 默认设置为sell;
            5:PumpSwap狙击策略, 需要用户选择是否仅狙击买入, 如果选择 "是否仅狙击买入", 如果选择为否, 则需要用户选择发射账号, 否则不需要用户选择发射账号;

            选择钱包限制:
            1: 限价策略、定时策略、拉砸策略, 可以选择一个或者多个钱包来创建策略;
            2: 拆分策略, 用户需要选择拆分地址和目标地址,都可以选择一个或者多个钱包,但是拆分地址和目标地址不能有交集;
            3: 刷量策略, 用户需要选择买入地址和卖出地址,只能选择一个钱包地址, 买入地址和卖出地址不能相同;
            4: Raydium狙击策略, 只能选择一个钱包地址狙击;
            5: PumpSwap狙击策略, 如果选择 "是否仅狙击买入", 如果选择为否, 则需要用户选择发射账号, 否则不需要用户选择发射账号;发射账号和狙击账号不能相同, 狙击地址和发射账号只能选择一个钱包地址;


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
        handler: async args => {
            Logger.info('收到获取钱包列表请求', { args });
            try {
                if (!token) {
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

                const response = await apiClient.getWallets(args.projectId, args.tokenId, args.page, args.limit);
                Logger.debug('API钱包列表响应', response);

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
    tools.set('createPriceStrategy', {
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
                    default: config.strategy.defaultTipAmount,
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
                if (!token) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: config.messages.login.required,
                            },
                        ],
                    };
                }

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

                tradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                    tradingParams.slippageBps = args.slippageBps;
                }

                const strategyParams = {
                    name: 'PRICE_BASED',
                    type: 'PRICE_BASED',
                    tokenId: args.tokenId,
                    config: tradingParams,
                };

                const response = await apiClient.createStrategy(strategyParams);

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
    tools.set('createTimeStrategy', {
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
                    default: config.strategy.defaultTipAmount,
                },
                slippageBps: {
                    type: 'number',
                    description: '滑点(单位: %)',
                    default: config.strategy.defaultSlippageBps,
                },
            },
            required: ['tokenId', 'executeAt', 'walletIds', 'tradingType', 'side'],
        },
        handler: async args => {
            try {
                if (!token) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: config.messages.login.required,
                            },
                        ],
                    };
                }

                // 验证策略参数
                const validationArgs = {
                    ...args,
                };
                Validator.validateTimeStrategyParams(validationArgs);

                const tradingParams = {
                    side: args.side,
                    tradingType: args.tradingType,
                    executeAt: dayjs(args.executeAt).toISOString(),
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

                tradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                    tradingParams.slippageBps = args.slippageBps;
                }

                const strategyParams = {
                    name: 'TIME_BASED',
                    type: 'TIME_BASED',
                    tokenId: args.tokenId,
                    config: tradingParams,
                };

                const response = await apiClient.createStrategy(strategyParams);

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
    tools.set('createMarketManipulationStrategy', {
        description: `
            创建拉砸策略订单,
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
                },
                walletIds: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    description: '钱包ID列表',
                },
                targetPrice: {
                    type: 'number',
                    description: '目标价格(单位: SOL)',
                },
                maxAmount: {
                    type: 'number',
                    description: '交易总量(单位: 拉升为SOL, 砸盘为Token)',
                },
                minTradeAmount: {
                    type: 'number',
                    description: '最小单笔交易量(单位: 拉升为SOL, 砸盘为Token, 注意: 是每个钱包地址的最小单笔交易量)',
                },
                maxTradeAmount: {
                    type: 'number',
                    description: '最大单笔交易量(单位: 拉升为SOL, 砸盘为Token, 注意: 是每个钱包地址的最大单笔交易量)',
                },
                tradingType: {
                    type: 'string',
                    description: '交易类型',
                    enum: ['inside', 'outside'],
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
                    default: config.strategy.defaultTipAmount,
                },
                slippageBps: {
                    type: 'number',
                    description: '滑点(单位: %)',
                    default: config.strategy.defaultSlippageBps,
                },
            },
            required: ['tokenId', 'side', 'walletIds', 'targetPrice', 'maxAmount', 'minTradeAmount', 'maxTradeAmount', 'tradingType'],
        },
        handler: async args => {
            try {
                if (!token) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: config.messages.login.required,
                            },
                        ],
                    };
                }

                // 验证策略参数
                const validationArgs = {
                    ...args,
                };
                Validator.validateMarketManipulationStrategyParams(validationArgs);

                const tradingParams = {
                    side: args.side,
                    tradingType: args.tradingType,
                    targetPrice: args.targetPrice,
                    walletIds: args.walletIds,
                    maxAmount: args.maxAmount,
                    minTradeAmount: args.minTradeAmount,
                    maxTradeAmount: args.maxTradeAmount,
                    minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
                    maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
                };

                tradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                    tradingParams.slippageBps = args.slippageBps;
                }

                const strategyParams = {
                    name: 'MARKET_MANIPULATION',
                    type: 'MARKET_MANIPULATION',
                    tokenId: args.tokenId,
                    config: tradingParams,
                };

                const response = await apiClient.createStrategy(strategyParams);

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
    tools.set('createPortfolioExchangeStrategy', {
        description: `
            创建拆分策略订单,
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
                fromWalletIds: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    description: '拆分地址钱包ID列表',
                },
                toWalletIds: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    description: '拆分目标钱包ID列表',
                },
                fromSplitAmount: {
                    type: 'number',
                    description: '拆分比例(1拆n，即一个被拆地址对应n个拆分后的地址)',
                },
                fromAmountMinRatio: {
                    type: 'number',
                    description: '最小拆分数量比例(每轮操作分散的token占被拆地址总量最小比例,单位: %)',
                },
                fromAmountMaxRatio: {
                    type: 'number',
                    description: '最大拆分数量比例(每轮操作分散的token占被拆地址总量最大比例,单位: %)',
                },
                minTradeAmount: {
                    type: 'number',
                    description: '单笔拆分最小数量(单位: 当前的Token, 注意: 拆分地址的每笔子操作的需要满足的金额区间)',
                },
                maxTradeAmount: {
                    type: 'number',
                    description: '单笔拆分最大数量(单位: 当前的Token, 注意: 拆分地址的每笔子操作的需要满足的金额区间)',
                },
                tradingType: {
                    type: 'string',
                    description: '交易类型',
                    enum: ['inside', 'outside'],
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
                    default: config.strategy.defaultTipAmount,
                },
                slippageBps: {
                    type: 'number',
                    description: '滑点(单位: %)',
                    default: config.strategy.defaultSlippageBps,
                },
            },
            required: ['tokenId', 'fromWalletIds', 'toWalletIds', 'fromSplitAmount', 'fromAmountMinRatio', 'fromAmountMaxRatio', 'minTradeAmount', 'maxTradeAmount', 'tradingType'],
        },
        handler: async args => {
            try {
                if (!token) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: config.messages.login.required,
                            },
                        ],
                    };
                }

                // 验证策略参数
                const validationArgs = {
                    ...args,
                };
                Validator.validatePortfolioExchangeStrategyParams(validationArgs);

                const tradingParams = {
                    tradingType: args.tradingType,
                    fromWalletIds: args.fromWalletIds,
                    toWalletIds: args.toWalletIds,
                    fromSplitAmount: args.fromSplitAmount,
                    fromAmountMinRatio: args.fromAmountMinRatio,
                    fromAmountMaxRatio: args.fromAmountMaxRatio,
                    minTradeAmount: args.minTradeAmount,
                    maxTradeAmount: args.maxTradeAmount,
                    minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
                    maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
                };

                tradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                    tradingParams.slippageBps = args.slippageBps;
                }

                const strategyParams = {
                    name: 'PORTFOLIO_EXCHANGE',
                    type: 'PORTFOLIO_EXCHANGE',
                    tokenId: args.tokenId,
                    config: tradingParams,
                };

                const response = await apiClient.createStrategy(strategyParams);

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
    tools.set('createBundleSwapStrategy', {
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
                    default: config.strategy.defaultTipAmount,
                },
                slippageBps: {
                    type: 'number',
                    description: '滑点(单位: %)',
                    default: config.strategy.defaultSlippageBps,
                },
            },
            required: ['tokenId', 'tradingType', 'buyWalletId', 'sellWalletId', 'maxCycles', 'minTradeAmount', 'maxTradeAmount'],
        },
        handler: async args => {
            try {
                if (!token) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: config.messages.login.required,
                            },
                        ],
                    };
                }

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

                tradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

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

                const response = await apiClient.createStrategy(strategyParams);

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

    // 注册PumpSwap狙击策略
    tools.set('createPumpSniperStrategy', {
        description: `
            创建PumpSwap狙击策略订单;
            需要用户优先选择 "是否仅狙击买入" (狙击买入模式下,发射地址不生效);
            发射账号, 如果选择 "是仅狙击买入", 则不需要用户选择发射账号, 否则需要用户选择发射账号;

            只有当前Token是内盘的时候才可以狙击,否则提示用户当前Token是外盘,不能狙击;
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
                onlySniperBuy: {
                    type: 'boolean',
                    description: '是否仅狙击买入',
                    enum: [true, false],
                },
                migratorWalletId: {
                    type: 'string',
                    description: '发射账号',
                },
                buyerWalletId: {
                    type: 'string',
                    description: '狙击账号',
                },
                amountType: {
                    type: 'string',
                    description: '数量类型, fixed: 固定数量, range: 余额比例(1-100%), random: 随机数量; 需要先让用户选择数量类型',
                    enum: ['fixed', 'range', 'random'],
                    default: 'fixed',
                },
                amount: {
                    type: 'number',
                    description: '固定数量(单位: 买入为SOL, 如果数量类型为fixed, 则必须要输入;需要先让用户选择数量类型)',
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
                    description: '随机数量最小值(单位:  SOL, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                },
                maxAmount: {
                    type: 'number',
                    description: '随机数量最大值(单位:  买入为SOL, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                },
                tipAmount: {
                    type: 'number',
                    description: '小费金额(单位: SOL)',
                    default: config.strategy.defaultTipAmount,
                },
                slippageBps: {
                    type: 'number',
                    description: '滑点(单位: %)',
                    default: config.strategy.defaultSlippageBps,
                },
            },
            required: ['tokenId', 'onlySniperBuy', 'buyerWalletId', 'amountType'],
        },
        handler: async args => {
            try {
                if (!token) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: config.messages.login.required,
                            },
                        ],
                    };
                }

                // 验证策略参数
                const validationArgs = {
                    ...args,
                };
                Validator.validatePumpSwapSniperStrategyParams(validationArgs);

                const tradingParams = {
                    buyerWalletId: args.buyerWalletId,
                    onlySniper: args.onlySniperBuy,
                };

                if (!args.onlySniperBuy) {
                    tradingParams.migratorWalletId = args.migratorWalletId;
                }

                if (args.amountType === 'fixed') {
                    tradingParams.amount = args.amount;
                } else if (args.amountType === 'range') {
                    tradingParams.minRatio = args.minRatio;
                    tradingParams.maxRatio = args.maxRatio;
                } else if (args.amountType === 'random') {
                    tradingParams.minAmount = args.minAmount;
                    tradingParams.maxAmount = args.maxAmount;
                }

                tradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                    tradingParams.slippageBps = args.slippageBps;
                }

                const strategyParams = {
                    name: 'PUMP_MIGRATE',
                    type: 'PUMP_MIGRATE',
                    tokenId: args.tokenId,
                    config: tradingParams,
                };

                Logger.info('pump sniper strategyParams ==============', strategyParams);

                const response = await apiClient.createStrategy(strategyParams);

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

    // 注册Raydium狙击策略
    tools.set('createRaydiumSniperStrategy', {
        description: `
            创建Raydium狙击策略订单;
            池子类型,需要用户自己来选择;
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
                poolType: {
                    type: 'string',
                    description: '池子类型',
                    enum: ['AMM_V4', 'CLMM', 'CPMM'],
                },
                buyerWalletId: {
                    type: 'string',
                    description: '狙击账号',
                },
                amountType: {
                    type: 'string',
                    description: '数量类型, fixed: 固定数量, range: 余额比例(1-100%), random: 随机数量; 需要先让用户选择数量类型',
                    enum: ['fixed', 'range', 'random'],
                    default: 'fixed',
                },
                amount: {
                    type: 'number',
                    description: '固定数量(单位: 买入为SOL, 如果数量类型为fixed, 则必须要输入;需要先让用户选择数量类型)',
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
                    description: '随机数量最小值(单位:  SOL, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                },
                maxAmount: {
                    type: 'number',
                    description: '随机数量最大值(单位:  买入为SOL, 如果数量类型为random, 则需要输入随机数量最小值和最大值;需要先让用户选择数量类型)',
                },
                tipAmount: {
                    type: 'number',
                    description: '小费金额(单位: SOL)',
                    default: config.strategy.defaultTipAmount,
                },
                slippageBps: {
                    type: 'number',
                    description: '滑点(单位: %)',
                    default: config.strategy.defaultSlippageBps,
                },
            },
            required: ['tokenId', 'poolType', 'buyerWalletId', 'amountType'],
        },
        handler: async args => {
            try {
                if (!token) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: config.messages.login.required,
                            },
                        ],
                    };
                }

                // 验证策略参数
                const validationArgs = {
                    ...args,
                };
                Validator.validateRaydiumSniperStrategyParams(validationArgs);

                const tradingParams = {
                    buyerWalletId: args.buyerWalletId,
                    poolType: args.poolType,
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

                tradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (tradingParams.tradingType === 'outside' && args.slippageBps) {
                    tradingParams.slippageBps = args.slippageBps;
                }

                const strategyParams = {
                    name: 'RAYDIUM_SNIPER',
                    type: 'RAYDIUM_SNIPER',
                    tokenId: args.tokenId,
                    config: tradingParams,
                };

                console.log('raydium sniper strategyParams ==============', strategyParams);

                const response = await apiClient.createStrategy(strategyParams);

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

    // 注册工具列表请求处理器
    server.setRequestHandler(ListToolsRequestSchema, request => {
        Logger.info('收到工具列表请求', { request });
        const toolsList = Array.from(tools.entries()).map(([name, tool]) => ({
            name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        }));

        // Logger.debug('返回工具列表', { tools: toolsList });
        return {
            tools: toolsList,
        };
    });

    // 注册工具调用请求处理器
    server.setRequestHandler(CallToolRequestSchema, async request => {
        // Logger.info('收到工具调用请求', {
        //     method: request.method,
        //     params: request.params,
        //     id: request.id,
        // });

        const { name, arguments: args } = request.params;
        // Logger.debug('解析请求参数', { toolName: name, arguments: args });

        const tool = tools.get(name);
        if (!tool) {
            Logger.error('工具不存在', { toolName: name, availableTools: Array.from(tools.keys()) });
            throw new Error(`Tool '${name}' not found`);
        }

        // Logger.info('开始执行工具', { toolName: name });
        const result = await tool.handler(args || {});
        // Logger.info('工具执行完成', { toolName: name, result });

        return result;
    });
}

// 解析Authorization Token
function parseAuthToken(authHeader) {
    if (!authHeader) {
        return null;
    }

    // 支持 Bearer token 格式
    if (authHeader.startsWith('Bearer ') || authHeader.startsWith('ApiKey ')) {
        return authHeader;
    }

    // 支持直接token格式
    return authHeader;
}

// 导出启动函数
export async function startHttpServer() {
    const serverMode = process.env.SERVER_MODE || 'stdio';
    const port = parseInt(process.env.PORT || '3010');
    const host = process.env.HOST || '0.0.0.0';

    Logger.info(`启动MM MCP服务器 - 模式: ${serverMode}, 端口: ${port}, 主机: ${host}`);

    if (serverMode === 'sse') {
        // SSE模式
        Logger.info('🌐 MM MCP SSE 服务器启动');

        const httpServer = http.createServer(async (req, res) => {
            // 设置CORS头部
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            if (req.url === '/sse') {
                if (req.method === 'GET') {
                    Logger.info('🔌 建立SSE连接');

                    // 处理authorization token
                    const authHeader = req.headers.authorization;
                    Logger.info('收到SSE连接请求，Authorization header:', authHeader ? '已提供' : '未提供');

                    if (!authHeader) {
                        Logger.warn('缺少authorization token');
                        res.writeHead(401);
                        res.end('Unauthorized: Missing authorization token');
                        return;
                    }

                    const token = parseAuthToken(authHeader);
                    if (!token) {
                        Logger.warn(`无效的authorization token格式，实际: ${authHeader}`);
                        res.writeHead(401);
                        res.end('Unauthorized: Invalid authorization token format');
                        return;
                    }

                    Logger.info(`Authorization token已解析`);

                    try {
                        // 创建SSE传输
                        const transport = new SSEServerTransport('/messages', res);
                        transports[transport.sessionId] = transport;

                        // Logger.info(`📝 存储传输对象，会话ID: ${transport.sessionId}`);
                        // Logger.info(`📊 当前活跃会话数: ${Object.keys(transports).length}`);

                        // 连接关闭时清理
                        res.on('close', () => {
                            // Logger.info(`🔌 SSE连接关闭，会话ID: ${transport.sessionId}`);
                            delete transports[transport.sessionId];
                            // Logger.info(`📊 清理后活跃会话数: ${Object.keys(transports).length}`);
                        });

                        // 为每个传输创建独立的服务器实例，使用真实的API凭据
                        const server = getMcpServer(token);
                        await server.connect(transport);

                        // Logger.info(`✅ SSE连接建立，会话ID: ${transport.sessionId}`);
                    } catch (error) {
                        Logger.error('❌ SSE连接失败:', error);
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: 'SSE connection failed' }));
                    }
                } else {
                    Logger.warn(`❌ 不支持的HTTP方法: ${req.method} for /sse`);
                    res.writeHead(405);
                    res.end('Method Not Allowed');
                }
            } else if (req.url?.startsWith('/messages')) {
                // 处理POST消息 - 与官方示例完全一致
                if (req.method === 'POST') {
                    // Logger.info('📨 收到POST消息请求');
                    const parsedUrl = url.parse(req.url || '', true);
                    const sessionId = parsedUrl.query.sessionId;
                    // Logger.info(`🔍 查找会话ID: ${sessionId}`);

                    const transport = transports[sessionId];

                    if (transport) {
                        Logger.info(`✅ 找到传输对象，会话ID: ${sessionId}`);

                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });
                        req.on('end', async () => {
                            try {
                                // Logger.info(`📦 收到请求体: ${body}`);
                                const parsedBody = JSON.parse(body);
                                // Logger.info(`🔧 解析后的请求:`, parsedBody);

                                await transport.handlePostMessage(req, res, parsedBody);
                                Logger.info(`✅ POST消息处理完成`);
                            } catch (error) {
                                Logger.error('❌ POST消息处理失败:', error);
                                res.writeHead(400);
                                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                            }
                        });
                    } else {
                        Logger.error(`❌ 未找到传输对象，会话ID: ${sessionId}`);
                        Logger.info(`📋 当前存储的会话ID: ${Object.keys(transports).join(', ')}`);
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'No transport found for sessionId' }));
                    }
                } else {
                    Logger.warn(`❌ 不支持的HTTP方法: ${req.method} for /messages`);
                    res.writeHead(405);
                    res.end('Method Not Allowed');
                }
            } else {
                Logger.warn(`❌ 未找到路由: ${req.url}`);
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        httpServer.listen(port, host, () => {
            Logger.info(`SSE 服务器启动在端口 ${port}，访问路径: http://${host}:${port}/sse`);
            Logger.info('💡 提示：请在Claude Desktop的MCP配置中使用以下配置：');
            Logger.info(`   "command": "sse",`);
            Logger.info(`   "args": ["http://${host}:${port}/sse"],`);
            Logger.info(`   "authorization_token": "your_token"`);
            Logger.info('');
            Logger.info('🔑 Authorization Token格式: Bearer your_token');
            Logger.info('📡 支持的协议: SSE (Server-Sent Events)');
            Logger.info('🌐 CORS已启用，支持跨域访问');
        });
    } else if (serverMode === 'streamable-http') {
        // Streamable HTTP模式
        Logger.info('🌐 MM MCP Streamable HTTP 服务器启动');

        const httpServer = http.createServer(async (req, res) => {
            // 设置CORS头部
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // 处理authorization token
            const authHeader = req.headers.authorization;
            // Logger.info('收到Streamable HTTP请求，Authorization header:', authHeader ? '已提供' : '未提供');

            if (!authHeader) {
                Logger.warn('缺少authorization token');
                res.writeHead(401);
                res.end('Unauthorized: Missing authorization token');
                return;
            }

            const token = parseAuthToken(authHeader);
            if (!token) {
                Logger.warn(`无效的authorization token格式，实际: ${authHeader}`);
                res.writeHead(401);
                res.end('Unauthorized: Invalid authorization token format');
                return;
            }

            // Logger.info(`Authorization token已解析`);

            try {
                // 解析请求体
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });

                await new Promise(resolve => {
                    req.on('end', () => {
                        resolve();
                    });
                });

                let parsedBody;
                try {
                    parsedBody = JSON.parse(body);
                } catch (error) {
                    Logger.error('❌ 请求体解析失败:', error);
                    res.writeHead(400);
                    res.end(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            error: {
                                code: -32700,
                                message: 'Parse error',
                            },
                            id: null,
                        })
                    );
                    return;
                }

                const sessionId = req.headers['mcp-session-id'];

                if (sessionId && transports[sessionId]) {
                    // 重用现有传输
                    Logger.info(`🔄 重用现有传输，会话ID: ${sessionId}`);
                    const transport = transports[sessionId];
                    await transport.handleRequest(req, res, parsedBody);
                } else if (!sessionId && isInitializeRequest(parsedBody)) {
                    // 新的初始化请求
                    Logger.info('🆕 处理新的初始化请求');

                    const transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => {
                            const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            Logger.info(`📝 生成新会话ID: ${newSessionId}`);
                            return newSessionId;
                        },
                        onsessioninitialized: newSessionId => {
                            Logger.info(`✅ 会话初始化完成: ${newSessionId}`);
                            // 存储传输对象，包含凭据信息
                            transports[newSessionId] = transport;
                        },
                        onsessionclosed: closedSessionId => {
                            Logger.info(`🔌 会话关闭: ${closedSessionId}`);
                            delete transports[closedSessionId];
                        },
                    });

                    // 设置关闭处理器
                    transport.onclose = () => {
                        const sid = transport.sessionId;
                        if (sid && transports[sid]) {
                            Logger.info(`🔌 传输关闭，会话ID: ${sid}`);
                            delete transports[sid];
                        }
                    };

                    // 为传输创建独立的服务器实例
                    const server = getMcpServer(credentials);
                    await server.connect(transport);

                    // 处理请求
                    await transport.handleRequest(req, res, parsedBody);
                } else {
                    // 无效请求 - 没有会话ID或不是初始化请求
                    Logger.warn('❌ 无效请求：没有会话ID或不是初始化请求');
                    res.writeHead(400);
                    res.end(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            error: {
                                code: -32000,
                                message: 'Bad Request: No valid session ID provided',
                            },
                            id: null,
                        })
                    );
                }
            } catch (error) {
                Logger.error('❌ Streamable HTTP请求处理失败:', error);
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            error: {
                                code: -32603,
                                message: 'Internal server error',
                            },
                            id: null,
                        })
                    );
                }
            }
        });
        httpServer.listen(port, host, () => {
            Logger.info(`Streamable HTTP 服务器启动在端口 ${port}，访问路径: http://${host}:${port}/mcp`);
            Logger.info('💡 提示：请在Claude Desktop的MCP配置中使用以下配置：');
            Logger.info(`   "command": "streamable-http",`);
            Logger.info(`   "args": ["http://${host}:${port}/mcp"],`);
            Logger.info(`   "authorization_token": "your_api_key:your_api_secret"`);
            Logger.info('');
            Logger.info('🔑 Authorization Token格式: apiKey:apiSecret');
            Logger.info('📡 支持的协议: Streamable HTTP (2025-03-26)');
            Logger.info('🌐 CORS已启用，支持跨域访问');
        });
    } else if (serverMode === 'multi-mode') {
        // 多模式：同时支持 SSE 和 Streamable HTTP
        Logger.info('🌐 MM MCP 多模式服务器启动 (SSE + Streamable HTTP)');

        const httpServer = http.createServer(async (req, res) => {
            // 设置CORS头部
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // 处理authorization token
            const authHeader = req.headers.authorization;
            Logger.info('收到多模式请求，Authorization header:', authHeader ? '已提供' : '未提供');

            if (!authHeader) {
                Logger.warn('缺少authorization token');
                res.writeHead(401);
                res.end('Unauthorized: Missing authorization token');
                return;
            }

            const token = parseAuthToken(authHeader);
            if (!token) {
                Logger.warn(`无效的authorization token格式，实际: ${authHeader}`);
                res.writeHead(401);
                res.end('Unauthorized: Invalid authorization token format');
                return;
            }

            Logger.info(`Authorization token已解析`);

            // 根据URL路径决定使用哪种模式
            if (req.url === '/sse') {
                // SSE模式处理
                if (req.method === 'GET') {
                    Logger.info('🔌 建立SSE连接 (多模式)');

                    try {
                        // 创建SSE传输
                        const transport = new SSEServerTransport('/messages', res);
                        transports[transport.sessionId] = transport;

                        Logger.info(`📝 存储SSE传输对象，会话ID: ${transport.sessionId}`);
                        Logger.info(`📊 当前活跃会话数: ${Object.keys(transports).length}`);

                        // 连接关闭时清理
                        res.on('close', () => {
                            Logger.info(`🔌 SSE连接关闭，会话ID: ${transport.sessionId}`);
                            delete transports[transport.sessionId];
                            Logger.info(`📊 清理后活跃会话数: ${Object.keys(transports).length}`);
                        });

                        // 为每个传输创建独立的服务器实例
                        const server = getMcpServer(token);
                        await server.connect(transport);

                        Logger.info(`✅ SSE连接建立，会话ID: ${transport.sessionId}`);
                    } catch (error) {
                        Logger.error('❌ SSE连接失败:', error);
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: 'SSE connection failed' }));
                    }
                } else {
                    Logger.warn(`❌ 不支持的HTTP方法: ${req.method} for /sse`);
                    res.writeHead(405);
                    res.end('Method Not Allowed');
                }
            } else if (req.url?.startsWith('/messages')) {
                // SSE POST消息处理
                if (req.method === 'POST') {
                    Logger.info('📨 收到SSE POST消息请求');
                    const parsedUrl = url.parse(req.url || '', true);
                    const sessionId = parsedUrl.query.sessionId;
                    Logger.info(`🔍 查找SSE会话ID: ${sessionId}`);

                    const transport = transports[sessionId];

                    if (transport) {
                        Logger.info(`✅ 找到SSE传输对象，会话ID: ${sessionId}`);

                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });
                        req.on('end', async () => {
                            try {
                                Logger.info(`📦 收到SSE请求体: ${body}`);
                                const parsedBody = JSON.parse(body);

                                // SSE 传输对象使用 handlePostMessage 方法
                                await transport.handlePostMessage(req, res, parsedBody);
                                Logger.info('✅ SSE POST消息处理完成');
                            } catch (error) {
                                Logger.error('❌ SSE POST消息处理失败:', error);
                                res.writeHead(500);
                                res.end(JSON.stringify({ error: 'Failed to process message' }));
                            }
                        });
                    } else {
                        Logger.warn(`❌ 未找到SSE传输对象，会话ID: ${sessionId}`);
                        res.writeHead(404);
                        res.end(JSON.stringify({ error: 'Session not found' }));
                    }
                } else {
                    Logger.warn(`❌ 不支持的HTTP方法: ${req.method} for /messages`);
                    res.writeHead(405);
                    res.end('Method Not Allowed');
                }
            } else if (req.url === '/mcp') {
                // Streamable HTTP模式处理
                Logger.info('🌐 处理Streamable HTTP请求 (多模式)');

                try {
                    // 解析请求体
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                    });

                    await new Promise(resolve => {
                        req.on('end', () => {
                            resolve();
                        });
                    });

                    let parsedBody;
                    try {
                        parsedBody = JSON.parse(body);
                    } catch (error) {
                        Logger.error('❌ Streamable HTTP请求体解析失败:', error, 'body:::', body);
                        res.writeHead(400);
                        res.end(
                            JSON.stringify({
                                jsonrpc: '2.0',
                                error: {
                                    code: -32700,
                                    message: 'Parse error',
                                },
                                id: null,
                            })
                        );
                        return;
                    }

                    const sessionId = req.headers['mcp-session-id'];

                    if (sessionId && transports[sessionId]) {
                        // 重用现有传输
                        Logger.info(`🔄 重用现有Streamable HTTP传输，会话ID: ${sessionId}`);
                        const transport = transports[sessionId];
                        await transport.handleRequest(req, res, parsedBody);
                    } else if (!sessionId && isInitializeRequest(parsedBody)) {
                        // 新的初始化请求
                        Logger.info('🆕 处理新的Streamable HTTP初始化请求');

                        const transport = new StreamableHTTPServerTransport({
                            sessionIdGenerator: () => {
                                const newSessionId = `streamable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                Logger.info(`📝 生成新Streamable HTTP会话ID: ${newSessionId}`);
                                return newSessionId;
                            },
                            onsessioninitialized: async sessionId => {
                                Logger.info(`🚀 Streamable HTTP会话初始化，会话ID: ${sessionId}`);
                                const server = getMcpServer(token);
                                await server.connect(transport);
                                Logger.info(`✅ Streamable HTTP服务器连接完成，会话ID: ${sessionId}`);

                                // 在会话初始化后存储传输对象
                                transports[sessionId] = transport;
                                Logger.info(`📝 存储Streamable HTTP传输对象，会话ID: ${sessionId}`);
                                Logger.info(`📊 当前活跃会话数: ${Object.keys(transports).length}`);
                            },
                            onsessionclosed: async sessionId => {
                                Logger.info(`🔌 Streamable HTTP会话关闭，会话ID: ${sessionId}`);
                                delete transports[sessionId];
                                Logger.info(`📊 清理后活跃会话数: ${Object.keys(transports).length}`);
                            },
                        });

                        // 处理请求
                        await transport.handleRequest(req, res, parsedBody);
                    } else {
                        Logger.warn(`❌ 无效的Streamable HTTP请求，会话ID: ${sessionId}`);
                        res.writeHead(400);
                        res.end(
                            JSON.stringify({
                                jsonrpc: '2.0',
                                error: {
                                    code: -32600,
                                    message: 'Invalid Request',
                                },
                                id: parsedBody?.id || null,
                            })
                        );
                    }
                } catch (error) {
                    Logger.error('❌ Streamable HTTP请求处理失败:', error);
                    res.writeHead(500);
                    res.end(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            error: {
                                code: -32603,
                                message: 'Internal error',
                            },
                            id: null,
                        })
                    );
                }
            } else {
                // 其他路径返回404
                Logger.warn(`❌ 未找到路径: ${req.url}`);
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        httpServer.listen(port, host, () => {
            Logger.info(`多模式服务器启动在端口 ${port}`);
            Logger.info('📡 支持的协议: SSE + Streamable HTTP');
            Logger.info('🌐 访问路径:');
            Logger.info(`   SSE: http://${host}:${port}/sse`);
            Logger.info(`   Streamable HTTP: http://${host}:${port}/mcp`);
            Logger.info('');
            Logger.info('💡 Claude Desktop MCP 配置示例:');
            Logger.info('   SSE模式:');
            Logger.info(`     "url": "http://${host}:${port}/sse",`);
            Logger.info(`     "headers": {`);
            Logger.info(`       "Authorization": "your_token"`);
            Logger.info(`     }`);
            Logger.info('');
            Logger.info('   Streamable HTTP模式:');
            Logger.info(`     "url": "http://${host}:${port}/mcp",`);
            Logger.info(`     "headers": {`);
            Logger.info(`       "Authorization": "your_token"`);
            Logger.info(`     }`);
            Logger.info('');
            Logger.info('🔑 Authorization Token格式: Bearer your_token 或直接 your_token');
            Logger.info('🌐 CORS已启用，支持跨域访问');
        });
    } else {
        Logger.error(`不支持的服务器模式: ${serverMode}`);
        Logger.info('支持的模式: stdio, sse, streamable-http, multi-mode');
        process.exit(1);
    }
}

// 处理进程退出
process.on('SIGINT', async () => {
    Logger.info('收到 SIGINT 信号，正在关闭服务器...');

    // 关闭所有活跃的传输对象
    for (const sessionId in transports) {
        try {
            // Logger.info(`关闭传输对象，会话ID: ${sessionId}`);
            await transports[sessionId].close();
            delete transports[sessionId];
        } catch (error) {
            Logger.error(`关闭传输对象失败，会话ID: ${sessionId}:`, error);
        }
    }

    // Logger.info('服务器关闭完成');
    process.exit(0);
});

// 只有在直接运行此文件时才启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
    startHttpServer().catch(error => {
        Logger.error('服务器启动失败:', error);
        process.exit(1);
    });
}
