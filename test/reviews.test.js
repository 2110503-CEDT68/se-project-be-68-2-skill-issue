/**
 * Unit Tests: controllers/reviews.js
 * Tests: getReviews, getReview, addReview, updateReview, deleteReview
 */

// ── Mock dependencies ──────────────────────────────────────────────────────
jest.mock('../models/Review');
jest.mock('../models/Company');

const Review  = require('../models/Review');
const Company = require('../models/Company');

const {
  getReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview,
} = require('../controllers/reviews');

// ── Helpers ────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const sampleReview = {
  _id: 'review123',
  rating: 4,
  comment: 'Great company!',
  company: 'comp123',
  user: { toString: () => 'user123', _id: 'user123' },
};

beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════
// getReviews
// ══════════════════════════════════════════════════════════════════════════
describe('getReviews', () => {
  const buildChain = (result) => {
    const obj = { populate: jest.fn() };
    obj.populate
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          sort:  jest.fn().mockReturnValue({
            skip:  jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(result),
            }),
          }),
        }),
      });
    return obj;
  };

  // Single-populate chain (for company-scoped queries)
  const buildSingleChain = (result) => ({
    populate: jest.fn().mockReturnValue({
      sort:  jest.fn().mockReturnValue({
        skip:  jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(result),
        }),
      }),
    }),
  });

  it('should return all reviews when no params.id', async () => {
    Review.find.mockReturnValue(buildChain([sampleReview]));
    Review.countDocuments.mockResolvedValue(1);

    const req = { query: {}, params: {} };
    const res = mockRes();

    await getReviews(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 1 })
    );
  });

  it('should return 500 on database error', async () => {
    Review.find.mockImplementation(() => { throw new Error('DB Error'); });
    Review.countDocuments.mockResolvedValue(0);

    const req = { query: {}, params: {} };
    const res = mockRes();

    await getReviews(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Cannot find reviews' })
    );
  });

  it('should apply custom sorting if sort parameter is provided (lines 58-59)', async () => {
    const mockSort = jest.fn().mockReturnThis();
    const mockChain = { 
      populate: jest.fn().mockReturnThis(), 
      sort: mockSort, 
      skip: jest.fn().mockReturnThis(), 
      limit: jest.fn().mockResolvedValue([]) 
    };
    Review.find.mockReturnValue(mockChain);
    Review.countDocuments.mockResolvedValue(0);

    // Provide multiple sort parameters to test the split/join logic
    const req = { params: {}, query: { sort: 'rating,createdAt' } };
    const res = mockRes();

    await getReviews(req, res);
    
    expect(mockSort).toHaveBeenCalledWith('rating createdAt');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// getReview
// ══════════════════════════════════════════════════════════════════════════
describe('getReview', () => {
  const chain = (result) => {
    const obj = { populate: jest.fn() };
    obj.populate.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(result) });
    return obj;
  };

  it('should return a review by ID', async () => {
    Review.findById.mockReturnValue(chain(sampleReview));

    const req = { params: { id: 'review123' } };
    const res = mockRes();

    await getReview(req, res);

    expect(Review.findById).toHaveBeenCalledWith('review123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: sampleReview });
  });

  it('should return 404 when review not found', async () => {
    Review.findById.mockReturnValue(chain(null));

    const req = { params: { id: 'notexist' } };
    const res = mockRes();

    await getReview(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('should return 500 on database error', async () => {
    Review.findById.mockImplementation(() => { throw new Error('DB Error'); });

    const req = { params: { id: 'review123' } };
    const res = mockRes();

    await getReview(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// addReview
// ══════════════════════════════════════════════════════════════════════════
describe('addReview', () => {
  it('should return 404 when company does not exist', async () => {
    Company.findById.mockResolvedValue(null);

    const req = {
      body: { rating: 5, comment: 'Amazing!' },
      params: { id: 'badcomp' },
      user: { id: 'user123' },
    };
    const res = mockRes();

    await addReview(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('should create and return the review on success', async () => {
    Company.findById.mockResolvedValue({ _id: 'comp123' });
    Review.create.mockResolvedValue(sampleReview);

    const req = {
      body: { rating: 4, comment: 'Great company!' },
      params: { id: 'comp123' },
      user: { id: 'user123' },
    };
    const res = mockRes();

    await addReview(req, res);

    expect(Review.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: sampleReview });
  });

  it('should return 400 with duplicate message when user already reviewed', async () => {
    Company.findById.mockResolvedValue({ _id: 'comp123' });
    const dupError = new Error('Duplicate key');
    dupError.code = 11000;
    Review.create.mockRejectedValue(dupError);

    const req = {
      body: { rating: 3, comment: 'Seen it before' },
      params: { id: 'comp123' },
      user: { id: 'user123' },
    };
    const res = mockRes();

    await addReview(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'You have already reviewed this company' })
    );
  });

  it('should return 400 on other creation errors', async () => {
    Company.findById.mockResolvedValue({ _id: 'comp123' });
    Review.create.mockRejectedValue(new Error('Validation error'));

    const req = {
      body: { rating: 6, comment: 'Out of range' },
      params: { id: 'comp123' },
      user: { id: 'user123' },
    };
    const res = mockRes();

    await addReview(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 404 when adding a review to a non-existent company (line 139)', async () => {
    Company.findById.mockResolvedValueOnce(null);

    const req = { 
      params: { id: 'nonexistent123' }, 
      user: { id: 'user123' }, 
      body: { rating: 5, comment: 'Great!' } 
    };
    const res = mockRes();

    await addReview(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'No company with the id of nonexistent123' })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// updateReview
// ══════════════════════════════════════════════════════════════════════════
describe('updateReview', () => {
  it('should return 404 when review not found', async () => {
    Review.findById.mockResolvedValue(null);

    const req = {
      params: { id: 'notexist' },
      body: { rating: 3 },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await updateReview(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 401 when user is not the review owner', async () => {
    Review.findById.mockResolvedValue(sampleReview);

    const req = {
      params: { id: 'review123' },
      body: { rating: 2 },
      user: { id: 'otheruser', role: 'user' },
    };
    const res = mockRes();

    await updateReview(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Not authorized to update this review' })
    );
  });

  it('should update only rating and comment fields', async () => {
    Review.findById.mockResolvedValue(sampleReview);
    const updated = { ...sampleReview, rating: 5, comment: 'Updated!' };
    Review.findByIdAndUpdate.mockResolvedValue(updated);
    Review.calcAverageRating = jest.fn().mockResolvedValue();

    const req = {
      params: { id: 'review123' },
      body: { rating: 5, comment: 'Updated!', company: 'hack_attempt' },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await updateReview(req, res);

    // Should only pass allowed fields — not 'company'
    expect(Review.findByIdAndUpdate).toHaveBeenCalledWith(
      'review123',
      { rating: 5, comment: 'Updated!' },
      { new: true, runValidators: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
  });

  it('should allow admin to update any review', async () => {
    Review.findById.mockResolvedValue(sampleReview);
    Review.findByIdAndUpdate.mockResolvedValue(sampleReview);
    Review.calcAverageRating = jest.fn().mockResolvedValue();

    const req = {
      params: { id: 'review123' },
      body: { comment: 'Admin edit' },
      user: { id: 'admin1', role: 'admin' },
    };
    const res = mockRes();

    await updateReview(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 400 when an error is caught during update (lines 151-152)', async () => {
    Review.findById.mockRejectedValueOnce(new Error('Simulated Review Error'));

    const req = { params: { id: 'review123' }, body: { rating: 5 } };
    const res = mockRes();

    await updateReview(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Simulated Review Error' })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// deleteReview
// ══════════════════════════════════════════════════════════════════════════
describe('deleteReview', () => {
  it('should return 404 when review not found', async () => {
    Review.findById.mockResolvedValue(null);

    const req = { params: { id: 'notexist' }, user: { id: 'user123', role: 'user' } };
    const res = mockRes();

    await deleteReview(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 401 when user is not the review owner', async () => {
    Review.findById.mockResolvedValue(sampleReview);

    const req = {
      params: { id: 'review123' },
      user: { id: 'otheruser', role: 'user' },
    };
    const res = mockRes();

    await deleteReview(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Not authorized to delete this review' })
    );
  });

  it('should delete review when user is the owner', async () => {
    Review.findById.mockResolvedValue(sampleReview);
    Review.findByIdAndDelete.mockResolvedValue(sampleReview);

    const req = {
      params: { id: 'review123' },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await deleteReview(req, res);

    expect(Review.findByIdAndDelete).toHaveBeenCalledWith('review123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
  });

  it('should allow admin to delete any review', async () => {
    Review.findById.mockResolvedValue(sampleReview);
    Review.findByIdAndDelete.mockResolvedValue(sampleReview);

    const req = {
      params: { id: 'review123' },
      user: { id: 'admin1', role: 'admin' },
    };
    const res = mockRes();

    await deleteReview(req, res);

    expect(Review.findByIdAndDelete).toHaveBeenCalledWith('review123');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 500 on database error', async () => {
    Review.findById.mockRejectedValue(new Error('DB Error'));

    const req = { params: { id: 'review123' }, user: { id: 'user123', role: 'user' } };
    const res = mockRes();

    await deleteReview(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('Review Advanced Queries and Whitelist', () => {
  it('should get reviews restricted to a specific company ID (lines 33-34)', async () => {
    const mockChain = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    Review.find.mockReturnValue(mockChain);
    Review.countDocuments.mockResolvedValue(0);

    const req = { params: { id: 'company123' }, query: {} };
    const res = mockRes();

    await getReviews(req, res);
    expect(Review.find).toHaveBeenCalledWith(expect.objectContaining({ company: 'company123' }));
  });

  it('should apply custom sorting if sort parameter is provided (lines 43-44)', async () => {
    const mockSort = jest.fn().mockReturnThis();
    const mockChain = { populate: jest.fn().mockReturnThis(), sort: mockSort, skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    Review.find.mockReturnValue(mockChain);
    Review.countDocuments.mockResolvedValue(0);

    const req = { params: {}, query: { sort: 'rating' } };
    const res = mockRes();

    await getReviews(req, res);
    expect(mockSort).toHaveBeenCalledWith('rating');
  });

  it('should whitelist only rating and comment updates (lines 148-149)', async () => {
    const existingReview = { _id: 'review123', company: 'comp123', user: { toString: () => 'user123' } };
    Review.findById.mockResolvedValue(existingReview);
    Review.findByIdAndUpdate.mockResolvedValue(existingReview);
    Review.calcAverageRating = jest.fn();

    const req = { 
      params: { id: 'review123' }, 
      user: { id: 'user123', role: 'user' }, 
      // Include valid and invalid fields
      body: { rating: 5, comment: 'Updated comment!', invalidField: 'hack' } 
    };
    const res = mockRes();
    
    await updateReview(req, res);

    // Verify only 'rating' and 'comment' make it to findByIdAndUpdate
    expect(Review.findByIdAndUpdate).toHaveBeenCalledWith(
      'review123',
      { rating: 5, comment: 'Updated comment!' },
      expect.any(Object)
    );
  });
});
