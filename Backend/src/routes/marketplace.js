const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getListings,
  createListing,
  getMyListings,
  updateListing,
  deleteListing
} = require('../controllers/marketplaceController');

router.route('/')
  .get(getListings)
  .post(protect, authorize('farmer', 'landowner'), createListing);

router.route('/my-listings')
  .get(protect, authorize('farmer', 'landowner'), getMyListings);

router.route('/:id')
  .put(protect, authorize('farmer', 'landowner'), updateListing)
  .delete(protect, authorize('farmer', 'landowner'), deleteListing);

module.exports = router;