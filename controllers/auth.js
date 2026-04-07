/**
 * @file controllers/auth.js
 * @desc Authentication controllers — register, login, getMe, logout
 */

const User = require('../models/User');

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, telephone_number, email, password, role } = req.body;
    const user = await User.create({ name, telephone_number, email, password, role });
    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false });
    console.log(err.stack);
  }
};

/**
 * @desc    Login user with email and password
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate that both fields are provided
    if (!email || !password) {
      return res.status(400).json({ success: false, msg: 'Please provide an email and password' });
    }

    // Find user by email — password is hidden by default so must explicitly select it
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ success: false, msg: 'Invalid credentials' });
    }

    // Compare entered password against hashed password in DB
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(401).json({ success: false, msg: 'Cannot convert email or password to str' });
  }
};

/**
 * @desc    Create JWT token and send via cookie and response body
 * @param   {Object} user - Mongoose user document
 * @param   {number} statusCode - HTTP status code to respond with
 * @param   {Object} res - Express response object
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true // Prevent client-side JS from accessing the cookie
  };

  // Enable secure flag in production (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({ success: true, token });
};

/**
 * @desc    Get currently logged-in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, data: user });
};

/**
 * @desc    Logout user and clear token cookie
 * @route   GET /api/v1/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, data: {} });
};