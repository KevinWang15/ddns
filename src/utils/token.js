// Token management utilities
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Generate a random token
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create a token for a domain
 * @param {string} domain - The domain name
 * @param {string} provider - The DNS provider type
 * @returns {Promise<string>} - The generated token
 */
const createTokenForDomain = async (domain, provider) => {
  const token = generateToken();
  
  // Check if domain already has a token
  const existingDomain = await prisma.domainToken.findUnique({
    where: { domain }
  });
  
  if (existingDomain) {
    // Update existing token
    await prisma.domainToken.update({
      where: { id: existingDomain.id },
      data: { token }
    });
  } else {
    // Create new token
    await prisma.domainToken.create({
      data: {
        token,
        domain,
        provider
      }
    });
  }
  
  return token;
};

/**
 * Verify a token and return associated domain
 * @param {string} token - The token to verify
 * @returns {Promise<object>} - The domain information
 */
const verifyToken = async (token) => {
  const domainToken = await prisma.domainToken.findUnique({
    where: { token }
  });
  
  if (!domainToken) {
    throw new Error('Invalid token');
  }
  
  return {
    domain: domainToken.domain,
    provider: domainToken.provider
  };
};

/**
 * Get all registered domains
 * @returns {Promise<Array>} - List of domain configurations
 */
const getAllDomains = async () => {
  return await prisma.domainToken.findMany({
    select: {
      domain: true,
      provider: true,
      lastIp: true,
      lastUpdated: true
    }
  });
};

/**
 * Delete a domain token
 * @param {string} domain - The domain to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteDomainToken = async (domain) => {
  try {
    await prisma.domainToken.delete({
      where: { domain }
    });
    return true;
  } catch (error) {
    console.error('Error deleting domain token:', error);
    return false;
  }
};

module.exports = {
  generateToken,
  createTokenForDomain,
  verifyToken,
  getAllDomains,
  deleteDomainToken
};