import { Router, Request, Response } from 'express';
import UserController from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// Public test route (no authentication required)
router.get('/test', (req: Request, res: Response) => {
    res.json({ 
        message: 'TechHive User Management API - User routes working!',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        authentication: 'Not required for this endpoint',
        requestId: (req as any).requestId,
        endpoints: [
            'GET /api/users - Get all users with filtering',
            'POST /api/users - Create new user',
            'GET /api/users/stats - Get user statistics',
            'GET /api/users/search?q=term - Search users',
            'GET /api/users/age?minAge=X&maxAge=Y - Filter by age',
            'GET /api/users/role/:role - Get users by role',
            'GET /api/users/:id - Get user by ID',
            'PUT /api/users/:id - Update user',
            'DELETE /api/users/:id - Delete user',
            'PATCH /api/users/:id/toggle-status - Toggle user active status'
        ]
    });
});

// Public route with optional auth
router.get('/public-info', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;
    
    const response: any = {
        message: 'Public information endpoint',
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId
    };

    if (authHeader || apiKey) {
        response.message += ' (authentication detected but not required)';
        response.authProvided = true;
    } else {
        response.authProvided = false;
    }

    res.json(response);
});

// Apply authentication to all routes below this point
router.use(authenticate);

// User CRUD operations with role-based access
router.post('/', authorize('admin', 'manager'), userController.createUser);
router.get('/', authorize('admin', 'manager', 'user'), userController.getAllUsers);
router.get('/stats', authorize('admin', 'manager'), userController.getUserStats);
router.get('/search', authorize('admin', 'manager', 'user'), userController.searchUsers);
router.get('/age', authorize('admin', 'manager', 'user'), userController.getUsersByAge);
router.get('/role/:role', authorize('admin', 'manager'), userController.getUsersByRole);
router.get('/:id', authorize('admin', 'manager', 'user'), userController.getUser);

// Sensitive operations (admin/manager only)
router.put('/:id', authorize('admin', 'manager'), userController.updateUser);
router.patch('/:id/toggle-status', authorize('admin', 'manager'), userController.toggleUserStatus);
router.delete('/:id', authorize('admin'), userController.deleteUser);

export default router;