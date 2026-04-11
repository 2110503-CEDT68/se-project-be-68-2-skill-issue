/**
 * @file controllers/reviews.js
 * @desc CRUD operations for Review — role-based access
 */

const Review = require('../models/Review');
const Company = require('../models/Company');

/**
 * @desc    Get reviews — for a specific company or all (admin)
 * @route   GET /api/v1/companies/:id/reviews
 * @route   GET /api/v1/reviews
 * @access  Public
 */
exports.getReviews = async (req, res, next) => {
  try {
    let query;

    if (req.params.id) {
      query = Review.find({ company: req.params.id })
        .populate({ path: 'user', select: 'name email' });
    } else {
      query = Review.find()
        .populate({ path: 'company', select: 'name' })
        .populate({ path: 'user', select: 'name email' });
    }

    const reviews = await query;
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Cannot find reviews' });
  }
};

/**
 * @desc    Get a single review by ID
 * @route   GET /api/v1/reviews/:id
 * @access  Public
 */
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate({ path: 'company', select: 'name' })
      .populate({ path: 'user', select: 'name email' });

    if (!review) {
      return res.status(404).json({ success: false, message: `No review with the id of ${req.params.id}` });
    }

    res.status(200).json({ success: true, data: review });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Cannot find review' });
  }
};

/**
 * @desc    Create a review for a company
 * @route   POST /api/v1/companies/:id/reviews
 * @access  Private
 */
exports.addReview = async (req, res, next) => {
  try {
    req.body.company = req.params.id;
    req.body.user = req.user.id;

    // Check if the company exists
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: `No company with the id of ${req.params.id}` });
    }

    const review = await Review.create(req.body);
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    console.log(err);
    // Handle duplicate review (unique index on company + user)
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this company' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Update a review
 * @route   PUT /api/v1/reviews/:id
 * @access  Private
 */
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: `No review with the id of ${req.params.id}` });
    }

    // Only the review owner or admin can update
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to update this review' });
    }

    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Recalculate average rating
    await Review.calcAverageRating(review.company);

    res.status(200).json({ success: true, data: review });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/v1/reviews/:id
 * @access  Private
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: `No review with the id of ${req.params.id}` });
    }

    // Only the review owner or admin can delete
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this review' });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Cannot delete review' });
  }
};
