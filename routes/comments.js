const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const { getComments, addComment } = require('../controllers/comments');

router.route('/').get(getComments).post(protect, authorize('user'), addComment);

module.exports = router;