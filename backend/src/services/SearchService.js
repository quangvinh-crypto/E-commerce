const mongoose = require('mongoose');
const { Product } = require('../models');

// MongoDB Atlas Search index name.
// Create this index in Atlas for the Product collection with searchable fields:
// name, description, brand, categoryName, searchText, specificationTerms, price,
// categoryId, isActive, createdAt, images.
const ATLAS_SEARCH_INDEX = process.env.ATLAS_SEARCH_INDEX || 'products_search';

class SearchService {
  normalizeSpecifications(specifications) {
    if (!specifications) return {};
    if (typeof specifications === 'object') return specifications;
    if (typeof specifications === 'string') {
      try {
        const parsed = JSON.parse(specifications);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (_) {
        return {};
      }
    }
    return {};
  }

  normalizeText(value = '') {
    return String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  normalizeToken(token = '') {
    return this.normalizeText(token)
      .replace(/(.)\1+/g, '$1')
      .trim();
  }

  expandUnitToken(token = '') {
    const compact = String(token).toLowerCase().replace(/\s+/g, '');
    const variants = new Set([compact]);
    const match = compact.match(/^(\d+(?:\.\d+)?)(tb|t|gb|g)$/);
    if (!match) return Array.from(variants);

    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount) || amount <= 0) return Array.from(variants);

    if (unit === 'tb' || unit === 't') {
      variants.add(`${amount}tb`);
      variants.add(`${amount}t`);
      variants.add(`${amount * 1024}gb`);
      variants.add(`${amount * 1024}g`);
    }

    if (unit === 'gb' || unit === 'g') {
      variants.add(`${amount}gb`);
      variants.add(`${amount}g`);
      if (amount % 1024 === 0) {
        variants.add(`${amount / 1024}tb`);
        variants.add(`${amount / 1024}t`);
      }
    }

    return Array.from(variants);
  }

  expandNumericToken(token = '') {
    const compact = String(token).toLowerCase().replace(/\s+/g, '');
    if (!/^\d{1,4}$/.test(compact)) return [compact];

    const variants = new Set([compact]);
    variants.add(`${compact}gb`);
    variants.add(`${compact}g`);

    const amount = Number(compact);
    if (Number.isFinite(amount) && amount % 1024 === 0 && amount > 0) {
      variants.add(`${amount / 1024}tb`);
      variants.add(`${amount / 1024}t`);
    }

    return Array.from(variants);
  }

  buildSpecificationTerms(specifications) {
    if (!specifications || typeof specifications !== 'object') return [];

    const terms = new Set();
    const walk = (value, keyPath = '') => {
      if (value === null || value === undefined) return;

      if (Array.isArray(value)) {
        value.forEach((item) => walk(item, keyPath));
        return;
      }

      if (typeof value === 'object') {
        Object.entries(value).forEach(([key, nested]) => {
          const normalizedKey = this.normalizeText(key).replace(/\s+/g, '');
          if (normalizedKey) terms.add(normalizedKey);
          walk(nested, key);
        });
        return;
      }

      const normalizedValue = this.normalizeText(value);
      if (!normalizedValue) return;

      terms.add(normalizedValue);
      normalizedValue.split(/\s+/).forEach((token) => {
        this.expandUnitToken(token).forEach((variant) => terms.add(variant));
        this.expandNumericToken(token).forEach((variant) => terms.add(variant));
      });

      if (keyPath) {
        const normalizedKeyPath = this.normalizeText(keyPath).replace(/\s+/g, '');
        if (normalizedKeyPath) {
          terms.add(`${normalizedKeyPath} ${normalizedValue}`);
        }
      }
    };

    walk(specifications);
    return Array.from(terms).filter(Boolean);
  }

  extractBrand(name = '', specifications = {}) {
    const possibleKeys = ['brand', 'manufacturer', 'hang', 'thuonghieu'];
    const normalizedSpecs = specifications && typeof specifications === 'object' ? specifications : {};

    for (const key of possibleKeys) {
      const value = normalizedSpecs[key];
      if (value && String(value).trim()) {
        return String(value).trim();
      }
    }

    const firstToken = String(name || '').trim().split(/\s+/)[0];
    return firstToken || null;
  }

