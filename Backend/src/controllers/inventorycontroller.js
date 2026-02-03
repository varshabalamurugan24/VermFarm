const Inventory = require('../models/inventory');
const User = require('../models/User');

// @desc    Get user inventoryn
// @route   GET /api/inventory
// @access  Private (Farmers only)
exports.getInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.find({ userId: req.user.id });
    // Calculate total inventory
    const totalInventory = inventory.reduce((sum, item) => sum + item.quantity, 0);

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      'farmerStats.totalInventory': totalInventory
    });

    res.status(200).json({
      success: true,
      count: inventory.length,
      totalQuantity: totalInventory,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (Farmers only)
exports.updateInventory = async (req, res, next) => {
  try {
    let inventory = await Inventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Make sure user owns this inventory
    if (inventory.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this inventory'
      });
    }

    inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { quantity: req.body.quantity, notes: req.body.notes },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update inventory
// @route   PUT /api/inventory/bulk
// @access  Private (Farmers only)
exports.bulkUpdateInventory = async (req, res, next) => {
  try {
    const updates = req.body.updates; // Array of {id, quantity}

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates must be an array'
      });
    }

    const results = [];

    for (const update of updates) {
      const inventory = await Inventory.findOneAndUpdate(
        { _id: update.id, userId: req.user.id },
        { quantity: update.quantity },
        { new: true, runValidators: true }
      );
      
      if (inventory) {
        results.push(inventory);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      data: results
    });
  } catch (error) {
    next(error);
  }
};