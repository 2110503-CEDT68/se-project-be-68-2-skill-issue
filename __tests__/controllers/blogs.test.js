jest.mock('../../models/Blog');

const Blog = require('../../models/Blog');
const { getBlogs, getBlog, addBlog, updateBlog, deleteBlog } = require('../../controllers/blogs');

describe('Blogs Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
    Blog.countDocuments = jest.fn();
  });

  describe('getBlogs', () => {
    it('should return all blogs', async () => {
      const mockBlogs = [{ _id: 'b1', title: 'Blog 1' }, { _id: 'b2', title: 'Blog 2' }];
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockBlogs)
      };
      Blog.find.mockReturnValue(mockQuery);
      Blog.countDocuments.mockResolvedValue(2);

      await getBlogs(req, res, next);

      expect(Blog.find).toHaveBeenCalledWith({});
      expect(Blog.countDocuments).toHaveBeenCalledWith({});
      expect(mockQuery.populate).toHaveBeenCalledWith('author', 'name');
      expect(mockQuery.sort).toHaveBeenCalledWith('-effectiveDate');
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(25);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        pagination: {
          page: 1,
          limit: 25,
          total: 2,
          totalPages: 1
        },
        data: mockBlogs
      });
    });

    it('should apply search and pagination for blogs', async () => {
      req.query = { search: 'React', page: '2', limit: '1' };

      const mockBlogs = [{ _id: 'b2', title: 'React patterns', content: 'Hooks' }];
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockBlogs)
      };

      const expectedFilter = {
        $or: [
          { title: { $regex: 'React', $options: 'i' } },
          { content: { $regex: 'React', $options: 'i' } }
        ]
      };

      Blog.find.mockReturnValue(mockQuery);
      Blog.countDocuments.mockResolvedValue(3);

      await getBlogs(req, res, next);

      expect(Blog.find).toHaveBeenCalledWith(expectedFilter);
      expect(Blog.countDocuments).toHaveBeenCalledWith(expectedFilter);
      expect(mockQuery.skip).toHaveBeenCalledWith(1);
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        pagination: {
          page: 2,
          limit: 1,
          total: 3,
          totalPages: 3,
          next: { page: 3, limit: 1 },
          prev: { page: 1, limit: 1 }
        },
        data: mockBlogs
      });
    });

    it('should escape search text and fallback invalid pagination values', async () => {
      req.query = { search: ' React? ', page: '0', limit: 'abc' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      const expectedFilter = {
        $or: [
          { title: { $regex: 'React\\?', $options: 'i' } },
          { content: { $regex: 'React\\?', $options: 'i' } }
        ]
      };

      Blog.find.mockReturnValue(mockQuery);
      Blog.countDocuments.mockResolvedValue(0);

      await getBlogs(req, res, next);

      expect(Blog.find).toHaveBeenCalledWith(expectedFilter);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(25);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        pagination: {
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 0
        },
        data: []
      });
    });

    it('should return 500 on error', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('DB error'))
      };
      Blog.find.mockReturnValue(mockQuery);
      Blog.countDocuments.mockResolvedValue(0);

      await getBlogs(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'DB error' });
    });
  });

  describe('getBlog', () => {
    it('should return a single blog with comments', async () => {
      const mockBlog = { _id: 'b1', title: 'Blog 1' };
      const mockQuery = { populate: jest.fn().mockReturnThis() };
      mockQuery.populate.mockReturnValueOnce(mockQuery).mockResolvedValueOnce(mockBlog);
      Blog.findById.mockReturnValue(mockQuery);

      req.params.id = 'b1';
      await getBlog(req, res, next);

      expect(Blog.findById).toHaveBeenCalledWith('b1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockBlog });
    });

    it('should return 404 if blog not found', async () => {
      const mockQuery = { populate: jest.fn().mockReturnThis() };
      mockQuery.populate.mockReturnValueOnce(mockQuery).mockResolvedValueOnce(null);
      Blog.findById.mockReturnValue(mockQuery);

      req.params.id = 'nonexistent';
      await getBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Blog not found' });
    });

    it('should return 500 on error', async () => {
      const mockQuery = { populate: jest.fn().mockReturnThis() };
      mockQuery.populate.mockReturnValueOnce(mockQuery).mockRejectedValueOnce(new Error('DB error'));
      Blog.findById.mockReturnValue(mockQuery);

      req.params.id = 'b1';
      await getBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'DB error' });
    });
  });

  describe('addBlog', () => {
    it('should create a blog successfully', async () => {
      req.body = { title: 'Test Blog', content: 'Some content' };
      const mockBlog = { _id: 'blog1', ...req.body, author: 'user123' };
      Blog.create.mockResolvedValue(mockBlog);

      await addBlog(req, res, next);

      expect(req.body.author).toBe('user123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockBlog });
    });

    it('should return 400 if title is undefined', async () => {
      req.body = { content: 'Some content' };

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Title cannot be empty'
      });
    });

    it('should return 400 if content is undefined', async () => {
      req.body = { title: 'Test' };

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Content cannot be empty'
      });
    });

    it('should return 400 if title exceeds 50 characters', async () => {
      req.body = { title: 'a'.repeat(51), content: 'Some content' };

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Character limit exceeded at title'
      });
    });

    it('should return 400 if content exceeds 50 characters', async () => {
      req.body = { title: 'Test', content: 'a'.repeat(51) };

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Character limit exceeded at content'
      });
    });

    it('should return 500 on database error', async () => {
      req.body = { title: 'Test', content: 'Content' };
      Blog.create.mockRejectedValue(new Error('DB error'));

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB error'
      });
    });
  });

  describe('updateBlog', () => {
    it('should return 404 if blog not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { title: 'Updated' };
      Blog.findById.mockResolvedValue(null);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Blog not found'
      });
    });

    it('should return 403 if not authorized to update', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'Updated' };
      req.user = { id: 'user123', role: 'user' };
      const mockBlog = { _id: 'blog1', author: 'user456', title: 'Original' };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to update this blog'
      });
    });

    it('should allow author to update blog title', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'Updated Title' };
      req.user = { id: 'user123' };
      const updatedBlog = { _id: 'blog1', author: 'user123', title: 'Updated Title', content: 'Content', edited: true };
      const mockBlog = {
        _id: 'blog1',
        author: 'user123',
        title: 'Original',
        content: 'Content',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(updatedBlog)
      };
      Blog.findById.mockResolvedValueOnce(mockBlog);

      await updateBlog(req, res, next);

      expect(mockBlog.save).toHaveBeenCalled();
      expect(mockBlog.populate).toHaveBeenCalledWith('author', 'name');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedBlog });
    });

    it('should allow admin to update blog', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'Updated' };
      req.user = { id: 'user456', role: 'admin' };
      const updatedBlog = { _id: 'blog1', author: 'user123', title: 'Updated', content: 'Content', edited: true };
      const mockBlog = {
        _id: 'blog1',
        author: 'user123',
        title: 'Original',
        content: 'Content',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(updatedBlog)
      };
      Blog.findById.mockResolvedValueOnce(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if title exceeds 50 characters', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'a'.repeat(51) };
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123', content: 'Valid content' };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Character limit exceeded at title'
      });
    });

    it('should return 400 if content exceeds 50 characters', async () => {
      req.params.id = 'blog1';
      req.body = { content: 'a'.repeat(51) };
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123', title: 'Valid title' };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Character limit exceeded at content'
      });
    });

    it('should return 400 if title becomes empty after trim', async () => {
      req.params.id = 'blog1';
      req.body = { title: '   ' };
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123', title: 'Original', content: 'Content' };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Title cannot be empty'
      });
    });

    it('should return 400 if content becomes empty after trim', async () => {
      req.params.id = 'blog1';
      req.body = { content: '   ' };
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123', title: 'Valid title', content: 'Old content' };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Content cannot be empty'
      });
    });

    it('should return 200 without saving if no changes', async () => {
      req.params.id = 'blog1';
      req.body = {};
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123', title: 'Original', content: 'Content', save: jest.fn() };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(mockBlog.save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockBlog });
    });

    it('should allow updating both title and content', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'New Title', content: 'New Content' };
      req.user = { id: 'user123' };
      const updatedBlog = { _id: 'blog1', author: 'user123', title: 'New Title', content: 'New Content', edited: true };
      const mockBlog = {
        _id: 'blog1',
        author: 'user123',
        title: 'Old Title',
        content: 'Old Content',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(updatedBlog)
      };
      Blog.findById.mockResolvedValueOnce(mockBlog);

      await updateBlog(req, res, next);

      expect(mockBlog.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on database error during update', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'Updated' };
      req.user = { id: 'user123' };
      Blog.findById.mockRejectedValue(new Error('DB error'));

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB error'
      });
    });

    it('should return 400 if blog has no title and none is provided', async () => {
      req.params.id = 'blog1';
      req.body = {};
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123' };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Title cannot be empty'
      });
    });

    it('should return 400 if blog has no content and none is provided', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'Valid Title' };
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123' };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Content cannot be empty'
      });
    });
  });

  describe('deleteBlog', () => {
    it('should return 404 if blog not found', async () => {
      req.params.id = 'nonexistent';
      Blog.findById.mockResolvedValue(null);

      await deleteBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Blog not found'
      });
    });

    it('should return 403 if not authorized to delete', async () => {
      req.params.id = 'blog1';
      req.user = { id: 'user123', role: 'user' };
      const mockBlog = { _id: 'blog1', author: 'user456' };
      Blog.findById.mockResolvedValue(mockBlog);

      await deleteBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to delete this blog'
      });
    });

    it('should allow author to delete blog', async () => {
      req.params.id = 'blog1';
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123' };
      Blog.findById.mockResolvedValue(mockBlog);
      Blog.findByIdAndDelete.mockResolvedValue({});

      await deleteBlog(req, res, next);

      expect(Blog.findByIdAndDelete).toHaveBeenCalledWith('blog1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
    });

    it('should allow admin to delete blog', async () => {
      req.params.id = 'blog1';
      req.user = { id: 'user456', role: 'admin' };
      const mockBlog = { _id: 'blog1', author: 'user123' };
      Blog.findById.mockResolvedValue(mockBlog);
      Blog.findByIdAndDelete.mockResolvedValue({});

      await deleteBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on database error during delete', async () => {
      req.params.id = 'blog1';
      Blog.findById.mockRejectedValue(new Error('DB error'));

      await deleteBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB error'
      });
    });
  });
});
