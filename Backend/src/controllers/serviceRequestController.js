const ServiceRequest = require('../models/ServiceRequest');
const Inventory = require('../models/inventory');
const User = require('../models/User');

// @desc    Create service request (Farmer)
// @route   POST /api/service-requests
// @access  Private (Farmers only)
exports.createServiceRequest = async (req, res, next) => {
  try {
    const { materialType, quantity, serviceChargePercent, notes } = req.body;

    // Add farmer ID
    req.body.farmerId = req.user.id;

    const serviceRequest = await ServiceRequest.create(req.body);

    // Update farmer stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'farmerStats.activeRequests': 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: serviceRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all available service requests (for land owners)
// @route   GET /api/service-requests/available
// @access  Private (Land owners only)
exports.getAvailableRequests = async (req, res, next) => {
  try {
    const requests = await ServiceRequest.find({
      landownerId: null,
      status: 'pending'
    })
    .populate('farmerId', 'name phone location')
    .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's service requests
// @route   GET /api/service-requests/my-requests
// @access  Private
exports.getMyRequests = async (req, res, next) => {
  try {
    let query;

    if (req.user.userType === 'farmer') {
      query = { farmerId: req.user.id };
    } else if (req.user.userType === 'landowner') {
      query = { landownerId: req.user.id };
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only farmers and land owners can access service requests'
      });
    }

    const requests = await ServiceRequest.find(query)
      .populate('farmerId', 'name phone location')
      .populate('landownerId', 'name phone location')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept service request (Land owner)
// @route   PUT /api/service-requests/:id/accept
// @access  Private (Land owners only)
exports.acceptServiceRequest = async (req, res, next) => {
  try {
    let request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request is not available'
      });
    }

    request.landownerId = req.user.id;
    request.status = 'accepted';
    await request.save();

    // Update landowner stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'landownerStats.activeProjects': 1 }
    });

    res.status(200).json({
      success: true,
      message: 'Service request accepted successfully',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start project (Land owner)
// @route   PUT /api/service-requests/:id/start
// @access  Private (Land owners only)
exports.startProject = async (req, res, next) => {
  try {
    let request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    if (request.landownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (request.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Request must be accepted first'
      });
    }

    request.status = 'in_progress';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Project started successfully',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete project (Land owner)
// @route   PUT /api/service-requests/:id/complete
// @access  Private (Land owners only)
exports.completeProject = async (req, res, next) => {
  try {
    let request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    if (request.landownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (request.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Project must be in progress'
      });
    }

    // Update actual revenue if provided
    if (req.body.actualRevenue) {
      request.actualRevenue = req.body.actualRevenue;
    }

    request.status = 'completed';
    await request.save();

    // Calculate earnings
    const serviceCharge = request.calculateServiceCharge();
    const farmerEarnings = request.calculateFarmerEarnings();

    // Update landowner stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        'landownerStats.completedProjects': 1,
        'landownerStats.activeProjects': -1,
        'landownerStats.serviceRevenue': serviceCharge
      }
    });

    // Update farmer stats
    await User.findByIdAndUpdate(request.farmerId, {
      $inc: {
        'farmerStats.activeRequests': -1,
        'farmerStats.revenue': farmerEarnings
      }
    });

    res.status(200).json({
      success: true,
      message: 'Project completed successfully',
      data: request,
      earnings: {
        landowner: serviceCharge,
        farmer: farmerEarnings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel service request (Farmer)
// @route   PUT /api/service-requests/:id/cancel
// @access  Private (Farmers only)
exports.cancelServiceRequest = async (req, res, next) => {
  try {
    let request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    if (request.farmerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending requests'
      });
    }

    request.status = 'cancelled';
    await request.save();

    // Update farmer stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'farmerStats.activeRequests': -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Service request cancelled successfully',
      data: request
    });
  } catch (error) {
    next(error);
  }
};