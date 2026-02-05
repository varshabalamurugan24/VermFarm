const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please provide a valid phone number']
  },
  userType: {
    type: String,
    required: [true, 'Please specify user type'],
    enum: {
      values: ['farmer', 'landowner', 'buyer'],
      message: 'User type must be either farmer, landowner, or buyer'
    }
  },
  location: {
    type: String,
    required: [true, 'Please provide your location'],
    trim: true
  },
  // Farmer-specific fields
  farmerStats: {
    totalInventory: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    activeRequests: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },
  // Land Owner-specific fields
  landownerStats: {
    activeProjects: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    serviceRevenue: { type: Number, default: 0 },
    productRevenue: { type: Number, default: 0 },
    serviceChargePercent: { type: Number, default: 15, min: 1, max: 50 }
  },
  // Buyer-specific fields
  buyerStats: {
    totalPurchases: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    activeOrders: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      userType: this.userType,
      email: this.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Get user stats based on user type
userSchema.methods.getStats = function() {
  if (this.userType === 'farmer') {
    return this.farmerStats;
  } else if (this.userType === 'landowner') {
    return this.landownerStats;
  } else {
    return this.buyerStats;
  }
};

module.exports = mongoose.model('User', userSchema);