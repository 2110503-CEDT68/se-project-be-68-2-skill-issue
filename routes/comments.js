const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const { getComments, addComment, getComment, updateComment, deleteComment } = require('../controllers/comments');

router.route('/').get(getComments).post(protect, authorize('user'), addComment);
router.route('/:commentId').get(getComment).put(protect, authorize('user', 'admin'), updateComment).delete(protect, authorize('user', 'admin'), deleteComment);

module.exports = router;