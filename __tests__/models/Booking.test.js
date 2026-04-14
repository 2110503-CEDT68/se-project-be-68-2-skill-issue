const mongoose = require('mongoose');

describe('Booking Model', () => {
  let Booking;

  beforeAll(() => {
    Booking = require('../../models/Booking');
  });

  describe('Schema definition', () => {
    it('should have required fields', () => {
      const schema = Booking.schema.paths;
      expect(schema.bookingDate).toBeDefined();
      expect(schema.user).toBeDefined();
      expect(schema.company).toBeDefined();
      expect(schema.createdAt).toBeDefined();
    });

    it('should have bookingDate as required', () => {
      expect(Booking.schema.paths.bookingDate.isRequired).toBeTruthy();
    });

    it('should have user as required', () => {
      expect(Booking.schema.paths.user.isRequired).toBeTruthy();
    });

    it('should have company as required', () => {
      expect(Booking.schema.paths.company.isRequired).toBeTruthy();
    });

    it('should have user ref to User', () => {
      expect(Booking.schema.paths.user.options.ref).toBe('User');
    });

    it('should have company ref to Company', () => {
      expect(Booking.schema.paths.company.options.ref).toBe('Company');
    });

    it('should have createdAt with default Date.now', () => {
      expect(Booking.schema.paths.createdAt.options.default).toBe(Date.now);
    });
  });

  describe('validation', () => {
    const validBooking = {
      bookingDate: new Date('2022-05-11'),
      user: new mongoose.Types.ObjectId(),
      company: new mongoose.Types.ObjectId()
    };

    it('should validate with valid data', () => {
      const booking = new Booking(validBooking);
      const err = booking.validateSync();
      expect(err).toBeUndefined();
    });

    it('should fail without bookingDate', () => {
      const booking = new Booking({
        user: new mongoose.Types.ObjectId(),
        company: new mongoose.Types.ObjectId()
      });
      const err = booking.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.bookingDate).toBeDefined();
    });

    it('should fail without user', () => {
      const booking = new Booking({
        bookingDate: new Date('2022-05-11'),
        company: new mongoose.Types.ObjectId()
      });
      const err = booking.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.user).toBeDefined();
    });

    it('should fail without company', () => {
      const booking = new Booking({
        bookingDate: new Date('2022-05-11'),
        user: new mongoose.Types.ObjectId()
      });
      const err = booking.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.company).toBeDefined();
    });

    it('should fail with date before May 10, 2022', () => {
      const booking = new Booking({
        bookingDate: new Date('2022-05-09'),
        user: new mongoose.Types.ObjectId(),
        company: new mongoose.Types.ObjectId()
      });
      const err = booking.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.bookingDate).toBeDefined();
    });

    it('should fail with date after May 13, 2022', () => {
      const booking = new Booking({
        bookingDate: new Date('2022-05-14T01:00:00Z'),
        user: new mongoose.Types.ObjectId(),
        company: new mongoose.Types.ObjectId()
      });
      const err = booking.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.bookingDate).toBeDefined();
    });
  });
});
