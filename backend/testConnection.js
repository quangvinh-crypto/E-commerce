const { connectDB, sequelize } = require('./src/config/database');

async function testConnection() {
  console.log('🔍 Testing MySQL Database Connection...\n');
  
  try {
    // Test connection
    await connectDB();
    
    // Get database info
    const [results] = await sequelize.query('SELECT VERSION() as version');
    console.log(`\n📊 MySQL Version: ${results[0].version}`);
    
    // Test creating a simple table
    console.log('\n🧪 Testing table creation...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS test_connection (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Test table created successfully');
    
    // Clean up test table
    await sequelize.query('DROP TABLE IF EXISTS test_connection');
    console.log('✅ Test table dropped successfully');
    
    console.log('\n🎉 Database connection test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run db:sync (to create all tables)');
    console.log('   2. Start the server: npm run dev');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database connection test failed!');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure MySQL is running');
    console.error('   2. Check your .env file configuration');
    console.error('   3. Verify database credentials');
    console.error('   4. Ensure the database exists (create it if needed)');
    process.exit(1);
  }
}

testConnection();
