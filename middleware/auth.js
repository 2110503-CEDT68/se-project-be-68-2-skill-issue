/**
 * @file middleware/auth.js
 * @desc Middleware for JWT verification and role-based access control
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @desc    Protect routes — verifies JWT token from Authorization header
 * @access  Private
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check Authorization header (Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || token === 'null') {
    return res.status(401).json({ success: false, message: 'Not authorize to access this route' });
  }

  try {
    // Verify token and attach user to request
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    console.log(err.stack);
    return res.status(401).json({ success: false, message: 'Not authorize to access this route' });
  }
};

/**
 * @desc    Restrict access to specific roles
 * @param   {...string} roles - Allowed roles (e.g. 'admin', 'user')
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};