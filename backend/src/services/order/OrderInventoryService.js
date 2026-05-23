const { Product } = require('../../models');

class OrderInventoryService {
  findSelectedVariant(product, variantId) {
    if (!product) return null;

    if (variantId) {
      return (product.variants || []).find(
        (variant) => String(variant._id) === String(variantId) && variant.isActive !== false
      ) || null;
    }

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants.find((variant) => variant.isActive !== false) || product.variants[0];
    }

    return null;
  }

  async reserveStock(productId, variantId, requiredQty) {
    if (variantId) {
      const updateResult = await Product.updateOne(
        {
          _id: productId,
          'variants._id': variantId,
          'variants.quantity': { $gte: requiredQty },
        },
        {
          $inc: {
            'variants.$.quantity': -requiredQty,
            quantity: -requiredQty,
          },
        }
      );

      if (!updateResult.modifiedCount) {
        throw new Error('Failed to reserve stock for selected variant');
      }
      return;
    }

    const updateResult = await Product.updateOne(
      { _id: productId, quantity: { $gte: requiredQty } },
      { $inc: { quantity: -requiredQty } }
    );

    if (!updateResult.modifiedCount) {
      throw new Error('Failed to reserve stock for product');
    }
  }

  async restoreItemStock(item) {
    const product = await Product.findById(item.productId);
    if (!product) return;

    product.quantity += item.quantity;
    if (item.variantId && Array.isArray(product.variants)) {
      const variant = product.variants.find((entry) => String(entry._id) === String(item.variantId));
      if (variant) {
        variant.quantity += item.quantity;
      }
    }
    await product.save();
  }
}

module.exports = new OrderInventoryService();
