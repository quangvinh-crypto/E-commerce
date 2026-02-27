const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { upload, handleMulterError } = require('../middleware/upload');
const { cloudinary } = require('../config/cloudinary');

const uploadAvatar = upload.single('avatar');

const idParamValidation = [
  param('id').isMongoId().withMessage('ID must be a valid MongoDB ObjectId'),
  validate,
];

const updateUserValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('role').optional().isIn(['customer', 'staff', 'admin']).withMessage('Vai trò không hợp lệ'),
  body('isActive').optional().isBoolean(),
  validate,
];

const createUserValidation = [
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['customer', 'staff', 'admin']).withMessage('Vai trò không hợp lệ'),
  validate,
];

const createUserHandler = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
    }

    let avatar = null;
    if (req.file) {
      const uploadedAvatar = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'ecommerce/avatars', resource_type: 'image' },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });

      avatar = uploadedAvatar.secure_url;
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      avatar,
      role: role || 'staff',
      isVerified: true,
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

router.post('/create', auth, isAdmin, uploadAvatar, handleMulterError, createUserValidation, createUserHandler);
router.post('/staff', auth, isAdmin, uploadAvatar, handleMulterError, createUserValidation, createUserHandler);

router.get('/', auth, isAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;
    const where = {};

    if (role) where.role = role;
    if (isActive === 'true' || isActive === 'false') {
      where.isActive = isActive === 'true';
    }
    if (search) {
      where.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    const [rows, count] = await Promise.all([
      User.find(where)
        .select('-password -resetPasswordToken -resetPasswordExpire')
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit),
      User.countDocuments(where),
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', auth, isAdmin, idParamValidation, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', auth, isAdmin, idParamValidation, updateUserValidation, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isRootAdmin) {
      return res.status(403).json({ success: false, message: 'Root admin cannot be edited' });
    }

    if (String(user._id) === String(req.user.id) && req.body.role && req.body.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot change your own role' });
    }

    const { name, role, isActive } = req.body;
    if (name) user.name = name;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', auth, isAdmin, idParamValidation, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isRootAdmin) {
      return res.status(403).json({ success: false, message: 'Root admin cannot be deleted' });
    }

    if (String(user._id) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
