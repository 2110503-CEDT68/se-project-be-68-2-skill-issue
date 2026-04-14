const mongoose = require('mongoose');

describe('Company Model', () => {
  let Company;

  beforeAll(() => {
    Company = require('../../models/Company');
  });

  describe('Schema definition', () => {
    it('should have required fields', () => {
      const schema = Company.schema.paths;
      expect(schema.name).toBeDefined();
      expect(schema.address).toBeDefined();
      expect(schema.website).toBeDefined();
      expect(schema.description).toBeDefined();
      expect(schema.telephone_number).toBeDefined();
      expect(schema.averageRating).toBeDefined();
      expect(schema.numReviews).toBeDefined();
    });

    it('should have name as required, unique, trimmed, maxlength 50', () => {
      const nameField = Company.schema.paths.name;
      expect(nameField.isRequired).toBeTruthy();
      expect(nameField.options.unique).toBe(true);
      expect(nameField.options.trim).toBe(true);
      expect(nameField.options.maxlength[0]).toBe(50);
    });

    it('should have address as required', () => {
      expect(Company.schema.paths.address.isRequired).toBeTruthy();
    });

    it('should have website as required', () => {
      expect(Company.schema.paths.website.isRequired).toBeTruthy();
    });

    it('should have description as required', () => {
      expect(Company.schema.paths.description.isRequired).toBeTruthy();
    });

    it('should have telephone_number as required', () => {
      expect(Company.schema.paths.telephone_number.isRequired).toBeTruthy();
    });

    it('should have averageRating default 0', () => {
      expect(Company.schema.paths.averageRating.options.default).toBe(0);
    });

    it('should have numReviews default 0', () => {
      expect(Company.schema.paths.numReviews.options.default).toBe(0);
    });
  });

  describe('virtuals', () => {
    it('should have bookings virtual', () => {
      expect(Company.schema.virtuals.bookings).toBeDefined();
    });

    it('should have reviews virtual', () => {
      expect(Company.schema.virtuals.reviews).toBeDefined();
    });

    it('should have toJSON with virtuals enabled', () => {
      expect(Company.schema.options.toJSON.virtuals).toBe(true);
    });

    it('should have toObject with virtuals enabled', () => {
      expect(Company.schema.options.toObject.virtuals).toBe(true);
    });
  });

  describe('validation', () => {
    const validCompany = {
      name: 'Test Company',
      address: '123 Test St',
      website: 'https://test.com',
      description: 'A test company',
      telephone_number: '0812345678'
    };

    it('should validate with valid data', () => {
      const company = new Company(validCompany);
      const err = company.validateSync();
      expect(err).toBeUndefined();
    });

    it('should fail without name', () => {
      const data = { ...validCompany };
      delete data.name;
      const company = new Company(data);
      const err = company.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.name).toBeDefined();
    });

    it('should fail without address', () => {
      const data = { ...validCompany };
      delete data.address;
      const company = new Company(data);
      const err = company.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.address).toBeDefined();
    });

    it('should fail with name longer than 50 characters', () => {
      const data = { ...validCompany, name: 'A'.repeat(51) };
      const company = new Company(data);
      const err = company.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.name).toBeDefined();
    });

    it('should fail with averageRating > 5', () => {
      const data = { ...validCompany, averageRating: 6 };
      const company = new Company(data);
      const err = company.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.averageRating).toBeDefined();
    });

    it('should fail with averageRating < 0', () => {
      const data = { ...validCompany, averageRating: -1 };
      const company = new Company(data);
      const err = company.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.averageRating).toBeDefined();
    });
  });
});
