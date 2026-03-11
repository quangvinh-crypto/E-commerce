const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 255,
    },
    description: {
      type: String,
      default: null,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    images: {
      type: [
        {
          url: String,
          publicId: String,
        },
      ],
      default: [],
    },
    variants: {
      type: [
        {
          color: {
            type: String,
            required: true,
            trim: true,
          },
          colorHex: {
            type: String,
            default: null,
            trim: true,
          },
          storage: {
            type: String,
            required: true,
            trim: true,
          },
          price: {
            type: Number,
            required: true,
            min: 0,
          },
          quantity: {
            type: Number,
            default: 0,
            min: 0,
          },
          sku: {
            type: String,
            default: null,
            trim: true,
          },
          images: {
            type: [
              {
                url: String,
                publicId: String,
              },
            ],
            default: [],
          },
          isActive: {
            type: Boolean,
            default: true,
          },
        },
      ],
      default: [],
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        if (ret.categoryId) {
          ret.categoryId = ret.categoryId.toString();
        }
        ret.rating = ret.ratingAverage;
        ret.review_count = ret.ratingCount;
        if (Array.isArray(ret.variants)) {
          ret.variants = ret.variants.map((variant) => {
            const normalized = { ...variant };
            normalized.id = variant._id?.toString ? variant._id.toString() : variant.id;
            delete normalized._id;
            return normalized;
          });
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ price: 1 });

ProductSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true,
});

module.exports = mongoose.model('Product', ProductSchema);
