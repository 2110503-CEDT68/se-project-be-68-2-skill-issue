const mongoose = require('mongoose');

/**
 * One-to-Squillion: child (comment) stores parent ref (company)
*/
const ReviewSchema = new mongoose.Schema({
    rating: {
      type: Number, required: [true, 'Please select a star rating between 1 and 5'], min: [1, 'Rating must be at least 1 star'], max: [5, 'Rating must be at most 5 stars'],
      // Enforce integer stars only
      validate: { validator: Number.isInteger, message: 'Rating must be an integer (1, 2, 3, 4, or 5)' }
    },
    comment: { type: String, required: [true, 'Please add a comment'], trim: true, maxlength: [100, 'Comment cannot exceed 100 characters'] },

    // Relationships
    company: { type: mongoose.Schema.ObjectId, ref: 'Company', required: true, index: true },
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },

    createdAt: { type: Date, default: Date.now }
  }, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
// reviews for company X, newest first
ReviewSchema.index({ company: 1, createdAt: -1 });
// One review per user per company (prevents duplicate reviews)
ReviewSchema.index({ company: 1, user: 1 }, { unique: true });

// Fucntion: Recalculate and store average rating on Company
ReviewSchema.statics.calcAverageRating = async function (companyId) {
  const stats = await this.aggregate([
    { $match: { company: companyId } },
    {
      $group: {
        _id: '$company',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model('Company').findByIdAndUpdate(companyId, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      numReviews: stats[0].numReviews
    });
  } else {
    await mongoose.model('Company').findByIdAndUpdate(companyId, {
      averageRating: 0,
      numReviews: 0
    });
  }
};

// Recalculate after save
ReviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.company);
});

// Recalculate after delete
ReviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) doc.constructor.calcAverageRating(doc.company);
});

module.exports = mongoose.model('Review', ReviewSchema);