  buildSearchDocument(product, categoryName = null) {
    const specs = this.normalizeSpecifications(product.specifications);
    const brand = this.extractBrand(product.name, specs);
    const specificationTerms = this.buildSpecificationTerms(specs);
    const firstImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null;
    const resolvedCategoryName = categoryName || product.categoryName || product.category?.name || null;
    const searchText = [
      product.name,
      product.description,
      resolvedCategoryName,
      brand,
      ...specificationTerms,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      id: product.id?.toString?.() || String(product._id || ''),
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      quantity: product.quantity,
      categoryId: product.categoryId ? product.categoryId.toString() : null,
      categoryName: resolvedCategoryName,
      brand,
      isActive: product.isActive,
      specifications: specs,
      specificationTerms,
      searchText,
      image_url: firstImage?.url || null,
      createdAt: product.createdAt,
    };
  }

  buildSearchMetadata(product, categoryName = null) {
    const document = this.buildSearchDocument(product, categoryName);
    return {
      brand: document.brand,
      categoryName: document.categoryName,
      specificationTerms: document.specificationTerms,
      searchText: document.searchText,
    };
  }

  mapProductForResponse(product) {
    const imageUrl = product.image_url || product.images?.[0]?.url || null;

    return {
      ...product,
      id: product.id?.toString?.() || String(product._id || ''),
      category: product.categoryId
        ? {
            id: product.categoryId?.toString?.() || String(product.categoryId),
            name: product.categoryName || null,
          }
        : null,
      category_name: product.categoryName || null,
      image_url: imageUrl,
      images: Array.isArray(product.images) ? product.images : imageUrl ? [{ url: imageUrl }] : [],
      _score: product.score,
    };
  }

  buildAtlasFilter(filters = {}) {
    const { categoryId, minPrice, maxPrice, isActive } = filters;
    const filter = [];

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.push({
        equals: {
          path: 'categoryId',
          value: new mongoose.Types.ObjectId(categoryId),
        },
      });
    }

    if (isActive !== undefined) {
      filter.push({
        equals: {
          path: 'isActive',
          value: Boolean(isActive),
        },
      });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const range = {
        path: 'price',
      };
      const parsedMinPrice = Number(minPrice);
      const parsedMaxPrice = Number(maxPrice);
      if (minPrice !== undefined && Number.isFinite(parsedMinPrice)) range.gte = parsedMinPrice;
      if (maxPrice !== undefined && Number.isFinite(parsedMaxPrice)) range.lte = parsedMaxPrice;
      filter.push({ range });
    }

