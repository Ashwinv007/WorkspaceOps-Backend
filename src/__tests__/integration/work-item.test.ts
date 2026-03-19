import request from 'supertest';
import app from '../../app';
import './setup';

// Helper: sign up, create a work item type + entity, return everything needed
async function setupWorkspace(email = 'wi-owner@test.com') {
    const signupRes = await request(app).post('/auth/signup')
        .send({ email, password: 'password123', name: 'Owner' });
    const token = signupRes.body.data.token;
    const workspaceId = signupRes.body.data.workspaceId;

    // Create a work item type (requires Admin/Owner)
    const typeRes = await request(app)
        .post(`/workspaces/${workspaceId}/work-item-types`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bug Fix' });
    const workItemTypeId = typeRes.body.id;

    // Create an entity (a CUSTOMER to assign work items to)
    const entityRes = await request(app)
        .post(`/workspaces/${workspaceId}/entities`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme Corp', role: 'CUSTOMER' });
    const entityId = entityRes.body.id;

    return { token, workspaceId, workItemTypeId, entityId };
}

describe('POST /workspaces/:workspaceId/work-item-types', () => {
    it('should create a work item type successfully', async () => {
        const signupRes = await request(app).post('/auth/signup')
            .send({ email: 'wit-create@test.com', password: 'password123', name: 'Owner' });
        const { token, workspaceId } = { token: signupRes.body.data.token, workspaceId: signupRes.body.data.workspaceId };

        const res = await request(app)
            .post(`/workspaces/${workspaceId}/work-item-types`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Bug Fix', description: 'Bug tracking type' });

        expect(res.status).toBe(201);
        // WorkItemPresenter returns direct object (no success wrapper)
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Bug Fix');
        expect(res.body.workspaceId).toBe(workspaceId);
    });

    it('should return 401 when no token provided', async () => {
        const signupRes = await request(app).post('/auth/signup')
            .send({ email: 'wit-unauth@test.com', password: 'password123', name: 'Owner' });
        const workspaceId = signupRes.body.data.workspaceId;

        const res = await request(app)
            .post(`/workspaces/${workspaceId}/work-item-types`)
            .send({ name: 'Bug Fix' });
        expect(res.status).toBe(401);
    });
});

describe('GET /workspaces/:workspaceId/work-item-types', () => {
    it('should return list of work item types', async () => {
        const { token, workspaceId } = await setupWorkspace('wit-list@test.com');

        const res = await request(app)
            .get(`/workspaces/${workspaceId}/work-item-types`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('workItemTypes');
        expect(Array.isArray(res.body.workItemTypes)).toBe(true);
        expect(res.body).toHaveProperty('count');
    });
});

describe('POST /workspaces/:workspaceId/work-items', () => {
    it('should create a work item in DRAFT status', async () => {
        const { token, workspaceId, workItemTypeId, entityId } = await setupWorkspace('wi-create@test.com');

        const res = await request(app)
            .post(`/workspaces/${workspaceId}/work-items`)
            .set('Authorization', `Bearer ${token}`)
            .send({ workItemTypeId, entityId, title: 'Fix login bug' });

        expect(res.status).toBe(201);
        // WorkItemPresenter returns direct object (no success wrapper)
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe('Fix login bug');
        expect(res.body.status).toBe('DRAFT');
        expect(res.body.workspaceId).toBe(workspaceId);
    });

    it('should return 401 when no token provided', async () => {
        const { workspaceId, workItemTypeId, entityId } = await setupWorkspace('wi-unauth@test.com');

        const res = await request(app)
            .post(`/workspaces/${workspaceId}/work-items`)
            .send({ workItemTypeId, entityId, title: 'Fix bug' });
        expect(res.status).toBe(401);
    });
});

describe('GET /workspaces/:workspaceId/work-items', () => {
    it('should return list of work items', async () => {
        const { token, workspaceId, workItemTypeId, entityId } = await setupWorkspace('wi-list@test.com');

        // Create a work item first
        await request(app)
            .post(`/workspaces/${workspaceId}/work-items`)
            .set('Authorization', `Bearer ${token}`)
            .send({ workItemTypeId, entityId, title: 'Fix login bug' });

        const res = await request(app)
            .get(`/workspaces/${workspaceId}/work-items`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('workItems');
        expect(Array.isArray(res.body.workItems)).toBe(true);
        expect(res.body.workItems.length).toBeGreaterThan(0);
        expect(res.body).toHaveProperty('count');
    });
});

describe('PATCH /workspaces/:workspaceId/work-items/:id/status', () => {
    it('should transition work item from DRAFT to ACTIVE', async () => {
        const { token, workspaceId, workItemTypeId, entityId } = await setupWorkspace('wi-status@test.com');

        const createRes = await request(app)
            .post(`/workspaces/${workspaceId}/work-items`)
            .set('Authorization', `Bearer ${token}`)
            .send({ workItemTypeId, entityId, title: 'Status test item' });

        const workItemId = createRes.body.id;

        const res = await request(app)
            .patch(`/workspaces/${workspaceId}/work-items/${workItemId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'ACTIVE' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ACTIVE');
    });

    it('should return 400 for blocked transition DRAFT → COMPLETED', async () => {
        const { token, workspaceId, workItemTypeId, entityId } = await setupWorkspace('wi-blocked@test.com');

        const createRes = await request(app)
            .post(`/workspaces/${workspaceId}/work-items`)
            .set('Authorization', `Bearer ${token}`)
            .send({ workItemTypeId, entityId, title: 'Blocked transition item' });

        const workItemId = createRes.body.id;

        const res = await request(app)
            .patch(`/workspaces/${workspaceId}/work-items/${workItemId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'COMPLETED' });

        expect(res.status).toBe(400);
    });
});
