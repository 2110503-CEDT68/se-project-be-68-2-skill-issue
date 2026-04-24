/**
 * @file controllers/companies.js
 * @desc CRUD operations for Company — supports filtering, sorting, and pagination
 */

const Company = require('../models/Company.js');
const Booking = require('../models/Booking.js');
const Review  = require('../models/Review.js');

/**
 * @desc    Get all companies with optional filter, sort, and pagination
 * @route   GET /api/v1/companies
 * @access  Public
 */
exports.getCompanies = async (req, res, next) => {
  let query;

  // Copy query and remove reserved pagination/selection fields
  const reqQuery = { ...req.query };
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);

  // Convert comparison operators to MongoDB syntax (e.g. gt → $gt)
  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  query = Company.find(JSON.parse(queryStr)).populate('bookings');

  // Select specific fields if requested
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort results — default to newest first
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  try {
    const total = await Company.countDocuments();
    query = query.skip(startIndex).limit(limit);
    const companies = await query;

    // Build pagination metadata
    const pagination = {};
    if (endIndex < total) pagination.next = { page: page + 1, limit };
    if (startIndex > 0) pagination.prev = { page: page - 1, limit };

    res.status(200).json({ success: true, count: companies.length, pagination, data: companies });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

/**
 * @desc    Get a single company by ID
 * @route   GET /api/v1/companies/:id
 * @access  Public
 */
exports.getCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(400).json({ success: false });
    }
    res.status(200).json({ success: true, data: company });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

/**
 * @desc    Create a new company
 * @route   POST /api/v1/companies
 * @access  Private (admin only)
 */
exports.createCompany = async (req, res, next) => {
  try {
    if (typeof req.body.name        === 'string') req.body.name        = req.body.name.trim();
    if (typeof req.body.address     === 'string') req.body.address     = req.body.address.trim();
    if (typeof req.body.website     === 'string') req.body.website     = req.body.website.trim();
    if (typeof req.body.description === 'string') req.body.description = req.body.description.trim();
    if (typeof req.body.telephone_number === 'string') req.body.telephone_number = req.body.telephone_number.trim();
    
    const company = await Company.create(req.body);
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Update a company by ID
 * @route   PUT /api/v1/companies/:id
 * @access  Private (admin only)
 */
exports.updateCompany = async (req, res, next) => {
  try {
    if (typeof req.body.name        === 'string') req.body.name        = req.body.name.trim();
    if (typeof req.body.address     === 'string') req.body.address     = req.body.address.trim();
    if (typeof req.body.website     === 'string') req.body.website     = req.body.website.trim();
    if (typeof req.body.description === 'string') req.body.description = req.body.description.trim();
    if (typeof req.body.telephone_number === 'string') req.body.telephone_number = req.body.telephone_number.trim();

    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!company) {
      return res.status(400).json({ success: false });
    }
    res.status(200).json({ success: true, data: company });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};

/**
 * @desc    Delete a company by ID — also removes all associated bookings
 * @route   DELETE /api/v1/companies/:id
 * @access  Private (admin only)
 */
exports.deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(400).json({ success: false, message: 'Company not found' });
    }

    // Cascade delete all bookings belonging to this company
    await Booking.deleteMany({ company: req.params.id });
    await Review.deleteMany({ company: req.params.id });
    await company.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: 'Delete failed due to server error' });
  }
};