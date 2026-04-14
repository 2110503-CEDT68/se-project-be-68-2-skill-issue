process.env.JWT_SECRET = 'testsecret';
process.env.JWT_EXPIRE = '30d';
process.env.JWT_COOKIE_EXPIRE = '30';
process.env.NODE_ENV = 'development';

// Mock User model
jest.mock('../../models/User');
const User = require('../../models/User');

const { register, login, getMe, logout } = require('../../controllers/auth');

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, user: { id: 'user123' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register user and return token', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Test',
        email: 'test@test.com',
        getSignedJwtToken: jest.fn().mockReturnValue('testtoken123')
      };
      req.body = {
        name: 'Test',
        telephone_number: '0812345678',
        email: 'test@test.com',
        password: 'password123',
        role: 'user'
      };
      User.create.mockResolvedValue(mockUser);

      await register(req, res, next);

      expect(User.create).toHaveBeenCalledWith({
        name: 'Test',
        telephone_number: '0812345678',
        email: 'test@test.com',
        password: 'password123',
        role: 'user'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.cookie).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, token: 'testtoken123' });
    });

    it('should return 400 on error', async () => {
      User.create.mockRejectedValue(new Error('Duplicate email'));
      req.body = { name: 'Test', email: 'dup@test.com', password: '123456' };

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false });
    });
  });

  describe('login', () => {
    it('should return 400 if email is missing', async () => {
      req.body = { password: 'password123' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Please provide an email and password'
      });
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@test.com' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Please provide an email and password'
      });
    });

    it('should return 400 if user not found', async () => {
      req.body = { email: 'notfound@test.com', password: 'password123' };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Invalid credentials'
      });
    });

    it('should return 401 if password does not match', async () => {
      const mockUser = {
        _id: 'user123',
        matchPassword: jest.fn().mockResolvedValue(false)
      };
      req.body = { email: 'test@test.com', password: 'wrongpassword' };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Invalid credentials'
      });
    });

    it('should return token on successful login', async () => {
      const mockUser = {
        _id: 'user123',
        matchPassword: jest.fn().mockResolvedValue(true),
        getSignedJwtToken: jest.fn().mockReturnValue('logintoken123')
      };
      req.body = { email: 'test@test.com', password: 'password123' };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.cookie).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, token: 'logintoken123' });
    });

    it('should return 401 on catch error', async () => {
      req.body = { email: 'test@test.com', password: 'password123' };
      User.findOne.mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('DB error')) });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Cannot convert email or password to str'
      });
    });
  });

  describe('sendTokenResponse - production mode', () => {
    it('should set secure cookie in production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockUser = {
        _id: 'user123',
        name: 'Test',
        email: 'test@test.com',
        getSignedJwtToken: jest.fn().mockReturnValue('prodtoken')
      };
      req.body = {
        name: 'Test',
        telephone_number: '0812345678',
        email: 'test@test.com',
        password: 'password123',
        role: 'user'
      };
      User.create.mockResolvedValue(mockUser);

      await register(req, res, next);

      const cookieCall = res.cookie.mock.calls[0];
      expect(cookieCall[0]).toBe('token');
      expect(cookieCall[2].secure).toBe(true);

      process.env.NODE_ENV = origEnv;
    });
  });

  describe('getMe', () => {
    it('should return current user', async () => {
      const mockUser = { _id: 'user123', name: 'Test', email: 'test@test.com' };
      req.user = { id: 'user123' };
      User.findById.mockResolvedValue(mockUser);

      await getMe(req, res, next);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockUser });
    });
  });

  describe('logout', () => {
    it('should clear token cookie and return success', async () => {
      await logout(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith('token', 'none', expect.objectContaining({
        httpOnly: true
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });
  });
});
