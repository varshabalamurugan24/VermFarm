const mongoose = require('mongoose');

const marketplaceSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: {
      values: ['poultry_waste', 'coconut_husk', 'dry_leaves', 'vermicompost'],
      message: 'Invalid product category'
    }
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  quantityAvailable: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['kg', 'ton'],
    default: 'kg'
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['active', 'sold_out', 'inactive', 'pending_approval'],
    default: 'active'
  },
  totalSold: {
    type: Number,
    default: 0,
    min: 0
  },
  // Quality indicators
  qualityGrade: {
    type: String,
    enum: ['A', 'B', 'C', 'Not Graded'],
    default: 'Not Graded'
  },
  isCertified: {
    type: Boolean,
    default: false
  },
  certificationDetails: {
    type: String,
    maxlength: [500, 'Certification details cannot exceed 500 characters']
  },
  // Location for local pickup
  pickupLocation: {
    type: String,
    trim: true
  },
  deliveryAvailable: {
    type: Boolean,
    default: false
  },
  deliveryRadius: {
    type: Number, // in km
    default: 0
  },
  deliveryCharge: {
    type: Number,
    default: 0
  },
  // Statistics
  views: {
    type: Number,
    default: 0
  },
  inquiries: {
    type: Number,
    default: 0
  },
  // Reviews
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
marketplaceSchema.index({ sellerId: 1, status: 1 });
marketplaceSchema.index({ category: 1, status: 1 });
marketplaceSchema.index({ status: 1, createdAt: -1 });
marketplaceSchema.index({ pricePerUnit: 1 });

// Auto-update status based on quantity
marketplaceSchema.pre('save', function(next) {
  if (this.isModified('quantityAvailable')) {
    if (this.quantityAvailable === 0) {
      this.status = 'sold_out';
    } else if (this.status === 'sold_out' && this.quantityAvailable > 0) {
      this.status = 'active';
    }
  }
  next();
});

// Calculate total value
marketplaceSchema.methods.getTotalValue = function() {
  return this.quantityAvailable * this.pricePerUnit;
};

// Increment views
marketplaceSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
};

// Increment inquiries
marketplaceSchema.methods.incrementInquiries = async function() {
  this.inquiries += 1;
  await this.save();
};

module.exports = mongoose.model('Marketplace', marketplaceSchema);