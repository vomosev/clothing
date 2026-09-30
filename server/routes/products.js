const express = require('express');
const {
  listProducts,
  listCategories,
  getProductBySlug,
} = require('../controllers/productController');

const router = express.Router();

// GET /api/products?category=&q=&sort=&featured=&limit=
router.get('/', listProducts);

// GET /api/products/categories
router.get('/categories', listCategories);

// GET /api/products/:slug
router.get('/:slug', getProductBySlug);

module.exports = router;