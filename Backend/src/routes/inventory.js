const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventorycontroller');

const { protect, authorize } = require('../middleware/auth');
const {
  getInventory,
  updateInventory,
  bulkUpdateInventory
} = require('../controllers/inventorycontroller');

router.use(protect);
router.use(authorize('farmer'));

router.route('/').get(getInventory);
router.route('/bulk').put(bulkUpdateInventory);
router.route('/:id').put(updateInventory);

module.exports = router;