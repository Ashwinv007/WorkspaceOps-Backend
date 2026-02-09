import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserModel } from './UserModel';

/**
 * User Repository Implementation (Infrastructure Layer)
 * 
 * Implements the IUserRepository interface using Mongoose.
 * Converts between domain entities and Mongoose documents.
 * The application layer doesn't know this exists - it only knows the interface.
 */
export class UserRepositoryImpl implements IUserRepository {
    async findById(id: string): Promise<User | null> {
        const doc = await UserModel.findById(id);
        if (!doc) return null;

        return this.toDomain(doc);
    }

    async findByEmail(email: string): Promise<User | null> {
        const doc = await UserModel.findOne({ email: email.toLowerCase() });
        if (!doc) return null;

        return this.toDomain(doc);
    }

    async save(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
        const doc = await UserModel.create({
            email: user.email,
            passwordHash: user.passwordHash,
            name: user.name
        });

        return this.toDomain(doc);
    }

    async delete(id: string): Promise<void> {
        await UserModel.findByIdAndDelete(id);
    }

    /**
     * Convert Mongoose document to domain entity
     * This is the adapter pattern - adapting database model to domain model
     */
    private toDomain(doc: any): User {
        return new User(
            doc._id.toString(),
            doc.email,
            doc.passwordHash,
            doc.name,
            doc.createdAt,
            doc.updatedAt
        );
    }
}
