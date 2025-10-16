const express = require('express');
const {
  globalSearch,
  getSearchSuggestions
} = require('../controllers/searchController');

const router = express.Router();

// Public routes (no authentication required for search)
router.get('/', globalSearch);
router.get('/suggestions', getSearchSuggestions);

module.exports = router;