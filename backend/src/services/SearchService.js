const mongoose = require('mongoose');
const { getESClient, isESConnected } = require('../config/elasticsearch');
const { Product } = require('../models');

const PRODUCT_INDEX = 'products';

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
    const searchText = [
      product.name,
      product.description,
      categoryName,
      brand,
      ...specificationTerms,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      id: product.id.toString(),
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      quantity: product.quantity,
      categoryId: product.categoryId ? product.categoryId.toString() : null,
      categoryName: categoryName || null,
      brand: brand || null,
      isActive: product.isActive,
      specifications: specs,
      specificationTerms,
      searchText,
      image_url: firstImage?.url || null,
      createdAt: product.createdAt,
    };
  }

  buildSearchClauses(query) {
    const rawQuery = String(query || '').trim();
    if (!rawQuery) return [];

    const normalizedRawQuery = this.normalizeText(rawQuery);
    const compactRawQuery = normalizedRawQuery.replace(/\s+/g, '');

    const tokens = rawQuery.split(/\s+/).filter(Boolean);
    const tokenVariants = Array.from(
      new Set(
        tokens.flatMap((token) => {
          const normalized = this.normalizeToken(token);
          const compact = normalized.replace(/\s+/g, '');
          return [token, normalized, compact].filter((value) => value && value.length >= 2);
        })
      )
    );

    const queryVariants = new Set([rawQuery, normalizedRawQuery, compactRawQuery]);
    tokenVariants.forEach((token) => {
      this.expandUnitToken(token).forEach((variant) => queryVariants.add(variant));
      this.expandNumericToken(token).forEach((variant) => queryVariants.add(variant));
    });

    return [
      {
        multi_match: {
          query: rawQuery,
          fields: ['name^5', 'brand^4', 'categoryName^2', 'description^2', 'searchText^3', 'specificationTerms^4'],
          fuzziness: 'AUTO',
          prefix_length: 1,
          max_expansions: 50,
          operator: 'or',
        },
      },
      {
        match_phrase_prefix: {
          name: {
            query: rawQuery,
            boost: 3,
          },
        },
      },
      ...Array.from(queryVariants).map((token) => ({
        multi_match: {
          query: token,
          fields: ['name^5', 'brand^5', 'searchText^3', 'specificationTerms^5', 'description'],
          fuzziness: 'AUTO',
          prefix_length: 0,
          max_expansions: 50,
          boost: 2,
        },
      })),
    ];
  }

  extractHardSearchTokens(query = '') {
    const tokens = String(query || '')
      .trim()
      .split(/\s+/)
      .map((token) => this.normalizeToken(token))
      .filter(Boolean);

    const hardKeywords = new Set(['ram', 'rom', 'storage', 'ssd', 'hdd', 'gb', 'tb']);
    const hardTokens = tokens.filter((token) => /\d/.test(token) || hardKeywords.has(token));

    return Array.from(
      new Set(
        hardTokens.flatMap((token) => [
          token,
          ...this.expandUnitToken(token),
          ...this.expandNumericToken(token),
        ])
      )
    );
  }

  mapSearchHit(hit) {
    const source = hit._source || {};
    const imageUrl = source.image_url || null;
    const images = imageUrl ? [{ url: imageUrl }] : [];

    return {
      ...source,
      category: source.categoryId
        ? {
            id: source.categoryId,
            name: source.categoryName || null,
          }
        : null,
      category_name: source.categoryName || null,
      image_url: imageUrl,
      images,
      _score: hit._score,
    };
  }

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
              index: {
                number_of_shards: 1,
                number_of_replicas: 0,
                refresh_interval: '30s',
                codec: 'best_compression',
              },
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
              dynamic: false,
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text', analyzer: 'vietnamese', norms: false, fields: { keyword: { type: 'keyword' } } },
                description: { type: 'text', analyzer: 'vietnamese', norms: false },
                price: { type: 'float' },
                quantity: { type: 'integer' },
                categoryId: { type: 'keyword' },
                categoryName: { type: 'text', analyzer: 'vietnamese', norms: false, fields: { keyword: { type: 'keyword' } } },
                brand: { type: 'text', analyzer: 'vietnamese', norms: false, fields: { keyword: { type: 'keyword' } } },
                isActive: { type: 'boolean' },
                specifications: { type: 'object', enabled: false },
                specificationTerms: { type: 'text', analyzer: 'vietnamese', norms: false },
                searchText: { type: 'text', analyzer: 'vietnamese', norms: false },
                image_url: { type: 'keyword', index: false, doc_values: false },
                createdAt: { type: 'date' },
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
      const document = this.buildSearchDocument(product, populated?.category?.name || null);

      await client.index({
        index: PRODUCT_INDEX,
        id: product.id.toString(),
        body: document,
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
      await client.delete({ index: PRODUCT_INDEX, id: productId.toString() });
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
      const client = getESClient();
      const { body: exists } = await client.indices.exists({ index: PRODUCT_INDEX });

      if (exists) {
        await client.indices.delete({ index: PRODUCT_INDEX });
      }

      const initialized = await this.initIndex();
      if (!initialized) {
        return { success: false, message: 'Failed to initialize search index' };
      }

      const products = await Product.find().populate({ path: 'category', select: 'name' });
      if (products.length === 0) return { success: true, indexed: 0 };

      const body = products.flatMap((p) => [
        { index: { _index: PRODUCT_INDEX, _id: p.id.toString() } },
        this.buildSearchDocument(p, p.category?.name || null),
      ]);

      const { body: result } = await client.bulk({ body, refresh: true });
      return { success: !result.errors, indexed: products.length, errors: result.errors };
    } catch (error) {
      console.error('OpenSearch bulk index error:', error.message);
      return { success: false, message: error.message };
    }
  }

  async search(query, filters = {}, options = {}) {
    if (!isESConnected()) {
      return this.fallbackSearch(query, filters, options);
    }

    try {
      const { categoryId, minPrice, maxPrice, isActive } = filters;
      const { page = 1, limit = 10, sortBy = '_score', sortOrder = 'desc' } = options;
      const normalizedSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

      const should = [];
      const must = [];
      const filter = [];

      if (query) {
        should.push(...this.buildSearchClauses(query));

        const hardTokens = this.extractHardSearchTokens(query);
        hardTokens.forEach((token) => {
          must.push({
            bool: {
              should: [
                { match: { specificationTerms: { query: token, operator: 'and', boost: 5 } } },
                { match: { searchText: { query: token, operator: 'and', boost: 3 } } },
                { match: { name: { query: token, operator: 'and', boost: 2 } } },
              ],
              minimum_should_match: 1,
            },
          });
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
          query: {
            bool: {
              must,
              should: should.length ? should : [{ match_all: {} }],
              minimum_should_match: should.length ? 1 : 0,
              filter,
            },
          },
          sort: sortBy === '_score' ? [{ _score: normalizedSortOrder }] : [{ [sortBy]: normalizedSortOrder }],
        },
      });

      if (result.hits.total?.value === 0 && query) {
        return this.fallbackSearch(query, filters, options);
      }

      const rankedIds = result.hits.hits
        .map((hit) => hit._id || hit?._source?.id)
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

      if (rankedIds.length === 0) {
        return this.fallbackSearch(query, filters, options);
      }

      const products = await Product.find({ _id: { $in: rankedIds } })
        .populate({ path: 'category', select: 'name description' });

      const productMap = new Map(products.map((product) => [product.id.toString(), product]));
      const orderedProducts = rankedIds
        .map((id) => productMap.get(id.toString()))
        .filter(Boolean);

      if (orderedProducts.length === 0) {
        return this.fallbackSearch(query, filters, options);
      }

      const response = {
        products: orderedProducts,
        pagination: {
          total: result.hits.total?.value || orderedProducts.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil((result.hits.total?.value || orderedProducts.length) / limit),
        },
      };

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
    const { categoryId, minPrice, maxPrice, isActive } = filters;
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
        ...tokenVariants.map((token) => ({ name: { $regex: token, $options: 'i' } })),
        ...tokenVariants.map((token) => ({ description: { $regex: token, $options: 'i' } })),
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
