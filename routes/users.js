const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   GET api/users/all
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/all', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const users = await User.find()
      .select('-password') // Exclude password from response
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, addresses } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (addresses) user.addresses = addresses;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT api/users/addresses
// @desc    Update user addresses
// @access  Private
router.put('/addresses', auth, async (req, res) => {
  try {
    const { addresses } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.addresses = addresses;
    await user.save();
    res.json(user.addresses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT api/users/:id/role
// @desc    Update user role (admin only)
// @access  Private (Admin)
router.put('/:id/role', auth, async (req, res) => {
  try {
    console.log('🎯 Role update request:', { userId: req.params.id, newRole: req.body.role, adminId: req.user.id });
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('❌ Access denied - not admin');
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { role } = req.body;
    const validRoles = ['admin', 'customer', 'delivery'];

    if (!validRoles.includes(role)) {
      console.log('❌ Invalid role:', role);
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Prevent admin from changing their own role
    if (req.params.id === req.user.id) {
      console.log('❌ Admin trying to change own role');
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      console.log('❌ User not found:', req.params.id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User found:', { name: user.name, currentRole: user.role, newRole: role });

    user.role = role;
    await user.save();

    console.log('✅ Role updated successfully');

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('❌ Error updating role:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 