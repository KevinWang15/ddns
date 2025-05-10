/**
 * Utility functions for redacting sensitive information
 */

/**
 * Redact a string value, showing only first and last few characters
 * @param {string} value - The value to redact
 * @param {number} visibleStart - Number of characters to show at start (default: 3)
 * @param {number} visibleEnd - Number of characters to show at end (default: 3)
 * @returns {string} - The redacted string
 */
const redactString = (value, visibleStart = 3, visibleEnd = 3) => {
  if (!value || typeof value !== 'string' || value.length <= (visibleStart + visibleEnd)) {
    return '********'; // Default redaction for short strings
  }
  
  return value.substring(0, visibleStart) + 
         '*'.repeat(value.length - (visibleStart + visibleEnd)) + 
         value.substring(value.length - visibleEnd);
};

/**
 * Create a safe copy of a configuration object with sensitive data redacted
 * @param {object} config - The configuration object to redact
 * @returns {object} - A new object with sensitive data redacted
 */
const createSafeConfig = (config) => {
  // Create a deep copy of the config
  const safeConfig = JSON.parse(JSON.stringify(config));
  
  // Redact sensitive provider information
  if (safeConfig.providers) {
    // Handle Aliyun provider
    if (safeConfig.providers.aliyun && safeConfig.providers.aliyun.accessKeySecret) {
      safeConfig.providers.aliyun.accessKeySecret = redactString(
        safeConfig.providers.aliyun.accessKeySecret
      );
    }
    
    // Add more provider redactions here as they are implemented
  }
  
  // Redact JWT secret
  if (safeConfig.server && safeConfig.server.jwtSecret) {
    safeConfig.server.jwtSecret = '********';
  }
  
  // Redact database password if present in the URL
  if (safeConfig.database && safeConfig.database.url) {
    // Match and redact password in database connection URL
    safeConfig.database.url = safeConfig.database.url.replace(
      /(:\/\/)([^:]+)(:[^@]+)(@)/,
      '$1$2:********$4'
    );
  }
  
  return safeConfig;
};

module.exports = {
  redactString,
  createSafeConfig
};