const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');

// Test route to verify cart endpoints are working
router.get('/test', (req, res) => {
  res.json({ message: 'Cart routes are working!' });
});

// Get user's cart
router.get('/', auth, async (req, res) => {
  try {
    console.log('Cart GET request - User ID:', req.user.id);
    
    let cart = await Cart.findOne({ user: req.user.id, isActive: true })
      .populate('items.product')
      .populate('user', 'name email');

    if (!cart) {
      // Create new cart if user doesn't have one
      cart = new Cart({
        user: req.user.id,
        items: [],
        totalAmount: 0,
        totalItems: 0
      });
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
  try {
    console.log('Cart ADD request - User ID:', req.user.id, 'Body:', req.body);
    
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    let cart = await Cart.findOne({ user: req.user.id, isActive: true });

    if (!cart) {
      cart = new Cart({
        user: req.user.id,
        items: []
      });
    }

    // Get product price from database
    const Product = require('../models/Product');
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.isActive) {
      return res.status(400).json({ message: 'Product is not available' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    await cart.addItem(productId, quantity, product.price);
    
    // Populate product details
    await cart.populate('items.product');
    
    res.json(cart);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update item quantity
router.put('/update/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({ message: 'Quantity must be positive' });
    }

    let cart = await Cart.findOne({ user: req.user.id, isActive: true });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Check stock availability
    const Product = require('../models/Product');
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    await cart.updateItemQuantity(productId, quantity);
    await cart.populate('items.product');
    
    res.json(cart);
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove item from cart
router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;

    let cart = await Cart.findOne({ user: req.user.id, isActive: true });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await cart.removeItem(productId);
    await cart.populate('items.product');
    
    res.json(cart);
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear cart
router.delete('/clear', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id, isActive: true });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    await cart.clearCart();
    
    res.json(cart);
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get cart summary (total items and amount)
router.get('/summary', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id, isActive: true });

    if (!cart) {
      return res.json({
        totalItems: 0,
        totalAmount: 0
      });
    }

    res.json({
      totalItems: cart.totalItems,
      totalAmount: cart.totalAmount
    });
  } catch (error) {
    console.error('Error getting cart summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 