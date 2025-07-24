import { Request, Response, NextFunction } from 'express';
import { CreateUserRequest, UpdateUserRequest } from '../models/user';

export const validateCreateUser = (req: Request, res: Response, next: NextFunction): void => {
    const { name, email, age } = req.body as CreateUserRequest;
    const errors: string[] = [];

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push('Valid email is required');
    }

    // Validate age
    if (!age || typeof age !== 'number' || age < 0 || age > 150) {
        errors.push('Age must be a number between 0 and 150');
    }

    if (errors.length > 0) {
        res.status(400).json({ 
            message: 'Validation failed', 
            errors 
        });
        return;
    }

    next();
};

export const validateUpdateUser = (req: Request, res: Response, next: NextFunction): void => {
    const { name, email, age, isActive } = req.body as UpdateUserRequest;
    const errors: string[] = [];

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
        errors.push('Name must be at least 2 characters long');
    }

    // Validate email if provided
    if (email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errors.push('Valid email is required');
        }
    }

    // Validate age if provided
    if (age !== undefined && (typeof age !== 'number' || age < 0 || age > 150)) {
        errors.push('Age must be a number between 0 and 150');
    }

    // Validate isActive if provided
    if (isActive !== undefined && typeof isActive !== 'boolean') {
        errors.push('isActive must be a boolean');
    }

    if (errors.length > 0) {
        res.status(400).json({ 
            message: 'Validation failed', 
            errors 
        });
        return;
    }

    next();
};

export const validateUserId = (req: Request, res: Response, next: NextFunction): void => {
    const { id } = req.params;
    
    if (!id || id.trim().length === 0) {
        res.status(400).json({ 
            message: 'User ID is required' 
        });
        return;
    }

    next();
};