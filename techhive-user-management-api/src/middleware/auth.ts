import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2025';
const API_KEY = process.env.API_KEY || 'techhive-2025';

// Mock users for authentication
const mockUsers = [
    { id: '1', email: 'admin@techhive.com', password: 'admin123', role: 'admin', name: 'Admin User' },
    { id: '2', email: 'manager@techhive.com', password: 'manager123', role: 'manager', name: 'Manager User' },
    { id: '3', email: 'user@techhive.com', password: 'user123', role: 'user', name: 'Regular User' }
];

// Helper function to create error response
const createErrorResponse = (message: string, code: string, statusCode: number = 401) => ({
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    statusCode
});

// Add Request ID middleware
export const addRequestId = (req: Request, res: Response, next: NextFunction): void => {
    (req as any).requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    next();
};

// Login function
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json(createErrorResponse(
                'Email and password are required',
                'MISSING_CREDENTIALS',
                400
            ));
            return;
        }

        const user = mockUsers.find(u => u.email === email && u.password === password);
        if (!user) {
            res.status(401).json(createErrorResponse(
                'Invalid email or password',
                'INVALID_CREDENTIALS'
            ));
            return;
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { 
                expiresIn: '24h',
                issuer: 'techhive-api'
            }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                tokenType: 'Bearer',
                expiresIn: '24h'
            },
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        });
    } catch (error) {
        next(error);
    }
};

// Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        const apiKey = req.headers['x-api-key'] as string;

        // Check API key first
        if (apiKey) {
            if (apiKey === API_KEY) {
                (req as any).user = { 
                    id: 'api-key-user', 
                    email: 'api@techhive.com',
                    role: 'admin',
                    tokenType: 'api-key'
                };
                return next();
            } else {
                res.status(401).json(createErrorResponse(
                    'Invalid API key provided',
                    'INVALID_API_KEY'
                ));
                return;
            }
        }

        // Check JWT token
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            
            if (!token) {
                res.status(401).json(createErrorResponse(
                    'Token is required',
                    'TOKEN_REQUIRED'
                ));
                return;
            }

            try {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                
                // Validate token payload
                if (!decoded.id || !decoded.email || !decoded.role) {
                    res.status(401).json(createErrorResponse(
                        'Invalid token payload',
                        'INVALID_TOKEN_PAYLOAD'
                    ));
                    return;
                }

                // Check if user still exists
                const user = mockUsers.find(u => u.id === decoded.id && u.email === decoded.email);
                if (!user) {
                    res.status(401).json(createErrorResponse(
                        'User associated with this token no longer exists',
                        'USER_NOT_FOUND'
                    ));
                    return;
                }

                (req as any).user = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                    tokenType: 'jwt'
                };

                return next();

            } catch (jwtError: any) {
                if (jwtError.name === 'TokenExpiredError') {
                    res.status(401).json(createErrorResponse(
                        'Token has expired. Please login again',
                        'TOKEN_EXPIRED'
                    ));
                    return;
                } else {
                    res.status(401).json(createErrorResponse(
                        'Token validation failed',
                        'TOKEN_VALIDATION_FAILED'
                    ));
                    return;
                }
            }
        }

        // No valid authentication provided
        res.status(401).json(createErrorResponse(
            'Authentication required. Provide a valid JWT token in Authorization header or API key in x-api-key header',
            'AUTHENTICATION_REQUIRED'
        ));
        return;

    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json(createErrorResponse(
            'Authentication failed due to server error',
            'AUTH_SERVER_ERROR'
        ));
        return;
    }
};

// Authorization middleware
export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const user = (req as any).user;
            
            if (!user) {
                res.status(401).json(createErrorResponse(
                    'Authentication required',
                    'AUTH_REQUIRED'
                ));
                return;
            }

            if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
                res.status(403).json({
                    success: false,
                    error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${user.role}`,
                    code: 'INSUFFICIENT_PERMISSIONS',
                    timestamp: new Date().toISOString(),
                    statusCode: 403,
                    userRole: user.role,
                    requiredRoles: allowedRoles
                });
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // If no auth headers present, continue without authentication
    if (!authHeader && !apiKey) {
        return next();
    }

    // If auth headers are present, validate them
    authenticate(req, res, next);
};

// Logout function (for token blacklisting in production)
export const logout = (req: Request, res: Response): void => {
    // In production, you would add the token to a blacklist
    res.json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId
    });
};

// Additional utility functions
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json(createErrorResponse(
                'Valid token required for refresh',
                'TOKEN_REQUIRED'
            ));
            return;
        }

        const token = authHeader.slice(7);
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const user = mockUsers.find(u => u.id === decoded.id);
            
            if (!user) {
                res.status(401).json(createErrorResponse(
                    'User not found',
                    'USER_NOT_FOUND'
                ));
                return;
            }

            const newToken = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    role: user.role 
                },
                JWT_SECRET,
                { 
                    expiresIn: '24h',
                    issuer: 'techhive-api'
                }
            );

            res.json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    token: newToken,
                    tokenType: 'Bearer',
                    expiresIn: '24h'
                },
                timestamp: new Date().toISOString(),
                requestId: (req as any).requestId
            });
        } catch (jwtError) {
            res.status(401).json(createErrorResponse(
                'Invalid or expired token',
                'TOKEN_INVALID'
            ));
            return;
        }
    } catch (error) {
        next(error);
    }
};