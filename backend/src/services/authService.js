const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

class AuthService {
  generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    });
  }

  async register(userData) {
    const { name, email, password, phone } = userData;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error('Email already exists');
      error.statusCode = 400;
      throw error;
    }

    const user = await userRepository.create({
      name,
      email,
      password,
      phone,
      role: 'customer',
      isRootAdmin: false,
    });

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isActive: user.isActive,
      },
    };
  }

  async login(credentials) {
    const { email, password } = credentials;

    const user = await userRepository.findByEmailWithPassword(email);
    if (!user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account is deactivated');
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isActive: user.isActive,
      },
    };
  }

  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      isRootAdmin: user.isRootAdmin,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId, updateData) {
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (existingUser.isRootAdmin) {
      const error = new Error('Root admin profile cannot be modified');
      error.statusCode = 403;
      throw error;
    }

    const user = await userRepository.update(userId, updateData);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
    };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.isRootAdmin) {
      const error = new Error('Root admin password cannot be changed from API');
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 400;
      throw error;
    }

    await userRepository.update(userId, { password: newPassword });

    return { message: 'Password changed successfully' };
  }

  async googleAuth(user) {
    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isActive: user.isActive,
      },
    };
  }
}

module.exports = new AuthService();
