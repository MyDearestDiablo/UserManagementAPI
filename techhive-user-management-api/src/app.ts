import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { login, addRequestId } from './middleware/auth';
import { eventBasedLogger } from './middleware/logging';

const app = express();

// 1. ERROR-HANDLING MIDDLEWARE FIRST (Global handlers)
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Basic setup
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
    next();
});

// 2. AUTHENTICATION MIDDLEWARE NEXT
app.use(addRequestId);

// Public routes (no authentication required)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        requestId: (req as any).requestId
    });
});

app.get('/api', (req, res) => {
    res.json({
        name: 'TechHive User Management API',
        version: '2.0.0',
        description: 'Enhanced API with proper middleware order',
        requestId: (req as any).requestId,
        middlewareOrder: [
            '1. Error-handling middleware',
            '2. Authentication middleware', 
            '3. Logging middleware'
        ],
        endpoints: {
            auth: {
                'POST /api/auth/login': 'Authenticate user and get JWT token'
            },
            users: {
                'GET /api/users/test': 'Test endpoint (public)',
                'GET /api/users': 'Get all users (authenticated)',
                'POST /api/users': 'Create user (admin/manager)',
                'PUT /api/users/:id': 'Update user (admin/manager)',
                'DELETE /api/users/:id': 'Delete user (admin only)'
            }
        }
    });
});

app.get('/test-error', (req, res, next) => {
    throw new Error('This is a test error to verify error handling middleware');
});

// Authentication routes
app.post('/api/auth/login', login);

// User routes (with authentication applied inside)
app.use('/api/users', userRoutes);

// 3. LOGGING MIDDLEWARE LAST
app.use(eventBasedLogger);

// 404 handler for unmatched routes (before error handler)
app.use(notFoundHandler);

// Global error handler (must be absolutely last)
app.use(errorHandler);

export default app;