// API工具类

import axios from 'axios';
import config from '../config/index.js';

class ApiClient {
    constructor() {
        this.baseUrl = config.api.baseUrl;
        // this.baseUrl = 'https://api-ai.taoillium.ai'
        this.timeout = config.api.timeout;
        this.retries = config.api.retries;
        this.token = config.api.token;
        // this.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjMzg4NTNjYS1jNTg4LTQ2MGUtYWNkNS1kZTEwYWEyY2MzMTUiLCJyb2xlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTY3MDc4MTAsImV4cCI6MTc1Njc5NDIxMH0.s46PgZWcAmTZ1G-jspR51afE3Gv_r_l85QVAo8ffVBg'
    }

    // 设置认证token
    setToken(token) {
        this.token = token;
    }

    // 获取请求头
    getHeaders() {
        const headers = {};

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // 带重试的请求方法
    async request(method, url, data = null, params = null) {
        let lastError;

        for (let i = 0; i <= this.retries; i++) {
            try {
                // console.log('request info ==============', {
                //     method,
                //     url: `${this.baseUrl}${url}`,
                //     data,
                //     params,
                //     headers: this.getHeaders(),
                //     timeout: this.timeout,
                // });
                const response = await axios({
                    method,
                    url: `${this.baseUrl}${url}`,
                    data,
                    params,
                    headers: this.getHeaders(),
                    timeout: this.timeout,
                });
                return response.data;
            } catch (error) {
                lastError = error;

                // 如果是最后一次重试，直接抛出错误
                if (i === this.retries) {
                    throw error;
                }

                // 等待一段时间后重试
                await this.delay(1000 * (i + 1));
            }
        }

        throw lastError;
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 验证响应
    validateResponse(response) {
        if (!response) {
            throw new Error('API响应为空');
        }

        return response;
    }

    // 登录
    async login(email, password) {
        const response = await this.request('POST', '/auth/login', {
            email,
            password,
        });

        return this.validateResponse(response);
    }

    // 获取项目列表
    async getProjects() {
        const response = await this.request('GET', '/project/getProjects', null, {});
        return this.validateResponse(response);
    }

    // 获取Token列表
    async getTokens(projectId, page = 1, limit = 100, status = 'active') {
        const response = await this.request('GET', '/token/getTokens', null, {
            projectId,
            page,
            limit,
            status,
        });

        return this.validateResponse(response);
    }

    // 获取钱包列表
    async getWallets(projectId, tokenId, page = 1, limit = 100000) {
        const response = await this.request('GET', '/wallet/getWallets', null, {
            projectId,
            tokenId,
            page,
            limit,
        });

        return this.validateResponse(response);
    }

    // 创建策略
    async createStrategy(strategyParams) {
        // console.log('createStrategy strategyParams ==============', strategyParams);
        const response = await this.request('POST', '/strategy/createStrategy', strategyParams);

        return this.validateResponse(response);
    }

    // 获取策略列表
    async getStrategies(projectId, page = 1, limit = 20) {
        const response = await this.request('GET', '/strategy/getStrategies', null, {
            projectId,
            page,
            limit,
        });

        return this.validateResponse(response);
    }

    // 删除策略
    async deleteStrategy(strategyId) {
        const response = await this.request('POST', '/strategy/deleteStrategy', {
            strategyId,
        });

        return this.validateResponse(response);
    }
}

export default ApiClient;

// curl 'http://127.0.0.1:3000/project/getProjects' \
//   -H 'Accept: application/json, text/plain, */*' \
//   -H 'Accept-Language: zh-CN,zh;q=0.9' \
//   -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjMzg4NTNjYS1jNTg4LTQ2MGUtYWNkNS1kZTEwYWEyY2MzMTUiLCJyb2xlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTY3MDc4MTAsImV4cCI6MTc1Njc5NDIxMH0.s46PgZWcAmTZ1G-jspR51afE3Gv_r_l85QVAo8ffVBg' \
//   -H 'Cache-Control: no-cache, no-store, must-revalidate' \
//   -H 'Connection: keep-alive' \
//   -H 'Origin: http://127.0.0.1' \
//   -H 'Pragma: no-cache' \
//   -H 'Referer: http://localhost:9004/' \
//   -H 'Sec-Fetch-Dest: empty' \
//   -H 'Sec-Fetch-Mode: cors' \
//   -H 'Sec-Fetch-Site: cross-site' \
//   -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36' \
//   -H 'sec-ch-ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"' \
//   -H 'sec-ch-ua-mobile: ?0' \
//   -H 'sec-ch-ua-platform: "macOS"'
