import request from 'supertest';
import app from '../../app';
import './setup';

async function signup(email = 'entity-owner@test.com') {
    const res = await request(app).post('/auth/signup')
        .send({ email, password: 'password123', name: 'Owner' });
    return {
        token: res.body.data.token,
        workspaceId: res.body.data.workspaceId,
    };
}

describe('POST /workspaces/:workspaceId/entities', () => {
    it('should create entity successfully', async () => {
        const { token, workspaceId } = await signup();

        const res = await request(app)
            .post(`/workspaces/${workspaceId}/entities`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Acme Corp', role: 'CUSTOMER' });

        expect(res.status).toBe(201);
        // Entity presenter returns a direct object (no success wrapper)
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('workspaceId', workspaceId);
        expect(res.body).toHaveProperty('name', 'Acme Corp');
        expect(res.body).toHaveProperty('role', 'CUSTOMER');
    });

    it('should return 401 when no token provided', async () => {
        const { workspaceId } = await signup('entity-unauth@test.com');
        const res = await request(app)
            .post(`/workspaces/${workspaceId}/entities`)
            .send({ name: 'Acme', role: 'CUSTOMER' });
        expect(res.status).toBe(401);
    });

    it('should return 400 when role is invalid', async () => {
        const { token, workspaceId } = await signup('entity-badrole@test.com');

        const res = await request(app)
            .post(`/workspaces/${workspaceId}/entities`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Acme', role: 'INVALID_ROLE' });

        expect(res.status).toBe(400);
    });
});

describe('GET /workspaces/:workspaceId/entities', () => {
    it('should return entity list', async () => {
        const { token, workspaceId } = await signup('entity-list@test.com');

        // Create one entity first
        await request(app)
            .post(`/workspaces/${workspaceId}/entities`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Acme Corp', role: 'CUSTOMER' });

        const res = await request(app)
            .get(`/workspaces/${workspaceId}/entities`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('entities');
        expect(Array.isArray(res.body.entities)).toBe(true);
        expect(res.body.entities.length).toBeGreaterThan(0);
        expect(res.body).toHaveProperty('count');
    });
});

describe('GET /workspaces/:workspaceId/entities/:id', () => {
    it('should return a single entity by id', async () => {
        const { token, workspaceId } = await signup('entity-get@test.com');

        const createRes = await request(app)
            .post(`/workspaces/${workspaceId}/entities`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Vendor Co', role: 'VENDOR' });

        const entityId = createRes.body.id;

        const res = await request(app)
            .get(`/workspaces/${workspaceId}/entities/${entityId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(entityId);
        expect(res.body.name).toBe('Vendor Co');
    });

    it('should return 404 for non-existent entity', async () => {
        const { token, workspaceId } = await signup('entity-404@test.com');

        const res = await request(app)
            .get(`/workspaces/${workspaceId}/entities/507f1f77bcf86cd799439099`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });
});

describe('DELETE /workspaces/:workspaceId/entities/:id', () => {
    it('should delete entity and return 204', async () => {
        const { token, workspaceId } = await signup('entity-del@test.com');

        const createRes = await request(app)
            .post(`/workspaces/${workspaceId}/entities`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'To Delete', role: 'VENDOR' });

        const entityId = createRes.body.id;

        const res = await request(app)
            .delete(`/workspaces/${workspaceId}/entities/${entityId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(204);
    });
});
