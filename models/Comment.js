const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    text: { type: String, required: [true, "Please add a comment text"], trim: true, minlength: [1, 'Please add a comment text'], maxlength: [100, 'Comment cannot exceed 100 characters'] },
    
    // Relationships
    blog: { type: mongoose.Schema.ObjectId, ref: 'Blog', required: true },
    author: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    
    isDeletedByAdmin: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    effectiveDate: { type: Date, default: Date.now }, 
});

CommentSchema.pre('save', function (next) {
    this.effectiveDate = (this.edited && this.editedAt) ? this.editedAt : this.createdAt;
    next();
});

CommentSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
    const update = this.getUpdate();
    const isEdited  = update.$set?.edited  ?? update.edited;
    const editedAt  = update.$set?.editedAt ?? update.editedAt;
    const createdAt = update.$set?.createdAt;

    if (isEdited && editedAt) {
        this.setUpdate({ ...update, $set: { ...update.$set, effectiveDate: editedAt } });
    } else if (createdAt) {
        this.setUpdate({ ...update, $set: { ...update.$set, effectiveDate: createdAt } });
    }
    next();
});

CommentSchema.index({ blog: 1, effectiveDate: -1 });

module.exports = mongoose.model('Comment', CommentSchema);