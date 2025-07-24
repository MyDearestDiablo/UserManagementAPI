import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Simple logger middleware
export const eventBasedLogger = (req: Request, res: Response, next: NextFunction): void => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    
    // Log request
    const logEntry = `[${timestamp}] ${method} ${url} - ${ip} - ${userAgent}\n`;
    
    // Console log
    console.log(`📝 ${method} ${url} - ${ip}`);
    
    // File log
    try {
        const logFile = path.join(logsDir, `api-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, logEntry);
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
    
    next();
};

// Simple logger for other modules
export const simpleLogger = (message: string): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
};

// Request logger
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    eventBasedLogger(req, res, next);
};