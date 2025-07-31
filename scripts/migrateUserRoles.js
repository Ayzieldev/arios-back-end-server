const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const migrateUserRoles = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easycash-ecommerce', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find all users with 'user' role
    const usersWithOldRole = await User.find({ role: 'user' });
    
    if (usersWithOldRole.length === 0) {
      console.log('No users found with old "user" role. Migration not needed.');
      process.exit(0);
    }

    console.log(`Found ${usersWithOldRole.length} users with old "user" role`);

    // Update all users with 'user' role to 'customer'
    const result = await User.updateMany(
      { role: 'user' },
      { role: 'customer' }
    );

    console.log(`Successfully updated ${result.modifiedCount} users from "user" to "customer" role`);

    // Verify the changes
    const updatedUsers = await User.find({ role: 'customer' });
    console.log(`Total users with "customer" role: ${updatedUsers.length}`);

  } catch (error) {
    console.error('Error migrating user roles:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

migrateUserRoles(); 