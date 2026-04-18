// @ts-check
import { test, expect } from '@playwright/test';

const uniqueEmail = `playwright_${Date.now()}@test.com`;
let userToken = '';
let blogId = '';
let commentId = '';

test.describe.serial('Blog & Comment API Tests', () => {

  // ─── Auth ───────────────────────────────────────────────
  test('Register a new user', async ({ request }) => {
    const res = await request.post('/api/v1/auth/register', {
      data: {
        name: 'Playwright User',
        telephone_number: '0899999999',
        email: uniqueEmail,
        password: 'password123',
        role: 'user',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    userToken = body.token;
  });

  test('Login as user', async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { email: uniqueEmail, password: 'password123' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    userToken = body.token;
  });

  // ─── Blog POST ──────────────────────────────────────────
  test('Create a blog successfully', async ({ request }) => {
    const res = await request.post('/api/v1/blogs', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { title: 'Playwright Blog', content: 'Test content' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('title', 'Playwright Blog');
    expect(body.data).toHaveProperty('content', 'Test content');
    blogId = body.data._id;
  });

  test('Create blog without title returns 400', async ({ request }) => {
    const res = await request.post('/api/v1/blogs', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { content: 'No title' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Title and Content');
  });

  test('Create blog without content returns 400', async ({ request }) => {
    const res = await request.post('/api/v1/blogs', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { title: 'No content' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Title and Content');
  });

  test('Create blog with title over 50 chars returns 400', async ({ request }) => {
    const res = await request.post('/api/v1/blogs', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { title: 'a'.repeat(51), content: 'Valid' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Character limit exceeded at title');
  });

  test('Create blog with content over 50 chars returns 400', async ({ request }) => {
    const res = await request.post('/api/v1/blogs', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { title: 'Valid', content: 'a'.repeat(51) },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Character limit exceeded at content');
  });

  // ─── Blog GET ───────────────────────────────────────────
  test('Get all blogs', async ({ request }) => {
    const res = await request.get('/api/v1/blogs');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('Get single blog by ID', async ({ request }) => {
    const res = await request.get(`/api/v1/blogs/${blogId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('title', 'Playwright Blog');
  });

  test('Get non-existent blog returns 404', async ({ request }) => {
    const res = await request.get('/api/v1/blogs/000000000000000000000000');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ─── Comment POST ──────────────────────────────────────
  test('Create a comment successfully', async ({ request }) => {
    const res = await request.post(`/api/v1/blogs/${blogId}/comments`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { text: 'Great blog post!' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('text', 'Great blog post!');
    commentId = body.data._id;
  });

  test('Create comment without text returns 400', async ({ request }) => {
    const res = await request.post(`/api/v1/blogs/${blogId}/comments`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Please enter text');
  });

  test('Create comment over 100 chars returns 400', async ({ request }) => {
    const res = await request.post(`/api/v1/blogs/${blogId}/comments`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { text: 'a'.repeat(101) },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Character limit exceeded');
  });

  // ─── Comment GET ────────────────────────────────────────
  test('Get comments for a blog', async ({ request }) => {
    const res = await request.get(`/api/v1/blogs/${blogId}/comments`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    expect(Array.isArray(body.data)).toBe(true);
  });

  // ─── Auth: Unauthorized ─────────────────────────────────
  test('Create blog without token returns 401', async ({ request }) => {
    const res = await request.post('/api/v1/blogs', {
      data: { title: 'No Auth', content: 'Should fail' },
    });
    expect(res.status()).toBe(401);
  });

  test('Create comment without token returns 401', async ({ request }) => {
    const res = await request.post(`/api/v1/blogs/${blogId}/comments`, {
      data: { text: 'No auth comment' },
    });
    expect(res.status()).toBe(401);
  });
});
