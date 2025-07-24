import { Request, Response, NextFunction } from 'express';
import UserService from '../services/userService';
import { 
    ApiResponse, 
    UserFilters, 
    CreateUserRequest, 
    UpdateUserRequest 
} from '../models/user';

class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    // Helper method to handle async errors
    private asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

    public createUser = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userData: CreateUserRequest = req.body;
        const user = await this.userService.createUser(userData);
        
        const response: ApiResponse = {
            success: true,
            message: 'User created successfully',
            data: user,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        };
        
        res.status(201).json(response);
    });

    public updateUser = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userData: UpdateUserRequest = req.body;
        const user = await this.userService.updateUser(req.params.id, userData);
        
        const response: ApiResponse = {
            success: true,
            message: 'User updated successfully',
            data: user,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        };
        
        res.status(200).json(response);
    });

    public getUser = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const user = await this.userService.getUserById(req.params.id);
        
        const response: ApiResponse = {
            success: true,
            data: user,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        };
        
        res.status(200).json(response);
    });

    public deleteUser = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        await this.userService.deleteUser(req.params.id);
        
        const response: ApiResponse = {
            success: true,
            message: 'User deleted successfully',
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        };
        
        res.status(200).json(response);
    });

    public getAllUsers = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const filters: UserFilters = {
            activeOnly: req.query.active === 'true',
            role: req.query.role as 'admin' | 'manager' | 'user' | undefined,
            minAge: req.query.minAge ? parseInt(req.query.minAge as string) : undefined,
            maxAge: req.query.maxAge ? parseInt(req.query.maxAge as string) : undefined,
            search: req.query.search as string | undefined
        };

        // Remove undefined values
        Object.keys(filters).forEach(key => {
            if (filters[key as keyof UserFilters] === undefined) {
                delete filters[key as keyof UserFilters];
            }
        });

        const users = await this.userService.getAllUsers(filters);
        
        const response: ApiResponse = {
            success: true,
            data: users,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        };

        (response as any).count = users.length;
        (response as any).filters = filters;

        res.status(200).json(response);
    });

    public getUserStats = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const stats = await this.userService.getUserStats();
        
        const response: ApiResponse = {
            success: true,
            data: stats,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        };
        
        res.status(200).json(response);
    });

    public searchUsers = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const searchQuery = req.query.q as string;
        
        if (!searchQuery?.trim()) {
            const response: ApiResponse = {
                success: false,
                error: 'Search query parameter "q" is required',
                timestamp: new Date().toISOString(),
                requestId: (req as any).requestId
            };
            res.status(400).json(response);
            return;
        }

        const users = await this.userService.searchUsers(searchQuery.trim());
        
        const response: ApiResponse = {
            success: true,
            data: users,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        };

        (response as any).count = users.length;
        (response as any).searchQuery = searchQuery.trim();

        res.status(200).json(response);
    });

    public getUsersByAge = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const minAge = req.query.minAge ? parseInt(req.query.minAge as string) : undefined;
        const maxAge = req.query.maxAge ? parseInt(req.query.maxAge as string) : undefined;

        if (minAge !== undefined && (isNaN(minAge) || minAge < 0)) {
            res.status(400).json({
                success: false,
                error: 'minAge must be a valid number >= 0',
                timestamp: new Date().toISOString(),
                requestId: (req as any).requestId
            });
            return;
        }

        if (maxAge !== undefined && (isNaN(maxAge) || maxAge < 0)) {
            res.status(400).json({
                success: false,
                error: 'maxAge must be a valid number >= 0',
                timestamp: new Date().toISOString(),
                requestId: (req as any).requestId
            });
            return;
        }

        if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
            res.status(400).json({
                success: false,
                error: 'minAge cannot be greater than maxAge',
                timestamp: new Date().toISOString(),
                requestId: (req as any).requestId
            });
            return;
        }

        const filters: UserFilters = {};
        if (minAge !== undefined) filters.minAge = minAge;
        if (maxAge !== undefined) filters.maxAge = maxAge;

        const users = await this.userService.getAllUsers(filters);
        
        const response: ApiResponse = {
            success: true,
            data: users,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        };

        (response as any).count = users.length;
        (response as any).ageFilter = { minAge, maxAge };

        res.status(200).json(response);
    });

    public getUsersByRole = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const role = req.params.role as 'admin' | 'manager' | 'user';
        
        if (!['admin', 'manager', 'user'].includes(role)) {
            res.status(400).json({
                success: false,
                error: 'Invalid role. Must be one of: admin, manager, user',
                timestamp: new Date().toISOString(),
                requestId: (req as any).requestId
            });
            return;
        }

        const users = await this.userService.getUsersByRole(role);
        
        const response: ApiResponse = {
            success: true,
            data: users,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        };

        (response as any).count = users.length;
        (response as any).role = role;

        res.status(200).json(response);
    });

    public toggleUserStatus = this.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const updatedUser = await this.userService.toggleUserStatus(req.params.id);

        const response: ApiResponse = {
            success: true,
            message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedUser,
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId
        };

        res.status(200).json(response);
    });
}

// Export the class as default
export default UserController;