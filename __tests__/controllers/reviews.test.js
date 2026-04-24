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

    it('should return 400 if rating is invalid', async () => {
      req.params.id = 'company123';
      req.body = { rating: 6, comment: 'Test' };
      Company.findById.mockResolvedValue({ _id: 'company123' });

      await addReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rating must be an integer between 1 and 5'
      });
    });

    it('should return 400 if comment is empty', async () => {
      req.params.id = 'company123';
      req.body = { rating: 3, comment: '   ' };
      Company.findById.mockResolvedValue({ _id: 'company123' });

      await addReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Comment is required'
      });
    });

    it('should return 400 if comment is not provided', async () => {
      req.params.id = 'company123';
      req.body = { rating: 3 };
      Company.findById.mockResolvedValue({ _id: 'company123' });

      await addReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Comment is required'
      });
    });

    it('should return 400 if comment exceeds 100 characters', async () => {
      req.params.id = 'company123';
      req.body = { rating: 3, comment: 'a'.repeat(101) };
      Company.findById.mockResolvedValue({ _id: 'company123' });

      await addReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Comment cannot exceed 100 characters'
      });
    });
  });
describe('updateReview', () => {
  let mockReview;

  beforeEach(() => {
    // สร้าง Mock Review พื้นฐานไว้ใช้ในทุก Case
    mockReview = {
      _id: 'review123',
      user: { toString: () => 'user123' },
      company: 'comp123',
      rating: 5,
      comment: 'Old comment',
      save: jest.fn().mockResolvedValue(true)
    };
    Review.calcAverageRating = jest.fn().mockResolvedValue();
  });

  it('should update review successfully and set edited flag', async () => {
    req.params.id = 'review123';
    req.body = { rating: 4, comment: 'Updated' };

    Review.findById.mockResolvedValue(mockReview);

    await updateReview(req, res, next);

    expect(mockReview.rating).toBe(4);
    expect(mockReview.comment).toBe('Updated');
    expect(mockReview.edited).toBe(true);
    expect(mockReview.save).toHaveBeenCalled();
    expect(Review.calcAverageRating).toHaveBeenCalledWith('comp123');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 200 without saving if data is unchanged', async () => {
    req.params.id = 'review123';
    req.body = { rating: 5, comment: 'Old comment' }; // ข้อมูลเดิมเป๊ะ

    Review.findById.mockResolvedValue(mockReview);

    await updateReview(req, res, next);

    expect(mockReview.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockReview });
  });

  it('should allow admin to update any review even if not the owner', async () => {
    req.params.id = 'review123';
    req.user.role = 'admin';
    req.user.id = 'admin456'; // คนละ id กับเจ้าของรีวิว
    req.body = { rating: 1 };

    Review.findById.mockResolvedValue(mockReview);

    await updateReview(req, res, next);

    expect(mockReview.rating).toBe(1);
    expect(mockReview.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 401 if not authorized (not owner and not admin)', async () => {
    req.params.id = 'review123';
    req.user.id = 'hacker789'; // ไม่ใช่เจ้าของ
    req.user.role = 'user';

    Review.findById.mockResolvedValue(mockReview);

    await updateReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockReview.save).not.toHaveBeenCalled();
  });

  it('should return 404 if review not found', async () => {
    req.params.id = 'nonexistent';
    Review.findById.mockResolvedValue(null);

    await updateReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 400 on database error', async () => {
    req.params.id = 'review123';
    Review.findById.mockRejectedValue(new Error('DB error'));

    await updateReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'DB error'
    });
  });

  it('should update only comment if rating is undefined in req.body', async () => {
  req.params.id = 'review123';
  // ส่งมาแค่ comment อย่างเดียว ไม่ส่ง rating
  req.body = { comment: 'Updated comment only' };
  
  const mockReview = {
    _id: 'review123',
    user: { toString: () => 'user123' },
    company: 'comp123',
    rating: 5, // ค่าเดิม
    comment: 'Old comment',
    save: jest.fn().mockResolvedValue(true)
  };

  Review.findById.mockResolvedValue(mockReview);
  Review.calcAverageRating = jest.fn().mockResolvedValue();

  await updateReview(req, res, next);

  // ตรวจสอบว่า rating ยังเป็นค่าเดิม (5) แต่ comment เปลี่ยนไป
  expect(mockReview.rating).toBe(5); 
  expect(mockReview.comment).toBe('Updated comment only');
  expect(mockReview.save).toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(200);
});

  it('should return 400 if new rating is invalid', async () => {
    req.params.id = 'review123';
    req.body = { rating: 0, comment: 'Valid comment' };

    Review.findById.mockResolvedValue(mockReview);

    await updateReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
    expect(mockReview.save).not.toHaveBeenCalled();
  });

  it('should return 400 if comment becomes empty after trim', async () => {
    req.params.id = 'review123';
    req.body = { comment: '   ' };

    Review.findById.mockResolvedValue(mockReview);

    await updateReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Comment is required'
    });
  });

  it('should return 400 if no comment provided and review has no existing comment', async () => {
    req.params.id = 'review123';
    req.body = {};

    const reviewWithNoComment = { ...mockReview, comment: undefined };
    Review.findById.mockResolvedValue(reviewWithNoComment);

    await updateReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Comment is required'
    });
  });

  it('should return 400 if comment exceeds 100 characters', async () => {
    req.params.id = 'review123';
    req.body = { comment: 'a'.repeat(101) };

    Review.findById.mockResolvedValue(mockReview);

    await updateReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Comment cannot exceed 100 characters'
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
