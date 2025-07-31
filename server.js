const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Add debugging for .env file loading
const fs = require('fs');
console.log('🔍 .env file path:', path.resolve('./.env'));
console.log('🔍 .env file exists:', fs.existsSync('./.env'));
console.log('🔍 Current directory:', __dirname);

// Try reading .env file directly to debug
try {
  const envContent = fs.readFileSync('./.env', 'utf8');
  console.log('🔍 .env file content (first 200 chars):', envContent.substring(0, 200));
  
  // Parse manually to check for issues
  const lines = envContent.split('\n');
  const mongoLine = lines.find(line => line.startsWith('MONGODB_URI='));
  console.log('🔍 Found MONGODB_URI line:', mongoLine);
} catch (error) {
  console.log('🔍 Error reading .env file:', error.message);
}

// Set environment variables directly for testing
process.env.CLOUDINARY_CLOUD_NAME = 'dge1av7r7';
process.env.CLOUDINARY_API_KEY = '513653858837876';
process.env.CLOUDINARY_API_SECRET = 'LLC8E25AuB5P1uhpz11WsGkZYkw';
process.env.JWT_SECRET = 'your-super-secret-jwt-key-2024';
process.env.MONGODB_URI = process.env.MONGODB_URI = 'mongodb+srv://Arios-Ecommerce:Arios@ayziel.gfrzim8.mongodb.net/arios-cafe?retryWrites=true&w=majority&appName=Ayziel';
//process.env.MONGODB_URI = 'mongodb://localhost:27017/arios-cafe'
console.log('🔧 Environment Variables Check:');
console.log('🔍 Raw MONGODB_URI value:', process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Test endpoint to verify server is running
app.get('/api/arios-cafe', (req, res) => {
  res.json({ 
    message: 'Server is running!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint to check database connection
app.get('/api/arios-cafe-db', async (req, res) => {
  try {
    const orderCount = await require('./models/Order').countDocuments();
    const productCount = await require('./models/Product').countDocuments();
    const userCount = await require('./models/User').countDocuments();
    
    res.json({
      message: 'Database connection successful!',
      counts: {
        orders: orderCount,
        products: productCount,
        users: userCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Database connection failed', 
      error: error.message 
    });
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arios-cafe', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 