const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createServiceRequest,
  getAvailableRequests,
  getMyRequests,
  acceptServiceRequest,
  startProject,
  completeProject,
  cancelServiceRequest
} = require('../controllers/serviceRequestController');

router.use(protect);

router.route('/')
  .post(authorize('farmer'), createServiceRequest);

router.route('/available')
  .get(authorize('landowner'), getAvailableRequests);

router.route('/my-requests')
  .get(getMyRequests);

router.route('/:id/accept')
  .put(authorize('landowner'), acceptServiceRequest);

router.route('/:id/start')
  .put(authorize('landowner'), startProject);

router.route('/:id/complete')
  .put(authorize('landowner'), completeProject);

router.route('/:id/cancel')
  .put(authorize('farmer'), cancelServiceRequest);

module.exports = router;