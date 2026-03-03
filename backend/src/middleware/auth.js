const jwt = require('jsonwebtoken');
const User = require('../models/User');

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

/**
 * ROLE PERMISSIONS:
 * - customer: Xem sản phẩm, đặt hàng, quản lý đơn hàng của mình
 * - staff: Quản lý sản phẩm, categories, xem đơn hàng, cập nhật trạng thái đơn
 * - admin: Toàn quyền (quản lý users, staff, settings, reports)
 */

// Protect routes - require authentication
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    req.user = user;
    req.user.role = normalizeRole(req.user.role);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Token is not valid',
    });
  }
};

// Authorize by role(s)
const authorize = (...roles) => {
  const normalizedRoles = roles.map((role) => normalizeRole(role));
  return (req, res, next) => {
    if (!normalizedRoles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// Shorthand role middlewares
const isAdmin = authorize('admin');
const isStaff = authorize('staff', 'admin');
const isCustomer = authorize('customer', 'staff', 'admin');

// Optional auth - attach user if token exists
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        user.role = normalizeRole(user.role);
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

// Check if user owns the resource or is admin/staff
const isOwnerOrStaff = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      const resourceUserId = await getResourceUserId(req);
      
      if (req.user.role === 'admin' || req.user.role === 'staff') {
        return next();
      }
      
      if (String(req.user.id) === String(resourceUserId)) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource',
      });
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { auth, authorize, isAdmin, isStaff, isCustomer, optionalAuth, isOwnerOrStaff };