    return filter;
  }

  buildAtlasQuery(query, filters = {}) {
    const rawQuery = String(query || '').trim();
    if (!rawQuery) return null;

    const should = [
      {
        text: {
          query: rawQuery,
          path: ['name', 'description', 'brand', 'categoryName', 'searchText', 'specificationTerms'],
          fuzzy: {
            maxEdits: 1,
            prefixLength: 1,
          },
          score: {
            boost: {
              value: 2,
            },
          },
        },
      },
      {
        text: {
          query: rawQuery,
          path: 'name',
          fuzzy: {
            maxEdits: 1,
            prefixLength: 1,
          },
          score: {
            boost: {
              value: 5,
            },
          },
        },
      },
      {
        text: {
          query: rawQuery,
          path: 'brand',
          fuzzy: {
            maxEdits: 1,
            prefixLength: 1,
          },
          score: {
            boost: {
              value: 4,
            },
          },
        },
      },
      {
        text: {
          query: rawQuery,
          path: 'categoryName',
          fuzzy: {
            maxEdits: 1,
            prefixLength: 1,
          },
          score: {
            boost: {
              value: 3,
            },
          },
        },
      },
      {
        text: {
          query: rawQuery,
          path: 'specificationTerms',
          fuzzy: {
            maxEdits: 1,
            prefixLength: 1,
          },
          score: {
            boost: {
              value: 4,
            },
          },
        },
      },
    ];

    return {
      compound: {
        should,
        minimumShouldMatch: 1,
        filter: this.buildAtlasFilter(filters),
      },
    };
  }

  async syncSearchFields(product) {
    const populatedProduct = product?.category
      ? product
      : await Product.findById(product.id || product._id).populate({ path: 'category', select: 'name' });

    if (!populatedProduct) {
      return null;
    }

    const metadata = this.buildSearchMetadata(populatedProduct, populatedProduct.category?.name || null);

    await Product.updateOne(
      { _id: populatedProduct.id },
      {
        $set: metadata,
      }
    );

    return metadata;
  }

  async initIndex() {
    return this.bulkIndexProducts();
  }

  async indexProduct(product) {
    try {
      await this.syncSearchFields(product);
      return true;
    } catch (error) {
      console.error('Atlas Search sync product error:', error.message);
      return false;
    }
  }

  async removeProduct() {
    // Search fields live inside the product document, so deleting the product
    // removes it from Atlas Search automatically.
    return true;
  }

  async bulkIndexProducts() {
    try {
      const products = await Product.find().populate({ path: 'category', select: 'name' });

      if (products.length === 0) {
        return { success: true, indexed: 0 };
      }

      const bulkOps = products.map((product) => ({
        updateOne: {
          filter: { _id: product.id },
          update: {
            $set: this.buildSearchMetadata(product, product.category?.name || null),
          },
        },
      }));

      await Product.bulkWrite(bulkOps, { ordered: false });

      return { success: true, indexed: products.length };
    } catch (error) {
      console.error('Atlas Search bulk sync error:', error.message);
      return { success: false, message: error.message };
    }
  }

  async search(query, filters = {}, options = {}) {
    const rawQuery = String(query || '').trim();
    if (!rawQuery) {
      return this.fallbackSearch(query, filters, options);
    }

    try {
      const { page = 1, limit = 10, sortBy = '_score', sortOrder = 'desc' } = options;
      const parsedPage = parseInt(page, 10);
      const parsedLimit = parseInt(limit, 10);
      const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
      const supportedSortFields = new Set(['_score', 'name', 'price', 'createdAt', 'quantity', 'brand', 'categoryName']);
      const effectiveSortBy = supportedSortFields.has(sortBy) ? sortBy : '_score';
      const searchStage = {
        $search: {
          index: ATLAS_SEARCH_INDEX,
          ...this.buildAtlasQuery(rawQuery, filters),
        },
      };

      const projectionStage = {
        $project: {
          _id: 1,
          id: { $toString: '$_id' },
          name: 1,
          description: 1,
          price: 1,
          quantity: 1,
          images: 1,
          brand: 1,
          categoryId: 1,
          categoryName: 1,
          isActive: 1,
          specifications: 1,
          specificationTerms: 1,
          searchText: 1,
          createdAt: 1,
          score: { $meta: 'searchScore' },
        },
      };

      const sortStage = effectiveSortBy === '_score'
        ? { score: sortDirection, createdAt: -1 }
        : { [effectiveSortBy]: sortDirection, score: -1, createdAt: -1 };

      const [result] = await Product.aggregate([
        searchStage,
        projectionStage,
        { $sort: sortStage },
        {
          $facet: {
            products: [
              { $skip: (parsedPage - 1) * parsedLimit },
              { $limit: parsedLimit },
            ],
            meta: [{ $count: 'total' }],
          },
        },
      ]);

      const products = (result?.products || []).map((product) => this.mapProductForResponse(product));
      const total = result?.meta?.[0]?.total || products.length;

      if (total === 0) {
        return this.fallbackSearch(query, filters, options);
      }

      return {
        products,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit),
        },
      };
    } catch (error) {
      console.error('Atlas Search search error:', error.message);
      return this.fallbackSearch(query, filters, options);
    }
  }

  async suggest(query, limit = 10) {
    const rawQuery = String(query || '').trim();
    if (!rawQuery) return [];

    try {
      const parsedLimit = parseInt(limit, 10) || 10;
      const [result] = await Product.aggregate([
        {
          $search: {
            index: ATLAS_SEARCH_INDEX,
            compound: {
              should: [
                {
                  autocomplete: {
                    query: rawQuery,
                    path: 'name',
                    fuzzy: {
                      maxEdits: 1,
                      prefixLength: 1,
                    },
                  },
                },
                {
                  autocomplete: {
                    query: rawQuery,
                    path: 'brand',
                    fuzzy: {
                      maxEdits: 1,
                      prefixLength: 1,
                    },
                  },
                },
                {
                  text: {
                    query: rawQuery,
                    path: ['name', 'brand', 'categoryName', 'searchText'],
                    fuzzy: {
                      maxEdits: 1,
                      prefixLength: 1,
                    },
                  },
                },
              ],
              minimumShouldMatch: 1,
              filter: [
                {
                  equals: {
                    path: 'isActive',
                    value: true,
                  },
                },
              ],
            },
          },
        },
        {
          $project: {
            _id: 1,
            id: { $toString: '$_id' },
            name: 1,
            price: 1,
            images: 1,
            categoryName: 1,
            score: { $meta: 'searchScore' },
          },
        },
        { $sort: { score: -1, name: 1 } },
        { $limit: parsedLimit },
      ]);

      return (result || []).map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        category_name: item.categoryName || null,
        image_url: item.images?.[0]?.url || null,
        _score: item.score,
      }));
    } catch (error) {
      console.error('Atlas Search suggest error:', error.message);
      return this.fallbackSuggest(query, limit);
    }
  }

  async fallbackSearch(query, filters = {}, options = {}) {
    const { categoryId, minPrice, maxPrice, isActive } = filters;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = options;
    const effectiveSortBy = sortBy === '_score' ? 'createdAt' : sortBy;

    const where = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) where.categoryId = categoryId;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      const parsedMinPrice = Number(minPrice);
      const parsedMaxPrice = Number(maxPrice);
      if (minPrice !== undefined && Number.isFinite(parsedMinPrice)) where.price.$gte = parsedMinPrice;
      if (maxPrice !== undefined && Number.isFinite(parsedMaxPrice)) where.price.$lte = parsedMaxPrice;
    }
    if (query) {
      const rawQuery = String(query).trim();
      const tokens = rawQuery.split(/\s+/).filter(Boolean);
      const tokenVariants = Array.from(
        new Set(
          tokens.flatMap((token) => {
            const normalized = this.normalizeToken(token);
            const unitVariants = this.expandUnitToken(normalized);
            return [token, normalized, ...unitVariants].filter((value) => value && value.length >= 2);
          })
        )
      );

      where.$or = [
        { name: { $regex: rawQuery, $options: 'i' } },
        { description: { $regex: rawQuery, $options: 'i' } },
        { brand: { $regex: rawQuery, $options: 'i' } },
        { categoryName: { $regex: rawQuery, $options: 'i' } },
        { searchText: { $regex: rawQuery, $options: 'i' } },
        ...tokenVariants.map((token) => ({ name: { $regex: token, $options: 'i' } })),
        ...tokenVariants.map((token) => ({ description: { $regex: token, $options: 'i' } })),
        ...tokenVariants.map((token) => ({ brand: { $regex: token, $options: 'i' } })),
        ...tokenVariants.map((token) => ({ categoryName: { $regex: token, $options: 'i' } })),
      ];
    }

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const sortDirection = String(sortOrder).toUpperCase() === 'ASC' ? 1 : -1;

    const [rows, count] = await Promise.all([
      Product.find(where)
        .populate({ path: 'category', select: 'name' })
        .sort({ [effectiveSortBy]: sortDirection })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit),
      Product.countDocuments(where),
    ]);

    const products = rows.map((product) => this.mapProductForResponse({
      ...product.toObject(),
      categoryName: product.categoryName || product.category?.name || null,
    }));

    return {
      products,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
      },
      fallback: true,
    };
  }

  async fallbackSuggest(query, limit = 10) {
    const rawQuery = String(query || '').trim();
    if (!rawQuery) return [];

    const docs = await Product.find({
      isActive: true,
      $or: [
        { name: { $regex: rawQuery, $options: 'i' } },
        { brand: { $regex: rawQuery, $options: 'i' } },
        { categoryName: { $regex: rawQuery, $options: 'i' } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 10);

    return docs.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      category_name: product.categoryName || null,
      image_url: product.images?.[0]?.url || null,
    }));
  }
}

module.exports = new SearchService();
