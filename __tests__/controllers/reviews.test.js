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

  describe('getReviews', () => {
    it('should get reviews for a specific company', async () => {
      req.params.id = 'company123';
      const mockReviews = [{ _id: 'r1', rating: 5 }];
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockReviews)
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(1);

      await getReviews(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        data: mockReviews
      });
    });

    it('should get all reviews without company id', async () => {
      const mockReviews = [{ _id: 'r1' }, { _id: 'r2' }];
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockReviews)
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(2);

      await getReviews(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: mockReviews
      });
    });

    it('should handle sort query parameter', async () => {
      req.query = { sort: 'rating,-createdAt' };
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(0);

      await getReviews(req, res, next);

      expect(mockQuery.sort).toHaveBeenCalledWith('rating -createdAt');
    });

    it('should handle pagination with next/prev', async () => {
      req.query = { page: '2', limit: '1' };
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ _id: 'r2' }])
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(3);

      await getReviews(req, res, next);

      // The controller doesn't return pagination in the response currently, 
      // but it computes it. Let's check the response.
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle filter with comparison operators', async () => {
      req.query = { rating: { gte: '4' } };
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(0);

      await getReviews(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      Review.find.mockImplementation(() => { throw new Error('DB error'); });

      await getReviews(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot find reviews'
      });
    });

    it('should handle pagination page 1 limit 1 with 2 total (next only)', async () => {
      req.query = { page: '1', limit: '1' };
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ _id: 'r1' }])
      };

      Review.find.mockReturnValue(mockQuery);
      Review.countDocuments.mockResolvedValue(2);

      await getReviews(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getReview', () => {
    it('should get a single review', async () => {
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

    it('should return 404 if review not found', async () => {
      req.params.id = 'nonexistent';

      Review.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      await getReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No review with the id of nonexistent'
      });
    });

    it('should return 500 on error', async () => {
      req.params.id = 'review123';

      Review.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockRejectedValue(new Error('DB error'))
        })
      });

      await getReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot find review'
      });
    });
  });

  describe('addReview', () => {
    it('should create a review successfully', async () => {
      req.params.id = 'company123';
      req.body = { rating: 5, comment: 'Excellent!' };
      const mockReview = { _id: 'review1', ...req.body };

      Company.findById.mockResolvedValue({ _id: 'company123' });
      Review.create.mockResolvedValue(mockReview);

      await addReview(req, res, next);

      expect(req.body.company).toBe('company123');
      expect(req.body.user).toBe('user123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockReview });
    });

    it('should return 404 if company not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { rating: 5, comment: 'Test' };
      Company.findById.mockResolvedValue(null);

      await addReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No company with the id of nonexistent'
      });
    });

    it('should return 400 for duplicate review (code 11000)', async () => {
      req.params.id = 'company123';
      req.body = { rating: 5, comment: 'Test' };
      Company.findById.mockResolvedValue({ _id: 'company123' });

      const dupError = new Error('Duplicate');
      dupError.code = 11000;
      Review.create.mockRejectedValue(dupError);

      await addReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You have already reviewed this company'
      });
    });

    it('should return 400 on other errors', async () => {
      req.params.id = 'company123';
      req.body = { rating: 5, comment: 'Test' };
      Company.findById.mockResolvedValue({ _id: 'company123' });
      Review.create.mockRejectedValue(new Error('Validation error'));

      await addReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error'
      });
    });
  });

  describe('updateReview', () => {
    it('should update review successfully', async () => {
      req.params.id = 'review123';
      req.body = { rating: 4, comment: 'Updated' };
      const mockReview = {
        _id: 'review123',
        user: { toString: () => 'user123' },
        company: 'comp123'
      };
      const updatedReview = { ...mockReview, rating: 4, comment: 'Updated' };

      Review.findById.mockResolvedValue(mockReview);
      Review.findByIdAndUpdate.mockResolvedValue(updatedReview);
      Review.calcAverageRating = jest.fn().mockResolvedValue();

      await updateReview(req, res, next);

      expect(Review.findByIdAndUpdate).toHaveBeenCalledWith('review123', { rating: 4, comment: 'Updated' }, { new: true, runValidators: true });
      expect(Review.calcAverageRating).toHaveBeenCalledWith('comp123');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if review not found', async () => {
      req.params.id = 'nonexistent';
      Review.findById.mockResolvedValue(null);

      await updateReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No review with the id of nonexistent'
      });
    });

    it('should return 401 if not authorized', async () => {
      req.params.id = 'review123';
      const mockReview = {
        _id: 'review123',
        user: { toString: () => 'otheruser' }
      };
      Review.findById.mockResolvedValue(mockReview);

      await updateReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to update this review'
      });
    });

    it('should allow admin to update any review', async () => {
      req.params.id = 'review123';
      req.user.role = 'admin';
      req.body = { rating: 3 };
      const mockReview = {
        _id: 'review123',
        user: { toString: () => 'otheruser' },
        company: 'comp123'
      };
      const updatedReview = { ...mockReview, rating: 3 };

      Review.findById.mockResolvedValue(mockReview);
      Review.findByIdAndUpdate.mockResolvedValue(updatedReview);
      Review.calcAverageRating = jest.fn().mockResolvedValue();

      await updateReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should only update allowed fields (rating and comment)', async () => {
      req.params.id = 'review123';
      req.body = { rating: 4, comment: 'New comment', company: 'hacked', user: 'hacked' };
      const mockReview = {
        _id: 'review123',
        user: { toString: () => 'user123' },
        company: 'comp123'
      };
      const updatedReview = { ...mockReview, rating: 4, comment: 'New comment' };

      Review.findById.mockResolvedValue(mockReview);
      Review.findByIdAndUpdate.mockResolvedValue(updatedReview);
      Review.calcAverageRating = jest.fn().mockResolvedValue();

      await updateReview(req, res, next);

      expect(Review.findByIdAndUpdate).toHaveBeenCalledWith('review123', { rating: 4, comment: 'New comment' }, { new: true, runValidators: true });
    });

    it('should handle update with no rating or comment in body', async () => {
      req.params.id = 'review123';
      req.body = {};
      const mockReview = {
        _id: 'review123',
        user: { toString: () => 'user123' },
        company: 'comp123'
      };

      Review.findById.mockResolvedValue(mockReview);
      Review.findByIdAndUpdate.mockResolvedValue(mockReview);
      Review.calcAverageRating = jest.fn().mockResolvedValue();

      await updateReview(req, res, next);

      expect(Review.findByIdAndUpdate).toHaveBeenCalledWith('review123', {}, { new: true, runValidators: true });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on error', async () => {
      req.params.id = 'review123';
      Review.findById.mockRejectedValue(new Error('DB error'));

      await updateReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB error'
      });
    });
  });

  describe('deleteReview', () => {
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

    it('should return 404 if review not found', async () => {
      req.params.id = 'nonexistent';
      Review.findById.mockResolvedValue(null);

      await deleteReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No review with the id of nonexistent'
      });
    });

    it('should return 401 if not authorized', async () => {
      req.params.id = 'review123';
      const mockReview = {
        _id: 'review123',
        user: { toString: () => 'otheruser' }
      };
      Review.findById.mockResolvedValue(mockReview);

      await deleteReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to delete this review'
      });
    });

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
    });

    it('should return 500 on error', async () => {
      req.params.id = 'review123';
      Review.findById.mockRejectedValue(new Error('DB error'));

      await deleteReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete review'
      });
    });
  });
});
