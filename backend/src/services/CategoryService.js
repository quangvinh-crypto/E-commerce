const { Category, Product } = require('../models');

class CategoryService {
  async getAllCategories(filters = {}, options = {}) {
    const { search, includeProducts = false } = filters;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = options;

    const whereClause = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const sortDirection = String(sortOrder).toUpperCase() === 'ASC' ? 1 : -1;

    let query = Category.find(whereClause)
      .sort({ [sortBy]: sortDirection })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    if (includeProducts) {
      query = query.populate({ path: 'products', select: 'name price images categoryId' });
    }

    const [rows, count] = await Promise.all([
      query,
      Category.countDocuments(whereClause),
    ]);

    const result = {
      categories: rows,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
      },
    };

    return result;
  }

  async getCategoryById(id, options = {}) {
    const { includeProducts = false } = options;
    let query = Category.findById(id);
    if (includeProducts) {
      query = query.populate({ path: 'products' });
    }

    const category = await query;
    if (!category) throw new Error('Category not found');

    return category;
  }

  async createCategory(categoryData) {
    const { name, description } = categoryData;

    const existing = await Category.findOne({ name });
    if (existing) throw new Error('Category with this name already exists');

    const category = await Category.create({
      name,
      description: description || null,
    });

    return category;
  }

  async updateCategory(id, updateData) {
    const category = await Category.findById(id);
    if (!category) throw new Error('Category not found');

    const { name, description } = updateData;

    if (name && name !== category.name) {
      const existing = await Category.findOne({ name, _id: { $ne: id } });
      if (existing) throw new Error('Category with this name already exists');
      category.name = name;
    }

    if (description !== undefined) category.description = description;

    await category.save();

    return category;
  }

  async deleteCategory(id, force = false) {
    const category = await Category.findById(id).populate({ path: 'products' });
    if (!category) throw new Error('Category not found');

    if (category.products?.length > 0 && !force) {
      throw new Error('Cannot delete category with products. Use force=true to unlink products.');
    }

    if (force && category.products?.length > 0) {
      await Product.updateMany({ categoryId: id }, { $set: { categoryId: null } });
    }

    await category.deleteOne();

    return { message: 'Category deleted successfully', deletedCategory: { id: category.id, name: category.name } };
  }

  async getCategoryStats(id) {
    const category = await Category.findById(id).populate({ path: 'products' });
    if (!category) throw new Error('Category not found');

    return { totalProducts: category.products?.length || 0 };
  }
}

module.exports = new CategoryService();
