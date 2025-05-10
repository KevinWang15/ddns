// IP Controller
// Handles IP address detection for clients

/**
 * Get client's IP address
 * 
 * This function handles various proxy headers to determine the actual client IP:
 * - X-Forwarded-For: Standard proxy header (comma-separated, leftmost is client)
 * - X-Real-IP: Used by Nginx and some proxies
 * - CF-Connecting-IP: Cloudflare specific header
 * - True-Client-IP: Akamai and some CDNs
 * 
 * Fall back to req.socket.remoteAddress if no proxy headers are found
 */
const getClientIp = (req) => {
  // Check X-Forwarded-For header (most common)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // Get the first IP in the list (client IP)
    return xForwardedFor.split(',')[0].trim();
  }
  
  // Check X-Real-IP (Nginx)
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) {
    return xRealIp.trim();
  }
  
  // Check Cloudflare specific header
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  // Check Akamai and some CDNs
  const trueClientIp = req.headers['true-client-ip'];
  if (trueClientIp) {
    return trueClientIp.trim();
  }
  
  // Fall back to socket remote address
  return req.socket.remoteAddress;
};

/**
 * Return the client's IP address
 */
const getIp = (req, res) => {
  try {
    const ip = getClientIp(req);
    
    // Check if IP is valid
    if (!ip) {
      return res.status(500).json({ 
        error: 'Could not determine your IP address' 
      });
    }
    
    // Return the IP in the same format as ipify for compatibility
    return res.status(200).json({ ip });
  } catch (error) {
    console.error('Error in IP detection:', error);
    return res.status(500).json({ 
      error: 'Failed to detect IP address',
      message: error.message 
    });
  }
};

module.exports = {
  getIp,
  getClientIp
};