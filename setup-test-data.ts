/**
 * Test Data Setup Script
 * 
 * Creates test users with different roles and outputs their tokens and IDs
 * for use in API testing.
 * 
 * Usage: npx ts-node setup-test-data.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

// Simple interfaces for our models
interface IUser {
    _id: any;
    email: string;
    passwordHash: string;
    name?: string;
}

interface ITenant {
    _id: any;
    name: string;
}

interface IWorkspace {
    _id: any;
    tenantId: string;
    name: string;
}

interface IWorkspaceMember {
    _id: any;
    workspaceId: string;
    userId: string;
    role: string;
}

// Define schemas
const { Schema, model } = mongoose;

const UserModel = model('User', new Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String }
}, { timestamps: true }));

const TenantModel = model('Tenant', new Schema({
    name: { type: String, required: true }
}, { timestamps: true }));

const WorkspaceModel = model('Workspace', new Schema({
    tenantId: { type: String, required: true },
    name: { type: String, required: true }
}, { timestamps: true }));

const WorkspaceMemberModel = model('WorkspaceMember', new Schema({
    workspaceId: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, required: true, enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] }
}, { timestamps: true }));

interface TestUser {
    email: string;
    password: string;
    name: string;
    role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

const testUsers: TestUser[] = [
    {
        email: 'owner@example.com',
        password: 'password123',
        name: 'Owner User',
        role: 'OWNER'
    },
    {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'ADMIN'
    },
    {
        email: 'member@example.com',
        password: 'password123',
        name: 'Member User',
        role: 'MEMBER'
    },
    {
        email: 'viewer@example.com',
        password: 'password123',
        name: 'Viewer User',
        role: 'VIEWER'
    }
];

async function setupTestData() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/workspaceops';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Clean up existing test users
        const testEmails = testUsers.map(u => u.email);
        await UserModel.deleteMany({ email: { $in: testEmails } });
        console.log('🧹 Cleaned up existing test users');

        const results: any[] = [];
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

        // Create users
        for (const testUser of testUsers) {
            const hashedPassword = await bcrypt.hash(testUser.password, 10);

            // Create user
            const userDoc = await UserModel.create({
                email: testUser.email,
                passwordHash: hashedPassword,
                name: testUser.name
            }) as any;

            // Create tenant for user
            const tenantDoc = await TenantModel.create({
                name: `${testUser.name}'s Tenant`
            }) as any;

            // Create default workspace
            const workspaceDoc = await WorkspaceModel.create({
                tenantId: tenantDoc._id.toString(),
                name: 'Default Workspace'
            }) as any;

            // Create workspace membership
            await WorkspaceMemberModel.create({
                workspaceId: workspaceDoc._id.toString(),
                userId: userDoc._id.toString(),
                role: testUser.role || 'OWNER'
            });

            // Generate token
            const token = jwt.sign(
                { userId: userDoc._id.toString(), email: userDoc.email },
                jwtSecret,
                { expiresIn: '24h' }
            );

            results.push({
                email: testUser.email,
                userId: userDoc._id.toString(),
                tenantId: tenantDoc._id.toString(),
                workspaceId: workspaceDoc._id.toString(),
                role: testUser.role || 'OWNER',
                token
            });

            console.log(`✅ Created user: ${testUser.email}`);
        }

        // Create a shared workspace for testing member operations
        const ownerResult = results.find(r => r.email === 'owner@example.com');
        if (ownerResult) {
            const sharedWorkspace = await WorkspaceModel.create({
                tenantId: ownerResult.tenantId,
                name: 'Shared Test Workspace'
            }) as any;

            // Add owner as OWNER
            const ownerMembership = await WorkspaceMemberModel.create({
                workspaceId: sharedWorkspace._id.toString(),
                userId: ownerResult.userId,
                role: 'OWNER'
            }) as any;

            console.log(`✅ Created shared workspace: ${sharedWorkspace._id}`);
            console.log(`✅ Added owner to shared workspace`);

            // Add admin user as ADMIN
            const adminResult = results.find(r => r.email === 'admin@example.com');
            if (adminResult) {
                await WorkspaceMemberModel.create({
                    workspaceId: sharedWorkspace._id.toString(),
                    userId: adminResult.userId,
                    role: 'ADMIN'
                });
                console.log(`✅ Added admin to shared workspace`);
            }

            // Add member user as MEMBER
            const memberResult = results.find(r => r.email === 'member@example.com');
            if (memberResult) {
                await WorkspaceMemberModel.create({
                    workspaceId: sharedWorkspace._id.toString(),
                    userId: memberResult.userId,
                    role: 'MEMBER'
                });
                console.log(`✅ Added member to shared workspace`);
            }

            // Store shared workspace info
            results.push({
                type: 'shared_workspace',
                workspaceId: sharedWorkspace._id.toString(),
                tenantId: ownerResult.tenantId,
                ownerMembershipId: ownerMembership._id.toString()
            });
        }

        // Print results
        console.log('\n' + '='.repeat(80));
        console.log('TEST DATA SETUP COMPLETE');
        console.log('='.repeat(80));
        console.log('\nCopy these values to your test files:\n');

        results.forEach(result => {
            if (result.type === 'shared_workspace') {
                console.log(`# Shared Workspace for Testing`);
                console.log(`SHARED_WORKSPACE_ID="${result.workspaceId}"`);
                console.log(`OWNER_MEMBERSHIP_ID="${result.ownerMembershipId}"`);
                console.log('');
            } else {
                console.log(`# ${result.email} (${result.role})`);
                console.log(`${result.role}_USER_ID="${result.userId}"`);
                console.log(`${result.role}_TENANT_ID="${result.tenantId}"`);
                console.log(`${result.role}_WORKSPACE_ID="${result.workspaceId}"`);
                console.log(`${result.role}_TOKEN="${result.token}"`);
                console.log('');
            }
        });

        console.log('='.repeat(80));
        console.log('\nTest users credentials (all use password: password123):');
        testUsers.forEach(u => console.log(`  - ${u.email}`));
        console.log('');

    } catch (error) {
        console.error('❌ Error setting up test data:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run the setup
setupTestData();
