// Configuration manager
// These values are now set by the CLI from the config.json

const config = {
  // Server config
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database config
  databaseUrl: process.env.DATABASE_URL,
  
  // JWT config
  jwtSecret: process.env.JWT_SECRET,
  
  // DNS config
  defaultTtl: parseInt(process.env.DEFAULT_TTL || '600', 10)
};

// Validate required configuration
function validateConfig() {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required. Use "ddns configure-db" to set it.');
  }
  
  if (config.nodeEnv === 'production' && config.jwtSecret === 'default_jwt_secret_change_this') {
    throw new Error('A secure JWT_SECRET is required in production.');
  }
}

// Export configuration
module.exports = {
  ...config,
  validateConfig
};