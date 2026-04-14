const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'testsecret';

// Mock User model
jest.mock('../../models/User', () => {
  return {
    findById: jest.fn()
  };
});

const User = require('../../models/User');
const { protect, authorize } = require('../../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('protect', () => {
    it('should return 401 if no token provided', async () => {
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorize to access this route'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is null string', async () => {
      req.headers.authorization = 'Bearer null';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if no authorization header', async () => {
      req.headers = {};
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next and set req.user for valid token', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      const mockUser = { _id: userId, name: 'Test', role: 'user' };
      User.findById.mockResolvedValue(mockUser);

      await protect(req, res, next);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 for invalid/expired token', async () => {
      req.headers.authorization = 'Bearer invalidtoken123';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorize to access this route'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Basic sometoken';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should call next if user role is in allowed roles', () => {
      req.user = { role: 'admin' };

      const middleware = authorize('admin', 'user');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user role is not in allowed roles', () => {
      req.user = { role: 'user' };

      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User role user is not authorized to access this route'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should work with single role', () => {
      req.user = { role: 'user' };

      const middleware = authorize('user');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
