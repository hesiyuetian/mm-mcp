export class Logger {
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
