/**
 * Unit Tests: middleware/auth.js
 * Tests: protect, authorize
 */

// ── Mock dependencies ──────────────────────────────────────────────────────
jest.mock('jsonwebtoken');
jest.mock('../models/User');

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// ── Helpers ────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
});

beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════
// protect
// ══════════════════════════════════════════════════════════════════════════
describe('protect middleware', () => {
  it('should return 401 when no Authorization header is present', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('should return 401 when token is the string "null"', async () => {
    const req = { headers: { authorization: 'Bearer null' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when JWT verification fails', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    const req = { headers: { authorization: 'Bearer badtoken' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should attach user to req and call next() on valid token', async () => {
    jwt.verify.mockReturnValue({ id: 'user123' });
    User.findById.mockResolvedValue({ _id: 'user123', role: 'user' });

    const req = { headers: { authorization: 'Bearer validtoken' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('validtoken', 'testsecret');
    expect(User.findById).toHaveBeenCalledWith('user123');
    expect(req.user).toEqual({ _id: 'user123', role: 'user' });
    expect(next).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// authorize
// ══════════════════════════════════════════════════════════════════════════
describe('authorize middleware', () => {
  it('should call next() when user role is allowed', () => {
    const req  = { user: { role: 'admin' } };
    const res  = mockRes();
    const next = jest.fn();

    authorize('admin', 'user')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when user role is not in allowed list', () => {
    const req  = { user: { role: 'user' } };
    const res  = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('user') })
    );
  });

  it('should allow access when user has one of multiple allowed roles', () => {
    const req  = { user: { role: 'user' } };
    const res  = mockRes();
    const next = jest.fn();

    authorize('admin', 'user', 'moderator')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
