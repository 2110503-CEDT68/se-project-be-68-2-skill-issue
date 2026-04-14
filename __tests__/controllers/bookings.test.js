jest.mock('../../models/Booking');
jest.mock('../../models/Company');

const Booking = require('../../models/Booking');
const Company = require('../../models/Company');
const { getBookings, getBooking, addBooking, updateBooking, deleteBooking } = require('../../controllers/bookings');

describe('Bookings Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: { id: 'user123', role: 'user' },
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getBookings', () => {
    it('should get bookings for regular user (only their own)', async () => {
      const mockBookings = [{ _id: 'b1', user: 'user123' }];
      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };
      // First populate returns chain, second populate resolves
      mockQuery.populate.mockReturnValueOnce(mockQuery).mockReturnValueOnce(mockBookings);

      // For regular user, Booking.find is called with { user: req.user.id }
      Booking.find.mockReturnValue(mockQuery);

      // Need to make the query thenable
      mockQuery.then = (resolve) => resolve(mockBookings);
      mockQuery[Symbol.toStringTag] = 'Promise';

      // Actually the code does `const bookings = await query` so we need mockQuery to be awaitable
      Booking.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBookings)
        })
      });

      await getBookings(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: mockBookings.length,
        data: mockBookings
      });
    });

    it('should get all bookings for admin', async () => {
      req.user.role = 'admin';
      const mockBookings = [{ _id: 'b1' }, { _id: 'b2' }];

      Booking.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBookings)
        })
      });

      await getBookings(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: mockBookings
      });
    });

    it('should get bookings for admin with company id filter', async () => {
      req.user.role = 'admin';
      req.params.id = 'company123';
      const mockBookings = [{ _id: 'b1' }];

      Booking.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBookings)
        })
      });

      await getBookings(req, res, next);

      expect(Booking.find).toHaveBeenCalledWith({ company: 'company123' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      Booking.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockRejectedValue(new Error('DB error'))
        })
      });

      await getBookings(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot find Bookings'
      });
    });
  });

  describe('getBooking', () => {
    it('should get a single booking', async () => {
      req.params.id = 'booking123';
      const mockBooking = {
        _id: 'booking123',
        user: { toString: () => 'user123' }
      };

      Booking.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBooking)
        })
      });

      await getBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockBooking });
    });

    it('should return 404 if booking not found', async () => {
      req.params.id = 'nonexistent';

      Booking.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      await getBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No booking with the id of nonexistent'
      });
    });

    it('should return 401 if user is not authorized', async () => {
      req.params.id = 'booking123';
      const mockBooking = {
        _id: 'booking123',
        user: { toString: () => 'otheruser' }
      };

      Booking.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBooking)
        })
      });

      await getBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User user123 is not authorized to view this booking'
      });
    });

    it('should allow admin to view any booking', async () => {
      req.params.id = 'booking123';
      req.user.role = 'admin';
      const mockBooking = {
        _id: 'booking123',
        user: { toString: () => 'otheruser' }
      };

      Booking.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBooking)
        })
      });

      await getBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.params.id = 'booking123';
      Booking.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockRejectedValue(new Error('DB error'))
        })
      });

      await getBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot find Booking'
      });
    });
  });

  describe('addBooking', () => {
    it('should create a booking successfully', async () => {
      req.params.id = 'company123';
      req.body = { bookingDate: '2022-05-11T10:00:00Z' };
      const mockBooking = { _id: 'newbooking', bookingDate: '2022-05-11' };

      Booking.find.mockResolvedValue([]);
      Company.findById.mockResolvedValue({ _id: 'company123', name: 'Test Co' });
      Booking.create.mockResolvedValue(mockBooking);

      await addBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockBooking });
    });

    it('should return 400 for invalid date format', async () => {
      req.params.id = 'company123';
      req.body = { bookingDate: 'not-a-date' };

      await addBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid booking date format. Please provide a valid ISO 8601 date string.'
      });
    });

    it('should return 400 if bookingDate is missing', async () => {
      req.params.id = 'company123';
      req.body = {};

      await addBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid booking date format. Please provide a valid ISO 8601 date string.'
      });
    });

    it('should return 400 if date is before May 10, 2022', async () => {
      req.params.id = 'company123';
      req.body = { bookingDate: '2022-05-09T00:00:00Z' };

      await addBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking date must be between May 10th and May 13th, 2022'
      });
    });

    it('should return 400 if date is after May 13, 2022', async () => {
      req.params.id = 'company123';
      req.body = { bookingDate: '2022-05-14T00:00:00Z' };

      await addBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking date must be between May 10th and May 13th, 2022'
      });
    });

    it('should return 400 if user exceeded max bookings', async () => {
      req.params.id = 'company123';
      req.body = { bookingDate: '2022-05-11T10:00:00Z' };

      Booking.find.mockResolvedValue([{}, {}, {}]); // 3 existing bookings

      await addBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'The user with ID user123 has already made 3 bookings'
      });
    });

    it('should allow admin to exceed max bookings', async () => {
      req.params.id = 'company123';
      req.user.role = 'admin';
      req.body = { bookingDate: '2022-05-11T10:00:00Z' };

      Booking.find.mockResolvedValue([{}, {}, {}]);
      Company.findById.mockResolvedValue({ _id: 'company123' });
      Booking.create.mockResolvedValue({ _id: 'newbooking' });

      await addBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if company not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { bookingDate: '2022-05-11T10:00:00Z' };

      Booking.find.mockResolvedValue([]);
      Company.findById.mockResolvedValue(null);

      await addBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No company with the id of nonexistent'
      });
    });

    it('should return 500 on error', async () => {
      req.params.id = 'company123';
      req.body = { bookingDate: '2022-05-11T10:00:00Z' };

      Booking.find.mockResolvedValue([]);
      Company.findById.mockResolvedValue({ _id: 'company123' });
      Booking.create.mockRejectedValue(new Error('DB error'));

      await addBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot create Booking'
      });
    });
  });

  describe('updateBooking', () => {
    it('should update booking successfully', async () => {
      req.params.id = 'booking123';
      req.body = { bookingDate: '2022-05-12T10:00:00Z' };
      const mockBooking = { _id: 'booking123', user: { toString: () => 'user123' } };
      const updatedBooking = { ...mockBooking, bookingDate: '2022-05-12' };

      Booking.findById.mockResolvedValue(mockBooking);
      Booking.findByIdAndUpdate.mockResolvedValue(updatedBooking);

      await updateBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedBooking });
    });

    it('should return 404 if booking not found', async () => {
      req.params.id = 'nonexistent';
      Booking.findById.mockResolvedValue(null);

      await updateBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 401 if not authorized', async () => {
      req.params.id = 'booking123';
      const mockBooking = { _id: 'booking123', user: { toString: () => 'otheruser' } };
      Booking.findById.mockResolvedValue(mockBooking);

      await updateBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should allow admin to update any booking', async () => {
      req.params.id = 'booking123';
      req.user.role = 'admin';
      req.body = {};
      const mockBooking = { _id: 'booking123', user: { toString: () => 'otheruser' } };

      Booking.findById.mockResolvedValue(mockBooking);
      Booking.findByIdAndUpdate.mockResolvedValue(mockBooking);

      await updateBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid bookingDate format', async () => {
      req.params.id = 'booking123';
      req.body = { bookingDate: 'invalid-date' };
      const mockBooking = { _id: 'booking123', user: { toString: () => 'user123' } };

      Booking.findById.mockResolvedValue(mockBooking);

      await updateBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid booking date format. Please provide a valid ISO 8601 date string.'
      });
    });

    it('should return 400 for bookingDate out of range', async () => {
      req.params.id = 'booking123';
      req.body = { bookingDate: '2022-06-01T00:00:00Z' };
      const mockBooking = { _id: 'booking123', user: { toString: () => 'user123' } };

      Booking.findById.mockResolvedValue(mockBooking);

      await updateBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking date must be between May 10th and May 13th, 2022'
      });
    });

    it('should update booking without bookingDate in body', async () => {
      req.params.id = 'booking123';
      req.body = { someOtherField: 'value' };
      const mockBooking = { _id: 'booking123', user: { toString: () => 'user123' } };

      Booking.findById.mockResolvedValue(mockBooking);
      Booking.findByIdAndUpdate.mockResolvedValue(mockBooking);

      await updateBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.params.id = 'booking123';
      Booking.findById.mockRejectedValue(new Error('DB error'));

      await updateBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot update Booking'
      });
    });
  });

  describe('deleteBooking', () => {
    it('should delete booking successfully', async () => {
      req.params.id = 'booking123';
      const mockBooking = {
        _id: 'booking123',
        user: { toString: () => 'user123' },
        deleteOne: jest.fn().mockResolvedValue({})
      };

      Booking.findById.mockResolvedValue(mockBooking);

      await deleteBooking(req, res, next);

      expect(mockBooking.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });

    it('should return 404 if booking not found', async () => {
      req.params.id = 'nonexistent';
      Booking.findById.mockResolvedValue(null);

      await deleteBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 401 if not authorized', async () => {
      req.params.id = 'booking123';
      const mockBooking = {
        _id: 'booking123',
        user: { toString: () => 'otheruser' },
        deleteOne: jest.fn()
      };
      Booking.findById.mockResolvedValue(mockBooking);

      await deleteBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should allow admin to delete any booking', async () => {
      req.params.id = 'booking123';
      req.user.role = 'admin';
      const mockBooking = {
        _id: 'booking123',
        user: { toString: () => 'otheruser' },
        deleteOne: jest.fn().mockResolvedValue({})
      };
      Booking.findById.mockResolvedValue(mockBooking);

      await deleteBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.params.id = 'booking123';
      Booking.findById.mockRejectedValue(new Error('DB error'));

      await deleteBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete Booking'
      });
    });
  });
});
