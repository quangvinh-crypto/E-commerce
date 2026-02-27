const mongoose = require('mongoose');
const { getESClient, isESConnected } = require('../config/elasticsearch');
const { Product } = require('../models');
const CacheService = require('./CacheService');

const PRODUCT_INDEX = 'products';

class SearchService {
  async initIndex() {
    if (!isESConnected()) return false;

    try {
      const client = getESClient();
      const { body: exists } = await client.indices.exists({ index: PRODUCT_INDEX });

      if (!exists) {
        await client.indices.create({
          index: PRODUCT_INDEX,
          body: {
            settings: {
              analysis: {
                analyzer: {
                  vietnamese: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding'],
                  },
                },
              },
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text', analyzer: 'vietnamese', fields: { keyword: { type: 'keyword' } } },
                description: { type: 'text', analyzer: 'vietnamese' },
                price: { type: 'float' },
                quantity: { type: 'integer' },
                categoryId: { type: 'keyword' },
                categoryName: { type: 'text', analyzer: 'vietnamese', fields: { keyword: { type: 'keyword' } } },
                isActive: { type: 'boolean' },
                images: { type: 'nested', properties: { url: { type: 'keyword' }, publicId: { type: 'keyword' } } },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
              },
            },
          },
        });
        console.log('OpenSearch: Product index created');
      }
      return true;
    } catch (error) {
      console.error('OpenSearch init index error:', error.message);
      return false;
    }
  }

  async indexProduct(product) {
    if (!isESConnected()) return false;

    try {
      const client = getESClient();
      const populated = await Product.findById(product.id).populate({ path: 'category', select: 'name' });

      await client.index({
        index: PRODUCT_INDEX,
        id: product.id.toString(),
        body: {
          id: product.id.toString(),
          name: product.name,
          description: product.description,
          price: parseFloat(product.price),
          quantity: product.quantity,
          categoryId: product.categoryId ? product.categoryId.toString() : null,
          categoryName: populated?.category?.name || null,
          isActive: product.isActive,
          images: product.images || [],
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
        refresh: true,
      });
      return true;
    } catch (error) {
      console.error('OpenSearch index product error:', error.message);
      return false;
    }
  }

  async removeProduct(productId) {
    if (!isESConnected()) return false;

    try {
      const client = getESClient();
      await client.delete({ index: PRODUCT_INDEX, id: productId.toString(), refresh: true });
      return true;
    } catch (error) {
      if (error.meta?.statusCode !== 404) {
        console.error('OpenSearch remove product error:', error.message);
      }
      return false;
    }
  }

  async bulkIndexProducts() {
    if (!isESConnected()) return { success: false, message: 'OpenSearch not connected' };

    try {
      const products = await Product.find().populate({ path: 'category', select: 'name' });
      if (products.length === 0) return { success: true, indexed: 0 };

      const client = getESClient();
      const body = products.flatMap((p) => [
        { index: { _index: PRODUCT_INDEX, _id: p.id.toString() } },
        {
          id: p.id.toString(),
          name: p.name,
          description: p.description,
          price: parseFloat(p.price),
          quantity: p.quantity,
          categoryId: p.categoryId ? p.categoryId.toString() : null,
          categoryName: p.category?.name || null,
          isActive: p.isActive,
          images: p.images || [],
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        },
      ]);

      const { body: result } = await client.bulk({ body, refresh: true });
      return { success: !result.errors, indexed: products.length, errors: result.errors };
    } catch (error) {
      console.error('OpenSearch bulk index error:', error.message);
      return { success: false, message: error.message };
    }
  }

  async search(query, filters = {}, options = {}) {
    const cacheKey = CacheService.generateHash({ query, filters, options });
    const cached = await CacheService.getSearchResults(cacheKey);
    if (cached) return cached;

    if (!isESConnected()) {
      return this.fallbackSearch(query, filters, options);
    }

    try {
      const { categoryId, minPrice, maxPrice, isActive = true } = filters;
      const { page = 1, limit = 10, sortBy = '_score', sortOrder = 'desc' } = options;

      const must = [];
      const filter = [];

      if (query) {
        must.push({
          multi_match: {
            query,
            fields: ['name^3', 'description', 'categoryName'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (categoryId) filter.push({ term: { categoryId: categoryId.toString() } });
      if (isActive !== undefined) filter.push({ term: { isActive } });
      if (minPrice || maxPrice) {
        const range = { price: {} };
        if (minPrice) range.price.gte = minPrice;
        if (maxPrice) range.price.lte = maxPrice;
        filter.push({ range });
      }

      const client = getESClient();
      const { body: result } = await client.search({
        index: PRODUCT_INDEX,
        body: {
          from: (page - 1) * limit,
          size: limit,
          query: { bool: { must: must.length ? must : [{ match_all: {} }], filter } },
          sort: sortBy === '_score' ? [{ _score: sortOrder }] : [{ [sortBy]: sortOrder }],
        },
      });

      const response = {
        products: result.hits.hits.map((hit) => ({ ...hit._source, _score: hit._score })),
        pagination: {
          total: result.hits.total.value,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(result.hits.total.value / limit),
        },
      };

      await CacheService.setSearchResults(cacheKey, response, 300);
      return response;
    } catch (error) {
      console.error('OpenSearch search error:', error.message);
      return this.fallbackSearch(query, filters, options);
    }
  }

  async suggest(query, limit = 10) {
    if (!isESConnected() || !query) return [];

    try {
      const client = getESClient();
      const { body: result } = await client.search({
        index: PRODUCT_INDEX,
        body: {
          size: limit,
          query: {
            bool: {
              should: [
                { prefix: { 'name.keyword': { value: query, case_insensitive: true } } },
                { match: { name: { query, fuzziness: 'AUTO' } } },
              ],
              filter: [{ term: { isActive: true } }],
            },
          },
          _source: ['id', 'name', 'price'],
        },
      });

      return result.hits.hits.map((hit) => hit._source);
    } catch (error) {
      console.error('OpenSearch suggest error:', error.message);
      return [];
    }
  }

  async fallbackSearch(query, filters = {}, options = {}) {
    const { categoryId, minPrice, maxPrice, isActive = true } = filters;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = options;

    const where = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) where.categoryId = categoryId;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.$gte = minPrice;
      if (maxPrice) where.price.$lte = maxPrice;
    }
    if (query) {
      where.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ];
    }

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const sortDirection = String(sortOrder).toUpperCase() === 'ASC' ? 1 : -1;

    const [rows, count] = await Promise.all([
      Product.find(where)
        .populate({ path: 'category', select: 'name' })
        .sort({ [sortBy]: sortDirection })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit),
      Product.countDocuments(where),
    ]);

    return {
      products: rows,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
      },
      fallback: true,
    };
  }
}

module.exports = new SearchService();
