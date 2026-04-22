const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const { getBlogs, getBlog, addBlog, updateBlog, deleteBlog } = require('../controllers/blogs');
const commentRouter = require('./comments')

router.use('/:id/comments/',commentRouter);
router.route('/').get(getBlogs).post(protect, authorize('user'), addBlog);
router.route('/:id').get(getBlog).put(protect, authorize('user', 'admin'), updateBlog).delete(protect, authorize('user', 'admin'), deleteBlog);

module.exports = router;