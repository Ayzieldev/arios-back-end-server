const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Test route to check if orders API is working
router.get('/test', (req, res) => {
  res.json({ message: 'Orders API is working' });
});

// Test route to check if auth middleware is working
router.get('/test-auth', auth, (req, res) => {
  res.json({ 
    message: 'Auth middleware is working', 
    user: req.user,
    userRole: req.user.role 
  });
});

// @route   POST api/orders
// @desc    Create new order
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { items, deliveryAddress, paymentMethod, note } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    // Validate required delivery address fields
    if (!deliveryAddress) {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    if (!deliveryAddress.fullName) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!deliveryAddress.email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!deliveryAddress.phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Calculate subtotal and validate stock
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.product} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      subtotal += product.price * item.quantity;
    }

    // Calculate delivery fee (free for orders over PHP 50)
    const deliveryFee = subtotal >= 50 ? 0 : 10;
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + deliveryFee + tax;

    const order = new Order({
      user: req.user.id,
      items: items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        price: item.price
      })),
      deliveryAddress,
      note,
      paymentMethod,
      subtotal,
      deliveryFee,
      tax,
      total
    });

    await order.save();

    // Create notification for admin about new order
    const Notification = require('../models/Notification');
    const User = require('../models/User');
    const adminUsers = await User.find({ role: 'admin' });
    
    console.log('🔔 Creating notifications for admin users:', adminUsers.length);
    
    for (const admin of adminUsers) {
      try {
        const notification = await Notification.create({
          user: admin._id,
          title: 'New Order Received',
          message: `New order #${order._id.toString().slice(-6)} received from ${deliveryAddress.fullName}`,
          type: 'new_order',
          order: order._id
        });
        console.log('✅ Notification created for admin:', admin.name, notification._id);
      } catch (error) {
        console.error('❌ Error creating notification for admin:', admin.name, error.message);
      }
    }

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/orders/all
// @desc    Get all orders (admin only)
// @access  Private (Admin)
router.get('/all', auth, async (req, res) => {
  console.log('🎯 /all route hit!');
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('❌ Access denied - not admin');
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    console.log('✅ Admin access granted, fetching all orders for admin:', req.user.id);

    const orders = await Order.find()
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price')
      .populate('assignedDeliveryBoy', 'name email phone')
      .populate('deliveryRequests.deliveryBoyId', 'name email phone')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${orders.length} orders`);

    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching all orders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/orders
// @desc    Get user orders
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product', 'name images price')
      .populate('assignedDeliveryBoy', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/orders/customer
// @desc    Get customer orders (same as user orders but with customer-specific logic)
// @access  Private (Customer)
router.get('/customer', auth, async (req, res) => {
  try {
    // Ensure user is a customer
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Access denied. Customer only.' });
    }

    const orders = await Order.find({ user: req.user.id })
      .populate('items.product', 'name images price')
      .populate('assignedDeliveryBoy', 'name email phone')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${orders.length} orders for customer ${req.user.id}`);

    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching customer orders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/orders/delivery-requests
// @desc    Get all delivery requests (admin only)
// @access  Private (Admin)
router.get('/delivery-requests', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const orders = await Order.find({
      'deliveryRequests.status': 'pending'
    })
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price')
      .populate('deliveryRequests.deliveryBoyId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/orders/completion-requests
// @desc    Get all delivery completion requests (admin only)
// @access  Private (Admin)
router.get('/completion-requests', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const orders = await Order.find({

    })
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price')
      .populate('assignedDeliveryBoy', 'name email phone')

      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/orders/daily
// @desc    Get orders for today
// @access  Private (Admin only)
router.get('/daily', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Get today's date (start and end of day)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .populate('user', 'name email')
    .populate('items.product', 'name price image')
    .populate('deliveryRequests.deliveryBoyId', 'name')
    .populate('assignedDeliveryBoy', 'name')
    .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching daily orders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  console.log('🎯 /:id route hit with ID:', req.params.id);
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price')
      .populate('assignedDeliveryBoy', 'name email phone')
      .populate('deliveryRequests.deliveryBoyId', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    console.error('❌ Error in /:id route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    order.status = 'cancelled';
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT api/orders/:id/status
// @desc    Update order status (admin only)
// @access  Private (Admin)
router.put('/:id/status', auth, async (req, res) => {
  try {
    console.log('🔄 Status update request:', req.params.id, 'to status:', req.body.status);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'served', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    console.log('📦 Order found:', order ? 'Yes' : 'No');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If order is being cancelled, restore product stock
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
    }

    // If order was cancelled and is now being reactivated, reduce stock again
    if (order.status === 'cancelled' && status !== 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }
    }

    order.status = status;
    await order.save();
    console.log('✅ Order status updated successfully');

    // Create notification when order is delivered
    if (status === 'delivered' && order.assignedDeliveryBoy) {
      const Notification = require('../models/Notification');
      try {
        await Notification.create({
          user: order.user,
          title: 'Order Delivered',
          message: `Your order #${order._id.toString().slice(-6)} has been delivered successfully!`,
          type: 'order_delivered',
          order: order._id
        });
      } catch (error) {
        console.error('❌ Error creating customer notification:', error.message);
      }
    }

    // Create notification for admin about status change
    console.log('🔔 Creating admin notifications...');
    const adminUsers = await require('../models/User').find({ role: 'admin' });
    console.log('👥 Found admin users:', adminUsers.length);
    
    for (const admin of adminUsers) {
      try {
        const notification = await Notification.create({
          user: admin._id,
          title: 'Order Status Updated',
          message: `Order #${order._id.toString().slice(-6)} status changed to ${status}`,
          type: 'status_update',
          order: order._id
        });
        console.log('✅ Admin notification created for:', admin.name);
      } catch (error) {
        console.error('❌ Error creating admin notification for', admin.name, ':', error.message);
      }
    }

    console.log('🎉 Status update completed successfully');
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/orders/delivery/available
// @desc    Get orders available for delivery (delivery role only)
// @access  Private (Delivery)
router.get('/delivery/available', auth, async (req, res) => {
  try {
    // Check if user is delivery
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery only.' });
    }

    const orders = await Order.find({
      status: { $in: ['pending', 'confirmed'] },
      assignedDeliveryBoy: { $exists: false }
    })
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price')
      .populate('deliveryRequests.deliveryBoyId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/orders/delivery/assigned
// @desc    Get orders assigned to delivery guy
// @access  Private (Delivery)
router.get('/delivery/assigned', auth, async (req, res) => {
  try {
    // Check if user is delivery
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery only.' });
    }

    const orders = await Order.find({
      assignedDeliveryBoy: req.user.id,
      status: { $in: ['out_for_delivery', 'delivered'] }
    })
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price')

      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST api/orders/:id/request-delivery
// @desc    Request to deliver an order (delivery role only)
// @access  Private (Delivery)
router.post('/:id/request-delivery', auth, async (req, res) => {
  try {
    // Check if user is delivery
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery only.' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order is available for delivery
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Order is not available for delivery' });
    }

    // Check if already assigned
    if (order.assignedDeliveryBoy) {
      return res.status(400).json({ message: 'Order is already assigned to a delivery person' });
    }

    // Check if already requested
    const existingRequest = order.deliveryRequests.find(
      request => request.deliveryBoyId.toString() === req.user.id
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'You have already requested this order' });
    }

    // Add delivery request
    order.deliveryRequests.push({
      deliveryBoyId: req.user.id,
      requestedAt: new Date(),
      status: 'pending'
    });

    await order.save();

    // Create notification for admin about delivery request
    const Notification = require('../models/Notification');
    const adminUsers = await require('../models/User').find({ role: 'admin' });
    
    for (const admin of adminUsers) {
      await Notification.create({
        user: admin._id,
        title: 'Delivery Request',
        message: `Delivery request for order #${order._id.toString().slice(-6)} from ${req.user.name}`,
        type: 'delivery_request',
        order: order._id
      });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT api/orders/:id/assign-delivery
// @desc    Assign order to delivery guy (admin only)
// @access  Private (Admin)
router.put('/:id/assign-delivery', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { deliveryBoyId } = req.body;

    if (!deliveryBoyId) {
      return res.status(400).json({ message: 'Delivery boy ID is required' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order is available for assignment
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Order is not available for assignment' });
    }

    // Check if delivery boy exists and has delivery role
    const deliveryBoy = await require('../models/User').findById(deliveryBoyId);
    if (!deliveryBoy || deliveryBoy.role !== 'delivery') {
      return res.status(400).json({ message: 'Invalid delivery person' });
    }

    // Check if delivery boy has requested this order
    const deliveryRequest = order.deliveryRequests.find(
      request => request.deliveryBoyId.toString() === deliveryBoyId
    );

    if (!deliveryRequest) {
      return res.status(400).json({ message: 'Delivery person has not requested this order' });
    }

    // Assign order and update status
    order.assignedDeliveryBoy = deliveryBoyId;
    order.status = 'out_for_delivery';



    // Update all delivery requests for this order
    order.deliveryRequests.forEach(request => {
      if (request.deliveryBoyId.toString() === deliveryBoyId) {
        request.status = 'accepted';
      } else {
        request.status = 'rejected';
      }
    });

    await order.save();

    // Create notification for assigned delivery person
    const Notification = require('../models/Notification');
    await Notification.create({
      user: deliveryBoyId,
      title: 'Order Assigned',
      message: `You have been assigned order #${order._id.toString().slice(-6)}. Please check your assigned orders.`,
      type: 'order_assigned',
      order: order._id
    });

    // Create notifications for rejected delivery requests
    for (const request of order.deliveryRequests) {
      if (request.deliveryBoyId.toString() !== deliveryBoyId && request.status === 'rejected') {
        await Notification.create({
          user: request.deliveryBoyId,
          title: 'Order Assignment Update',
          message: `Order #${order._id.toString().slice(-6)} has been assigned to another delivery person.`,
          type: 'order_assigned',
          order: order._id
        });
      }
    }

    // Create notification for admin about order assignment
    const adminUsers = await require('../models/User').find({ role: 'admin' });
    for (const admin of adminUsers) {
      await Notification.create({
        user: admin._id,
        title: 'Order Assigned to Delivery',
        message: `Order #${order._id.toString().slice(-6)} has been assigned to ${deliveryBoy.name}`,
        type: 'order_assigned',
        order: order._id
      });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});







module.exports = router; 