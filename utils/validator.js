// 验证工具类

import config from '../config/index.js'

class Validator {
    // 验证邮箱格式
    static validateEmail(email) {
        if (!email) {
            throw new Error('邮箱不能为空')
        }

        if (!config.validation.email.pattern.test(email)) {
            throw new Error(config.validation.email.message)
        }

        return true
    }

    // 验证价格
    static validatePrice(price) {
        if (price === null || price === undefined) {
            throw new Error('价格不能为空')
        }

        const numPrice = parseFloat(price)
        if (isNaN(numPrice) || numPrice < config.validation.price.min) {
            throw new Error(config.validation.price.message)
        }

        return true
    }

    // 验证数量
    static validateAmount(amount) {
        if (amount === null || amount === undefined) {
            throw new Error('数量不能为空')
        }

        const numAmount = parseFloat(amount)
        if (isNaN(numAmount) || numAmount < config.validation.amount.min) {
            throw new Error(config.validation.amount.message)
        }

        return true
    }

    // 验证比例
    static validateRatio(ratio) {
        if (ratio === null || ratio === undefined) {
            throw new Error('比例不能为空')
        }

        const numRatio = parseFloat(ratio)
        if (isNaN(numRatio) || numRatio < config.validation.ratio.min || numRatio > config.validation.ratio.max) {
            throw new Error(config.validation.ratio.message)
        }

        return true
    }

    // 验证交易间隔
    static validateInterval(interval) {
        if (interval === null || interval === undefined) {
            throw new Error('交易间隔不能为空')
        }

        const numInterval = parseFloat(interval)
        if (isNaN(numInterval) || numInterval < config.validation.interval.min || numInterval > config.validation.interval.max) {
            throw new Error(config.validation.interval.message)
        }

        return true
    }

    // 验证交易方向
    static validateSide(side) {
        const validSides = ['buy', 'sell']
        if (!validSides.includes(side)) {
            throw new Error('交易方向必须是 buy 或 sell')
        }

        return true
    }

    // 验证数量类型
    static validateAmountType(amountType) {
        const validTypes = ['fixed', 'range', 'random']
        if (!validTypes.includes(amountType)) {
            throw new Error('数量类型必须是 fixed、range 或 random')
        }

        return true
    }

    // 验证钱包ID列表
    static validateWalletIds(walletIds) {
        if (!Array.isArray(walletIds) || walletIds.length === 0) {
            throw new Error('钱包ID列表不能为空')
        }

        for (const walletId of walletIds) {
            if (!walletId || typeof walletId !== 'string') {
                throw new Error('钱包ID必须是有效的字符串')
            }
        }

        return true
    }

    // 验证Token ID
    static validateTokenId(tokenId) {
        if (!tokenId || typeof tokenId !== 'string') {
            throw new Error('Token ID不能为空')
        }

        return true
    }

    // 验证项目ID
    static validateProjectId(projectId) {
        if (!projectId || typeof projectId !== 'string') {
            throw new Error('项目ID不能为空')
        }

        return true
    }

    // 验证策略参数
    static validateStrategyParams(params) {
        // 验证必需参数
        this.validateTokenId(params.tokenId)
        this.validateSide(params.side)
        this.validatePrice(params.targetPrice)
        this.validateWalletIds(params.walletIds)

        this.validateAmount(params.amount)
        // this.validateAmountType(params.amountType)

        // 验证数量相关参数
        // if (params.amountType === 'fixed') {
        //     this.validateAmount(params.fixedAmount)
        // } else if (params.amountType === 'range') {
        //     this.validateRatio(params.minRatio)
        //     this.validateRatio(params.maxRatio)
        //     if (params.minRatio >= params.maxRatio) {
        //         throw new Error('最小比例必须小于最大比例')
        //     }
        // } else if (params.amountType === 'random') {
        //     this.validateAmount(params.minAmount)
        //     this.validateAmount(params.maxAmount)
        //     if (params.minAmount >= params.maxAmount) {
        //         throw new Error('最小数量必须小于最大数量')
        //     }
        // }

        // 验证交易间隔
        if (params.minInterval !== undefined) {
            this.validateInterval(params.minInterval)
        }
        if (params.maxInterval !== undefined) {
            this.validateInterval(params.maxInterval)
        }
        if (params.minInterval !== undefined && params.maxInterval !== undefined) {
            if (params.minInterval >= params.maxInterval) {
                throw new Error('最小交易间隔必须小于最大交易间隔')
            }
        }

        // 验证可选参数
        if (params.tipAmount !== undefined) {
            this.validateAmount(params.tipAmount)
        }

        if (params.slippageBps !== undefined) {
            const slippage = parseFloat(params.slippageBps)
            if (isNaN(slippage) || slippage < 0 || slippage > 10000) {
                throw new Error('滑点必须在0-10000基点之间')
            }
        }

        if (params.priceThresholdPercent !== undefined) {
            const threshold = parseFloat(params.priceThresholdPercent)
            if (isNaN(threshold) || threshold < 0 || threshold > 100) {
                throw new Error('价格阈值百分比必须在0-100之间')
            }
        }

        return true
    }

    // 验证登录参数
    static validateLoginParams(params) {
        this.validateEmail(params.email)

        if (!params.password || typeof params.password !== 'string') {
            throw new Error('密码不能为空')
        }

        return true
    }

    // 验证分页参数
    static validatePaginationParams(params) {
        if (params.page !== undefined) {
            const page = parseInt(params.page)
            if (isNaN(page) || page < 1) {
                throw new Error('页码必须大于0')
            }
        }

        if (params.limit !== undefined) {
            const limit = parseInt(params.limit)
            if (isNaN(limit) || limit < 1 || limit > 10000) {
                throw new Error('每页数量必须在1-10000之间')
            }
        }

        return true
    }
}

export default Validator
