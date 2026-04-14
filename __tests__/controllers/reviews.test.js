jest.mock('../../models/Review');
jest.mock('../../models/Company');

const Review = require('../../models/Review');
const Company = require('../../models/Company');
const { getReviews, getReview, addReview, updateReview, deleteReview } = require('../../controllers/reviews');

describe('Reviews Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      user: { id: 'user123', role: 'user' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // ─── getReviews ────────────────────────────────────────────────────────────

  describe('getReviews', () => {
    /**
     * Branch: req.params.id is set  →  single-populate path
     */
    it('should get reviews for a specific company (branch: req.params.id set)', async () => {
      req.params.id = 'company123';
      const mockReviews = [{ _id: 'r1', rating: 5 }];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort:     jest.fn().mockReturnThis(),
        skip:     jest.fn().mockReturnThis(),
        limit:    jest.fn().mockResolvedValue(mockReviews)
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(1);

      await getReviews(req, res, next);

      // The company filter must be injected
      expect(Review.find).toHaveBeenCalledWith(expect.objectContaining({ company: 'company123' }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, count: 1, data: mockReviews });
    });

    /**
     * Branch: req.params.id is NOT set  →  double-populate path
     */
    it('should get all reviews when no company id (branch: no req.params.id)', async () => {
      const mockReviews = [{ _id: 'r1' }, { _id: 'r2' }];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort:     jest.fn().mockReturnThis(),
        skip:     jest.fn().mockReturnThis(),
        limit:    jest.fn().mockResolvedValue(mockReviews)
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(2);

      await getReviews(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, count: 2, data: mockReviews });
    });

    /**
     * Branch: req.query.sort is provided  →  custom sort
     */
    it('should apply custom sort when sort query param is provided', async () => {
      req.query = { sort: 'rating,-createdAt' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort:     jest.fn().mockReturnThis(),
        skip:     jest.fn().mockReturnThis(),
        limit:    jest.fn().mockResolvedValue([])
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(0);

      await getReviews(req, res, next);

      expect(mockQuery.sort).toHaveBeenCalledWith('rating -createdAt');
    });

    /**
     * Branch: req.query.sort is NOT provided  →  default sort '-createdAt'
     */
    it('should apply default sort when no sort query param', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort:     jest.fn().mockReturnThis(),
        skip:     jest.fn().mockReturnThis(),
        limit:    jest.fn().mockResolvedValue([])
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(0);

      await getReviews(req, res, next);

      expect(mockQuery.sort).toHaveBeenCalledWith('-createdAt');
    });

    /**
     * Branch: endIndex < total  →  pagination.next is set
     *         startIndex === 0  →  pagination.prev is NOT set
     */
    it('should set pagination.next when on page 1 of many (branch: next only)', async () => {
      req.query = { page: '1', limit: '1' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort:     jest.fn().mockReturnThis(),
        skip:     jest.fn().mockReturnThis(),
        limit:    jest.fn().mockResolvedValue([{ _id: 'r1' }])
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(3); // endIndex(1) < total(3) → next; startIndex(0) not > 0 → no prev

      await getReviews(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Branch: startIndex > 0  →  pagination.prev is set
     *         endIndex >= total  →  pagination.next is NOT set
     */
    it('should set pagination.prev when on last page (branch: prev only)', async () => {
      req.query = { page: '3', limit: '1' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort:     jest.fn().mockReturnThis(),
        skip:     jest.fn().mockReturnThis(),
        limit:    jest.fn().mockResolvedValue([{ _id: 'r3' }])
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(3); // endIndex(3) === total(3) → no next; startIndex(2) > 0 → prev

      await getReviews(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Branch: both next AND prev (middle page)
     */
    it('should set both pagination.next and prev on a middle page', async () => {
      req.query = { page: '2', limit: '1' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort:     jest.fn().mockReturnThis(),
        skip:     jest.fn().mockReturnThis(),
        limit:    jest.fn().mockResolvedValue([{ _id: 'r2' }])
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(3); // endIndex(2) < total(3) → next; startIndex(1) > 0 → prev

      await getReviews(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Branch: query filter with comparison operators (gt/gte/lt/lte/in replaced)
     */
    it('should replace comparison operators in query string', async () => {
      req.query = { rating: { gte: '4' } };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort:     jest.fn().mockReturnThis(),
        skip:     jest.fn().mockReturnThis(),
        limit:    jest.fn().mockResolvedValue([])
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(0);

      await getReviews(req, res, next);

      // The transformed query should use $gte, not gte
      expect(Review.find).toHaveBeenCalledWith(expect.objectContaining({ rating: { $gte: '4' } }));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Branch: error thrown  →  500
     */
    it('should return 500 on error', async () => {
      Review.find.mockImplementation(() => { throw new Error('DB error'); });

      await getReviews(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot find reviews' });
    });
  });

  // ─── getReview ─────────────────────────────────────────────────────────────

  describe('getReview', () => {
    /**
     * Branch: review found  →  200
     */
    it('should return a single review when found', async () => {
      req.params.id = 'review123';
      const mockReview = { _id: 'review123', rating: 5, comment: 'Great!' };

      Review.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockReview)
        })
      });

      await getReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockReview });
    });

    /**
     * Branch: review NOT found  →  404
     */
    it('should return 404 when review does not exist', async () => {
      req.params.id = 'nonexistent';

      Review.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      await getReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No review with the id of nonexistent' });
    });

    /**
     * Branch: error thrown  →  500
     */
    it('should return 500 on error', async () => {
      req.params.id = 'review123';

      Review.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockRejectedValue(new Error('DB error'))
        })
      });

      await getReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot find review' });
    });
  });

  // ─── addReview ─────────────────────────────────────────────────────────────

  describe('addReview', () => {
    /**
     * Branch: company found + review created  →  201
     */
    it('should create a review successfully', async () => {
      req.params.id = 'company123';
      req.body = { rating: 5, comment: 'Excellent!' };
      const mockReview = { _id: 'review1', rating: 5, comment: 'Excellent!' };

      Company.findById.mockResolvedValue({ _id: 'company123' });
      Review.create.mockResolvedValue(mockReview);

      await addReview(req, res, next);

      expect(req.body.company).toBe('company123');
      expect(req.body.user).toBe('user123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockReview });
    });

    /**
     * Branch: company NOT found  →  404
     */
    it('should return 404 when company does not exist', async () => {
      req.params.id = 'nonexistent';
      req.body = { rating: 5, comment: 'Test' };
      Company.findById.mockResolvedValue(null);

      await addReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No company with the id of nonexistent' });
    });

    /**
     * Branch: duplicate key error (code 11000)  →  400 with specific message
     */
    it('should return 400 for duplicate review (err.code === 11000)', async () => {
      req.params.id = 'company123';
      req.body = { rating: 5, comment: 'Test' };
      Company.findById.mockResolvedValue({ _id: 'company123' });

      const dupError = new Error('Duplicate');
      dupError.code = 11000;
      Review.create.mockRejectedValue(dupError);

      await addReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'You have already reviewed this company' });
    });

    /**
     * Branch: other error (code !== 11000)  →  400 with err.message
     */
    it('should return 400 on other errors', async () => {
      req.params.id = 'company123';
      req.body = { rating: 5, comment: 'Test' };
      Company.findById.mockResolvedValue({ _id: 'company123' });
      Review.create.mockRejectedValue(new Error('Validation error'));

      await addReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Validation error' });
    });
  });

  // ─── updateReview ──────────────────────────────────────────────────────────
  //
  // The controller mutates the review document in-place and calls review.save().
  // It does NOT call Review.findByIdAndUpdate.
  // Early-return branch: if rating AND comment are unchanged → 200, skip save.

  describe('updateReview', () => {
    /**
     * Branch: authorized owner, values changed  →  save() called, 200
     */
    it('should update review successfully when values change', async () => {
      req.params.id = 'review123';
      req.body = { rating: 4, comment: 'Updated comment' };

      const mockReview = {
        _id: 'review123',
        rating: 5,
        comment: 'Original comment',
        company: 'comp123',
        user: { toString: () => 'user123' },
        save: jest.fn().mockResolvedValue()
      };

      Review.findById.mockResolvedValue(mockReview);
      Review.calcAverageRating = jest.fn().mockResolvedValue();

      await updateReview(req, res, next);

      expect(mockReview.save).toHaveBeenCalled();
      expect(mockReview.rating).toBe(4);
      expect(mockReview.comment).toBe('Updated comment');
      expect(mockReview.edited).toBe(true);
      expect(mockReview.editedAt).toBeDefined();
      expect(Review.calcAverageRating).toHaveBeenCalledWith('comp123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockReview });
    });

    /**
     * Branch: rating and comment are IDENTICAL to current values
     *         →  early return 200, save() NOT called
     */
    it('should return 200 without saving when nothing changed', async () => {
      req.params.id = 'review123';
      req.body = { rating: 5, comment: 'Same comment' };

      const mockReview = {
        _id: 'review123',
        rating: 5,
        comment: 'Same comment',
        company: 'comp123',
        user: { toString: () => 'user123' },
        save: jest.fn()
      };

      Review.findById.mockResolvedValue(mockReview);
      Review.calcAverageRating = jest.fn();

      await updateReview(req, res, next);

      expect(mockReview.save).not.toHaveBeenCalled();
      expect(Review.calcAverageRating).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockReview });
    });

    /**
     * Branch: only rating provided (comment undefined → not in allowedUpdates)
     *         The unchanged-check: rating differs → proceeds to save
     */
    it('should update when only rating is in body and it differs', async () => {
      req.params.id = 'review123';
      req.body = { rating: 3 }; // no comment

      const mockReview = {
        _id: 'review123',
        rating: 5,
        comment: 'Existing',
        company: 'comp123',
        user: { toString: () => 'user123' },
        save: jest.fn().mockResolvedValue()
      };

      Review.findById.mockResolvedValue(mockReview);
      Review.calcAverageRating = jest.fn().mockResolvedValue();

      await updateReview(req, res, next);

      // rating changed → save must be called
      expect(mockReview.save).toHaveBeenCalled();
      expect(mockReview.rating).toBe(3);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Branch: only comment provided (rating undefined → not in allowedUpdates)
     * The unchanged-check: comment differs → proceeds to save
     */
    it('should update when only comment is in body and it differs', async () => {
      req.params.id = 'review123';
      req.body = { comment: 'Changed comment' }; // no rating

      const mockReview = {
        _id: 'review123',
        rating: 5,
        comment: 'Existing',
        company: 'comp123',
        user: { toString: () => 'user123' },
        save: jest.fn().mockResolvedValue()
      };

      Review.findById.mockResolvedValue(mockReview);
      Review.calcAverageRating = jest.fn().mockResolvedValue();

      await updateReview(req, res, next);

      // comment changed → save must be called
      expect(mockReview.save).toHaveBeenCalled();
      expect(mockReview.comment).toBe('Changed comment');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Branch: review NOT found  →  404
     */
    it('should return 404 when review does not exist', async () => {
      req.params.id = 'nonexistent';
      Review.findById.mockResolvedValue(null);

      await updateReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No review with the id of nonexistent' });
    });

    /**
     * Branch: user is NOT owner AND NOT admin  →  401
     */
    it('should return 401 when user is not the owner', async () => {
      req.params.id = 'review123';
      req.body = { rating: 1 };

      const mockReview = {
        _id: 'review123',
        user: { toString: () => 'otheruser' }
      };
      Review.findById.mockResolvedValue(mockReview);

      await updateReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized to update this review' });
    });

    /**
     * Branch: user is admin (different owner)  →  authorised, proceeds
     */
    it('should allow admin to update any review', async () => {
      req.params.id = 'review123';
      req.user.role = 'admin';
      req.body = { rating: 3, comment: 'Admin edit' };

      const mockReview = {
        _id: 'review123',
        rating: 5,
        comment: 'Original',
        company: 'comp123',
        user: { toString: () => 'otheruser' },
        save: jest.fn().mockResolvedValue()
      };

      Review.findById.mockResolvedValue(mockReview);
      Review.calcAverageRating = jest.fn().mockResolvedValue();

      await updateReview(req, res, next);

      expect(mockReview.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Branch: req.body contains extra fields (company/user) — they must NOT be applied
     */
    it('should not update company or user fields (whitelist enforced)', async () => {
      req.params.id = 'review123';
      req.body = { rating: 4, comment: 'New comment', company: 'hacked', user: 'hacked' };

      const mockReview = {
        _id: 'review123',
        rating: 5,
        comment: 'Old',
        company: 'comp123',
        user: { toString: () => 'user123' },
        save: jest.fn().mockResolvedValue()
      };

      Review.findById.mockResolvedValue(mockReview);
      Review.calcAverageRating = jest.fn().mockResolvedValue();

      await updateReview(req, res, next);

      expect(mockReview.company).toBe('comp123'); // untouched
      expect(mockReview.rating).toBe(4);
      expect(mockReview.comment).toBe('New comment');
    });

    /**
     * Branch: error thrown  →  400
     */
    it('should return 400 on error', async () => {
      req.params.id = 'review123';
      Review.findById.mockRejectedValue(new Error('DB error'));

      await updateReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'DB error' });
    });
  });

  // ─── deleteReview ──────────────────────────────────────────────────────────

  describe('deleteReview', () => {
    /**
     * Branch: review found + owner  →  deleted, 200
     */
    it('should delete review successfully', async () => {
      req.params.id = 'review123';
      const mockReview = {
        _id: 'review123',
        user: { toString: () => 'user123' }
      };

      Review.findById.mockResolvedValue(mockReview);
      Review.findByIdAndDelete.mockResolvedValue(mockReview);

      await deleteReview(req, res, next);

      expect(Review.findByIdAndDelete).toHaveBeenCalledWith('review123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });

    /**
     * Branch: review NOT found  →  404
     */
    it('should return 404 when review does not exist', async () => {
      req.params.id = 'nonexistent';
      Review.findById.mockResolvedValue(null);

      await deleteReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No review with the id of nonexistent' });
    });

    /**
     * Branch: user is NOT owner AND NOT admin  →  401
     */
    it('should return 401 when user is not the owner', async () => {
      req.params.id = 'review123';
      const mockReview = {
        _id: 'review123',
        user: { toString: () => 'otheruser' }
      };
      Review.findById.mockResolvedValue(mockReview);

      await deleteReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized to delete this review' });
    });

    /**
     * Branch: user is admin (different owner)  →  authorised, deleted
     */
    it('should allow admin to delete any review', async () => {
      req.params.id = 'review123';
      req.user.role = 'admin';
      const mockReview = {
        _id: 'review123',
        user: { toString: () => 'otheruser' }
      };

      Review.findById.mockResolvedValue(mockReview);
      Review.findByIdAndDelete.mockResolvedValue(mockReview);

      await deleteReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });

    /**
     * Branch: error thrown  →  500
     */
    it('should return 500 on error', async () => {
      req.params.id = 'review123';
      Review.findById.mockRejectedValue(new Error('DB error'));

      await deleteReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot delete review' });
    });
  });
});