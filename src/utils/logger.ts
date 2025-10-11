import fs from 'fs';
import path from 'path';

// 日志工具类
export class Logger {
  static log(level: string, message: string, data: any = null) {
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

  static info(message: string, data: any = null) {
    this.log('INFO', message, data);
  }

  static debug(message: string, data: any = null) {
    this.log('DEBUG', message, data);
  }

  static warn(message: string, data: any = null) {
    this.log('WARN', message, data);
  }

  static error(message: string, data: any = null) {
    this.log('ERROR', message, data);
  }
}

// 导出 logger 实例以保持兼容性
export const logger = Logger;
