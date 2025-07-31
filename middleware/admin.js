const auth = require('./auth');

module.exports = function(req, res, next) {
  // First check if user is authenticated
  auth(req, res, () => {
    // Then check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  });
}; 