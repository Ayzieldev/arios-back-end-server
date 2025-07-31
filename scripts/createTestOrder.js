const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

async function createTestOrder() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easycash-ecommerce', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Test order data
    const orderData = {
      customer: {
        fullName: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890'
      },
      products: [
        {
          product: '507f1f77bcf86cd799439011', // This should be a real product ID
          quantity: 2,
          price: 25.99
        }
      ],
      totalAmount: 51.98
    };
    
    console.log('🛒 Creating test order...');
    
    // Make request to create order
    const response = await axios.post('http://localhost:5000/api/admin/orders', orderData);
    
    console.log('✅ Order created successfully:', response.data);
    
  } catch (error) {
    console.error('❌ Error creating test order:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestOrder(); 