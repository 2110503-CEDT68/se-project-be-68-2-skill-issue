const express = require('express');

describe('Auth Routes', () => {
  let router;

  beforeAll(() => {
    // Mock the middleware and controllers before requiring routes
    jest.mock('../../middleware/auth', () => ({
      protect: jest.fn((req, res, next) => next()),
      authorize: jest.fn((...roles) => (req, res, next) => next())
    }));

    jest.mock('../../controllers/auth', () => ({
      register: jest.fn((req, res) => res.status(200).json({ success: true })),
      login: jest.fn((req, res) => res.status(200).json({ success: true })),
      getMe: jest.fn((req, res) => res.status(200).json({ success: true })),
      logout: jest.fn((req, res) => res.status(200).json({ success: true }))
    }));

    router = require('../../routes/auth');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should be an express router', () => {
    expect(router).toBeDefined();
    // Check that it has stack (routes)
    expect(router.stack).toBeDefined();
  });

  it('should have POST /register route', () => {
    const registerRoute = router.stack.find(
      layer => layer.route && layer.route.path === '/register' && layer.route.methods.post
    );
    expect(registerRoute).toBeDefined();
  });

  it('should have POST /login route', () => {
    const loginRoute = router.stack.find(
      layer => layer.route && layer.route.path === '/login' && layer.route.methods.post
    );
    expect(loginRoute).toBeDefined();
  });

  it('should have GET /me route', () => {
    const meRoute = router.stack.find(
      layer => layer.route && layer.route.path === '/me' && layer.route.methods.get
    );
    expect(meRoute).toBeDefined();
  });

  it('should have GET /logout route', () => {
    const logoutRoute = router.stack.find(
      layer => layer.route && layer.route.path === '/logout' && layer.route.methods.get
    );
    expect(logoutRoute).toBeDefined();
  });
});
