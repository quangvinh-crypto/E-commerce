const User = require('../models/User');

class SeedService {
  async ensureRootAdmin() {
    await User.updateMany({ googleId: null }, { $unset: { googleId: 1 } });

    const rootEmail = process.env.ROOT_ADMIN_EMAIL || 'root.admin@ecommerce.local';
    const rootPassword = process.env.ROOT_ADMIN_PASSWORD || 'RootAdmin@123';
    const rootName = process.env.ROOT_ADMIN_NAME || 'Root Admin';

    const existingRoot = await User.findOne({ isRootAdmin: true });
    if (existingRoot) return existingRoot;

    let user = await User.findOne({ email: rootEmail });

    if (!user) {
      user = await User.create({
        name: rootName,
        email: rootEmail,
        password: rootPassword,
        role: 'admin',
        isActive: true,
        isVerified: true,
        isRootAdmin: true,
      });
      console.log(`Root admin created: ${rootEmail}`);
      return user;
    }

    user.name = rootName;
    user.role = 'admin';
    user.isActive = true;
    user.isVerified = true;
    user.isRootAdmin = true;
    await user.save();
    console.log(`Existing account promoted to root admin: ${rootEmail}`);
    return user;
  }
}

module.exports = new SeedService();
