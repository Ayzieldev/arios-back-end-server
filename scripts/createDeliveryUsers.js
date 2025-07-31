const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/arios-ecommerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const deliveryUsers = [
  {
    name: 'John Delivery',
    email: 'john.delivery@arios.com',
    password: 'delivery123',
    phone: '+63 912 345 6789',
    role: 'delivery'
  },
  {
    name: 'Maria Santos',
    email: 'maria.delivery@arios.com',
    password: 'delivery123',
    phone: '+63 923 456 7890',
    role: 'delivery'
  },
  {
    name: 'Pedro Cruz',
    email: 'pedro.delivery@arios.com',
    password: 'delivery123',
    phone: '+63 934 567 8901',
    role: 'delivery'
  },
  {
    name: 'Ana Reyes',
    email: 'ana.delivery@arios.com',
    password: 'delivery123',
    phone: '+63 945 678 9012',
    role: 'delivery'
  }
];

const createDeliveryUsers = async () => {
  try {
    console.log('🚚 Creating delivery users...');

    for (const userData of deliveryUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = new User({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        phone: userData.phone,
        role: userData.role
      });

      await user.save();
      console.log(`✅ Created delivery user: ${userData.name} (${userData.email})`);
    }

    console.log('🎉 Delivery users creation completed!');
    console.log('\n📋 Delivery User Credentials:');
    console.log('Email: john.delivery@arios.com | Password: delivery123');
    console.log('Email: maria.delivery@arios.com | Password: delivery123');
    console.log('Email: pedro.delivery@arios.com | Password: delivery123');
    console.log('Email: ana.delivery@arios.com | Password: delivery123');

  } catch (error) {
    console.error('❌ Error creating delivery users:', error);
  } finally {
    mongoose.connection.close();
  }
};

createDeliveryUsers(); 