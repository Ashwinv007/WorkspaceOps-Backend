import request from 'supertest';
import app from '../../app';
import './setup';

const SIGNUP_URL = '/auth/signup';
const LOGIN_URL  = '/auth/login';

describe('POST /auth/signup', () => {
    it('should create user and return token', async () => {
        const res = await request(app).post(SIGNUP_URL)
            .send({ email: 'user@test.com', password: 'password123', name: 'Test User' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('token');
        expect(res.body.data).toHaveProperty('userId');
        expect(res.body.data).toHaveProperty('workspaceId');
    });

    it('should return 400 when email is already registered', async () => {
        await request(app).post(SIGNUP_URL)
            .send({ email: 'dup@test.com', password: 'password123', name: 'User' });

        const res = await request(app).post(SIGNUP_URL)
            .send({ email: 'dup@test.com', password: 'password123', name: 'User' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe('POST /auth/login', () => {
    beforeEach(async () => {
        await request(app).post(SIGNUP_URL)
            .send({ email: 'login@test.com', password: 'password123', name: 'Login User' });
    });

    it('should return userId and token on valid credentials', async () => {
        const res = await request(app).post(LOGIN_URL)
            .send({ email: 'login@test.com', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('token');
        expect(res.body.data).toHaveProperty('userId');
    });

    it('should return 401 when email is not registered', async () => {
        const res = await request(app).post(LOGIN_URL)
            .send({ email: 'nobody@test.com', password: 'password123' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('should return 401 when password is wrong', async () => {
        const res = await request(app).post(LOGIN_URL)
            .send({ email: 'login@test.com', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});
