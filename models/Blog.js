const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    title: { type: String, required: [true, 'Please add a title'], trim: true, minlength: [1, 'Please add a title'], maxlength: [50, 'Title can not be more than 50 characters'] },
    content: { type: String, trim: true, maxlength: [250, 'Body can not be more than 50 characters'] }, // Note: You may want to update the error message to '250 characters'
    
    // Relationships
    author: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },

    numComments: { type: Number, default: 0 },
    isDeletedByAdmin: { type: Boolean, default: false },
    
    createdAt: { type: Date, default: Date.now },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    effectiveDate: { type: Date, default: Date.now }, 
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

BlogSchema.pre('save', function () {
    this.effectiveDate = (this.edited && this.editedAt) ? this.editedAt : this.createdAt;
});

BlogSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
    const update = this.getUpdate();
    const isEdited  = update.$set?.edited  ?? update.edited;
    const editedAt  = update.$set?.editedAt ?? update.editedAt;
    const createdAt = update.$set?.createdAt;

    if (isEdited && editedAt) {
        this.setUpdate({ ...update, $set: { ...update.$set, effectiveDate: editedAt } });
    } else if (createdAt) {
        this.setUpdate({ ...update, $set: { ...update.$set, effectiveDate: createdAt } });
    }
});

BlogSchema.index({ effectiveDate: -1 });

BlogSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'blog',
  justOne: false,
});

module.exports = mongoose.model('Blog', BlogSchema);