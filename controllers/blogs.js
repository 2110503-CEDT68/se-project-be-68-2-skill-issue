
const Blog = require('../models/Blog.js');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;

const parsePositiveInteger = (value, fallback) => {
  const parsedValue = parseInt(value, 10);
  return Number.isNaN(parsedValue) || parsedValue < 1 ? fallback : parsedValue;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getBlogs = async (req, res, next) => {
  try {
    const filters = {};
    const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    if (searchTerm) {
      const escapedSearchTerm = escapeRegex(searchTerm);
      filters.$or = [
        { title: { $regex: escapedSearchTerm, $options: 'i' } },
        { content: { $regex: escapedSearchTerm, $options: 'i' } }
      ];
    }

    const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);
    const startIndex = (page - 1) * limit;
    const total = await Blog.countDocuments(filters);

    const blogs = await Blog.find(filters)
      .populate('author', 'name')
      .sort('-effectiveDate')
      .skip(startIndex)
      .limit(limit);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const pagination = { page, limit, total, totalPages };

    if (page < totalPages) {
      pagination.next = { page: page + 1, limit };
    }

    if (startIndex > 0 && total > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({ success: true, count: blogs.length, pagination, data: blogs });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('author', 'name').populate('comments');
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.status(200).json({ success: true, data: blog });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.addBlog = async (req, res, next) => {
  try {

    req.body.author = req.user.id;

    if(typeof req.body.title === "undefined" 
      || typeof req.body.content === "undefined")return res.status(400).json(
        {
          success: false, 
          message: "Please enter Title and Content"
        });
    if(req.body.title.toString().length > 50)return res.status(400).json(
        {
          success: false, 
          message: "Character limit exceeded at title"
        });
    if(req.body.content.toString().length > 50)return res.status(400).json(
        {
          success: false, 
          message: "Character limit exceeded at content"
        });
    let blog = await Blog.create(req.body);
    return res.status(201).json({ success: true, data: blog });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBlog = async (req, res, next) => {
  try {
    let blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this blog' });
    }


    const newTitle = req.body.title ?? blog.title;
    const newContent = req.body.content ?? blog.content;


    const trimmedTitle = (newTitle ?? '').toString().trim();
    const trimmedContent = (newContent ?? '').toString().trim();
    if(!trimmedTitle) {
      return res.status(400).json({ success: false, message: 'Title cannot be empty' });
    }

    if(!trimmedContent) {
      return res.status(400).json({ success: false, message: 'Content cannot be empty' });
    }

    if (trimmedTitle.length > 50) {
      return res.status(400).json({ success: false, message: 'Character limit exceeded at title' });
    }
    if (trimmedContent.length > 50) {
      return res.status(400).json({ success: false, message: 'Character limit exceeded at content' });
    }

    if (blog.title === trimmedTitle && blog.content === trimmedContent) {
      return res.status(200).json({ success: true, data: blog });
    }

    blog.title = trimmedTitle;
    blog.content = trimmedContent;
    blog.edited = true;
    blog.editedAt = Date.now();
    await blog.save();
    blog = await blog.populate('author', 'name');


    return res.status(200).json({ success: true, data: blog });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this blog' });
    }

    await Blog.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};