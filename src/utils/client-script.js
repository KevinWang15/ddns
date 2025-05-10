#!/usr/bin/env node
// DDNS Client Script
// This script automatically updates your dynamic DNS record
// Token and server URL will be replaced with actual values when served

const TOKEN = '__TOKEN__';
const SERVER_URL = '__SERVER_URL__';
const UPDATE_INTERVAL = 300000; // 5 minutes
const DOMAIN = '__DOMAIN__';

// Use built-in Node.js modules to avoid dependencies
const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Make an HTTP request using native Node.js modules
 * @param {string} url - The URL to request
 * @param {object} options - Request options
 * @param {object|string} [data] - Request body data for POST/PUT
 * @returns {Promise<object>} - Promise resolving to the response
 */
function makeRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    // Parse the URL to determine protocol (http or https)
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    // Prepare request options
    const requestOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    };
    
    // Create request
    const req = client.request(url, requestOptions, (res) => {
      // Handle redirects (follow up to 5 redirects)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (options._redirectCount && options._redirectCount >= 5) {
          return reject(new Error('Too many redirects'));
        }
        
        // Update redirect count
        const redirectOptions = {
          ...options,
          _redirectCount: (options._redirectCount || 0) + 1
        };
        
        // Follow redirect
        return resolve(makeRequest(res.headers.location, redirectOptions, data));
      }
      
      // Collect response data
      let responseData = '';
      res.setEncoding('utf8');
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse as JSON
          const parsedData = responseData.trim() ? JSON.parse(responseData) : {};
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            const error = new Error(`Request failed with status ${res.statusCode}`);
            error.response = {
              status: res.statusCode,
              data: parsedData,
              headers: res.headers
            };
            reject(error);
          }
        } catch (e) {
          // Handle non-JSON responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: responseData });
          } else {
            const error = new Error(`Request failed with status ${res.statusCode}`);
            error.response = {
              status: res.statusCode,
              data: responseData,
              headers: res.headers
            };
            reject(error);
          }
        }
      });
    });
    
    // Handle request errors
    req.on('error', (err) => {
      reject(err);
    });
    
    // Send data if provided (for POST/PUT)
    if (data) {
      const bodyData = typeof data === 'string' ? data : JSON.stringify(data);
      req.write(bodyData);
    }
    
    // End the request
    req.end();
  });
}

/**
 * Format timestamp for logging
 * @returns {string} Formatted timestamp [HH:MM:SS]
 */
function timestamp() {
  const now = new Date();
  return `[${now.toISOString().substring(11, 19)}]`;
}

/**
 * Log with timestamp and prefix
 * @param {string} level - Log level (INFO, ERROR, etc.)
 * @param {string} message - Message to log
 */
function log(level, message) {
  console.log(`${timestamp()} ${level}: ${message}`);
}

/**
 * Log error with details
 * @param {string} context - Error context
 * @param {Error} error - Error object
 */
function logError(context, error) {
  log('ERROR', `${context}: ${error.message}`);
  if (error.response) {
    log('ERROR', `Server response: ${JSON.stringify(error.response.data)}`);
  }
  if (error.stack && process.env.DEBUG) {
    console.error(error.stack);
  }
}

// Get current public IP address
async function getCurrentIP() {
  try {
    log('INFO', 'Detecting public IP address...');
    // Use the server's built-in IP detection endpoint
    const response = await makeRequest(`${SERVER_URL}/api/ip`);
    log('INFO', `Successfully detected IP: ${response.ip}`);
    return response.ip;
  } catch (error) {
    logError('Failed to detect IP address', error);
    throw new Error('Failed to detect IP address');
  }
}

// Update DNS record
async function updateDNS(ip) {
  try {
    log('INFO', `Updating DNS record for ${DOMAIN} to ${ip}...`);
    const response = await makeRequest(`${SERVER_URL}/api/dns/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    }, { ip });

    if (response.success) {
      if (response.result && response.result.status === 'unchanged') {
        log('INFO', `DNS record is already up-to-date (${ip})`);
      } else {
        log('INFO', `DNS record updated successfully to ${ip}`);
      }
    }

    return response;
  } catch (error) {
    logError('Failed to update DNS record', error);
    throw error;
  }
}

// Main function to check and update IP
async function checkAndUpdateIP() {
  try {
    const currentIP = await getCurrentIP();
    const result = await updateDNS(currentIP);

    // Schedule next check
    const nextCheckTime = new Date(Date.now() + UPDATE_INTERVAL);
    const nextCheckTimeStr = nextCheckTime.toLocaleTimeString();
    log('INFO', `Next check scheduled at ${nextCheckTimeStr}`);
  } catch (error) {
    log('ERROR', `Update cycle failed: ${error.message}`);
    log('INFO', `Will retry in ${UPDATE_INTERVAL/60000} minutes`);
  }
}

// Run initially and then at intervals
log('INFO', '========================================');
log('INFO', `DDNS client starting for domain: ${DOMAIN}`);
log('INFO', `Server URL: ${SERVER_URL}`);
log('INFO', `Update interval: ${UPDATE_INTERVAL/60000} minutes`);
log('INFO', '========================================');

checkAndUpdateIP();
setInterval(checkAndUpdateIP, UPDATE_INTERVAL);

// Handle termination
process.on('SIGINT', () => {
  log('INFO', 'Received termination signal. Shutting down...');
  log('INFO', 'DDNS client stopped');
  process.exit(0);
});

// Handle unexpected errors
process.on('uncaughtException', (error) => {
  logError('Uncaught exception', error);
  log('ERROR', 'An unexpected error occurred. Client will attempt to continue...');
});