#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Define the config directory in user's home folder
const configDir = path.join(os.homedir(), '.ddns');
const configFile = path.join(configDir, 'config.json');

// Load configuration
function loadConfig() {
  if (!fs.existsSync(configFile)) {
    console.error(`Configuration file not found: ${configFile}`);
    console.error('Please run "ddns configure-db" first to set up your database connection.');
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch (error) {
    console.error('Error reading config file:', error.message);
    process.exit(1);
  }
}

// Generate Prisma client
function generateClient() {
  try {
    const config = loadConfig();
    
    if (!config.database || !config.database.url) {
      console.error('Database URL not found in configuration');
      console.error('Please run "ddns configure-db" to set up your database connection.');
      process.exit(1);
    }
    
    console.log('Generating Prisma client...');
    
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: config.database.url
      }
    });
    
    console.log('Prisma client generated successfully.');
  } catch (error) {
    console.error('Error generating Prisma client:', error.message);
    process.exit(1);
  }
}

generateClient();