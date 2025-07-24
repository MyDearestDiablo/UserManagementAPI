export interface User {
    id: string;
    name: string;
    email: string;
    age: number;
    role: 'admin' | 'manager' | 'user';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserRequest {
    name: string;
    email: string;
    age: number;
    role?: 'admin' | 'manager' | 'user';
}

export interface UpdateUserRequest {
    name?: string;
    email?: string;
    age?: number;
    role?: 'admin' | 'manager' | 'user';
    isActive?: boolean;
}

export interface LoginResponse {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    timestamp: string;
    requestId?: string;
}

export interface UserFilters {
    activeOnly?: boolean;
    role?: 'admin' | 'manager' | 'user';
    minAge?: number;
    maxAge?: number;
    search?: string;
}

export interface UserStats {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    averageAge: number;
}

export const UserValidation = {
    name: {
        min: 2,
        max: 100,
        required: true
    },
    email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        required: true
    },
    age: {
        min: 0,
        max: 150,
        required: true
    },
    role: {
        enum: ['admin', 'manager', 'user'] as const,
        default: 'user' as const
    }
};