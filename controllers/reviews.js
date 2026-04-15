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
  let query;
  const reqQuery = { ...req.query };
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);

  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  //pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  

  try {

    const parsedQuery = JSON.parse(queryStr);

    if (req.params.id) {
      parsedQuery.company = req.params.id;
      query = Review.find(parsedQuery)
        .populate({ path: 'user', select: 'name email' });
    } else {
      query = Review.find(parsedQuery)
        .populate({ path: 'company', select: 'name' })
        .populate({ path: 'user', select: 'name email' });
    }
    
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    
    const total = await Review.countDocuments(parsedQuery);
    query = query.skip(startIndex).limit(limit);
    const reviews = await query;

    
    const pagination = {};
    if (endIndex < total) pagination.next = { page: page + 1, limit };
    if (startIndex > 0) pagination.prev = { page: page - 1, limit };

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

    // Whitelist updatable fields -- prevents user from overwriting company/user refs
    const allowedUpdates = {};
    if (req.body.rating  !== undefined) allowedUpdates.rating  = req.body.rating;
    if (req.body.comment !== undefined) allowedUpdates.comment = req.body.comment;
    

    if(review.rating.toString() === allowedUpdates.rating.toString() && review.comment === allowedUpdates.comment){
      return res.status(200).json({ success: true, data: review });
    }

    review.rating = parseInt(allowedUpdates.rating);
    review.comment = allowedUpdates.comment;
    review.edited = true;
    review.editedAt = Date.now();

    await review.save();

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
