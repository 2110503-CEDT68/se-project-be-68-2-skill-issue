const mongoose = require('mongoose');
const Comment = require('../../models/Comment');

describe('Comment Model (FINAL)', () => {

  const makeId = () => new mongoose.Types.ObjectId();

  const validData = () => ({
    text: 'Valid comment',
    blog: makeId(),
    author: makeId()
  });

  // =========================
  // ✅ BASIC + VALIDATION
  // =========================
  describe('validation', () => {

    it('should create valid comment', () => {
      const comment = new Comment(validData());
      expect(comment.validateSync()).toBeUndefined();
    });

    it('should fail without text', () => {
      const comment = new Comment({ ...validData(), text: undefined });
      const err = comment.validateSync();
      expect(err.errors.text).toBeDefined();
    });

    it('should fail if text too long', () => {
      const comment = new Comment({
        ...validData(),
        text: 'a'.repeat(101)
      });

      const err = comment.validateSync();
      expect(err.errors.text).toBeDefined();
    });

    it('should fail without blog', () => {
      const comment = new Comment({ ...validData(), blog: undefined });
      const err = comment.validateSync();
      expect(err.errors.blog).toBeDefined();
    });

    it('should fail without author', () => {
      const comment = new Comment({ ...validData(), author: undefined });
      const err = comment.validateSync();
      expect(err.errors.author).toBeDefined();
    });

  });

  // =========================
  // ✅ DEFAULT VALUES
  // =========================
  describe('defaults', () => {

    it('should set default values', () => {
      const comment = new Comment(validData());

      expect(comment.isDeletedByAdmin).toBe(false);
      expect(comment.edited).toBe(false);
      expect(comment.createdAt).toBeDefined();
    });

  });

  // =========================
  // ✅ PRE SAVE HOOK (DIRECT)
  // =========================
  describe('pre save hook (coverage)', () => {

    it('should use createdAt when not edited', () => {
      const createdAt = new Date('2023-01-01');

      const comment = new Comment({
        ...validData(),
        createdAt,
        edited: false
      });

      const hook = Comment.schema.s.hooks._pres.get('save')[0].fn;
      hook.call(comment, () => {});

      expect(comment.effectiveDate.getTime())
        .toBe(createdAt.getTime());
    });

    it('should use editedAt when edited', () => {
      const editedAt = new Date('2024-01-01');

      const comment = new Comment({
        ...validData(),
        edited: true,
        editedAt
      });

      const hook = Comment.schema.s.hooks._pres.get('save')[0].fn;
      hook.call(comment, () => {});

      expect(comment.effectiveDate.getTime())
        .toBe(editedAt.getTime());
    });

    it('should fallback to createdAt when edited true but no editedAt', () => {
      const createdAt = new Date('2023-01-01');

      const comment = new Comment({
        ...validData(),
        createdAt,
        edited: true
      });

      const hook = Comment.schema.s.hooks._pres.get('save')[0].fn;
      hook.call(comment, () => {});

      expect(comment.effectiveDate.getTime())
        .toBe(createdAt.getTime());
    });

  });

  // =========================
  // ✅ PRE UPDATE HOOK
  // =========================
  describe('pre update hook', () => {

    it('should set effectiveDate when edited via $set', () => {
      const editedAt = new Date();

      const query = {
        getUpdate: () => ({
          $set: { edited: true, editedAt }
        }),
        setUpdate: jest.fn()
      };

      const hook = Comment.schema.s.hooks._pres.get('findOneAndUpdate')[0].fn;
      hook.call(query, () => {});

      expect(query.setUpdate).toHaveBeenCalled();
    });

    it('should set effectiveDate when createdAt provided', () => {
      const createdAt = new Date();

      const query = {
        getUpdate: () => ({
          $set: { createdAt }
        }),
        setUpdate: jest.fn()
      };

      const hook = Comment.schema.s.hooks._pres.get('findOneAndUpdate')[0].fn;
      hook.call(query, () => {});

      expect(query.setUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          $set: expect.objectContaining({
            effectiveDate: createdAt
          })
        })
      );
    });

    it('should handle top-level update (no $set)', () => {
      const editedAt = new Date();

      const query = {
        getUpdate: () => ({
          edited: true,
          editedAt
        }),
        setUpdate: jest.fn()
      };

      const hook = Comment.schema.s.hooks._pres.get('findOneAndUpdate')[0].fn;
      hook.call(query, () => {});

      expect(query.setUpdate).toHaveBeenCalled();
    });

    it('should not modify effectiveDate when no condition', () => {
      const query = {
        getUpdate: () => ({
          $set: { text: 'hello' }
        }),
        setUpdate: jest.fn()
      };

      const hook = Comment.schema.s.hooks._pres.get('findOneAndUpdate')[0].fn;
      hook.call(query, () => {});

      expect(query.setUpdate).not.toHaveBeenCalled();
    });

  });

  // =========================
  // ✅ INDEX
  // =========================
  describe('index', () => {

    it('should have blog + effectiveDate index', () => {
      const indexes = Comment.schema.indexes();

      const found = indexes.some(i =>
        i[0].blog === 1 && i[0].effectiveDate === -1
      );

      expect(found).toBe(true);
    });

  });

});