const Marketplace = require('../models/Marketplace');
const User = require('../models/User');

// @desc    Get all marketplace listings
// @route   GET /api/marketplace
// @access  Public
exports.getListings = async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, search, sort = '-createdAt' } = req.query;
    
    // Build query
    let query = { status: 'active', isActive: true };
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by price range
    if (minPrice || maxPrice) {
      query.pricePerUnit = {};
      if (minPrice) query.pricePerUnit.$gte = parseFloat(minPrice);
      if (maxPrice) query.pricePerUnit.$lte = parseFloat(maxPrice);
    }
    
    // Search by product name
    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }

    // Execute query with populated seller info
    const listings = await Marketplace.find(query)
      .populate('sellerId', 'name location phone userType')
      .sort(sort)
      .lean();

    res.status(200).json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single listing by ID
// @route   GET /api/marketplace/:id
// @access  Public
exports.getListing = async (req, res, next) => {
  try {
    const listing = await Marketplace.findById(req.params.id)
      .populate('sellerId', 'name location phone userType email');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Increment view count
    await listing.incrementViews();

    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create marketplace listing
// @route   POST /api/marketplace
// @access  Private (Farmers & Land owners)
exports.createListing = async (req, res, next) => {
  try {
    // Add seller ID from authenticated user
    req.body.sellerId = req.user.id;
    
    // Set pickup location to user's location if not provided
    if (!req.body.pickupLocation) {
      req.body.pickupLocation = req.user.location;
    }
    
    // Create listing
    const listing = await Marketplace.create(req.body);

    // Update user stats
    const statField = req.user.userType === 'farmer' ? 'farmerStats' : 'landownerStats';
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 
        [`${statField}.totalSales`]: 1 
      }
    });

    res.status(201).json({
      success: true,
      message: 'Product listed successfully on marketplace',
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's own listings
// @route   GET /api/marketplace/my-listings
// @access  Private (Farmers & Land owners)
exports.getMyListings = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let query = { sellerId: req.user.id };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    const listings = await Marketplace.find(query)
      .sort('-createdAt')
      .lean();

    // Calculate totals
    const totals = {
      active: listings.filter(l => l.status === 'active').length,
      sold_out: listings.filter(l => l.status === 'sold_out').length,
      inactive: listings.filter(l => l.status === 'inactive').length,
      total_revenue: listings.reduce((sum, l) => sum + (l.totalSold * l.pricePerUnit), 0),
      total_sold: listings.reduce((sum, l) => sum + l.totalSold, 0)
    };

    res.status(200).json({
      success: true,
      count: listings.length,
      totals,
      data: listings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update listing
// @route   PUT /api/marketplace/:id
// @access  Private (Seller only)
exports.updateListing = async (req, res, next) => {
  try {
    let listing = await Marketplace.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Check if user owns this listing
    if (listing.sellerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this listing'
      });
    }

    // Update listing
    listing = await Marketplace.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Listing updated successfully',
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete listing
// @route   DELETE /api/marketplace/:id
// @access  Private (Seller only)
exports.deleteListing = async (req, res, next) => {
  try {
    const listing = await Marketplace.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Check if user owns this listing
    if (listing.sellerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this listing'
      });
    }

    // Delete the listing
    await Marketplace.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Listing deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark listing as inactive
// @route   PUT /api/marketplace/:id/deactivate
// @access  Private (Seller only)
exports.deactivateListing = async (req, res, next) => {
  try {
    let listing = await Marketplace.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Check ownership
    if (listing.sellerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    listing.status = 'inactive';
    listing.isActive = false;
    await listing.save();

    res.status(200).json({
      success: true,
      message: 'Listing deactivated successfully',
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark listing as active
// @route   PUT /api/marketplace/:id/activate
// @access  Private (Seller only)
exports.activateListing = async (req, res, next) => {
  try {
    let listing = await Marketplace.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Check ownership
    if (listing.sellerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Can only activate if there's quantity available
    if (listing.quantityAvailable === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate listing with zero quantity. Please update quantity first.'
      });
    }

    listing.status = 'active';
    listing.isActive = true;
    await listing.save();

    res.status(200).json({
      success: true,
      message: 'Listing activated successfully',
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get marketplace statistics
// @route   GET /api/marketplace/stats
// @access  Public
exports.getMarketplaceStats = async (req, res, next) => {
  try {
    const stats = await Marketplace.aggregate([
      {
        $match: { status: 'active', isActive: true }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$pricePerUnit' },
          totalQuantity: { $sum: '$quantityAvailable' },
          minPrice: { $min: '$pricePerUnit' },
          maxPrice: { $max: '$pricePerUnit' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalListings = await Marketplace.countDocuments({ status: 'active', isActive: true });
    const totalSellers = await Marketplace.distinct('sellerId', { status: 'active', isActive: true });

    res.status(200).json({
      success: true,
      data: {
        categories: stats,
        totalListings,
        totalSellers: totalSellers.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Contact seller (increment inquiry count)
// @route   POST /api/marketplace/:id/contact
// @access  Private (Buyers)
exports.contactSeller = async (req, res, next) => {
  try {
    const listing = await Marketplace.findById(req.params.id)
      .populate('sellerId', 'name phone email location');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Increment inquiry count
    await listing.incrementInquiries();

    // Return seller contact info
    res.status(200).json({
      success: true,
      message: 'Seller contact information retrieved',
      data: {
        seller: {
          name: listing.sellerId.name,
          phone: listing.sellerId.phone,
          email: listing.sellerId.email,
          location: listing.sellerId.location
        },
        product: {
          name: listing.productName,
          price: listing.pricePerUnit,
          unit: listing.unit,
          available: listing.quantityAvailable
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/*module.exports = {
  getListings,
  getListing,
  createListing,
  getMyListings,
  updateListing,
  deleteListing,
  deactivateListing,
  activateListing,
  getMarketplaceStats,
  contactSeller
};*/
module.exports = {
  getListings: exports.getListings,
  getListing: exports.getListing,
  createListing: exports.createListing,
  getMyListings: exports.getMyListings,
  updateListing: exports.updateListing,
  deleteListing: exports.deleteListing,
  deactivateListing: exports.deactivateListing,
  activateListing: exports.activateListing,
  getMarketplaceStats: exports.getMarketplaceStats,
  contactSeller: exports.contactSeller
};
