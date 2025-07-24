import { 
    User, 
    CreateUserRequest, 
    UpdateUserRequest,
    UserFilters,
    UserStats,
    UserValidation
} from '../models/user';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

class UserService {
    private users: User[] = [
        {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            role: 'user',
            isActive: true,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01')
        },
        {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            age: 28,
            role: 'manager',
            isActive: true,
            createdAt: new Date('2025-01-02'),
            updatedAt: new Date('2025-01-02')
        },
        {
            id: '3',
            name: 'Admin User',
            email: 'admin@techhive.com',
            age: 35,
            role: 'admin',
            isActive: true,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01')
        },
        {
            id: '4',
            name: 'Manager Test',
            email: 'manager@techhive.com',
            age: 32,
            role: 'manager',
            isActive: false,
            createdAt: new Date('2025-01-03'),
            updatedAt: new Date('2025-01-15')
        },
        {
            id: '5',
            name: 'Test User',
            email: 'test@example.com',
            age: 25,
            role: 'user',
            isActive: true,
            createdAt: new Date('2025-01-10'),
            updatedAt: new Date('2025-01-10')
        }
    ];

    // Helper method for email validation
    private validateEmail(email: string): boolean {
        return UserValidation.email.pattern.test(email);
    }

    // Helper method for name validation
    private validateName(name: string): boolean {
        return name.length >= UserValidation.name.min && name.length <= UserValidation.name.max;
    }

    // Helper method for age validation
    private validateAge(age: number): boolean {
        return age >= UserValidation.age.min && age <= UserValidation.age.max;
    }

    public async createUser(userData: CreateUserRequest): Promise<User> {
        // Validation
        if (!userData.name?.trim() || userData.name.trim().length < 2) {
            throw new ValidationError('Name is required and must be at least 2 characters');
        }
        if (!userData.email?.trim() || !UserValidation.email.pattern.test(userData.email.trim())) {
            throw new ValidationError('Valid email is required');
        }
        if (userData.age === undefined || userData.age < 0 || userData.age > 150) {
            throw new ValidationError('Age must be between 0 and 150');
        }

        // Check for duplicate email
        const existingUser = this.users.find(user => 
            user.email.toLowerCase() === userData.email!.toLowerCase()
        );
        if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }

        const newUser: User = {
            id: uuidv4(),
            name: userData.name!.trim(),
            email: userData.email!.toLowerCase().trim(),
            age: userData.age!,
            role: userData.role || 'user',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.users.push(newUser);
        return newUser;
    }

    public async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
        const userIndex = this.users.findIndex(user => user.id === id);
        if (userIndex === -1) {
            throw new NotFoundError('User');
        }

        const currentUser = this.users[userIndex];
        const updatedUser: User = {
            ...currentUser,
            name: userData.name?.trim() ?? currentUser.name,
            email: userData.email?.toLowerCase().trim() ?? currentUser.email,
            age: userData.age ?? currentUser.age,
            role: userData.role ?? currentUser.role,
            isActive: userData.isActive ?? currentUser.isActive,
            updatedAt: new Date()
        };

        this.users[userIndex] = updatedUser;
        return updatedUser;
    }

    public async getUserById(id: string): Promise<User> {
        const user = this.users.find(user => user.id === id);
        if (!user) {
            throw new NotFoundError('User');
        }
        return user;
    }

    public async deleteUser(id: string): Promise<void> {
        const userIndex = this.users.findIndex(user => user.id === id);
        if (userIndex === -1) {
            throw new NotFoundError('User');
        }
        this.users.splice(userIndex, 1);
    }

    public async getAllUsers(filters?: UserFilters): Promise<User[]> {
        let filteredUsers = [...this.users];

        if (filters?.activeOnly) {
            filteredUsers = filteredUsers.filter(user => user.isActive);
        }
        if (filters?.role) {
            filteredUsers = filteredUsers.filter(user => user.role === filters.role);
        }
        if (filters?.minAge !== undefined) {
            filteredUsers = filteredUsers.filter(user => user.age >= filters.minAge!);
        }
        if (filters?.maxAge !== undefined) {
            filteredUsers = filteredUsers.filter(user => user.age <= filters.maxAge!);
        }
        if (filters?.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredUsers = filteredUsers.filter(user =>
                user.name.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm)
            );
        }

        return filteredUsers;
    }

    public async getUserStats(): Promise<UserStats> {
        const total = this.users.length;
        const active = this.users.filter(user => user.isActive).length;
        const inactive = total - active;
        
        const byRole = this.users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const averageAge = total > 0 
            ? Math.round((this.users.reduce((sum, user) => sum + user.age, 0) / total) * 100) / 100
            : 0;

        return { total, active, inactive, byRole, averageAge };
    }

    public async searchUsers(searchTerm: string): Promise<User[]> {
        if (!searchTerm || searchTerm.trim() === '') {
            return [];
        }
        return this.getAllUsers({ search: searchTerm.trim() });
    }

    public async getUsersByRole(role: User['role']): Promise<User[]> {
        return this.users.filter(user => user.role === role);
    }

    public async toggleUserStatus(id: string): Promise<User> {
        const user = await this.getUserById(id);
        return this.updateUser(id, { isActive: !user.isActive });
    }
}

// Export the class as default
export default UserService;