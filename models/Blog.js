const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    title: { type: String, required: [true, 'Please add a title'], trim: true, minlength: [1, 'Please add a title'], maxlength: [50, 'Title can not be more than 50 characters'] },
    content: { type: String, trim: true, maxlength: [250, 'Body can not be more than 50 characters'] },
    author: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    numComments: { type: Number, default: 0 },
    isDeletedByAdmin: {type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    edited : {type : Boolean, default : false},
    editedAt: { type: Date, default: Date.now },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

BlogSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'blog',
  justOne: false,
});

module.exports = mongoose.model('Blog', BlogSchema);