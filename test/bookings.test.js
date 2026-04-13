/**
 * Unit Tests: controllers/bookings.js
 * Tests: getBookings, getBooking, addBooking, updateBooking, deleteBooking
 */

// ── Mock dependencies ──────────────────────────────────────────────────────
jest.mock('../models/Booking');
jest.mock('../models/Company');

const Booking = require('../models/Booking');
const Company = require('../models/Company');

const {
  getBookings,
  getBooking,
  addBooking,
  updateBooking,
  deleteBooking,
} = require('../controllers/bookings');

// ── Helpers ────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const VALID_DATE   = '2022-05-11T10:00:00.000Z';
const INVALID_DATE = '2022-05-20T10:00:00.000Z'; // outside window

const sampleBooking = {
  _id: 'booking123',
  bookingDate: VALID_DATE,
  user: 'user123',
  company: 'comp123',
  toString: () => 'booking123',
  deleteOne: jest.fn().mockResolvedValue({}),
};

// Bookmark user stringify helper — Booking.user is populated as an object or stored as ObjectId
// The controller calls booking.user.toString() so we need this on the sample booking's user field.
const bookingWithUser = {
  ...sampleBooking,
  user: { toString: () => 'user123', _id: 'user123' },
};

beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════
// getBookings
// ══════════════════════════════════════════════════════════════════════════
describe('getBookings', () => {
  const buildChain = (result) => ({
    populate: jest.fn().mockReturnThis(),
    then: undefined,
    // make it thenable — await resolves to result
    [Symbol.asyncIterator]: undefined,
  });

  // Helper to create a chain where the last populate resolves
  const chain = (result) => {
    const obj = { populate: jest.fn() };
    obj.populate.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(result) });
    return obj;
  };

  it('should return only current user bookings for non-admin', async () => {
    Booking.find.mockReturnValue(chain([sampleBooking]));

    const req = { user: { id: 'user123', role: 'user' }, params: {} };
    const res = mockRes();

    await getBookings(req, res);

    expect(Booking.find).toHaveBeenCalledWith({ user: 'user123' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 1 })
    );
  });

  it('should return all bookings for admin without params.id', async () => {
    Booking.find.mockReturnValue(chain([sampleBooking]));

    const req = { user: { id: 'admin1', role: 'admin' }, params: {} };
    const res = mockRes();

    await getBookings(req, res);

    expect(Booking.find).toHaveBeenCalledWith();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should filter by company when admin supplies params.id', async () => {
    Booking.find.mockReturnValue(chain([sampleBooking]));

    const req = { user: { id: 'admin1', role: 'admin' }, params: { id: 'comp123' } };
    const res = mockRes();

    await getBookings(req, res);

    expect(Booking.find).toHaveBeenCalledWith({ company: 'comp123' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 500 on query execution error', async () => {
    // The try/catch in getBookings wraps only the await query call.
    // To trigger it, return a chain whose final populate rejects.
    const rejectingChain = {
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error('DB Error')),
      }),
    };
    Booking.find.mockReturnValue(rejectingChain);

    const req = { user: { id: 'user1', role: 'user' }, params: {} };
    const res = mockRes();

    await getBookings(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Cannot find Bookings' })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// getBooking
// ══════════════════════════════════════════════════════════════════════════
describe('getBooking', () => {
  const chain = (result) => {
    const obj = { populate: jest.fn() };
    obj.populate.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(result) });
    return obj;
  };

  it('should return a booking when user is the owner', async () => {
    Booking.findById.mockReturnValue(chain(bookingWithUser));

    const req = { params: { id: 'booking123' }, user: { id: 'user123', role: 'user' } };
    const res = mockRes();

    await getBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: bookingWithUser })
    );
  });

  it('should return a booking when user is admin', async () => {
    Booking.findById.mockReturnValue(chain(bookingWithUser));

    const req = { params: { id: 'booking123' }, user: { id: 'otheradmin', role: 'admin' } };
    const res = mockRes();

    await getBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 404 when booking not found', async () => {
    Booking.findById.mockReturnValue(chain(null));

    const req = { params: { id: 'notexist' }, user: { id: 'user123', role: 'user' } };
    const res = mockRes();

    await getBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('should return 401 when user is not the booking owner', async () => {
    Booking.findById.mockReturnValue(chain(bookingWithUser));

    const req = { params: { id: 'booking123' }, user: { id: 'otheruser', role: 'user' } };
    const res = mockRes();

    await getBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('should return 500 on error', async () => {
    Booking.findById.mockImplementation(() => { throw new Error('DB Error'); });

    const req = { params: { id: 'booking123' }, user: { id: 'user123', role: 'user' } };
    const res = mockRes();

    await getBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// addBooking
// ══════════════════════════════════════════════════════════════════════════
describe('addBooking', () => {
  it('should return 400 when bookingDate is missing', async () => {
    const req = {
      body: {},
      params: { id: 'comp123' },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await addBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('Invalid booking date') })
    );
  });

  it('should return 400 when bookingDate is invalid format', async () => {
    const req = {
      body: { bookingDate: 'not-a-date' },
      params: { id: 'comp123' },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await addBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('Invalid booking date') })
    );
  });

  it('should return 400 when bookingDate is outside allowed range', async () => {
    const req = {
      body: { bookingDate: INVALID_DATE },
      params: { id: 'comp123' },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await addBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('May 10th and May 13th') })
    );
  });

  it('should return 400 when user already has 3 bookings', async () => {
    Booking.find.mockResolvedValue([{}, {}, {}]); // 3 bookings

    const req = {
      body: { bookingDate: VALID_DATE },
      params: { id: 'comp123' },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await addBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('already made 3 bookings') })
    );
  });

  it('should bypass booking limit for admin users', async () => {
    Booking.find.mockResolvedValue([{}, {}, {}]); // 3 existing
    Company.findById.mockResolvedValue({ _id: 'comp123' });
    Booking.create.mockResolvedValue(sampleBooking);

    const req = {
      body: { bookingDate: VALID_DATE },
      params: { id: 'comp123' },
      user: { id: 'admin1', role: 'admin' },
    };
    const res = mockRes();

    await addBooking(req, res);

    expect(Booking.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 404 when company does not exist', async () => {
    Booking.find.mockResolvedValue([]);
    Company.findById.mockResolvedValue(null);

    const req = {
      body: { bookingDate: VALID_DATE },
      params: { id: 'badcomp' },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await addBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('should create booking successfully on valid request', async () => {
    Booking.find.mockResolvedValue([]);
    Company.findById.mockResolvedValue({ _id: 'comp123' });
    Booking.create.mockResolvedValue(sampleBooking);

    const req = {
      body: { bookingDate: VALID_DATE },
      params: { id: 'comp123' },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await addBooking(req, res);

    expect(Booking.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: sampleBooking })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// updateBooking
// ══════════════════════════════════════════════════════════════════════════
describe('updateBooking', () => {
  it('should return 404 when booking not found', async () => {
    Booking.findById.mockResolvedValue(null);

    const req = { params: { id: 'notexist' }, body: {}, user: { id: 'user123', role: 'user' } };
    const res = mockRes();

    await updateBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 401 when user is not the booking owner', async () => {
    Booking.findById.mockResolvedValue(bookingWithUser);

    const req = {
      params: { id: 'booking123' },
      body: {},
      user: { id: 'otheruser', role: 'user' },
    };
    const res = mockRes();

    await updateBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 400 when updated date is invalid format', async () => {
    Booking.findById.mockResolvedValue(bookingWithUser);

    const req = {
      params: { id: 'booking123' },
      body: { bookingDate: 'not-a-date' },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await updateBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Invalid booking date') })
    );
  });

  it('should return 400 when updated date is outside range', async () => {
    Booking.findById.mockResolvedValue(bookingWithUser);

    const req = {
      params: { id: 'booking123' },
      body: { bookingDate: INVALID_DATE },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await updateBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('May 10th and May 13th') })
    );
  });

  it('should update and return booking on valid request', async () => {
    const updatedBooking = { ...sampleBooking, bookingDate: VALID_DATE };
    Booking.findById.mockResolvedValue(bookingWithUser);
    Booking.findByIdAndUpdate.mockResolvedValue(updatedBooking);

    const req = {
      params: { id: 'booking123' },
      body: { bookingDate: VALID_DATE },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await updateBooking(req, res);

    expect(Booking.findByIdAndUpdate).toHaveBeenCalledWith(
      'booking123',
      { bookingDate: VALID_DATE },
      { new: true, runValidators: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: updatedBooking })
    );
  });

  it('should return 500 when database throws an error during updateBooking (lines 127-128)', async () => {
    Booking.findById.mockRejectedValueOnce(new Error('Simulated Database Error'));
    
    const req = { 
      params: { id: 'booking123' }, 
      user: { id: 'user123', role: 'user' },
      body: { bookingDate: '2022-05-11T10:00:00.000Z' }
    };
    const res = mockRes();

    await updateBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Cannot update Booking' })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// deleteBooking
// ══════════════════════════════════════════════════════════════════════════
describe('deleteBooking', () => {
  it('should return 404 when booking not found', async () => {
    Booking.findById.mockResolvedValue(null);

    const req = { params: { id: 'notexist' }, user: { id: 'user123', role: 'user' } };
    const res = mockRes();

    await deleteBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 401 when user is not the booking owner', async () => {
    Booking.findById.mockResolvedValue(bookingWithUser);

    const req = {
      params: { id: 'booking123' },
      user: { id: 'otheruser', role: 'user' },
    };
    const res = mockRes();

    await deleteBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should delete booking when user is the owner', async () => {
    Booking.findById.mockResolvedValue(bookingWithUser);

    const req = {
      params: { id: 'booking123' },
      user: { id: 'user123', role: 'user' },
    };
    const res = mockRes();

    await deleteBooking(req, res);

    expect(bookingWithUser.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
  });

  it('should allow admin to delete any booking', async () => {
    Booking.findById.mockResolvedValue(bookingWithUser);

    const req = {
      params: { id: 'booking123' },
      user: { id: 'admin1', role: 'admin' },
    };
    const res = mockRes();

    await deleteBooking(req, res);

    expect(bookingWithUser.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 500 on database error', async () => {
    Booking.findById.mockRejectedValue(new Error('DB Error'));

    const req = { params: { id: 'booking123' }, user: { id: 'user123', role: 'user' } };
    const res = mockRes();

    await deleteBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('Booking Error Catch Blocks', () => {
  it('should return 500 on server error during updateBooking (lines 127-128)', async () => {
    Booking.findById.mockRejectedValueOnce(new Error('DB Error'));
    
    const req = { params: { id: 'booking123' }, body: { bookingDate: '2022-05-11T10:00:00.000Z' } };
    const res = mockRes();

    await updateBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Cannot update Booking' }));
  });

  it('should return 500 on server error during deleteBooking (lines 169-170)', async () => {
    Booking.findById.mockRejectedValueOnce(new Error('DB Error'));
    
    const req = { params: { id: 'booking123' } };
    const res = mockRes();

    await deleteBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Cannot delete Booking' }));
  });
});
