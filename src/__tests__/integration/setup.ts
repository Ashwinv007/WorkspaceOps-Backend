import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Use a replica set (not a standalone server) because:
// - DocumentTypeRepositoryImpl uses mongoose.startSession() + transactions
// - MongoDB transactions require a replica set member
let mongoReplSet: MongoMemoryReplSet;

beforeAll(async () => {
    mongoReplSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(mongoReplSet.getUri());
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoReplSet.stop();
});
