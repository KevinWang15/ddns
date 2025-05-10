const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Serve client script
router.get('/script', async (req, res) => {
  const token = req.query.token;
  const scriptType = req.query.type || 'python'; // Default to Python implementation

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  // Load domain information from token
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Get domain from token
    const domainToken = await prisma.domainToken.findUnique({
      where: { token },
      select: { domain: true }
    });

    if (!domainToken) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // Determine script path based on requested type
    let clientScriptPath, fileName, contentType;

    if (scriptType.toLowerCase() === 'node' || scriptType.toLowerCase() === 'nodejs' || scriptType.toLowerCase() === 'js') {
      // Node.js implementation
      clientScriptPath = path.join(__dirname, '../utils/client-script.js');
      fileName = `ddns-client-${domainToken.domain}.js`;
      contentType = 'application/javascript';
    } else {
      // Python implementation (default)
      clientScriptPath = path.join(__dirname, '../utils/client-script.py');
      fileName = `ddns-client-${domainToken.domain}.py`;
      contentType = 'text/x-python';
    }

    // Read client script template
    let clientScript = fs.readFileSync(clientScriptPath, 'utf8');

    // Replace placeholders with actual values
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    clientScript = clientScript
      .replace('__TOKEN__', token)
      .replace('__SERVER_URL__', serverUrl)
      .replace('__DOMAIN__', domainToken.domain);

    // Set headers to make the script executable
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(clientScript);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error generating client script:', error);
    await prisma.$disconnect();
    return res.status(500).json({ error: 'Failed to generate client script' });
  }
});

module.exports = router;