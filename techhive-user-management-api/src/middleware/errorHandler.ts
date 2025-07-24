import { Request, Response, NextFunction } from 'express';

// Custom Error Classes
export class ApiError extends Error {
    public statusCode: number;
    public code: string;

    constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'ApiError';
    }
}

export class ValidationError extends ApiError {
    constructor(message: string) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

export class NotFoundError extends ApiError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class ConflictError extends ApiError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT');
    }
}

// Error Response Interface
interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    timestamp: string;
    requestId?: string;
    stack?: string;
}

// Main Error Handler Middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
    console.error('Error:', err);

    let statusCode = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    // Handle specific error types
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code;
    }
    // Handle Mongoose validation error
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors || {}).map((val: any) => val.message).join(', ');
        code = 'VALIDATION_ERROR';
    }
    // Handle JWT errors
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    }
    // Handle JWT expired error
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    }
    // Handle SyntaxError (malformed JSON)
    else if (err instanceof SyntaxError && err.message.includes('JSON')) {
        statusCode = 400;
        message = 'Invalid JSON format in request body';
        code = 'INVALID_JSON';
    }

    // Build error response
    const errorResponse: ErrorResponse = {
        success: false,
        error: message,
        code,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId
    };

    // Add stack trace in development mode
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
};

// 404 Not Found Handler
export const notFoundHandler = (req: Request, res: Response): void => {
    const response = {
        success: false,
        error: `Route ${req.method} ${req.originalUrl} not found`,
        code: 'ROUTE_NOT_FOUND',
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId
    };
    
    console.log(`[404] ${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${req.ip}`);
    res.status(404).json(response);
};