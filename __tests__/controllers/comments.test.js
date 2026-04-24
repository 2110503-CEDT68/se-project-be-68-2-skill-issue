jest.mock('../../models/Comment');

const Comment = require('../../models/Comment');
const { getComments, addComment, getComment, updateComment, deleteComment } = require('../../controllers/comments');

describe('Comments Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { id: 'blog123' },
      body: {},
      user: { id: 'user123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getComments', () => {
    it('should return all comments for a blog', async () => {
      const mockComments = [{ _id: 'c1', text: 'Comment 1' }, { _id: 'c2', text: 'Comment 2' }];
      const mockQuery = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue(mockComments) };
      Comment.find.mockReturnValue(mockQuery);

      await getComments(req, res, next);

      expect(Comment.find).toHaveBeenCalledWith({ blog: 'blog123' });
      expect(mockQuery.populate).toHaveBeenCalledWith('author', 'name');
      expect(mockQuery.sort).toHaveBeenCalledWith('-effectiveDate');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, count: 2, data: mockComments });
    });

    it('should return 500 on error', async () => {
      const mockQuery = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockRejectedValue(new Error('DB error')) };
      Comment.find.mockReturnValue(mockQuery);

      await getComments(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'DB error' });
    });
  });

  describe('addComment', () => {
    it('should create a comment successfully', async () => {
      req.body = { text: 'Great post!' };
      const mockComment = { _id: 'c1', text: 'Great post!', blog: 'blog123', author: 'user123' };
      Comment.create.mockResolvedValue(mockComment);

      await addComment(req, res, next);

      expect(req.body.blog).toBe('blog123');
      expect(req.body.author).toBe('user123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockComment });
    });

    it('should return 400 if blog param is undefined', async () => {
      req.params = {};
      req.body = { text: 'Test' };

      await addComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please enter Blog and Author'
      });
    });

    it('should return 400 if text is undefined', async () => {
      req.body = {};

      await addComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please enter text'
      });
    });

    it('should return 400 if text exceeds 100 characters', async () => {
      req.body = { text: 'a'.repeat(101) };

      await addComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Character limit exceeded'
      });
    });

    it('should return 500 on database error', async () => {
      req.body = { text: 'Test comment' };
      Comment.create.mockRejectedValue(new Error('DB error'));

      await addComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB error'
      });
    });
  });

  describe('getComment', () => {
    it('should return a comment by id', async () => {
      req.params = { commentId: 'c1' };
      const mockComment = { _id: 'c1', text: 'Great post!' };
      const mockQuery = { populate: jest.fn().mockResolvedValue(mockComment) };
      Comment.findById.mockReturnValue(mockQuery);

      await getComment(req, res, next);

      expect(Comment.findById).toHaveBeenCalledWith('c1');
      expect(mockQuery.populate).toHaveBeenCalledWith('author', 'name');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockComment });
    });

    it('should return 404 if comment not found', async () => {
      req.params = { commentId: 'nonexistent' };
      const mockQuery = { populate: jest.fn().mockResolvedValue(null) };
      Comment.findById.mockReturnValue(mockQuery);

      await getComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Comment not found'
      });
    });

    it('should return 500 on database error for getComment', async () => {
      req.params = { commentId: 'c1' };
      const mockQuery = { populate: jest.fn().mockRejectedValue(new Error('DB error')) };
      Comment.findById.mockReturnValue(mockQuery);

      await getComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB error'
      });
    });
  });

  describe('updateComment', () => {
    it('should return 404 if comment not found', async () => {
      req.params = { commentId: 'nonexistent' };
      req.body = { text: 'Updated' };
      Comment.findById.mockResolvedValue(null);

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Comment not found'
      });
    });

    it('should return 403 if not authorized to update', async () => {
      req.params = { commentId: 'c1' };
      req.body = { text: 'Updated' };
      req.user = { id: 'user123', role: 'user' };
      const mockComment = { _id: 'c1', author: 'user456', text: 'Original' };
      Comment.findById.mockResolvedValue(mockComment);

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to update this comment'
      });
    });

    it('should allow author to update comment', async () => {
      req.params = { commentId: 'c1' };
      req.body = { text: 'Updated text' };
      req.user = { id: 'user123' };
      const updatedComment = { _id: 'c1', author: 'user123', text: 'Updated text', edited: true };
      const mockComment = {
        _id: 'c1',
        author: 'user123',
        text: 'Original',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(updatedComment)
      };
      Comment.findById.mockResolvedValueOnce(mockComment);

      await updateComment(req, res, next);

      expect(mockComment.save).toHaveBeenCalled();
      expect(mockComment.populate).toHaveBeenCalledWith('author', 'name');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedComment });
    });

    it('should allow admin to update comment', async () => {
      req.params = { commentId: 'c1' };
      req.body = { text: 'Updated text' };
      req.user = { id: 'user456', role: 'admin' };
      const updatedComment = { _id: 'c1', author: 'user123', text: 'Updated text', edited: true };
      const mockComment = {
        _id: 'c1',
        author: 'user123',
        text: 'Original',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(updatedComment)
      };
      Comment.findById.mockResolvedValueOnce(mockComment);

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 200 without saving if text is unchanged', async () => {
      req.params = { commentId: 'c1' };
      req.body = { text: 'Same text' };
      req.user = { id: 'user123' };
      const mockComment = { _id: 'c1', author: 'user123', text: 'Same text', save: jest.fn() };
      Comment.findById.mockResolvedValue(mockComment);

      await updateComment(req, res, next);

      expect(mockComment.save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockComment });
    });

    it('should return 400 if text is undefined', async () => {
      req.params = { commentId: 'c1' };
      req.body = {};
      req.user = { id: 'user123' };
      const mockComment = { _id: 'c1', author: 'user123' };
      Comment.findById.mockResolvedValue(mockComment);

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please provide text to update'
      });
    });

    it('should return 400 if text exceeds 100 characters', async () => {
      req.params = { commentId: 'c1' };
      req.body = { text: 'a'.repeat(101) };
      req.user = { id: 'user123' };
      const mockComment = { _id: 'c1', author: 'user123' };
      Comment.findById.mockResolvedValue(mockComment);

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Character limit exceeded'
      });
    });

    it('should return 500 on database error during update', async () => {
      req.params = { commentId: 'c1' };
      req.body = { text: 'Updated' };
      Comment.findById.mockRejectedValue(new Error('DB error'));

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB error'
      });
    });
  });

  describe('deleteComment', () => {
    it('should return 404 if comment not found', async () => {
      req.params = { commentId: 'nonexistent' };
      Comment.findById.mockResolvedValue(null);

      await deleteComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Comment not found'
      });
    });

    it('should return 403 if not authorized to delete', async () => {
      req.params = { commentId: 'c1' };
      req.user = { id: 'user123', role: 'user' };
      const mockComment = { _id: 'c1', author: 'user456' };
      Comment.findById.mockResolvedValue(mockComment);

      await deleteComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    });

    it('should allow author to delete comment', async () => {
      req.params = { commentId: 'c1' };
      req.user = { id: 'user123' };
      const mockComment = { _id: 'c1', author: 'user123' };
      Comment.findById.mockResolvedValue(mockComment);
      Comment.findByIdAndDelete.mockResolvedValue({});

      await deleteComment(req, res, next);

      expect(Comment.findByIdAndDelete).toHaveBeenCalledWith('c1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });

    it('should allow admin to delete comment', async () => {
      req.params = { commentId: 'c1' };
      req.user = { id: 'user456', role: 'admin' };
      const mockComment = { _id: 'c1', author: 'user123' };
      Comment.findById.mockResolvedValue(mockComment);
      Comment.findByIdAndDelete.mockResolvedValue({});

      await deleteComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on database error during delete', async () => {
      req.params = { commentId: 'c1' };
      Comment.findById.mockRejectedValue(new Error('DB error'));

      await deleteComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB error'
      });
    });
  });
});
