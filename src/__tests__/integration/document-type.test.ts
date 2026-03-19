import request from 'supertest';
import app from '../../app';
import './setup';

async function signup(email = 'doctype-owner@test.com') {
    const res = await request(app).post('/auth/signup')
        .send({ email, password: 'password123', name: 'Owner' });
    return {
        token: res.body.data.token,
        workspaceId: res.body.data.workspaceId,
    };
}

describe('POST /workspaces/:workspaceId/document-types', () => {
    it('should create a document type successfully', async () => {
        const { token, workspaceId } = await signup();

        const res = await request(app)
            .post(`/workspaces/${workspaceId}/document-types`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Invoice', hasMetadata: false, hasExpiry: false });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.name).toBe('Invoice');
        expect(res.body.data.hasMetadata).toBe(false);
    });

    it('should return 401 when no token provided', async () => {
        const { workspaceId } = await signup('doctype-unauth@test.com');
        const res = await request(app)
            .post(`/workspaces/${workspaceId}/document-types`)
            .send({ name: 'Invoice', hasMetadata: false, hasExpiry: false });
        expect(res.status).toBe(401);
    });

    it('should return 400 when hasMetadata=true but no fields provided', async () => {
        const { token, workspaceId } = await signup('doctype-validation@test.com');

        const res = await request(app)
            .post(`/workspaces/${workspaceId}/document-types`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'With Metadata', hasMetadata: true, hasExpiry: false, fields: [] });

        expect(res.status).toBe(400);
    });
});

describe('GET /workspaces/:workspaceId/document-types', () => {
    it('should return list of document types', async () => {
        const { token, workspaceId } = await signup('doctype-list@test.com');

        await request(app)
            .post(`/workspaces/${workspaceId}/document-types`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Invoice', hasMetadata: false, hasExpiry: false });

        const res = await request(app)
            .get(`/workspaces/${workspaceId}/document-types`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });
});

describe('DELETE /workspaces/:workspaceId/document-types/:id', () => {
    it('should delete document type and return 204', async () => {
        const { token, workspaceId } = await signup('doctype-del@test.com');

        const createRes = await request(app)
            .post(`/workspaces/${workspaceId}/document-types`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'To Delete', hasMetadata: false, hasExpiry: false });

        const docTypeId = createRes.body.data.id;

        const res = await request(app)
            .delete(`/workspaces/${workspaceId}/document-types/${docTypeId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(204);
    });
});
