const express = require('express');
const {getBookings, getBooking, addBooking, updateBooking, deleteBooking} = require('../controllers/bookings');
const router = express.Router({mergeParams:true});
const { protect, authorize } = require('../middleware/auth');

router.route('/').get(protect, getBookings);
router.route('/:id').get(protect, getBooking);
router.route('/').post(protect, authorize('admin','user'), addBooking);
router.route('/:id').delete(protect, authorize('admin','user'), deleteBooking);
router.route('/:id').put(protect, authorize('admin','user'), updateBooking);

module.exports = router;