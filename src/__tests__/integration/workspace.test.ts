import request from 'supertest';
import app from '../../app';
import './setup';

// Helper: sign up and return token + workspaceId
// After signup, user is automatically OWNER of their default workspace
async function signup(email = 'owner@test.com') {
    const res = await request(app).post('/auth/signup')
        .send({ email, password: 'password123', name: 'Owner' });
    return {
        token: res.body.data.token,
        workspaceId: res.body.data.workspaceId,
        userId: res.body.data.userId,
    };
}

describe('GET /workspaces', () => {
    it('should return list of workspaces for authenticated user', async () => {
        const { token } = await signup();

        const res = await request(app).get('/workspaces')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return 401 when no token provided', async () => {
        const res = await request(app).get('/workspaces');
        expect(res.status).toBe(401);
    });
});

describe('POST /workspaces', () => {
    it('should create an additional workspace for authenticated user', async () => {
        const { token } = await signup();

        // Get tenantId from the existing workspace (signup response only returns workspaceId)
        const listRes = await request(app).get('/workspaces')
            .set('Authorization', `Bearer ${token}`);
        const tenantId = listRes.body.data[0].tenantId;

        const res = await request(app).post('/workspaces')
            .set('Authorization', `Bearer ${token}`)
            .send({ tenantId, name: 'Second Workspace' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.name).toBe('Second Workspace');
    });
});

describe('GET /workspaces/:id/members', () => {
    it('should return members list for workspace owner', async () => {
        const { token, workspaceId } = await signup();

        const res = await request(app).get(`/workspaces/${workspaceId}/members`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.members)).toBe(true);
        expect(res.body.members.length).toBeGreaterThan(0);
        // Owner should be in members list
        expect(res.body.members[0]).toHaveProperty('role', 'OWNER');
    });

    it('should return 401 when no token provided', async () => {
        const { workspaceId } = await signup('member2@test.com');
        const res = await request(app).get(`/workspaces/${workspaceId}/members`);
        expect(res.status).toBe(401);
    });
});

describe('POST /workspaces/:id/members (invite)', () => {
    it('should invite a registered user to workspace', async () => {
        const { token, workspaceId } = await signup('inviter@test.com');
        // Create the user to be invited
        await request(app).post('/auth/signup')
            .send({ email: 'invitee@test.com', password: 'password123', name: 'Invitee' });

        const res = await request(app).post(`/workspaces/${workspaceId}/members`)
            .set('Authorization', `Bearer ${token}`)
            .send({ invitedEmail: 'invitee@test.com', role: 'MEMBER' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('role', 'MEMBER');
    });

    it('should return 404 when inviting an unregistered email', async () => {
        const { token, workspaceId } = await signup('owner3@test.com');

        const res = await request(app).post(`/workspaces/${workspaceId}/members`)
            .set('Authorization', `Bearer ${token}`)
            .send({ invitedEmail: 'nobody@test.com', role: 'MEMBER' });

        expect(res.status).toBe(404);
    });
});
