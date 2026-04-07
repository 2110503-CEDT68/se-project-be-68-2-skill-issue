const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  bookingDate: {
    type: Date,
    required: true,
    // Restrict bookings to the job fair window: May 10–13, 2022
    min: ['2022-05-10T00:00:00.000Z', 'Booking date must be on or after May 10th, 2022'],
    max: ['2022-05-13T23:59:59.999Z', 'Booking date must be on or before May 13th, 2022']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company',
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);