
const Blog = require('../models/Blog.js');

exports.getBlogs = async (req, res, next) => {
  try {
    const query = Blog.find().populate('author', 'name').sort('-effectiveDate');
    const blogs = await query;
    res.status(200).json({ success: true, count: blogs.length, data: blogs });
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