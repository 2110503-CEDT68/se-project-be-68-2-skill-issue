jest.mock('../../models/Comment');

const Comment = require('../../models/Comment');
const { getComments, addComment, getComment, updateComment, deleteComment } = require('../../controllers/comments');

const createAuthor = (id) => ({ toString: () => id });

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
    it('should return a single comment', async () => {
      req.params.commentId = 'comment1';
      const mockComment = { _id: 'comment1', text: 'Comment 1' };
      const mockQuery = { populate: jest.fn().mockResolvedValue(mockComment) };
      Comment.findById.mockReturnValue(mockQuery);

      await getComment(req, res, next);

      expect(Comment.findById).toHaveBeenCalledWith('comment1');
      expect(mockQuery.populate).toHaveBeenCalledWith('author', 'name');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockComment });
    });

    it('should return 404 if comment not found', async () => {
      req.params.commentId = 'missing-comment';
      const mockQuery = { populate: jest.fn().mockResolvedValue(null) };
      Comment.findById.mockReturnValue(mockQuery);

      await getComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Comment not found' });
    });

    it('should return 500 on getComment error', async () => {
      req.params.commentId = 'comment1';
      const mockQuery = { populate: jest.fn().mockRejectedValue(new Error('DB error')) };
      Comment.findById.mockReturnValue(mockQuery);

      await getComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'DB error' });
    });
  });

  describe('updateComment', () => {
    it('should return 404 if comment not found', async () => {
      req.params.commentId = 'missing-comment';
      Comment.findById.mockResolvedValue(null);

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Comment not found' });
    });

    it('should return 401 when user is not authorized to update the comment', async () => {
      req.params.commentId = 'comment1';
      req.body = { text: 'Updated text' };
      Comment.findById.mockResolvedValue({ author: createAuthor('other-user') });

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized to update this comment' });
    });

    it('should return 400 when no text is provided', async () => {
      req.params.commentId = 'comment1';
      req.body = {};
      Comment.findById.mockResolvedValue({ author: createAuthor('user123') });

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Please provide text to update' });
    });

    it('should return 400 when text exceeds 100 characters', async () => {
      req.params.commentId = 'comment1';
      req.body = { text: 'a'.repeat(101) };
      Comment.findById.mockResolvedValue({ author: createAuthor('user123') });

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Character limit exceeded' });
    });

    it('should update the comment successfully', async () => {
      req.params.commentId = 'comment1';
      req.body = { text: 'Updated text' };
      const updatedComment = { _id: 'comment1', text: 'Updated text' };
      const updateQuery = { populate: jest.fn().mockResolvedValue(updatedComment) };

      Comment.findById.mockResolvedValue({ author: createAuthor('user123') });
      Comment.findByIdAndUpdate.mockReturnValue(updateQuery);

      await updateComment(req, res, next);

      expect(Comment.findByIdAndUpdate).toHaveBeenCalledWith(
        'comment1',
        {
          $set: {
            text: 'Updated text',
            edited: true,
            editedAt: expect.any(Number)
          }
        },
        { new: true, runValidators: true }
      );
      expect(updateQuery.populate).toHaveBeenCalledWith('author', 'name');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedComment });
    });

    it('should return 500 on updateComment error', async () => {
      req.params.commentId = 'comment1';
      Comment.findById.mockRejectedValue(new Error('DB error'));

      await updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'DB error' });
    });
  });

  describe('deleteComment', () => {
    it('should return 404 if comment not found', async () => {
      req.params.commentId = 'missing-comment';
      Comment.findById.mockResolvedValue(null);

      await deleteComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Comment not found' });
    });

    it('should return 401 when user is not authorized to delete the comment', async () => {
      req.params.commentId = 'comment1';
      Comment.findById.mockResolvedValue({ author: createAuthor('other-user') });

      await deleteComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized to delete this comment' });
    });

    it('should delete the comment successfully', async () => {
      req.params.commentId = 'comment1';
      Comment.findById.mockResolvedValue({ author: createAuthor('user123') });
      Comment.findByIdAndDelete.mockResolvedValue({});

      await deleteComment(req, res, next);

      expect(Comment.findByIdAndDelete).toHaveBeenCalledWith('comment1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });

    it('should return 500 on deleteComment error', async () => {
      req.params.commentId = 'comment1';
      Comment.findById.mockRejectedValue(new Error('DB error'));

      await deleteComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'DB error' });
    });
  });
});
