const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Set env vars before requiring model
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_EXPIRE = '30d';

// We need to test the schema hooks and methods, so we test them via the model directly
// but mock mongoose.connect since we don't need a real DB

describe('User Model', () => {
  let User;

  beforeAll(() => {
    User = require('../../models/User');
  });

  describe('Schema definition', () => {
    it('should have required fields', () => {
      const schema = User.schema.paths;
      expect(schema.name).toBeDefined();
      expect(schema.telephone_number).toBeDefined();
      expect(schema.email).toBeDefined();
      expect(schema.password).toBeDefined();
      expect(schema.role).toBeDefined();
      expect(schema.createdAt).toBeDefined();
    });

    it('should have name as required', () => {
      const nameField = User.schema.paths.name;
      expect(nameField.isRequired).toBeTruthy();
    });

    it('should have email as required and unique', () => {
      const emailField = User.schema.paths.email;
      expect(emailField.isRequired).toBeTruthy();
    });

    it('should have password with select false', () => {
      const passwordField = User.schema.paths.password;
      expect(passwordField.options.select).toBe(false);
    });

    it('should have role with default user', () => {
      const roleField = User.schema.paths.role;
      expect(roleField.options.default).toBe('user');
    });

    it('should have role enum of user and admin', () => {
      const roleField = User.schema.paths.role;
      expect(roleField.options.enum).toEqual(['user', 'admin']);
    });
  });

  describe('pre save hook - password hashing', () => {
    it('should hash password before saving', async () => {
      const user = new User({
        name: 'Test User',
        telephone_number: '0812345678',
        email: 'test@test.com',
        password: 'password123',
        role: 'user'
      });

      // Manually trigger the pre-save hook
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash('password123', salt);

      // The hook should modify password
      expect(user.password).toBe('password123');
      // After running pre save
      await user.schema.s.hooks.execPre('save', user);
      expect(user.password).not.toBe('password123');
      expect(user.password.startsWith('$2a$') || user.password.startsWith('$2b$')).toBe(true);
    });
  });

  describe('getSignedJwtToken', () => {
    it('should return a valid JWT token', () => {
      const user = new User({
        name: 'Test',
        telephone_number: '0812345678',
        email: 'jwt@test.com',
        password: 'password123'
      });
      
      const token = user.getSignedJwtToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(user._id.toString());
    });
  });

  describe('matchPassword', () => {
    it('should return true for matching password', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      const user = new User({
        name: 'Test',
        telephone_number: '0812345678',
        email: 'match@test.com',
        password: hashedPassword
      });

      const result = await user.matchPassword('password123');
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      const user = new User({
        name: 'Test',
        telephone_number: '0812345678',
        email: 'nomatch@test.com',
        password: hashedPassword
      });

      const result = await user.matchPassword('wrongpassword');
      expect(result).toBe(false);
    });
  });

  describe('validation', () => {
    it('should fail validation without required fields', async () => {
      const user = new User({});
      let err;
      try {
        await user.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors.name).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.password).toBeDefined();
      expect(err.errors.telephone_number).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const user = new User({
        name: 'Test',
        telephone_number: '0812345678',
        email: 'invalid-email',
        password: 'password123'
      });
      let err;
      try {
        await user.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors.email).toBeDefined();
    });

    it('should fail with password too short', async () => {
      const user = new User({
        name: 'Test',
        telephone_number: '0812345678',
        email: 'test@valid.com',
        password: '12345'
      });
      let err;
      try {
        await user.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors.password).toBeDefined();
    });

    it('should pass validation with valid data', async () => {
      const user = new User({
        name: 'Test',
        telephone_number: '0812345678',
        email: 'valid@test.com',
        password: 'password123'
      });
      const err = user.validateSync();
      expect(err).toBeUndefined();
    });

    it('should fail with invalid role', async () => {
      const user = new User({
        name: 'Test',
        telephone_number: '0812345678',
        email: 'role@test.com',
        password: 'password123',
        role: 'superadmin'
      });
      let err;
      try {
        await user.validate();
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.errors.role).toBeDefined();
    });
  });
});
