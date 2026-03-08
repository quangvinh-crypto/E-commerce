const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../validators/authValidator');

const router = express.Router();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerValidator, authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidator, authController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, authController.getMe);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, authController.updateProfile);

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', auth, authController.changePassword);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, authController.logout);

// @route   GET /api/auth/google
// @desc    Google OAuth login
// @access  Public
router.get('/google', (req, res, next) => {
  const redirect = req.query.redirect || '';
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: redirect,
  })(req, res, next);
});

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${frontendUrl}/login?oauth=failed` }),
  authController.googleCallback
);

module.exports = router;
