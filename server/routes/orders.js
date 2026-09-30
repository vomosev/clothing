const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createOrder,
  listOrders,
  getOrder,
} = require('../controllers/orderController');

const router = express.Router();

router.use(requireAuth);

router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:reference', getOrder);

module.exports = router;