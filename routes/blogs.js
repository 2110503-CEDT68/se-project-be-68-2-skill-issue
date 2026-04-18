const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const { getBlogs, getBlog, addBlog } = require('../controllers/blogs');
const commentRouter = require('./comments')

router.use('/:id/comments/',commentRouter);
router.route('/').get(getBlogs).post(protect, authorize('user'), addBlog);
router.route('/:id').get(getBlog);

module.exports = router;