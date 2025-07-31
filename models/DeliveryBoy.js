const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deliveryBoySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  vehicleNumber: {
    type: String
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'car', 'van']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'busy'],
    default: 'active'
  },
  currentLocation: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  rating: {
    type: Number,
    default: 0
  },
  earnings: {
    type: Number,
    default: 0
  },
  documents: {
    license: String,
    insurance: String,
    vehicleRegistration: String
  },
  role: {
    type: String,
    default: 'delivery'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
deliveryBoySchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
deliveryBoySchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('DeliveryBoy', deliveryBoySchema); 