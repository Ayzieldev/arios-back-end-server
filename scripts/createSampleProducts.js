const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const sampleProducts = [
  {
    name: 'Flame Grilled Chicken Burger',
    description: 'Juicy flame-grilled chicken breast with fresh lettuce, tomatoes, and special sauce on a toasted bun.',
    price: 25.00,
    originalPrice: 30.00,
    category: 'Burgers',
    brand: 'McDonald\'s',
    stock: 50,
    rating: 4.5,
    numReviews: 12,
    isActive: true,
    featured: true,
    tags: ['chicken', 'burger', 'flame-grilled', 'popular'],
    images: [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop'
    ]
  },
  {
    name: 'Classic Pepperoni Pizza',
    description: 'Traditional pepperoni pizza with melted mozzarella cheese and our signature tomato sauce.',
    price: 45.00,
    originalPrice: 55.00,
    category: 'Pizza',
    brand: 'Pizza Hut',
    stock: 30,
    rating: 4.3,
    numReviews: 8,
    isActive: true,
    featured: true,
    tags: ['pizza', 'pepperoni', 'cheese', 'traditional'],
    images: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop'
    ]
  },
  {
    name: 'Crispy Fried Chicken',
    description: 'Crispy fried chicken with 11 herbs and spices, served with coleslaw and mashed potatoes.',
    price: 35.00,
    originalPrice: 40.00,
    category: 'Fast Food',
    brand: 'KFC',
    stock: 40,
    rating: 4.7,
    numReviews: 15,
    isActive: true,
    featured: true,
    tags: ['fried-chicken', 'crispy', 'kfc', 'popular'],
    images: [
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=300&fit=crop'
    ]
  },
  {
    name: 'Chocolate Milkshake',
    description: 'Rich and creamy chocolate milkshake made with premium chocolate and fresh milk.',
    price: 15.00,
    category: 'Beverages',
    brand: 'Starbucks',
    stock: 60,
    rating: 4.2,
    numReviews: 6,
    isActive: true,
    featured: false,
    tags: ['milkshake', 'chocolate', 'beverage', 'sweet'],
    images: [
      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop'
    ]
  },
  {
    name: 'Caesar Salad',
    description: 'Fresh romaine lettuce with Caesar dressing, parmesan cheese, and croutons.',
    price: 20.00,
    category: 'Salads',
    brand: 'Subway',
    stock: 25,
    rating: 4.0,
    numReviews: 4,
    isActive: true,
    featured: false,
    tags: ['salad', 'healthy', 'caesar', 'vegetarian'],
    images: [
      'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop'
    ]
  },
  {
    name: 'BBQ Ribs',
    description: 'Slow-cooked BBQ ribs with tangy barbecue sauce, served with cornbread and baked beans.',
    price: 55.00,
    originalPrice: 65.00,
    category: 'Main Course',
    brand: 'Famous Daves',
    stock: 20,
    rating: 4.8,
    numReviews: 10,
    isActive: true,
    featured: true,
    tags: ['bbq', 'ribs', 'slow-cooked', 'meat'],
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop'
    ]
  },
  {
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with a molten chocolate center, served with vanilla ice cream.',
    price: 18.00,
    category: 'Desserts',
    brand: 'Pancake House',
    stock: 35,
    rating: 4.6,
    numReviews: 7,
    isActive: true,
    featured: false,
    tags: ['dessert', 'chocolate', 'cake', 'sweet'],
    images: [
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop'
    ]
  },
  {
    name: 'Fish Tacos',
    description: 'Grilled fish tacos with cabbage slaw, chipotle mayo, and fresh lime on corn tortillas.',
    price: 28.00,
    category: 'Main Course',
    brand: 'Taco Bell',
    stock: 30,
    rating: 4.1,
    numReviews: 5,
    isActive: true,
    featured: false,
    tags: ['tacos', 'fish', 'seafood', 'grilled'],
    images: [
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop'
    ]
  }
];

const createSampleProducts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arios-ecommerce', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if products already exist
    const existingProducts = await Product.countDocuments();
    if (existingProducts > 0) {
      console.log('Products already exist in the database');
      process.exit(0);
    }

    // Create sample products
    const createdProducts = await Product.insertMany(sampleProducts);
    
    console.log(`Successfully created ${createdProducts.length} sample products:`);
    createdProducts.forEach(product => {
      console.log(`- ${product.name} (${product.brand}) - PHP ${product.price}`);
    });

  } catch (error) {
    console.error('Error creating sample products:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createSampleProducts(); 