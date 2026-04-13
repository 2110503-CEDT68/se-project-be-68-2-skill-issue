/**
 * Unit Tests: controllers/auth.js
 * Tests: register, login, getMe, logout
 */

// ── Mock dependencies ──────────────────────────────────────────────────────
jest.mock('../models/User');

const User = require('../models/User');
const { register, login, getMe, logout } = require('../controllers/auth');

// ── Helpers ────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

const mockUser = {
  _id: 'user123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  getSignedJwtToken: jest.fn().mockReturnValue('mock.jwt.token'),
  matchPassword: jest.fn(),
};

// ── Environment Setup ──────────────────────────────────────────────────────
beforeAll(() => {
  process.env.JWT_SECRET       = 'testsecret';
  process.env.JWT_EXPIRE       = '30d';
  process.env.JWT_COOKIE_EXPIRE = '30';
  process.env.NODE_ENV         = 'test';
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════
// register
// ══════════════════════════════════════════════════════════════════════════
describe('register', () => {
  it('should create a user and return token with status 200', async () => {
    User.create.mockResolvedValue(mockUser);

    const req = {
      body: {
        name: 'Test User',
        telephone_number: '0812345678',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      },
    };
    const res = mockRes();

    await register(req, res);

    expect(User.create).toHaveBeenCalledWith({
      name: 'Test User',
      telephone_number: '0812345678',
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, token: 'mock.jwt.token' })
    );
  });

  it('should return 400 when User.create throws an error', async () => {
    User.create.mockRejectedValue(new Error('Duplicate email'));

    const req = { body: { email: 'dup@example.com', password: '123456' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// login
// ══════════════════════════════════════════════════════════════════════════
describe('login', () => {
  it('should return 400 when email is missing', async () => {
    const req = { body: { password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, msg: 'Please provide an email and password' })
    );
  });

  it('should return 400 when password is missing', async () => {
    const req = { body: { email: 'test@example.com' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, msg: 'Please provide an email and password' })
    );
  });

  it('should return 400 when user is not found', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const req = { body: { email: 'nobody@example.com', password: 'pass' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, msg: 'Invalid credentials' })
    );
  });

  it('should return 401 when password does not match', async () => {
    const userWithBadPwd = { ...mockUser, matchPassword: jest.fn().mockResolvedValue(false) };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(userWithBadPwd) });

    const req = { body: { email: 'test@example.com', password: 'wrongpass' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, msg: 'Invalid credentials' })
    );
  });

  it('should return token and status 200 on successful login', async () => {
    const validUser = { ...mockUser, matchPassword: jest.fn().mockResolvedValue(true) };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(validUser) });

    const req = { body: { email: 'test@example.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, token: 'mock.jwt.token' })
    );
  });

  it('should return 401 when an unexpected error occurs', async () => {
    User.findOne.mockImplementation(() => { throw new Error('DB Error'); });

    const req = { body: { email: 'test@example.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when an error is thrown in the catch block (line 71)', async () => {
    User.findOne.mockImplementationOnce(() => {
      throw new Error('Database Error');
    });

    const req = { body: { email: 'test@example.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false, 
      msg: 'Cannot convert email or password to str'
    });
  });
});

describe('login error handling', () => {
  it('should return 401 when an error is thrown during login (line 71)', async () => {
    // Correctly mock the asynchronous rejection of the Mongoose chain
    User.findOne.mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('Database connection failed'))
    });

    const req = { body: { email: 'test@example.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, msg: 'Cannot convert email or password to str' })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// getMe
// ══════════════════════════════════════════════════════════════════════════
describe('getMe', () => {
  it('should return the currently logged-in user', async () => {
    User.findById.mockResolvedValue(mockUser);

    const req = { user: { id: 'user123' } };
    const res = mockRes();

    await getMe(req, res);

    expect(User.findById).toHaveBeenCalledWith('user123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockUser });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// logout
// ══════════════════════════════════════════════════════════════════════════
describe('logout', () => {
  it('should clear the token cookie and respond with success', async () => {
    const req = {};
    const res = mockRes();

    await logout(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'token',
      'none',
      expect.objectContaining({ httpOnly: true })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
  });
});
