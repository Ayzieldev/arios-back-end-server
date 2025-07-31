const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const DeliveryBoy = require('../models/DeliveryBoy');

// @route   GET api/delivery/orders
// @desc    Get assigned orders for delivery boy
// @access  Private (Delivery Boy)
router.get('/orders', auth, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery boy privileges required.' });
    }

    const orders = await Order.find({ 
      deliveryBoy: req.user.id,
      status: { $in: ['assigned', 'picked_up', 'in_transit'] }
    })
    .populate('user', 'name phone')
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT api/delivery/orders/:id/status
// @desc    Update order status
// @access  Private (Delivery Boy)
router.put('/orders/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery boy privileges required.' });
    }

    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryBoy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.status = status;
    
    if (status === 'delivered' || status === 'served') {
      order.actualDelivery = new Date();
    }

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT api/delivery/location
// @desc    Update delivery boy location
// @access  Private (Delivery Boy)
router.put('/location', auth, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery boy privileges required.' });
    }

    const { latitude, longitude } = req.body;

    const deliveryBoy = await DeliveryBoy.findById(req.user.id);
    if (!deliveryBoy) {
      return res.status(404).json({ message: 'Delivery boy not found' });
    }

    deliveryBoy.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };

    await deliveryBoy.save();
    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT api/delivery/status
// @desc    Update delivery boy status
// @access  Private (Delivery Boy)
router.put('/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery boy privileges required.' });
    }

    const { status } = req.body;

    const deliveryBoy = await DeliveryBoy.findById(req.user.id);
    if (!deliveryBoy) {
      return res.status(404).json({ message: 'Delivery boy not found' });
    }

    deliveryBoy.status = status;
    await deliveryBoy.save();
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 