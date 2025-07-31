const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DeliveryBoy = require('../models/DeliveryBoy');

module.exports = async function(req, res, next) {
  // Get token from header
  let token = req.header('x-auth-token');
  
  // If not found in x-auth-token, try Authorization header
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  console.log('Auth middleware - Token found:', !!token);
  console.log('Auth middleware - Headers:', req.headers);

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify token
  try {
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Token decoded successfully:', decoded);
    
    // Fetch full user data from database
    let user = await User.findById(decoded.id).select('-password');
    console.log('User found:', user ? 'YES' : 'NO');
    
    if (!user) {
      // Check if it's a delivery boy
      user = await DeliveryBoy.findById(decoded.id).select('-password');
      console.log('Delivery boy found:', user ? 'YES' : 'NO');
    }
    
    if (!user) {
      console.log('No user found for ID:', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }
    
    console.log('User role:', user.role);
    req.user = user;
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    res.status(401).json({ message: 'Token is not valid', error: err.message });
  }
}; 