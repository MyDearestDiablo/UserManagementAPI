import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errorHandler';

// Extended Request interface to include user data
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        tokenType: 'jwt' | 'api-key';
        issuedAt?: number;
        expiresAt?: number;
    };
    requestId?: string;
}

// Configuration
import type { Secret } from 'jsonwebtoken';
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2025';
const API_KEY = process.env.API_KEY || 'techhive-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Mock user database for JWT validation
const validUsers = [
    { id: '1', email: 'admin@techhive.com', role: 'admin', name: 'Admin User' },
    { id: '2', email: 'manager@techhive.com', role: 'manager', name: 'Manager User' },
    { id: '3', email: 'user@techhive.com', role: 'user', name: 'Regular User' }
];

// Token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set<string>();

// Helper function to create unauthorized response
const createUnauthorizedResponse = (message: string, code: string = 'UNAUTHORIZED') => ({
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    statusCode: 401
});

// Helper function to validate JWT token structure
const isValidJWTStructure = (token: string): boolean => {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
};

// Helper function to check if token is blacklisted
const isTokenBlacklisted = (token: string): boolean => {
    return tokenBlacklist.has(token);
};

// Main token validation middleware
export const validateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        const apiKey = req.headers['x-api-key'] as string;
        const bearerToken = req.headers['x-access-token'] as string;

        // Check for API Key authentication first
        if (apiKey) {
            if (apiKey === API_KEY) {
                req.user = {
                    id: 'api-key-user',
                    email: 'api@techhive.com',
                    role: 'admin',
                    tokenType: 'api-key'
                };
                return next();
            } else {
                res.status(401).json(createUnauthorizedResponse(
                    'Invalid API key provided',
                    'INVALID_API_KEY'
                ));
                return;
            }
        }

        // Check for Bearer token in Authorization header
        let token: string | null = null;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        } else if (bearerToken) {
            token = bearerToken;
        }

        if (!token) {
            res.status(401).json(createUnauthorizedResponse(
                'Access token is required. Provide a valid JWT token in Authorization header or API key in x-api-key header',
                'TOKEN_REQUIRED'
            ));
            return;
        }

        // Validate JWT token structure
        if (!isValidJWTStructure(token)) {
            res.status(401).json(createUnauthorizedResponse(
                'Invalid token format. Token must be a valid JWT',
                'INVALID_TOKEN_FORMAT'
            ));
            return;
        }

        // Check if token is blacklisted
        if (isTokenBlacklisted(token)) {
            res.status(401).json(createUnauthorizedResponse(
                'Token has been revoked',
                'TOKEN_REVOKED'
            ));
            return;
        }

        // Verify and decode JWT token
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            
            // Validate decoded token structure
            if (!decoded.id || !decoded.email || !decoded.role) {
                res.status(401).json(createUnauthorizedResponse(
                    'Invalid token payload. Missing required fields',
                    'INVALID_TOKEN_PAYLOAD'
                ));
                return;
            }

            // Check if user still exists in our system
            const user = validUsers.find(u => u.id === decoded.id && u.email === decoded.email);
            if (!user) {
                res.status(401).json(createUnauthorizedResponse(
                    'User associated with this token no longer exists',
                    'USER_NOT_FOUND'
                ));
                return;
            }

            // Check token expiration manually (additional check)
            const currentTime = Math.floor(Date.now() / 1000);
            if (decoded.exp && decoded.exp < currentTime) {
                res.status(401).json(createUnauthorizedResponse(
                    'Token has expired. Please login again',
                    'TOKEN_EXPIRED'
                ));
                return;
            }

            // Add user info to request object
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                tokenType: 'jwt',
                issuedAt: decoded.iat,
                expiresAt: decoded.exp
            };

            next();

        } catch (jwtError: any) {
            // Handle specific JWT errors
            if (jwtError.name === 'TokenExpiredError') {
                res.status(401).json(createUnauthorizedResponse(
                    'Token has expired. Please login again',
                    'TOKEN_EXPIRED'
                ));
                return;
            } else if (jwtError.name === 'JsonWebTokenError') {
                res.status(401).json(createUnauthorizedResponse(
                    'Invalid token signature or malformed token',
                    'INVALID_TOKEN_SIGNATURE'
                ));
                return;
            } else if (jwtError.name === 'NotBeforeError') {
                res.status(401).json(createUnauthorizedResponse(
                    'Token is not yet valid',
                    'TOKEN_NOT_ACTIVE'
                ));
                return;
            } else {
                res.status(401).json(createUnauthorizedResponse(
                    'Token validation failed',
                    'TOKEN_VALIDATION_FAILED'
                ));
                return;
            }
        }

    } catch (error: any) {
        console.error('Token validation error:', error);
        res.status(401).json(createUnauthorizedResponse(
            'Authentication failed due to server error',
            'AUTH_SERVER_ERROR'
        ));
        return;
    }
};

// Utility functions for token management
export const revokeToken = (token: string): void => {
    tokenBlacklist.add(token);
};

export const isTokenValid = async (token: string): Promise<boolean> => {
    try {
        if (isTokenBlacklisted(token)) return false;
        
        const decoded = jwt.verify(token, JWT_SECRET);
        return !!decoded;
    } catch {
        return false;
    }
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json(createUnauthorizedResponse(
                'Authentication required',
                'AUTH_REQUIRED'
            ));
            return;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
                code: 'INSUFFICIENT_PERMISSIONS',
                timestamp: new Date().toISOString(),
                statusCode: 403
            });
            return;
        }

        next();
    };
};