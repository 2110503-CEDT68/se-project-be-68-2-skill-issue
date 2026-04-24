jest.mock('../../models/Company');
jest.mock('../../models/Booking');
jest.mock('../../models/Review');

const Company = require('../../models/Company');
const Booking = require('../../models/Booking');
const Review = require('../../models/Review');
const { getCompanies, getCompany, createCompany, updateCompany, deleteCompany } = require('../../controllers/companies');

describe('Companies Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      user: { id: 'admin123', role: 'admin' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getCompanies', () => {
    it('should get all companies with defaults', async () => {
      const mockCompanies = [{ _id: 'c1', name: 'Company 1' }];
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockCompanies)
      };

      Company.find.mockReturnValue(mockQuery);
      Company.countDocuments.mockResolvedValue(1);

      await getCompanies(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        pagination: {},
        data: mockCompanies
      });
    });

    it('should handle select query parameter', async () => {
      req.query = { select: 'name,address' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      Company.find.mockReturnValue(mockQuery);
      Company.countDocuments.mockResolvedValue(0);

      await getCompanies(req, res, next);

      expect(mockQuery.select).toHaveBeenCalledWith('name address');
    });

    it('should handle sort query parameter', async () => {
      req.query = { sort: 'name,-createdAt' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      Company.find.mockReturnValue(mockQuery);
      Company.countDocuments.mockResolvedValue(0);

      await getCompanies(req, res, next);

      expect(mockQuery.sort).toHaveBeenCalledWith('name -createdAt');
    });

    it('should handle pagination with next page', async () => {
      req.query = { page: '1', limit: '1' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ _id: 'c1' }])
      };

      Company.find.mockReturnValue(mockQuery);
      Company.countDocuments.mockResolvedValue(3);

      await getCompanies(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        pagination: { next: { page: 2, limit: 1 } }
      }));
    });

    it('should handle pagination with prev page', async () => {
      req.query = { page: '2', limit: '1' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ _id: 'c2' }])
      };

      Company.find.mockReturnValue(mockQuery);
      Company.countDocuments.mockResolvedValue(3);

      await getCompanies(req, res, next);

      const paginationArg = res.json.mock.calls[0][0].pagination;
      expect(paginationArg.prev).toEqual({ page: 1, limit: 1 });
      expect(paginationArg.next).toEqual({ page: 3, limit: 1 });
    });

    it('should handle filter with comparison operators', async () => {
      req.query = { averageRating: { gte: '3' } };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      Company.find.mockReturnValue(mockQuery);
      Company.countDocuments.mockResolvedValue(0);

      await getCompanies(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on error', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('DB error'))
      };
      Company.find.mockReturnValue(mockQuery);
      Company.countDocuments.mockRejectedValue(new Error('DB error'));

      await getCompanies(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false });
    });
  });

  describe('getCompany', () => {
    it('should get a single company', async () => {
      req.params.id = 'company123';
      const mockCompany = { _id: 'company123', name: 'Test Co' };
      Company.findById.mockResolvedValue(mockCompany);

      await getCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCompany });
    });

    it('should return 400 if company not found', async () => {
      req.params.id = 'nonexistent';
      Company.findById.mockResolvedValue(null);

      await getCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false });
    });

    it('should return 400 on error', async () => {
      req.params.id = 'invalid';
      Company.findById.mockRejectedValue(new Error('Cast error'));

      await getCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false });
    });
  });

  describe('createCompany', () => {
    it('should create a company', async () => {
      req.body = {
        name: 'New Co',
        address: '123 St',
        website: 'http://test.com',
        description: 'Test',
        telephone_number: '0812345678'
      };
      const mockCompany = { _id: 'newco', ...req.body };
      Company.create.mockResolvedValue(mockCompany);

      await createCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCompany });
    });

    it('should return 400 on error', async () => {
      req.body = {};
      Company.create.mockRejectedValue(new Error('Validation error'));

      await createCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Validation error' });
    });
  });

  describe('updateCompany', () => {
    it('should update a company', async () => {
      req.params.id = 'company123';
      req.body = { name: 'Updated Co' };
      const mockCompany = { _id: 'company123', name: 'Updated Co' };
      Company.findByIdAndUpdate.mockResolvedValue(mockCompany);

      await updateCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCompany });
    });

    it('should trim all string fields on update', async () => {
      req.params.id = 'company123';
      req.body = {
        name: '  Trimmed Co  ',
        address: '  123 St  ',
        website: '  http://test.com  ',
        description: '  Some desc  ',
        telephone_number: '  0812345678  '
      };
      const mockCompany = { _id: 'company123', name: 'Trimmed Co' };
      Company.findByIdAndUpdate.mockResolvedValue(mockCompany);

      await updateCompany(req, res, next);

      expect(req.body.name).toBe('Trimmed Co');
      expect(req.body.address).toBe('123 St');
      expect(req.body.website).toBe('http://test.com');
      expect(req.body.description).toBe('Some desc');
      expect(req.body.telephone_number).toBe('0812345678');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if company not found', async () => {
      req.params.id = 'nonexistent';
      Company.findByIdAndUpdate.mockResolvedValue(null);

      await updateCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false });
    });

    it('should return 400 on error', async () => {
      req.params.id = 'company123';
      Company.findByIdAndUpdate.mockRejectedValue(new Error('DB error'));

      await updateCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false });
    });
  });

  describe('deleteCompany', () => {
    it('should delete company and associated bookings/reviews', async () => {
      req.params.id = 'company123';
      const mockCompany = {
        _id: 'company123',
        deleteOne: jest.fn().mockResolvedValue({})
      };
      Company.findById.mockResolvedValue(mockCompany);
      Booking.deleteMany.mockResolvedValue({});
      Review.deleteMany.mockResolvedValue({});

      await deleteCompany(req, res, next);

      expect(Booking.deleteMany).toHaveBeenCalledWith({ company: 'company123' });
      expect(Review.deleteMany).toHaveBeenCalledWith({ company: 'company123' });
      expect(mockCompany.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });

    it('should return 400 if company not found', async () => {
      req.params.id = 'nonexistent';
      Company.findById.mockResolvedValue(null);

      await deleteCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Company not found' });
    });

    it('should return 400 on error', async () => {
      req.params.id = 'company123';
      Company.findById.mockRejectedValue(new Error('DB error'));

      await deleteCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Delete failed due to server error' });
    });
  });
});
