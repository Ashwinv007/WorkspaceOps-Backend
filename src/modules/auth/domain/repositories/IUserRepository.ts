import { User } from '../entities/User';

/**
 * User Repository Interface (Domain Layer Contract)
 * 
 * Defines the contract for user data access.
 * The infrastructure layer will implement this interface.
 * This allows the domain/application layers to be independent of database technology.
 */
export interface IUserRepository {
    /**
     * Find user by unique identifier
     */
    findById(id: string): Promise<User | null>;

    /**
     * Find user by email address
     */
    findByEmail(email: string): Promise<User | null>;

    /**
     * Save a new user or update existing user
     * Returns the saved user with generated ID and timestamps
     */
    save(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;

    /**
     * Delete user by ID
     */
    delete(id: string): Promise<void>;
}
