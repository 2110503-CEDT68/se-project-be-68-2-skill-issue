const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    text: { type: String, required: [true, "Please add a comment text"], trim: true, minlength: [1, 'Please add a comment text'], maxlength: [100, 'Comment cannot exceed 100 characters'] },
    blog: { type: mongoose.Schema.ObjectId, ref: 'Blog', required: true },
    author: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    edited : {type : Boolean, default : false },
    editedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Comment', CommentSchema);