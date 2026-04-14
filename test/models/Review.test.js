const mongoose = require('mongoose');
const Review = require('../../models/Review');
const Company = require('../../models/Company');

jest.mock('../../models/Company');

describe('Review Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Review.aggregate = jest.fn();
    Company.findByIdAndUpdate = jest.fn();
  });

  describe('calcAverageRating static method', () => {
    it('should calculate and update average rating when reviews exist', async () => {
      // Mock stats returning array with >0 length
      Review.aggregate.mockResolvedValue([{ _id: 'comp123', avgRating: 4.56, numReviews: 2 }]);
      mongoose.model = jest.fn().mockReturnValue(Company); // Mock mongoose.model('Company')
      
      await Review.calcAverageRating('comp123');
      
      expect(Review.aggregate).toHaveBeenCalled();
      expect(Company.findByIdAndUpdate).toHaveBeenCalledWith('comp123', {
        averageRating: 4.6, // Checks the Math.round calculation
        numReviews: 2
      });
    });

    it('should reset average rating to 0 when no reviews exist', async () => {
      // Mock empty aggregation
      Review.aggregate.mockResolvedValue([]);
      mongoose.model = jest.fn().mockReturnValue(Company);
      
      await Review.calcAverageRating('comp123');
      
      expect(Company.findByIdAndUpdate).toHaveBeenCalledWith('comp123', {
        averageRating: 0,
        numReviews: 0
      });
    });
  });

  describe('Review Hooks', () => {
    it('should call calcAverageRating after a document is saved', () => {
      const reviewDoc = new Review({ company: 'comp123', rating: 4, comment: 'Good' });
      reviewDoc.constructor.calcAverageRating = jest.fn();
      
      // Manually trigger the post('save') hook
      const postSaveHook = Review.schema.s.hooks._posts.get('save')[0].fn;
      postSaveHook.call(reviewDoc);
      
      expect(reviewDoc.constructor.calcAverageRating).toHaveBeenCalledWith(reviewDoc.company);
    });

    it('should call calcAverageRating after findOneAndDelete', () => {
      const mockDoc = { company: 'comp123', constructor: { calcAverageRating: jest.fn() } };
      
      // Manually trigger the post('findOneAndDelete') hook
      const postDeleteHook = Review.schema.s.hooks._posts.get('findOneAndDelete')[0].fn;
      postDeleteHook.call({}, mockDoc); // Mongoose passes doc as param to post query hooks
      
      expect(mockDoc.constructor.calcAverageRating).toHaveBeenCalledWith('comp123');
    });
  });

  it('should safely do nothing if deleted doc is null in findOneAndDelete post hook (line 63)', () => {
    // Manually trigger the post('findOneAndDelete') hook with a NULL document
    const postDeleteHook = Review.schema.s.hooks._posts.get('findOneAndDelete')[0].fn;
    
    // Expecting it not to throw an error when doc is null
    expect(() => {
      postDeleteHook.call({}, null); 
    }).not.toThrow();
  });
});