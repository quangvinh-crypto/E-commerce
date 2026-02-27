const { validationResult } = require('express-validator');
const authService = require('../services/authService');

class AuthController {
  // @desc    Register user
  // @route   POST /api/auth/register
  // @access  Public
  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const { name, email, password, phone } = req.body;
      const result = await authService.register({ name, email, password, phone });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // @desc    Login user
  // @route   POST /api/auth/login
  // @access  Public
  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // @desc    Get current user
  // @route   GET /api/auth/me
  // @access  Private
  async getMe(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // @desc    Update user profile
  // @route   PUT /api/auth/profile
  // @access  Private
  async updateProfile(req, res, next) {
    try {
      const { name, phone, avatar } = req.body;
      const result = await authService.updateProfile(req.user.id, {
        name,
        phone,
        avatar,
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // @desc    Change password
  // @route   PUT /api/auth/password
  // @access  Private
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // @desc    Logout user (stateless JWT)
  // @route   POST /api/auth/logout
  // @access  Private
  async logout(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        message: 'Logout successful. Remove token on client side.',
      });
    } catch (error) {
      next(error);
    }
  }

  // @desc    Google OAuth callback
  // @route   GET /api/auth/google/callback
  // @access  Public
  async googleCallback(req, res, next) {
    try {
      const result = await authService.googleAuth(req.user);
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/callback?token=${result.token}`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
