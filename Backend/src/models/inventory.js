const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    required: [true, 'Inventory type is required'],
    enum: {
      values: ['poultry_waste', 'coconut_husk', 'dry_leaves', 'vermicompost'],
      message: 'Invalid inventory type'
    }
  },
  name: {
    type: String,
    required: [true, 'Inventory name is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['kg', 'ton'],
    default: 'kg'
  },
  icon: {
    type: String,
    default: '📦'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Index for faster queries
inventorySchema.index({ userId: 1, type: 1 });

// Update lastUpdated on quantity change
inventorySchema.pre('save', function() {
  if (this.isModified('quantity')) {
    this.lastUpdated = Date.now();
  }
  
});

module.exports = mongoose.model('Inventory', inventorySchema);