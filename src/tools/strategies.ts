import { Tool } from '@modelcontextprotocol/sdk/types.js';
import ApiClient from '../utils/api-client';
import Validator from '../utils/validator';
import { logger } from '../utils/logger';
import config from '../config/index';
import dayjs from 'dayjs';

export function createStrategyTools(apiClient: ApiClient): Tool[] {
    return [
        {
            name: 'createPriceStrategy',
            description: `🎯 限价策略创建 - 价格触发交易策略

🔍 功能说明：
创建限价策略订单，当价格达到目标价格时执行交易。交易方向从获取钱包列表的参数里获取，交易类型根据Token列表里的poolType字段自动判断（pump=inside, pool=outside）。

⚠️ 重要提醒：
• 价格监控：系统会持续监控市场价格，达到目标价格时自动执行
• 交易类型：自动根据Token的poolType判断（pump=inside, pool=outside）
• 数量类型：支持固定数量、余额比例、随机数量三种模式
• 风险控制：建议设置合理的价格区间和数量限制

🎯 适用场景：
• 等待特定价格点进行买入或卖出
• 自动化价格触发交易
• 批量钱包同时执行限价策略

📋 输出示例：
创建成功后将返回：
\`\`\`
🎯 限价策略创建成功

✅ 策略信息：
策略类型：PRICE_BASED（限价策略）
Token ID：token_1234567890
目标价格：0.001500 SOL
交易方向：buy（买入）
交易类型：inside（内盘交易）

💰 交易配置：
数量类型：fixed（固定数量）
交易数量：1.000000 SOL
钱包数量：3个钱包
交易间隔：1-2秒

🔧 高级设置：
小费金额：0.001 SOL
滑点设置：5%
价格阈值：0%

💡 策略状态：
策略已成功创建并启动监控
系统将自动监控价格变化
达到目标价格时将自动执行交易

⚠️ 风险提醒：
请密切关注市场变化，必要时可手动调整策略参数。
\`\`\``,
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
                        description: '数量类型, fixed: 固定数量, range: 余额比例(1-100%), random: 随机数量',
                        enum: ['fixed', 'range', 'random'],
                    },
                    amount: {
                        type: 'number',
                        description: '固定数量(单位: 买入为SOL, 卖出为Token数量)',
                    },
                    minRatio: {
                        type: 'number',
                        description: '范围比例最小值(单位: %)',
                    },
                    maxRatio: {
                        type: 'number',
                        description: '范围比例最大值(单位: %)',
                    },
                    minAmount: {
                        type: 'number',
                        description: '随机数量最小值(单位: 买入为SOL, 卖出为Token数量)',
                    },
                    maxAmount: {
                        type: 'number',
                        description: '随机数量最大值(单位: 买入为SOL, 卖出为Token数量)',
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
        },
        {
            name: 'createTimeStrategy',
            description: `⏰ 定时策略创建 - 指定时间执行交易

🔍 功能说明：
创建定时策略订单，在指定时间执行交易。策略执行时间必须大于当前时间+3分钟且只能创建未来15内的交易，格式为: 2025-01-01 12:00:00。交易方向从获取钱包列表的参数里获取，交易类型根据Token列表里的poolType字段自动判断。

⚠️ 重要提醒：
• 时间要求：执行时间必须大于当前时间+3分钟
• 时间格式：严格按照 2025-01-01 12:00:00 格式
• 时区处理：使用系统默认时区
• 精确执行：系统会在指定时间精确执行交易

🎯 适用场景：
• 特定时间点的批量交易
• 定时买入或卖出操作
• 配合市场事件的时间策略

📋 输出示例：
创建成功后将返回：
\`\`\`
⏰ 定时策略创建成功

✅ 策略信息：
策略类型：TIME_BASED（定时策略）
Token ID：token_1234567890
执行时间：2025-01-15 16:30:00
交易方向：sell（卖出）
交易类型：outside（外盘交易）

💰 交易配置：
数量类型：range（余额比例）
比例范围：10%-20%
钱包数量：2个钱包
交易间隔：1-2秒

🔧 高级设置：
小费金额：0.001 SOL
滑点设置：5%

💡 策略状态：
策略已成功创建并设置定时器
将在 2025-01-15 16:30:00 自动执行
距离执行还有：1小时30分钟

⚠️ 时间提醒：
请确保在指定时间前钱包有足够余额。
\`\`\``,
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
                        description: '数量类型, fixed: 固定数量, range: 余额比例(1-100%), random: 随机数量',
                        enum: ['fixed', 'range', 'random'],
                        default: 'fixed',
                    },
                    amount: {
                        type: 'number',
                        description: '固定数量(单位: 买入为SOL, 卖出为Token数量)',
                    },
                    minRatio: {
                        type: 'number',
                        description: '范围比例最小值(单位: %)',
                    },
                    maxRatio: {
                        type: 'number',
                        description: '范围比例最大值(单位: %)',
                    },
                    minAmount: {
                        type: 'number',
                        description: '随机数量最小值(单位: 买入为SOL, 卖出为Token数量)',
                    },
                    maxAmount: {
                        type: 'number',
                        description: '随机数量最大值(单位: 买入为SOL, 卖出为Token数量)',
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
        },
        {
            name: 'createMarketManipulationStrategy',
            description: `📈 拉砸策略创建 - 市场操纵交易策略

🔍 功能说明：
创建拉砸策略订单，用于拉升或砸盘操作。交易方向从获取钱包列表的参数里获取，交易类型根据Token列表里的poolType字段自动判断。拉升为buy方向，砸盘为sell方向。

⚠️ 重要提醒：
• 市场风险：拉砸策略具有较高的市场风险，请谨慎使用
• 资金要求：需要充足的资金支持拉升或砸盘操作
• 合规注意：请确保操作符合当地法律法规
• 风险控制：建议设置合理的交易量限制

🎯 适用场景：
• 短期价格操纵
• 市场流动性管理
• 配合其他策略的辅助操作

📋 输出示例：
创建成功后将返回：
\`\`\`
📈 拉砸策略创建成功

✅ 策略信息：
策略类型：MARKET_MANIPULATION（拉砸策略）
Token ID：token_1234567890
目标价格：0.002000 SOL
交易方向：buy（拉升）
交易类型：inside（内盘交易）

💰 交易配置：
交易总量：10.000000 SOL
单笔交易：0.5-2.0 SOL
钱包数量：5个钱包
交易间隔：1-2秒

🔧 高级设置：
小费金额：0.001 SOL
滑点设置：5%

💡 策略状态：
策略已成功创建并启动
系统将自动执行拉升操作
目标价格：0.002000 SOL

⚠️ 风险提醒：
拉砸策略风险较高，请密切关注市场变化。
\`\`\``,
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
                        description: '最小单笔交易量(单位: 拉升为SOL, 砸盘为Token)',
                    },
                    maxTradeAmount: {
                        type: 'number',
                        description: '最大单笔交易量(单位: 拉升为SOL, 砸盘为Token)',
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
        },
        {
            name: 'createPortfolioExchangeStrategy',
            description: `🔄 拆分策略创建 - 资产分散转移策略

🔍 功能说明：
创建拆分策略订单，在不同钱包间转移资产。交易类型根据Token列表里的poolType字段自动判断。拆分地址和目标地址不能有交集，支持1拆n的分散操作。

⚠️ 重要提醒：
• 地址限制：拆分地址和目标地址不能有交集
• 分散比例：支持1拆n的分散操作
• 数量控制：通过比例和金额区间控制拆分数量
• 风险分散：有效分散资产风险

🎯 适用场景：
• 资产风险分散
• 多钱包资产配置
• 批量资产转移

📋 输出示例：
创建成功后将返回：
\`\`\`
🔄 拆分策略创建成功

✅ 策略信息：
策略类型：PORTFOLIO_EXCHANGE（拆分策略）
Token ID：token_1234567890
交易类型：inside（内盘交易）

🔧 交易设置：
单笔拆分：100-500 TOKEN
交易间隔：1-2秒
小费金额：0.001 SOL

💡 策略状态：
策略已成功创建并启动
系统将自动执行资产拆分
分散风险，优化资产配置

⚠️ 操作提醒：
拆分操作将分散资产到多个钱包，请确认目标地址正确。
\`\`\``,
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
                        description: '单笔拆分最小数量(单位: 当前的Token)',
                    },
                    maxTradeAmount: {
                        type: 'number',
                        description: '单笔拆分最大数量(单位: 当前的Token)',
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
        },
        {
            name: 'createBundleSwapStrategy',
            description: `🔄 刷量策略创建 - 循环交易刷量策略

🔍 功能说明：
创建刷量策略订单，在两个钱包间进行循环交易。只能选择一个买入钱包和一个卖出钱包，且不能相同。交易类型根据Token列表里的poolType字段自动判断。

⚠️ 重要提醒：
• 钱包限制：只能选择一个买入钱包和一个卖出钱包，且不能相同
• 循环交易：在两个钱包间进行买卖循环操作
• 资金要求：买入钱包需要SOL余额，卖出钱包需要Token余额
• 策略触发时间: 策略触发时间必须大于当前时间+3分钟且只能创建未来15内的交易，格式为: 2025-01-01 12:00:00。

🎯 适用场景：
• 交易量刷量
• 流动性提供
• 市场活跃度提升

📋 输出示例：
创建成功后将返回：
\`\`\`
🔄 刷量策略创建成功

✅ 策略信息：
策略类型：BUNDLE_SWAP（刷量策略）
Token ID：token_1234567890
交易类型：outside（外盘交易）

💰 交易配置：
买入钱包：wallet_buy_123
卖出钱包：wallet_sell_456
交易金额：0.1-0.5 SOL
最大循环：100次

🔧 高级设置：
交易间隔：1-2秒
小费金额：0.001 SOL
滑点设置：5%

💡 策略状态：
策略已成功创建并启动
系统将自动执行循环交易
提升交易量和市场活跃度

⚠️ 操作提醒：
刷量策略将产生大量交易，请注意手续费成本。
\`\`\``,
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
        },
        {
            name: 'createPumpSniperStrategy',
            description: `🎯 PumpSwap狙击策略创建 - 外盘发射狙击

🔍 功能说明：
创建PumpSwap狙击策略订单，狙击PumpSwap上的外盘发射。只有当前Token是内盘的时候才可以狙击，否则提示用户当前Token是外盘，不能狙击。需要用户优先选择"是否仅狙击买入"。

⚠️ 重要提醒：
• 内盘限制：只有当前Token是内盘的时候才可以狙击
• 狙击模式：支持仅狙击买入或狙击+发射模式
• 钱包限制：狙击地址和发射账号只能选择一个钱包地址
• 风险控制：狙击策略具有较高风险，请谨慎使用

🎯 适用场景：
• 新Token发射狙击
• 早期入场机会
• 高风险高收益策略

📋 输出示例：
创建成功后将返回：
\`\`\`
🎯 PumpSwap狙击策略创建成功

✅ 策略信息：
策略类型：PUMP_MIGRATE（PumpSwap狙击策略）
Token ID：token_1234567890
狙击模式：仅狙击买入
狙击钱包：wallet_sniper_123

💰 交易配置：
数量类型：fixed（固定数量）
狙击数量：1.000000 SOL
小费金额：0.001 SOL

💡 策略状态：
策略已成功创建并启动监控
系统将自动监控外盘发射
发现发射时将立即执行狙击

⚠️ 风险提醒：
狙击策略风险极高，请确保充分了解风险。
\`\`\``,
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
                        description: '数量类型, fixed: 固定数量, range: 余额比例(1-100%), random: 随机数量',
                        enum: ['fixed', 'range', 'random'],
                        default: 'fixed',
                    },
                    amount: {
                        type: 'number',
                        description: '固定数量(单位: 买入为SOL)',
                    },
                    minRatio: {
                        type: 'number',
                        description: '范围比例最小值(单位: %)',
                    },
                    maxRatio: {
                        type: 'number',
                        description: '范围比例最大值(单位: %)',
                    },
                    minAmount: {
                        type: 'number',
                        description: '随机数量最小值(单位: SOL)',
                    },
                    maxAmount: {
                        type: 'number',
                        description: '随机数量最大值(单位: 买入为SOL)',
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
        },
        {
            name: 'createRaydiumSniperStrategy',
            description: `🎯 Raydium狙击策略创建 - Raydium加池狙击

🔍 功能说明：
创建Raydium狙击策略订单，狙击raydium上的加池。池子类型需要用户自己来选择，支持AMM_V4、CLMM、CPMM三种池子类型。

⚠️ 重要提醒：
• 池子类型：需要用户选择池子类型（AMM_V4、CLMM、CPMM）
• 钱包限制：只能选择一个钱包地址狙击
• 风险控制：狙击策略具有较高风险，请谨慎使用
• 资金要求：需要足够的SOL余额进行狙击

🎯 适用场景：
• Raydium新池狙击
• 早期流动性提供
• 高风险高收益策略

📋 输出示例：
创建成功后将返回：
\`\`\`
🎯 Raydium狙击策略创建成功

✅ 策略信息：
策略类型：RAYDIUM_SNIPER（Raydium狙击策略）
Token ID：token_1234567890
池子类型：AMM_V4
狙击钱包：wallet_sniper_123

💰 交易配置：
数量类型：range（余额比例）
比例范围：20%-50%
小费金额：0.001 SOL

💡 策略状态：
策略已成功创建并启动监控
系统将自动监控Raydium加池
发现新池时将立即执行狙击

⚠️ 风险提醒：
Raydium狙击策略风险极高，请确保充分了解风险。
\`\`\``,
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
                        description: '数量类型, fixed: 固定数量, range: 余额比例(1-100%), random: 随机数量',
                        enum: ['fixed', 'range', 'random'],
                        default: 'fixed',
                    },
                    amount: {
                        type: 'number',
                        description: '固定数量(单位: 买入为SOL)',
                    },
                    minRatio: {
                        type: 'number',
                        description: '范围比例最小值(单位: %)',
                    },
                    maxRatio: {
                        type: 'number',
                        description: '范围比例最大值(单位: %)',
                    },
                    minAmount: {
                        type: 'number',
                        description: '随机数量最小值(单位: SOL)',
                    },
                    maxAmount: {
                        type: 'number',
                        description: '随机数量最大值(单位: 买入为SOL)',
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
        },
    ];
}

