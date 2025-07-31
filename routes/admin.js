const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryBoy = require('../models/DeliveryBoy');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with hardcoded values for testing
cloudinary.config({
  cloud_name: 'dge1av7r7',
  api_key: '513653858837876',
  api_secret: 'LLC8E25AuB5P1uhpz11WsGkZYkw'
});

console.log('✅ Cloudinary configured successfully!');

// Configure Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Admin middleware - check if user is admin
// ==================== CUSTOMER ENDPOINTS (No Admin Auth Required) ====================

// Get featured products for customer view
router.get('/products/featured', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, featured: true })
      .sort({ createdAt: -1 })
      .limit(8);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all active products for customer view
router.get('/products/customer', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';
    const category = req.query.category || '';

    let query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new order (customer checkout)
router.post('/orders', async (req, res) => {
  try {
    const { customer, products, totalAmount } = req.body;

    // Calculate subtotal and total
    const subtotal = totalAmount;
    const deliveryFee = 0; // Free delivery
    const tax = 0; // No tax for now
    const total = subtotal + deliveryFee + tax;

    // Create the order
    const order = new Order({
      user: customer._id || customer.id, // Use customer ID as user ID
      items: products.map(item => ({
        product: item.product,
        quantity: item.quantity,
        price: item.price
      })),
      deliveryAddress: {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        street: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zipCode: customer.zipCode || '',
        country: customer.country || 'Philippines'
      },
      status: 'pending',
      subtotal,
      deliveryFee,
      tax,
      total
    });

    await order.save();



    // Update product stock
    for (const item of products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    res.status(201).json({
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get customer's orders
router.get('/orders/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== ADMIN ENDPOINTS (Admin Auth Required) ====================

router.use(auth, admin);

// Get all products with pagination and filters
router.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const brand = req.query.brand || '';
    const status = req.query.status || '';

    let query = {};

    if (search) {
      console.log('🔍 Search query:', search);
      // Use regex for more flexible search
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
      console.log('🔍 Search query object:', query);
    }

    if (category) {
      query.category = category;
    }

    if (brand) {
      query.brand = brand;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new product
router.post('/products', upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, originalPrice, category, brand, stock, tags } = req.body;

    // Upload images to Cloudinary
    const imageUrls = [];
    console.log('📸 Image upload attempt:', {
      filesCount: req.files ? req.files.length : 0,
      cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    });
    
    if (req.files && req.files.length > 0) {
      console.log('🚀 Starting Cloudinary upload for', req.files.length, 'files...');
      for (const file of req.files) {
        try {
          console.log('📤 Uploading file:', file.originalname, 'Size:', file.size);
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
              folder: 'easycash/products',
              transformation: [
                { width: 800, height: 600, crop: 'fill' },
                { quality: 'auto:low' },
                { fetch_format: 'auto' },
                { compression: 'auto' }
              ],
              eager: [
                {
                  width: 400,
                  height: 300,
                  crop: 'fill',
                  quality: 'auto:low',
                  fetch_format: 'auto'
                },
                {
                  width: 200,
                  height: 150,
                  crop: 'fill',
                  quality: 'auto:low',
                  fetch_format: 'auto'
                }
              ],
              eager_async: true,
              eager_notification_url: null
            }
          );
          console.log('✅ Upload successful:', result.secure_url);
          console.log('📊 Image optimized - Original size reduced with multiple formats');
          imageUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error('❌ Upload failed for', file.originalname, ':', uploadError.message);
          throw uploadError;
        }
      }
    }

    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      category,
      brand,
      stock: parseInt(stock),
      images: imageUrls,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product
router.put('/products/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, originalPrice, category, brand, stock, tags, isActive } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImageUrls = [];
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name') {
        for (const file of req.files) {
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
              folder: 'easycash/products',
              transformation: [
                { width: 800, height: 600, crop: 'fill' },
                { quality: 'auto:low' },
                { fetch_format: 'auto' },
                { compression: 'auto' }
              ],
              eager: [
                {
                  width: 400,
                  height: 300,
                  crop: 'fill',
                  quality: 'auto:low',
                  fetch_format: 'auto'
                },
                {
                  width: 200,
                  height: 150,
                  crop: 'fill',
                  quality: 'auto:low',
                  fetch_format: 'auto'
                }
              ],
              eager_async: true,
              eager_notification_url: null
            }
          );
          console.log('📊 Image optimized - Original size reduced with multiple formats');
          newImageUrls.push(result.secure_url);
        }
      } else {
        console.log('Cloudinary not configured, skipping image upload');
      }
      
      // Combine existing images with new ones
      const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : [];
      product.images = [...existingImages, ...newImageUrls];
    }

    // Update other fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = parseFloat(price);
    if (originalPrice !== undefined) product.originalPrice = originalPrice ? parseFloat(originalPrice) : undefined;
    if (category) product.category = category;
    if (brand) product.brand = brand;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (tags) product.tags = tags.split(',').map(tag => tag.trim());
    if (isActive !== undefined) product.isActive = isActive === 'true';

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single product
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete images from Cloudinary (with error handling)
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          // Only try to delete from Cloudinary if it's a Cloudinary URL
          if (imageUrl.includes('cloudinary.com') && process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name') {
            const publicId = imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`easycash/products/${publicId}`);
          }
        } catch (cloudinaryError) {
          console.error('Error deleting image from Cloudinary:', cloudinaryError);
          // Continue with deletion even if Cloudinary fails
        }
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== ORDER MANAGEMENT ====================

// Get all orders with filters
router.get('/orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const paymentStatus = req.query.paymentStatus || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';

    let query = {};

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('deliveryBoy', 'name phone vehicleNumber')
      .populate('items.product', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status against enum
    const validStatuses = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    
    if (status === 'delivered' || status === 'served') {
      order.actualDelivery = new Date();
    }

    await order.save();
    res.json(order);
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Assign delivery boy to order
router.put('/orders/:id/assign-delivery', async (req, res) => {
  try {
    const { deliveryBoyId } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({ message: 'Delivery boy not found' });
    }

    order.deliveryBoy = deliveryBoyId;
    order.status = 'assigned';
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== USER MANAGEMENT ====================

// Get all users
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';

    let query = { role: 'customer' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user status
router.put('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = isActive;
    await user.save();
    
    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== DELIVERY BOY MANAGEMENT ====================

// Get all delivery boys
router.get('/delivery-boys', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';

    let query = {};

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const deliveryBoys = await DeliveryBoy.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DeliveryBoy.countDocuments(query);

    res.json({
      deliveryBoys,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== DASHBOARD STATISTICS ====================

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalProducts,
      totalOrders,
      totalUsers,
      totalDeliveryBoys,
      todayOrders,
      monthOrders,
      pendingOrders,
      totalRevenue,
      monthRevenue,
      recentOrders,
      recentDeliveryRequests
    ] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      DeliveryBoy.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({ status: { $in: ['pending', 'PENDING'] } }),
      Order.aggregate([
        { $match: { status: { $in: ['delivered', 'DELIVERED', 'served', 'SERVED'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { status: { $in: ['delivered', 'DELIVERED', 'served', 'SERVED'] }, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.find({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(5),
      Order.find({ 
        'deliveryRequests.status': 'pending',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
        .populate('deliveryRequests.deliveryBoyId', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    res.json({
      totalProducts,
      totalOrders,
      totalUsers,
      totalDeliveryBoys,
      todayOrders,
      monthOrders,
      pendingOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthRevenue: monthRevenue[0]?.total || 0,
      recentOrders,
      recentDeliveryRequests
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    // Get current date and calculate periods
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let startDate, endDate;
    
    if (period === 'yearly') {
      startDate = new Date(currentYear, 0, 1); // January 1st of current year
      endDate = new Date(currentYear, 11, 31, 23, 59, 59); // December 31st of current year
    } else {
      startDate = new Date(currentYear, currentMonth, 1); // First day of current month
      endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59); // Last day of current month
    }

    // Get sales data
    const salesData = await Order.aggregate([
      {
        $match: {
          status: { $in: ['delivered', 'DELIVERED', 'served', 'SERVED'] },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Get top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          status: { $in: ['delivered', 'DELIVERED', 'served', 'SERVED'] },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: '$productInfo'
      },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$productInfo.name' },
          productImage: { $first: '$productInfo.images' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalQuantity: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get customer statistics
    const customerStats = await Order.aggregate([
      {
        $match: {
          status: { $in: ['delivered', 'DELIVERED', 'served', 'SERVED'] },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get delivery statistics
    const deliveryStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate summary statistics
    const summaryStats = await Order.aggregate([
      {
        $match: {
          status: { $in: ['delivered', 'DELIVERED', 'served', 'SERVED'] },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    // Get monthly comparison data
    const monthlyComparison = await Order.aggregate([
      {
        $match: {
          status: { $in: ['delivered', 'DELIVERED', 'served', 'SERVED'] },
          createdAt: { $gte: new Date(currentYear, 0, 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      period,
      salesData,
      topProducts,
      customerStats,
      deliveryStats,
      summaryStats: summaryStats[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 },
      monthlyComparison
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get real-time analytics (last 24 hours)
router.get('/analytics/realtime', async (req, res) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const realtimeStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      }
    ]);

    const hourlyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.day': 1, '_id.hour': 1 }
      }
    ]);

    res.json({
      realtimeStats,
      hourlyOrders
    });
  } catch (error) {
    console.error('Realtime analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 