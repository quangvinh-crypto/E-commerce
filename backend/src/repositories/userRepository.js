const User = require('../models/User');

class UserRepository {
  async create(userData) {
    return User.create(userData);
  }

  async findById(id) {
    return User.findById(id);
  }

  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findByEmailWithPassword(email) {
    return User.findOne({ email }).select('+password');
  }

  async findByGoogleId(googleId) {
    return User.findOne({ googleId });
  }

  async update(id, updateData) {
    const user = await User.findById(id);
    if (!user) return null;

    Object.assign(user, updateData);
    await user.save();
    return user;
  }

  async delete(id) {
    const user = await User.findById(id);
    if (!user) return null;

    await user.deleteOne();
    return user;
  }

  async findAll(page = 1, limit = 10, filter = {}) {
    const offset = (page - 1) * limit;
    const [users, count] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  async search(query, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const filter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    };

    const [users, count] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  async exists(filter) {
    const count = await User.countDocuments(filter);
    return count > 0;
  }

  async count(filter = {}) {
    return User.countDocuments(filter);
  }
}

module.exports = new UserRepository();
