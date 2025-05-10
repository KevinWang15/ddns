const express = require('express');
const router = express.Router();

// Import route modules
const dnsRoutes = require('./dns.routes');
const clientRoutes = require('./client.routes');
const ipRoutes = require('./ip.routes');

// Register route modules
router.use('/dns', dnsRoutes);
router.use('/client', clientRoutes);
router.use('/ip', ipRoutes);

module.exports = router;