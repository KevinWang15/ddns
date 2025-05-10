const express = require('express');
const router = express.Router();
const { verifyToken } = require('../utils/token');
const dnsController = require('../controllers/dns.controller');

// Middleware to verify token
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const domainInfo = await verifyToken(token);
    req.domainInfo = domainInfo;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Update DNS record
router.post('/update', authenticate, dnsController.updateDNS);

// Get DNS record info
router.get('/info', authenticate, dnsController.getDNSInfo);

module.exports = router;