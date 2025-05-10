#!/usr/bin/env node

require('dotenv').config();
const { Command } = require('commander');
const { PrismaClient } = require('@prisma/client');
const { createTokenForDomain, getAllDomains, deleteDomainToken } = require('../utils/token');
const { setProviderConfig, getProviderConfig } = require('../config/providers');
const { createSafeConfig } = require('../utils/redact');
const { validateDomain } = require('../utils/domain');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Define the config directory in user's home folder
const configDir = path.join(os.homedir(), '.ddns');
const configFile = path.join(configDir, 'config.json');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Initialize or load configuration
function initConfig() {
  if (!fs.existsSync(configFile)) {
    const defaultConfig = {
      server: {
        port: 3000,
        nodeEnv: 'development',
        jwtSecret: crypto.randomBytes(32).toString('hex'),
        url: "http://localhost:3000"
      },
      database: {
        url: "mysql://user:password@localhost:3306/ddns"
      },
      providers: {},
      defaultTtl: 600
    };
    
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  } else {
    try {
      return JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (error) {
      console.error('Error reading config file:', error.message);
      process.exit(1);
    }
  }
}

// Save configuration
function saveConfig(config) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

// Load the configuration
const config = initConfig();

// Make configuration available to other modules
process.env.DATABASE_URL = config.database.url;
process.env.PORT = config.server.port;
process.env.NODE_ENV = config.server.nodeEnv;
process.env.JWT_SECRET = config.server.jwtSecret;
process.env.DEFAULT_TTL = config.defaultTtl;

// Load provider configurations
if (config.providers.aliyun) {
  process.env.ALIYUN_ACCESS_KEY_ID = config.providers.aliyun.accessKeyId;
  process.env.ALIYUN_ACCESS_KEY_SECRET = config.providers.aliyun.accessKeySecret;
  process.env.ALIYUN_ENDPOINT = config.providers.aliyun.endpoint;
  process.env.ALIYUN_API_VERSION = config.providers.aliyun.apiVersion;
}

const prisma = new PrismaClient();
const program = new Command();

// Initialize the CLI
async function initCLI() {
  try {
    // Set version and description
    program
      .name('ddns')
      .description('Dynamic DNS management CLI')
      .version('1.0.0');

    // Configure provider command
    program
      .command('configure')
      .description('Configure DNS provider credentials')
      .argument('<provider>', 'Provider type (e.g., aliyun)')
      .option('-k, --key <accessKeyId>', 'Access Key ID')
      .option('-s, --secret <accessKeySecret>', 'Access Key Secret')
      .option('-f, --file <configFile>', 'JSON config file path')
      .action(async (provider, options) => {
        try {
          let providerConfig = {};
          
          if (options.file) {
            const providedConfigPath = path.resolve(options.file);
            if (!fs.existsSync(providedConfigPath)) {
              console.error(`Config file not found: ${options.file}`);
              return;
            }
            
            const configContent = fs.readFileSync(providedConfigPath, 'utf8');
            providerConfig = JSON.parse(configContent);
          } else if (options.key && options.secret) {
            if (provider === 'aliyun') {
              providerConfig = {
                accessKeyId: options.key,
                accessKeySecret: options.secret,
                endpoint: 'https://alidns.aliyuncs.com',
                apiVersion: '2015-01-09'
              };
            } else {
              console.error(`Provider ${provider} is not supported yet`);
              return;
            }
          } else {
            console.error('Either --file or both --key and --secret must be provided');
            return;
          }
          
          // Update config
          if (!config.providers) {
            config.providers = {};
          }
          config.providers[provider] = providerConfig;
          saveConfig(config);
          
          // Update environment variables
          if (provider === 'aliyun') {
            process.env.ALIYUN_ACCESS_KEY_ID = providerConfig.accessKeyId;
            process.env.ALIYUN_ACCESS_KEY_SECRET = providerConfig.accessKeySecret;
            process.env.ALIYUN_ENDPOINT = providerConfig.endpoint;
            process.env.ALIYUN_API_VERSION = providerConfig.apiVersion;
          }
          
          // Update provider configuration in memory
          setProviderConfig(provider, providerConfig);
          
          console.log(`Provider ${provider} configured successfully`);
          console.log(`Configuration saved to ${configFile}`);
        } catch (error) {
          console.error('Error configuring provider:', error.message);
        }
      });

    // Configure database command
    program
      .command('configure-db')
      .description('Configure database connection')
      .argument('<url>', 'Database connection URL (e.g., mysql://user:password@localhost:3306/ddns)')
      .action(async (url) => {
        try {
          config.database.url = url;
          process.env.DATABASE_URL = url;
          saveConfig(config);

          console.log(`Database configuration updated`);
          console.log(`Configuration saved to ${configFile}`);
        } catch (error) {
          console.error('Error configuring database:', error.message);
        }
      });

    // Configure server URL command
    program
      .command('configure-url')
      .description('Configure server URL for client access')
      .argument('<url>', 'Server URL (e.g., https://ddns.example.com)')
      .action(async (url) => {
        try {
          config.server.url = url;
          saveConfig(config);

          console.log(`Server URL updated to: ${url}`);
          console.log(`Configuration saved to ${configFile}`);
        } catch (error) {
          console.error('Error configuring server URL:', error.message);
        }
      });

    // Configure server port command
    program
      .command('configure-port')
      .description('Configure server listening port')
      .argument('<port>', 'Port number (e.g., 3000)')
      .action(async (port) => {
        try {
          const portNum = parseInt(port, 10);
          if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            console.error('Invalid port number. Port must be between 1 and 65535.');
            return;
          }

          config.server.port = portNum;
          saveConfig(config);

          console.log(`Server port updated to: ${portNum}`);
          console.log(`Configuration saved to ${configFile}`);
        } catch (error) {
          console.error('Error configuring server port:', error.message);
        }
      });

    // Generate token command
    program
      .command('token')
      .description('Generate a token for a domain')
      .argument('<domain>', 'Domain name (e.g., machine1.example.com)')
      .argument('<provider>', 'Provider type (e.g., aliyun)')
      .action(async (domain, provider) => {
        try {
          // Validate domain name
          if (!validateDomain(domain)) {
            console.error(`Invalid domain name format: ${domain}`);
            return;
          }

          // Validate provider configuration
          const providerConfig = getProviderConfig(provider);
          if (!providerConfig) {
            console.error(`Provider ${provider} is not configured. Use 'ddns configure' first.`);
            return;
          }

          // Generate token
          const token = await createTokenForDomain(domain, provider);
          
          // Construct client script URL
          const serverUrl = config.server.url || `http://localhost:${config.server.port || 3000}`;
          const clientScriptUrl = `${serverUrl}/api/client/script?token=${token}`;
          
          console.log('Domain token generated successfully:');
          console.log('-'.repeat(50));
          console.log(`Domain: ${domain}`);
          console.log(`Provider: ${provider}`);
          console.log(`Token: ${token}`);
          console.log('\nClient script URL:');
          console.log(clientScriptUrl);
          console.log('\nTo use this token, run one of the following on your client machine:');
          console.log('Python implementation (recommended):');
          console.log(`curl "${clientScriptUrl}" > ddns-client.py && chmod +x ddns-client.py && python3 ddns-client.py`);
          console.log('\nNode.js implementation (alternative):');
          console.log(`curl "${clientScriptUrl}&type=node" > ddns-client.js && chmod +x ddns-client.js && node ddns-client.js`);
        } catch (error) {
          console.error('Error generating token:', error.message);
        }
      });

    // List domains command
    program
      .command('list')
      .description('List all registered domains')
      .action(async () => {
        try {
          const domains = await getAllDomains();
          
          if (domains.length === 0) {
            console.log('No domains registered yet.');
            return;
          }
          
          console.log('Registered domains:');
          console.log('-'.repeat(80));
          console.log('Domain                            Provider       Last IP            Last Updated');
          console.log('-'.repeat(80));
          
          domains.forEach(domain => {
            const lastUpdated = domain.lastUpdated 
              ? new Date(domain.lastUpdated).toLocaleString() 
              : 'Never';
              
            console.log(
              `${domain.domain.padEnd(32)} ${domain.provider.padEnd(14)} ${(domain.lastIp || 'None').padEnd(18)} ${lastUpdated}`
            );
          });
        } catch (error) {
          console.error('Error listing domains:', error.message);
        }
      });

    // Delete domain command
    program
      .command('delete')
      .description('Delete a domain registration')
      .argument('<domain>', 'Domain name to delete')
      .action(async (domain) => {
        try {
          const success = await deleteDomainToken(domain);
          
          if (success) {
            console.log(`Domain ${domain} deleted successfully`);
          } else {
            console.error(`Failed to delete domain ${domain}`);
          }
        } catch (error) {
          console.error('Error deleting domain:', error.message);
        }
      });

    // Start server command
    program
      .command('start')
      .description('Start the DDNS server')
      .action(async () => {
        try {
          // Validate required configuration
          if (!config.server || !config.server.port) {
            console.error('Server port not configured. Use "ddns configure-port" first.');
            return;
          }

          if (!config.server.url) {
            console.error('Server URL not configured. Use "ddns configure-url" first.');
            return;
          }

          // Set environment variables from configuration
          process.env.PORT = config.server.port;

          console.log(`DDNS server starting...`);
          console.log(`Configured to listen on port: ${config.server.port}`);
          console.log(`Public URL: ${config.server.url}`);

          // Load the server module but wrap in try/catch to handle any synchronous errors
          try {
            // Require the index module which starts the server
            const serverModule = require('../index');

            // Handle process exit for proper cleanup
            process.on('SIGINT', async () => {
              console.log('\nShutting down server...');
              process.exit(0);
            });

            process.on('SIGTERM', async () => {
              console.log('\nServer terminated.');
              process.exit(0);
            });
          } catch (err) {
            console.error(`Failed to start server: ${err.message}`);
            process.exit(1);
          }
        } catch (error) {
          console.error('Error starting server:', error.message);
          process.exit(1);
        }
      });

    // Show config command
    program
      .command('show-config')
      .description('Show current configuration')
      .action(() => {
        // Use the common utility to create a safe copy with redacted sensitive information
        const safeConfig = createSafeConfig(config);

        console.log('Current configuration:');
        console.log(JSON.stringify(safeConfig, null, 2));
        console.log(`\nConfiguration file location: ${configFile}`);
      });

    await program.parseAsync(process.argv);
    
    // Close prisma connection
    await prisma.$disconnect();
  } catch (error) {
    console.error('CLI error:', error);
    process.exit(1);
  }
}

// Run the CLI
initCLI().catch(error => {
  console.error('Initialization error:', error);
  process.exit(1);
});