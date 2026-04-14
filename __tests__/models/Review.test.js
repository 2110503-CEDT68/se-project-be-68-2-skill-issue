const mongoose = require('mongoose');

describe('Review Model', () => {
  let Review;

  beforeAll(() => {
    // Company model must be registered first since Review references it
    require('../../models/Company');
    Review = require('../../models/Review');
  });

  describe('Schema definition', () => {
    it('should have required fields', () => {
      const schema = Review.schema.paths;
      expect(schema.rating).toBeDefined();
      expect(schema.comment).toBeDefined();
      expect(schema.company).toBeDefined();
      expect(schema.user).toBeDefined();
      expect(schema.createdAt).toBeDefined();
    });

    it('should have rating required with min 1 max 5', () => {
      const ratingField = Review.schema.paths.rating;
      expect(ratingField.isRequired).toBeTruthy();
      expect(ratingField.options.min[0]).toBe(1);
      expect(ratingField.options.max[0]).toBe(5);
    });

    it('should have comment required, trimmed, maxlength 100', () => {
      const commentField = Review.schema.paths.comment;
      expect(commentField.isRequired).toBeTruthy();
      expect(commentField.options.trim).toBe(true);
      expect(commentField.options.maxlength[0]).toBe(100);
    });

    it('should have company ref to Company', () => {
      expect(Review.schema.paths.company.options.ref).toBe('Company');
    });

    it('should have user ref to User', () => {
      expect(Review.schema.paths.user.options.ref).toBe('User');
    });
  });

  describe('validation', () => {
    const validReview = {
      rating: 4,
      comment: 'Great company!',
      company: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId()
    };

    it('should validate with valid data', () => {
      const review = new Review(validReview);
      const err = review.validateSync();
      expect(err).toBeUndefined();
    });

    it('should fail without rating', () => {
      const data = { ...validReview };
      delete data.rating;
      const review = new Review(data);
      const err = review.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.rating).toBeDefined();
    });

    it('should fail without comment', () => {
      const data = { ...validReview };
      delete data.comment;
      const review = new Review(data);
      const err = review.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.comment).toBeDefined();
    });

    it('should fail with rating less than 1', () => {
      const data = { ...validReview, rating: 0 };
      const review = new Review(data);
      const err = review.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.rating).toBeDefined();
    });

    it('should fail with rating greater than 5', () => {
      const data = { ...validReview, rating: 6 };
      const review = new Review(data);
      const err = review.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.rating).toBeDefined();
    });

    it('should fail with non-integer rating', () => {
      const data = { ...validReview, rating: 3.5 };
      const review = new Review(data);
      const err = review.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.rating).toBeDefined();
    });

    it('should fail with comment longer than 100 chars', () => {
      const data = { ...validReview, comment: 'A'.repeat(101) };
      const review = new Review(data);
      const err = review.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.comment).toBeDefined();
    });

    it('should fail without company', () => {
      const data = { ...validReview };
      delete data.company;
      const review = new Review(data);
      const err = review.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.company).toBeDefined();
    });

    it('should fail without user', () => {
      const data = { ...validReview };
      delete data.user;
      const review = new Review(data);
      const err = review.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.user).toBeDefined();
    });
  });

  describe('statics', () => {
    it('should have calcAverageRating static method', () => {
      expect(typeof Review.calcAverageRating).toBe('function');
    });
  });

  describe('calcAverageRating', () => {
    it('should calculate average when reviews exist', async () => {
      const companyId = new mongoose.Types.ObjectId();
      const mockStats = [{ _id: companyId, avgRating: 4.3, numReviews: 3 }];

      const originalAggregate = Review.aggregate;
      Review.aggregate = jest.fn().mockResolvedValue(mockStats);

      const CompanyModel = mongoose.model('Company');
      const originalFindByIdAndUpdate = CompanyModel.findByIdAndUpdate;
      CompanyModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      await Review.calcAverageRating(companyId);

      expect(CompanyModel.findByIdAndUpdate).toHaveBeenCalledWith(companyId, {
        averageRating: 4.3,
        numReviews: 3
      });

      Review.aggregate = originalAggregate;
      CompanyModel.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should set averageRating to 0 when no reviews exist', async () => {
      const companyId = new mongoose.Types.ObjectId();

      const originalAggregate = Review.aggregate;
      Review.aggregate = jest.fn().mockResolvedValue([]);

      const CompanyModel = mongoose.model('Company');
      const originalFindByIdAndUpdate = CompanyModel.findByIdAndUpdate;
      CompanyModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      await Review.calcAverageRating(companyId);

      expect(CompanyModel.findByIdAndUpdate).toHaveBeenCalledWith(companyId, {
        averageRating: 0,
        numReviews: 0
      });

      Review.aggregate = originalAggregate;
      CompanyModel.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('post hooks', () => {
    it('should have post save hook', () => {
      const postHooks = Review.schema.s.hooks._posts.get('save');
      expect(postHooks).toBeDefined();
      expect(postHooks.length).toBeGreaterThan(0);
    });

    it('should have post findOneAndDelete hook', () => {
      const postHooks = Review.schema.s.hooks._posts.get('findOneAndDelete');
      expect(postHooks).toBeDefined();
      expect(postHooks.length).toBeGreaterThan(0);
    });

    it('post save hook should call calcAverageRating', () => {
      const review = new Review({
        rating: 4,
        comment: 'Test',
        company: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId()
      });

      const mockCalc = jest.fn();
      review.constructor.calcAverageRating = mockCalc;

      // Execute the post save hook function directly
      const postSaveHooks = Review.schema.s.hooks._posts.get('save');
      postSaveHooks[0].fn.call(review);

      expect(mockCalc).toHaveBeenCalledWith(review.company);
    });

    it('post findOneAndDelete hook should call calcAverageRating if doc exists', () => {
      const companyId = new mongoose.Types.ObjectId();
      const mockDoc = {
        company: companyId,
        constructor: { calcAverageRating: jest.fn() }
      };

      const postDeleteHooks = Review.schema.s.hooks._posts.get('findOneAndDelete');
      postDeleteHooks[0].fn.call(null, mockDoc);

      expect(mockDoc.constructor.calcAverageRating).toHaveBeenCalledWith(companyId);
    });

    it('post findOneAndDelete hook should not call calcAverageRating if doc is null', () => {
      const postDeleteHooks = Review.schema.s.hooks._posts.get('findOneAndDelete');
      // Should not throw when doc is null
      expect(() => postDeleteHooks[0].fn.call(null, null)).not.toThrow();
    });
  });
});
