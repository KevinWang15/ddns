// DNS Provider Registry
const aliyunProvider = require('./aliyun');

// Map of provider types to implementations
const providers = {
  'aliyun': aliyunProvider
};

// Get provider by type
const getDNSProvider = (type) => {
  return providers[type] || null;
};

// Register a new provider
const registerProvider = (type, provider) => {
  providers[type] = provider;
};

module.exports = {
  getDNSProvider,
  registerProvider
};