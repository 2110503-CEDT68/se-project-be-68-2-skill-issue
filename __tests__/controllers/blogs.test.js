jest.mock('../../models/Blog');

const Blog = require('../../models/Blog');
const { getBlogs, getBlog, addBlog, updateBlog, deleteBlog } = require('../../controllers/blogs');

describe('Blogs Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: { id: 'user123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getBlogs', () => {
    it('should return all blogs', async () => {
      const mockBlogs = [{ _id: 'b1', title: 'Blog 1' }, { _id: 'b2', title: 'Blog 2' }];
      const mockQuery = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue(mockBlogs) };
      Blog.find.mockReturnValue(mockQuery);

      await getBlogs(req, res, next);

      expect(Blog.find).toHaveBeenCalled();
      expect(mockQuery.populate).toHaveBeenCalledWith('author', 'name');
      expect(mockQuery.sort).toHaveBeenCalledWith('-effectiveDate');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, count: 2, data: mockBlogs });
    });

    it('should return 500 on error', async () => {
      const mockQuery = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockRejectedValue(new Error('DB error')) };
      Blog.find.mockReturnValue(mockQuery);

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
        message: 'Please enter Title and Content'
      });
    });

    it('should return 400 if content is undefined', async () => {
      req.body = { title: 'Test' };

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please enter Title and Content'
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

    it('should return 401 if not authorized to update', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'Updated' };
      req.user = { id: 'user123', role: 'user' };
      const mockBlog = { _id: 'blog1', author: 'user456', title: 'Original' };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to update this blog'
      });
    });

    it('should allow author to update blog title', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'Updated Title' };
      req.user = { id: 'user123' };
      const mockBlog = {
        _id: 'blog1',
        author: 'user123',
        title: 'Original',
        content: 'Content'
      };
      const mockQuery = { populate: jest.fn().mockResolvedValue({...mockBlog, title: 'Updated Title', edited: true, editedAt: Date.now()}) };
      Blog.findById.mockResolvedValueOnce(mockBlog);
      Blog.findByIdAndUpdate.mockReturnValue(mockQuery);

      await updateBlog(req, res, next);

      expect(Blog.findByIdAndUpdate).toHaveBeenCalledWith(
        'blog1',
        expect.objectContaining({ $set: expect.objectContaining({ title: 'Updated Title' }) }),
        expect.objectContaining({ new: true, runValidators: true })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should allow admin to update blog', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'Updated' };
      req.user = { id: 'user456', role: 'admin' };
      const mockBlog = { _id: 'blog1', author: 'user123', title: 'Original' };
      const mockQuery = { populate: jest.fn().mockResolvedValue({...mockBlog, title: 'Updated', edited: true}) };
      Blog.findById.mockResolvedValueOnce(mockBlog);
      Blog.findByIdAndUpdate.mockReturnValue(mockQuery);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if title exceeds 50 characters', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'a'.repeat(51) };
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123' };
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
      const mockBlog = { _id: 'blog1', author: 'user123' };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Character limit exceeded at content'
      });
    });

    it('should return 400 if neither title nor content provided', async () => {
      req.params.id = 'blog1';
      req.body = {};
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123' };
      Blog.findById.mockResolvedValue(mockBlog);

      await updateBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please provide title or content to update'
      });
    });

    it('should allow updating both title and content', async () => {
      req.params.id = 'blog1';
      req.body = { title: 'New Title', content: 'New Content' };
      req.user = { id: 'user123' };
      const mockBlog = { _id: 'blog1', author: 'user123' };
      const mockQuery = { populate: jest.fn().mockResolvedValue({...mockBlog, title: 'New Title', content: 'New Content', edited: true}) };
      Blog.findById.mockResolvedValueOnce(mockBlog);
      Blog.findByIdAndUpdate.mockReturnValue(mockQuery);

      await updateBlog(req, res, next);

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

    it('should return 401 if not authorized to delete', async () => {
      req.params.id = 'blog1';
      req.user = { id: 'user123', role: 'user' };
      const mockBlog = { _id: 'blog1', author: 'user456' };
      Blog.findById.mockResolvedValue(mockBlog);

      await deleteBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
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
