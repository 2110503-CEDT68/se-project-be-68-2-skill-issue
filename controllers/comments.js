const Comment = require('../models/Comment.js');

exports.getComments = async (req, res, next) => {
  try {
    const query = Comment.find({ blog: req.params.id }).populate('author', 'name').sort('-effectiveDate');
    const comments = await query;
    res.status(200).json({ success: true, count: comments.length, data: comments });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.addComment = async (req, res, next) => {
  try {

    req.body.blog = req.params.id;
    req.body.author = req.user.id;

    const trimmedText = (req.body.text ?? '').toString().trim();

    if(typeof req.body.blog === "undefined" 
      || typeof req.body.author === "undefined")return res.status(400).json(
        {
          success: false, 
          message: "Please enter Blog and Author"
        });

    if(!trimmedText)
      return res.status(400).json(
        {
          success: false, 
          message: "Please enter text"
        });
    if(trimmedText.length > 100)
      return res.status(400).json(
        {
          success: false, 
          message: "Character limit exceeded"
        });

    req.body.text = trimmedText;
      
    let comment = await Comment.create(req.body);
    return res.status(201).json({ success: true, data: comment });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId).populate('author', 'name');
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    return res.status(200).json({ success: true, data: comment });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateComment = async (req, res, next) => {
  try {
    let comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this comment' });
    }
    
    const trimmed = (req.body.text ?? '').toString().trim();  

    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Please provide text to update' });
    }
    if (trimmed.length > 100) {
      return res.status(400).json({ success: false, message: 'Character limit exceeded' });
    }

    if (comment.text === trimmed) {
      return res.status(200).json({ success: true, data: comment });
    }
    comment.text = trimmed;
    comment.edited = true;
    comment.editedAt = Date.now();
    await comment.save();
    comment = await comment.populate('author', 'name');

    return res.status(200).json({ success: true, data: comment });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(req.params.commentId);
    return res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};