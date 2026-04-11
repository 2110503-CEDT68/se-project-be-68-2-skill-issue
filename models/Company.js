const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please add a name'], unique: true, trim: true, maxlength: [50, 'Name can not be more than 50 characters'] },
  address: { type: String, required: [true, 'Please add an address'] },
  website: { type: String, required: [true, 'Please add a website'] },
  description: { type: String, required: [true, 'Please add a description'] },
  telephone_number: { type: String, required: [true, 'Please add a telephone number'] },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  numReviews: { type: Number, default: 0 }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field — dynamically populate bookings that reference this company
CompanySchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'company',
  justOne: false
});

// Virtual field — dynamically populate reviews (one-to-squillion: child stores parent ref)
// Not auto-populated on every query; call .populate('reviews') explicitly when needed.
CompanySchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'company',
  justOne: false
});

module.exports = mongoose.model('Company', CompanySchema);