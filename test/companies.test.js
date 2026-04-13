/**
 * Unit Tests: controllers/companies.js
 * Tests: getCompanies, getCompany, createCompany, updateCompany, deleteCompany
 */

// ── Mock dependencies ──────────────────────────────────────────────────────
jest.mock('../models/Company');
jest.mock('../models/Booking');
jest.mock('../models/Review');

const Company = require('../models/Company');
const Booking = require('../models/Booking');
const Review  = require('../models/Review');

const {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} = require('../controllers/companies');

// ── Helpers ────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const sampleCompany = {
  _id: 'comp123',
  name: 'Acme Corp',
  address: '123 Main St',
  website: 'https://acme.com',
  description: 'A great company',
  telephone_number: '0812345678',
  deleteOne: jest.fn().mockResolvedValue({}),
};

beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════
// getCompanies
// ══════════════════════════════════════════════════════════════════════════
describe('getCompanies', () => {
  const buildChain = (companies) => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      select:   jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      skip:     jest.fn().mockReturnThis(),
      limit:    jest.fn().mockResolvedValue(companies),
    };
    return chain;
  };

  it('should return all companies with pagination meta', async () => {
    const companies = [sampleCompany];
    Company.find.mockReturnValue(buildChain(companies));
    Company.countDocuments.mockResolvedValue(1);

    const req = { query: {} };
    const res = mockRes();

    await getCompanies(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 1, data: companies })
    );
  });

  it('should not include next page when on last page', async () => {
    Company.find.mockReturnValue(buildChain([sampleCompany]));
    Company.countDocuments.mockResolvedValue(1);

    const req = { query: { page: '1', limit: '25' } };
    const res = mockRes();

    await getCompanies(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.pagination.next).toBeUndefined();
  });

  it('should include prev page when not on first page', async () => {
    Company.find.mockReturnValue(buildChain([]));
    Company.countDocuments.mockResolvedValue(30);

    const req = { query: { page: '2', limit: '25' } };
    const res = mockRes();

    await getCompanies(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.pagination.prev).toEqual({ page: 1, limit: 25 });
  });

  it('should return 400 on database error', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      skip:     jest.fn().mockReturnThis(),
      limit:    jest.fn().mockRejectedValue(new Error('DB Error')),
    };
    Company.find.mockReturnValue(chain);
    Company.countDocuments.mockResolvedValue(0);

    const req = { query: {} };
    const res = mockRes();

    await getCompanies(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false });
  });

  it('should apply specific select fields if requested (lines 37-38)', async () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockChain = { 
      populate: jest.fn().mockReturnThis(), 
      select: mockSelect, 
      sort: jest.fn().mockReturnThis(), 
      skip: jest.fn().mockReturnThis(), 
      limit: jest.fn().mockResolvedValue([]) 
    };
    
    Company.find.mockReturnValue(mockChain);
    Company.countDocuments.mockResolvedValue(0);

    const req = { query: { select: 'name,description' } };
    const res = mockRes();

    await getCompanies(req, res);
    
    // Verifies the comma was replaced with a space
    expect(mockSelect).toHaveBeenCalledWith('name description');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// getCompany
// ══════════════════════════════════════════════════════════════════════════
describe('getCompany', () => {
  it('should return a company by ID', async () => {
    Company.findById.mockResolvedValue(sampleCompany);

    const req = { params: { id: 'comp123' } };
    const res = mockRes();

    await getCompany(req, res);

    expect(Company.findById).toHaveBeenCalledWith('comp123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: sampleCompany });
  });

  it('should return 400 when company not found', async () => {
    Company.findById.mockResolvedValue(null);

    const req = { params: { id: 'notexist' } };
    const res = mockRes();

    await getCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false });
  });

  it('should return 400 on database error', async () => {
    Company.findById.mockRejectedValue(new Error('DB Error'));

    const req = { params: { id: 'bad' } };
    const res = mockRes();

    await getCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// createCompany
// ══════════════════════════════════════════════════════════════════════════
describe('createCompany', () => {
  it('should create and return a new company with status 201', async () => {
    Company.create.mockResolvedValue(sampleCompany);

    const req = { body: { name: 'Acme Corp', address: '123 Main St' } };
    const res = mockRes();

    await createCompany(req, res);

    expect(Company.create).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: sampleCompany });
  });

  it('should return 400 with error message on failure', async () => {
    Company.create.mockRejectedValue(new Error('Validation failed'));

    const req = { body: {} };
    const res = mockRes();

    await createCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Validation failed' })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// updateCompany
// ══════════════════════════════════════════════════════════════════════════
describe('updateCompany', () => {
  it('should update and return the company', async () => {
    const updated = { ...sampleCompany, name: 'Acme Updated' };
    Company.findByIdAndUpdate.mockResolvedValue(updated);

    const req = { params: { id: 'comp123' }, body: { name: 'Acme Updated' } };
    const res = mockRes();

    await updateCompany(req, res);

    expect(Company.findByIdAndUpdate).toHaveBeenCalledWith(
      'comp123',
      { name: 'Acme Updated' },
      { new: true, runValidators: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
  });

  it('should return 400 when company not found', async () => {
    Company.findByIdAndUpdate.mockResolvedValue(null);

    const req = { params: { id: 'notexist' }, body: {} };
    const res = mockRes();

    await updateCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false });
  });

  it('should return 400 on error', async () => {
    Company.findByIdAndUpdate.mockRejectedValue(new Error('DB Error'));

    const req = { params: { id: 'comp123' }, body: {} };
    const res = mockRes();

    await updateCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// deleteCompany
// ══════════════════════════════════════════════════════════════════════════
describe('deleteCompany', () => {
  it('should delete company and cascade-delete bookings and reviews', async () => {
    Company.findById.mockResolvedValue(sampleCompany);
    Booking.deleteMany.mockResolvedValue({});
    Review.deleteMany.mockResolvedValue({});

    const req = { params: { id: 'comp123' } };
    const res = mockRes();

    await deleteCompany(req, res);

    expect(Booking.deleteMany).toHaveBeenCalledWith({ company: 'comp123' });
    expect(Review.deleteMany).toHaveBeenCalledWith({ company: 'comp123' });
    expect(sampleCompany.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
  });

  it('should return 400 when company not found', async () => {
    Company.findById.mockResolvedValue(null);

    const req = { params: { id: 'notexist' } };
    const res = mockRes();

    await deleteCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Company not found' })
    );
  });

  it('should return 400 on database error', async () => {
    Company.findById.mockRejectedValue(new Error('DB Error'));

    const req = { params: { id: 'comp123' } };
    const res = mockRes();

    await deleteCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Delete failed due to server error' })
    );
  });
});

describe('getCompanies Advanced Queries', () => {
  // Inside companies.test.js -> describe('getCompanies Advanced Queries' ...)
  it('should format comparison operators correctly in query (lines 31-32)', async () => {
    const mockChain = { 
      populate: jest.fn().mockReturnThis(), 
      sort: jest.fn().mockReturnThis(), // <--- ADD THIS LINE
      skip: jest.fn().mockReturnThis(), 
      limit: jest.fn().mockResolvedValue([]) 
    };
    Company.find.mockReturnValue(mockChain);
    Company.countDocuments.mockResolvedValue(0);

    const req = { query: { averageRating: { gte: '4' } } };
    const res = mockRes();

    await getCompanies(req, res);
    
    expect(Company.find).toHaveBeenCalledWith({ averageRating: { $gte: '4' } });
  });

  it('should apply specific select fields if requested (lines 37-38)', async () => {
    const mockSelect = jest.fn().mockReturnThis();
    const mockChain = { populate: jest.fn().mockReturnThis(), select: mockSelect, sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    
    Company.find.mockReturnValue(mockChain);
    Company.countDocuments.mockResolvedValue(0);

    // Provide the select query parameter
    const req = { query: { select: 'name,description' } };
    const res = mockRes();

    await getCompanies(req, res);
    
    // Verify that the comma was replaced by a space
    expect(mockSelect).toHaveBeenCalledWith('name description');
  });
});
