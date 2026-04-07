/**
 * @file controllers/bookings.js
 * @desc CRUD operations for Booking — role-based access and date validation
 */

const Booking = require('../models/Booking');
const Company = require('../models/Company');

// Allowed booking date range (Job Fair: May 10–13, 2022)
const MIN_DATE = new Date('2022-05-10T00:00:00Z');
const MAX_DATE = new Date('2022-05-13T23:59:59Z');

// Maximum number of bookings allowed per user
const MAX_BOOKINGS_PER_USER = 3;

/**
 * @desc    Get all bookings — admin sees all, user sees only their own
 * @route   GET /api/v1/bookings
 * @route   GET /api/v1/companies/:id/bookings
 * @access  Private
 */
exports.getBookings = async (req, res, next) => {
  let query;

  if (req.user.role !== 'admin') {
    // Regular user — only fetch their own bookings
    query = Booking.find({ user: req.user.id })
      .populate({ path: 'company', select: 'name address telephone_number website description' })
      .populate({ path: 'user', select: 'name email' });
  } else {
    if (req.params.id) {
      // Admin accessing via /companies/:id/bookings — filter by company
      query = Booking.find({ company: req.params.id })
        .populate({ path: 'company', select: 'name address telephone_number website description' })
        .populate({ path: 'user', select: 'name email' });
    } else {
      // Admin accessing /bookings — return all bookings
      query = Booking.find()
        .populate({ path: 'company', select: 'name address telephone_number website description' })
        .populate({ path: 'user', select: 'name email' });
    }
  }

  try {
    const bookings = await query;
    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Cannot find Bookings' });
  }
};

/**
 * @desc    Get a single booking by ID
 * @route   GET /api/v1/bookings/:id
 * @access  Private
 */
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'company', select: 'name address telephone_number website description' })
      .populate({ path: 'user', select: 'name email' });

    if (!booking) {
      return res.status(404).json({ success: false, message: `No booking with the id of ${req.params.id}` });
    }

    // Only the booking owner or admin can view this booking
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to view this booking` });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Cannot find Booking' });
  }
};

/**
 * @desc    Create a new booking under a specific company
 * @route   POST /api/v1/companies/:id/bookings
 * @access  Private
 */
exports.addBooking = async (req, res, next) => {
  try {
    req.body.user = req.user.id;
    req.body.company = req.params.id;

    // Validate bookingDate format
    if (!req.body.bookingDate || isNaN(Date.parse(req.body.bookingDate))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking date format. Please provide a valid ISO 8601 date string.',
      });
    }

    req.body.bookingDate = new Date(req.body.bookingDate).toISOString();
    const bookingDate = new Date(req.body.bookingDate);

    // Validate booking date is within allowed range (May 10–13, 2022)
    if (bookingDate < MIN_DATE || bookingDate >= MAX_DATE) {
      return res.status(400).json({
        success: false,
        message: 'Booking date must be between May 10th and May 13th, 2022',
      });
    }

    // Enforce booking limit per user (admin is exempt)
    const existedBookings = await Booking.find({ user: req.user.id });
    if (existedBookings.length >= MAX_BOOKINGS_PER_USER && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: `The user with ID ${req.user.id} has already made ${MAX_BOOKINGS_PER_USER} bookings`,
      });
    }

    // Verify the target company exists
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: `No company with the id of ${req.params.id}` });
    }

    const booking = await Booking.create(req.body);
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Cannot create Booking' });
  }
};

/**
 * @desc    Update a booking by ID
 * @route   PUT /api/v1/bookings/:id
 * @access  Private
 */
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: `No booking with the id of ${req.params.id}` });
    }

    // Only the booking owner or admin can update
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update this booking` });
    }

    // Validate bookingDate if provided in request body
    if (req.body.bookingDate) {
      if (isNaN(Date.parse(req.body.bookingDate))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid booking date format. Please provide a valid ISO 8601 date string.',
        });
      }
      const bookingDate = new Date(req.body.bookingDate);
      if (bookingDate < MIN_DATE || bookingDate > MAX_DATE) {
        return res.status(400).json({
          success: false,
          message: 'Booking date must be between May 10th and May 13th, 2022',
        });
      }
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Cannot update Booking' });
  }
};

/**
 * @desc    Delete a booking by ID
 * @route   DELETE /api/v1/bookings/:id
 * @access  Private
 */
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: `No booking with the id of ${req.params.id}` });
    }

    // Only the booking owner or admin can delete
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to delete this booking` });
    }

    await booking.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Cannot delete Booking' });
  }
};