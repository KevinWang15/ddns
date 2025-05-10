// No need for dotenv since config is loaded via CLI
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const routes = require('./routes');

const app = express();

// Configure Express to trust proxies
// This is needed for proper operation behind reverse proxies
app.set('trust proxy', true);

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use((req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');

  // Don't expose the framework
  res.setHeader('X-Powered-By', 'DDNS Server');

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Connected to database');

    // Create server but don't start listening yet
    const server = app.listen(PORT);

    // Handle server errors including port conflicts (EADDRINUSE)
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`ERROR: Port ${PORT} is already in use. Another instance may be running.`);
      } else {
        console.error('Server error:', error.message);
      }
      // Exit with an error code
      process.exit(1);
    });

    // Success handler
    server.on('listening', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();