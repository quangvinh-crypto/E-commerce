const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      default: null,
      index: true,
    },
    rating: {
      type: Number,
      default: null,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();

        if (!ret.productId || typeof ret.productId !== 'object') {
          ret.productId = ret.productId?.toString?.() || ret.productId;
        }
        if (!ret.userId || typeof ret.userId !== 'object') {
          ret.userId = ret.userId?.toString?.() || ret.userId;
        }
        if (!ret.parentId || typeof ret.parentId !== 'object') {
          ret.parentId = ret.parentId?.toString?.() || ret.parentId;
        }
        if (!ret.moderatedBy || typeof ret.moderatedBy !== 'object') {
          ret.moderatedBy = ret.moderatedBy?.toString?.() || ret.moderatedBy;
        }

        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ReviewSchema.index({ productId: 1, parentId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, productId: 1, parentId: 1 });

ReviewSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

module.exports = mongoose.model('Review', ReviewSchema);
