const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer ID is required']
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required']
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Marketplace',
    required: [true, 'Listing ID is required']
  },
  productName: {
    type: String,
    required: [true, 'Product name is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.1, 'Quantity must be positive']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['kg', 'ton']
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'Price per unit is required'],
    min: [0, 'Price cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  deliveryAddress: {
    type: String,
    required: [true, 'Delivery address is required'],
    trim: true
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'online', 'bank_transfer', 'upi'],
    default: 'cash_on_delivery'
  },
  paymentDetails: {
    transactionId: String,
    paymentDate: Date,
    paymentGateway: String
  },
  // Tracking
  trackingNumber: {
    type: String,
    default: null
  },
  estimatedDelivery: {
    type: Date,
    default: null
  },
  actualDelivery: {
    type: Date,
    default: null
  },
  // Contact info
  buyerPhone: {
    type: String,
    required: [true, 'Buyer phone is required']
  },
  sellerPhone: {
    type: String,
    required: [true, 'Seller phone is required']
  },
  // Reviews
  buyerRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  buyerReview: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  sellerRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  sellerReview: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  // Cancellation
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  cancelledBy: {
    type: String,
    enum: ['buyer', 'seller', 'admin'],
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ buyerId: 1, status: 1 });
transactionSchema.index({ sellerId: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ paymentStatus: 1 });

// Calculate total with delivery
transactionSchema.methods.getTotalWithDelivery = function() {
  return this.totalAmount + this.deliveryCharge;
};

// Check if order can be cancelled
transactionSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

// Check if order can be reviewed
transactionSchema.methods.canBeReviewed = function() {
  return this.status === 'completed' || this.status === 'delivered';
};

module.exports = mongoose.model('Transaction', transactionSchema);