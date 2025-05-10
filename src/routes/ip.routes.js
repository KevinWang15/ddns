const express = require('express');
const router = express.Router();
const ipController = require('../controllers/ip.controller');

// Get client IP address
router.get('/', ipController.getIp);

module.exports = router;