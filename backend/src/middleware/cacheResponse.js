const CacheService = require('../services/CacheService');

const cacheResponse = ({
  scope,
  ttlSeconds,
  payloadBuilder = (req) => ({ path: req.path, query: req.query }),
} = {}) => {
  if (!scope) {
    throw new Error('cacheResponse requires a scope');
  }

  return async (req, res, next) => {
    if (req.method !== 'GET' || !CacheService.isEnabled()) {
      return next();
    }

    try {
      const payload = payloadBuilder(req);
      const key = CacheService.buildCacheKey(scope, payload);
      const cached = await CacheService.get(key);

      if (cached !== null) {
        res.set('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          CacheService.set(key, body, ttlSeconds).catch(() => {});
          res.set('X-Cache', 'MISS');
        }
        return originalJson(body);
      };

      return next();
    } catch (_) {
      return next();
    }
  };
};

module.exports = cacheResponse;
