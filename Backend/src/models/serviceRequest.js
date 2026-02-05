const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Farmer ID is required']
  },
  landownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  materialType: {
    type: String,
    required: [true, 'Material type is required'],
    enum: {
      values: ['Poultry Waste', 'Coconut Husk', 'Dry Leaves', 'Mixed Materials'],
      message: 'Invalid material type'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1 kg']
  },
  unit: {
    type: String,
    default: 'kg',
    enum: ['kg', 'ton']
  },
  serviceChargePercent: {
    type: Number,
    required: [true, 'Service charge percentage is required'],
    min: [5, 'Service charge must be at least 5%'],
    max: [50, 'Service charge cannot exceed 50%'],
    default: 15
  },
  estimatedRevenue: {
    type: Number,
    default: 0
  },
  actualRevenue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  qualityRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  farmerReview: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  landownerReview: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes
serviceRequestSchema.index({ farmerId: 1, status: 1 });
serviceRequestSchema.index({ landownerId: 1, status: 1 });
serviceRequestSchema.index({ status: 1, createdAt: -1 });

// Calculate estimated revenue
serviceRequestSchema.pre('save', function(next) {
  if (this.isNew && !this.estimatedRevenue) {
    this.estimatedRevenue = this.quantity * 20;
  }
  next();
});

// Update timestamps
serviceRequestSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = Date.now();
    if (this.status === 'accepted' && !this.acceptedAt) {
      this.acceptedAt = now;
    }
    if (this.status === 'in_progress' && !this.startedAt) {
      this.startedAt = now;
    }
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = now;
    }
  }
  next();
});

// Calculate service charge
serviceRequestSchema.methods.calculateServiceCharge = function() {
  const revenue = this.actualRevenue || this.estimatedRevenue;
  return (revenue * this.serviceChargePercent) / 100;
};

// Calculate farmer earnings
serviceRequestSchema.methods.calculateFarmerEarnings = function() {
  const revenue = this.actualRevenue || this.estimatedRevenue;
  return revenue - this.calculateServiceCharge();
};

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);