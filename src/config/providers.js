// Provider configurations
// This file manages the configuration for different DNS providers

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Provider configuration format example:
 *
 * {
 *   aliyun: {
 *     accessKeyId: 'your_access_key_id',
 *     accessKeySecret: 'your_access_key_secret',
 *     endpoint: 'https://alidns.aliyuncs.com',
 *     apiVersion: '2015-01-09'
 *   },
 *   // Other providers can be added here
 * }
 */

// Define the config directory in user's home folder
const configDir = path.join(os.homedir(), '.ddns');
const configFile = path.join(configDir, 'config.json');

// Load provider configurations from config file and environment
const loadProviderConfigs = () => {
  const configs = {};

  // First try to load from config file
  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (config.providers) {
        return config.providers; // Return the providers section of the config file
      }
    } catch (error) {
      console.error('Error reading config file:', error.message);
    }
  }

  // Fallback to environment variables
  if (process.env.ALIYUN_ACCESS_KEY_ID && process.env.ALIYUN_ACCESS_KEY_SECRET) {
    configs.aliyun = {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
      endpoint: process.env.ALIYUN_ENDPOINT || 'https://alidns.aliyuncs.com',
      apiVersion: process.env.ALIYUN_API_VERSION || '2015-01-09'
    };
  }

  // Add more providers here as needed

  return configs;
};

// Provider configuration store
let providerConfigs = loadProviderConfigs();

// Get a specific provider's configuration
const getProviderConfig = (providerType) => {
  // Reload the config each time to ensure we have the latest values
  providerConfigs = loadProviderConfigs();
  return providerConfigs[providerType] || null;
};

// Set or update a provider's configuration
const setProviderConfig = (providerType, config) => {
  providerConfigs[providerType] = config;
};

// Check if a provider is configured
const isProviderConfigured = (providerType) => {
  // Reload the config each time to ensure we have the latest values
  providerConfigs = loadProviderConfigs();
  return !!providerConfigs[providerType];
};

// List all configured providers
const listConfiguredProviders = () => {
  // Reload the config each time to ensure we have the latest values
  providerConfigs = loadProviderConfigs();
  return Object.keys(providerConfigs);
};

module.exports = {
  getProviderConfig,
  setProviderConfig,
  isProviderConfigured,
  listConfiguredProviders
};