export async function handleStrategyTool(name: string, args: any, apiClient: ApiClient, token: string): Promise<any> {
    try {
        if (!token) {
            return {
                success: false,
                error: config.messages.login.required,
            };
        }

        switch (name) {
            case 'createPriceStrategy':
                // logger.info('开始创建限价策略', { args });

                // 验证策略参数
                const priceValidationArgs = { ...args };
                Validator.validatePriceStrategyParams(priceValidationArgs);

                const priceTradingParams: any = {
                    side: args.side || 'buy',
                    tradingType: args.tradingType || 'inside',
                    targetPrice: args.targetPrice,
                    priceThresholdPercent: args.priceThresholdPercent || 0,
                    walletIds: args.walletIds,
                    minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
                    maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
                };

                if (args.amountType === 'fixed') {
                    priceTradingParams.amount = args.amount;
                } else if (args.amountType === 'range') {
                    priceTradingParams.minRatio = args.minRatio;
                    priceTradingParams.maxRatio = args.maxRatio;
                } else if (args.amountType === 'random') {
                    priceTradingParams.minAmount = args.minAmount;
                    priceTradingParams.maxAmount = args.maxAmount;
                }

                priceTradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (priceTradingParams.tradingType === 'outside' && args.slippageBps) {
                    priceTradingParams.slippageBps = args.slippageBps;
                }

                const priceStrategyParams = {
                    name: 'PRICE_BASED',
                    type: 'PRICE_BASED',
                    tokenId: args.tokenId,
                    config: priceTradingParams,
                };

                const priceResponse = await apiClient.createStrategy(priceStrategyParams);

                return {
                    success: priceResponse.success,
                    data: priceResponse.success
                        ? {
                              strategyType: 'PRICE_BASED',
                              tokenId: args.tokenId,
                              targetPrice: args.targetPrice,
                              side: args.side,
                              tradingType: args.tradingType,
                              walletCount: args.walletIds.length,
                              message: config.messages.strategy.priceStrategySuccess,
                              strategyParams: priceStrategyParams,
                          }
                        : null,
                    error: priceResponse.success ? null : priceResponse.message || config.messages.strategy.priceStrategyFailed,
                };

            case 'createTimeStrategy':
                // logger.info('开始创建定时策略', { args });

                // 验证策略参数
                const timeValidationArgs = { ...args };
                Validator.validateTimeStrategyParams(timeValidationArgs);

                const timeTradingParams: any = {
                    side: args.side,
                    tradingType: args.tradingType,
                    executeAt: dayjs(args.executeAt).toISOString(),
                    walletIds: args.walletIds,
                    minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
                    maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
                };

                if (args.amountType === 'fixed') {
                    timeTradingParams.amount = args.amount;
                } else if (args.amountType === 'range') {
                    timeTradingParams.minRatio = args.minRatio;
                    timeTradingParams.maxRatio = args.maxRatio;
                } else if (args.amountType === 'random') {
                    timeTradingParams.minAmount = args.minAmount;
                    timeTradingParams.maxAmount = args.maxAmount;
                }

                timeTradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (timeTradingParams.tradingType === 'outside' && args.slippageBps) {
                    timeTradingParams.slippageBps = args.slippageBps;
                }

                const timeStrategyParams = {
                    name: 'TIME_BASED',
                    type: 'TIME_BASED',
                    tokenId: args.tokenId,
                    config: timeTradingParams,
                };

                const timeResponse = await apiClient.createStrategy(timeStrategyParams);

                return {
                    success: timeResponse.success,
                    data: timeResponse.success
                        ? {
                              strategyType: 'TIME_BASED',
                              tokenId: args.tokenId,
                              executeAt: args.executeAt,
                              side: args.side,
                              tradingType: args.tradingType,
                              walletCount: args.walletIds.length,
                              message: config.messages.strategy.timeStrategySuccess,
                              strategyParams: timeStrategyParams,
                          }
                        : null,
                    error: timeResponse.success ? null : timeResponse.message || config.messages.strategy.timeStrategyFailed,
                };

            case 'createMarketManipulationStrategy':
                // logger.info('开始创建拉砸策略', { args });

                // 验证策略参数
                const manipulationValidationArgs = { ...args };
                Validator.validateMarketManipulationStrategyParams(manipulationValidationArgs);

                const manipulationTradingParams: any = {
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

                manipulationTradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (manipulationTradingParams.tradingType === 'outside' && args.slippageBps) {
                    manipulationTradingParams.slippageBps = args.slippageBps;
                }

                const manipulationStrategyParams = {
                    name: 'MARKET_MANIPULATION',
                    type: 'MARKET_MANIPULATION',
                    tokenId: args.tokenId,
                    config: manipulationTradingParams,
                };

                const manipulationResponse = await apiClient.createStrategy(manipulationStrategyParams);

                return {
                    success: manipulationResponse.success,
                    data: manipulationResponse.success
                        ? {
                              strategyType: 'MARKET_MANIPULATION',
                              tokenId: args.tokenId,
                              targetPrice: args.targetPrice,
                              side: args.side,
                              tradingType: args.tradingType,
                              maxAmount: args.maxAmount,
                              walletCount: args.walletIds.length,
                              message: config.messages.strategy.marketManipulationStrategySuccess,
                              strategyParams: manipulationStrategyParams,
                          }
                        : null,
                    error: manipulationResponse.success ? null : manipulationResponse.message || config.messages.strategy.marketManipulationStrategyFailed,
                };

            case 'createPortfolioExchangeStrategy':
                // logger.info('开始创建拆分策略', { args });

                // 验证策略参数
                const portfolioValidationArgs = { ...args };
                Validator.validatePortfolioExchangeStrategyParams(portfolioValidationArgs);

                const portfolioTradingParams: any = {
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

                portfolioTradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (portfolioTradingParams.tradingType === 'outside' && args.slippageBps) {
                    portfolioTradingParams.slippageBps = args.slippageBps;
                }

                const portfolioStrategyParams = {
                    name: 'PORTFOLIO_EXCHANGE',
                    type: 'PORTFOLIO_EXCHANGE',
                    tokenId: args.tokenId,
                    config: portfolioTradingParams,
                };

                const portfolioResponse = await apiClient.createStrategy(portfolioStrategyParams);

                return {
                    success: portfolioResponse.success,
                    data: portfolioResponse.success
                        ? {
                              strategyType: 'PORTFOLIO_EXCHANGE',
                              tokenId: args.tokenId,
                              tradingType: args.tradingType,
                              fromWalletCount: args.fromWalletIds.length,
                              toWalletCount: args.toWalletIds.length,
                              splitAmount: args.fromSplitAmount,
                              message: config.messages.strategy.portfolioExchangeStrategySuccess,
                              strategyParams: portfolioStrategyParams,
                          }
                        : null,
                    error: portfolioResponse.success ? null : portfolioResponse.message || config.messages.strategy.portfolioExchangeStrategyFailed,
                };

            case 'createBundleSwapStrategy':
                // logger.info('开始创建刷量策略', { args });

                // 验证策略参数
                const bundleValidationArgs = { ...args };
                Validator.validateBundleSwapStrategyParams(bundleValidationArgs);

                const bundleTradingParams: any = {
                    wallet1Id: args.buyWalletId,
                    wallet2Id: args.sellWalletId,
                    tradingType: args.tradingType,
                    maxCycles: args.maxCycles,
                    minTradeAmount: args.minTradeAmount,
                    maxTradeAmount: args.maxTradeAmount,
                    minInterval: (args.minInterval || config.strategy.defaultInterval.min) * 1000,
                    maxInterval: (args.maxInterval || config.strategy.defaultInterval.max) * 1000,
                };

                if (args.executeAt) bundleTradingParams.executeAt = dayjs(args.executeAt).toISOString();

                bundleTradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (bundleTradingParams.tradingType === 'outside' && args.slippageBps) {
                    bundleTradingParams.slippageBps = args.slippageBps;
                }

                const bundleStrategyParams = {
                    name: 'BUNDLE_SWAP',
                    type: 'BUNDLE_SWAP',
                    tokenId: args.tokenId,
                    config: bundleTradingParams,
                };

                // logger.info('刷量策略参数', bundleStrategyParams);

                const bundleResponse = await apiClient.createStrategy(bundleStrategyParams);

                return {
                    success: bundleResponse.success,
                    data: bundleResponse.success
                        ? {
                              strategyType: 'BUNDLE_SWAP',
                              tokenId: args.tokenId,
                              tradingType: args.tradingType,
                              buyWalletId: args.buyWalletId,
                              sellWalletId: args.sellWalletId,
                              maxCycles: args.maxCycles,
                              message: config.messages.strategy.bundleSwapSuccess,
                              strategyParams: bundleStrategyParams,
                          }
                        : null,
                    error: bundleResponse.success ? null : bundleResponse.message || config.messages.strategy.bundleSwapFailed,
                };

            case 'createPumpSniperStrategy':
                // logger.info('开始创建PumpSwap狙击策略', { args });

                // 验证策略参数
                const pumpValidationArgs = { ...args };
                Validator.validatePumpSwapSniperStrategyParams(pumpValidationArgs);

                const pumpTradingParams: any = {
                    buyerWalletId: args.buyerWalletId,
                    onlySniper: args.onlySniperBuy,
                };

                if (!args.onlySniperBuy) {
                    pumpTradingParams.migratorWalletId = args.migratorWalletId;
                }

                if (args.amountType === 'fixed') {
                    pumpTradingParams.amount = args.amount;
                } else if (args.amountType === 'range') {
                    pumpTradingParams.minRatio = args.minRatio;
                    pumpTradingParams.maxRatio = args.maxRatio;
                } else if (args.amountType === 'random') {
                    pumpTradingParams.minAmount = args.minAmount;
                    pumpTradingParams.maxAmount = args.maxAmount;
                }

                pumpTradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (pumpTradingParams.tradingType === 'outside' && args.slippageBps) {
                    pumpTradingParams.slippageBps = args.slippageBps;
                }

                const pumpStrategyParams = {
                    name: 'PUMP_MIGRATE',
                    type: 'PUMP_MIGRATE',
                    tokenId: args.tokenId,
                    config: pumpTradingParams,
                };

                // logger.info('PumpSwap狙击策略参数', pumpStrategyParams);

                const pumpResponse = await apiClient.createStrategy(pumpStrategyParams);

                return {
                    success: pumpResponse.success,
                    data: pumpResponse.success
                        ? {
                              strategyType: 'PUMP_MIGRATE',
                              tokenId: args.tokenId,
                              onlySniperBuy: args.onlySniperBuy,
                              buyerWalletId: args.buyerWalletId,
                              migratorWalletId: args.migratorWalletId,
                              message: config.messages.strategy.bundleSwapSuccess,
                              strategyParams: pumpStrategyParams,
                          }
                        : null,
                    error: pumpResponse.success ? null : pumpResponse.message || config.messages.strategy.bundleSwapFailed,
                };

            case 'createRaydiumSniperStrategy':
                // logger.info('开始创建Raydium狙击策略', { args });

                // 验证策略参数
                const raydiumValidationArgs = { ...args };
                Validator.validateRaydiumSniperStrategyParams(raydiumValidationArgs);

                const raydiumTradingParams: any = {
                    buyerWalletId: args.buyerWalletId,
                    poolType: args.poolType,
                };

                if (args.amountType === 'fixed') {
                    raydiumTradingParams.amount = args.amount;
                } else if (args.amountType === 'range') {
                    raydiumTradingParams.minRatio = args.minRatio;
                    raydiumTradingParams.maxRatio = args.maxRatio;
                } else if (args.amountType === 'random') {
                    raydiumTradingParams.minAmount = args.minAmount;
                    raydiumTradingParams.maxAmount = args.maxAmount;
                }

                raydiumTradingParams.tipAmount = args.tipAmount || config.strategy.defaultTipAmount;

                if (raydiumTradingParams.tradingType === 'outside' && args.slippageBps) {
                    raydiumTradingParams.slippageBps = args.slippageBps;
                }

                const raydiumStrategyParams = {
                    name: 'RAYDIUM_SNIPER',
                    type: 'RAYDIUM_SNIPER',
                    tokenId: args.tokenId,
                    config: raydiumTradingParams,
                };

                // logger.info('Raydium狙击策略参数', raydiumStrategyParams);

                const raydiumResponse = await apiClient.createStrategy(raydiumStrategyParams);

                return {
                    success: raydiumResponse.success,
                    data: raydiumResponse.success
                        ? {
                              strategyType: 'RAYDIUM_SNIPER',
                              tokenId: args.tokenId,
                              poolType: args.poolType,
                              buyerWalletId: args.buyerWalletId,
                              message: config.messages.strategy.bundleSwapSuccess,
                              strategyParams: raydiumStrategyParams,
                          }
                        : null,
                    error: raydiumResponse.success ? null : raydiumResponse.message || config.messages.strategy.bundleSwapFailed,
                };

            default:
                throw new Error(`未知的策略工具: ${name}`);
        }
    } catch (error) {
        logger.error(`策略工具执行失败 ${name}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        };
    }
}
