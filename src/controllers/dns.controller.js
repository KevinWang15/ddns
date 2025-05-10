// DNS Controller
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../utils/token');
const aliyunProvider = require('../providers/aliyun');
const { getProviderConfig } = require('../config/providers');

const prisma = new PrismaClient();

// Map of provider types to implementations
const providerImplementations = {
  'aliyun': aliyunProvider
  // Add more providers here as they are implemented
};

// Get provider implementation by type
const getProviderImplementation = (providerType) => {
  return providerImplementations[providerType] || null;
};

// Simple regex for IPv4 validation
const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

// Validate IPv4 address
const isValidIpv4 = (ip) => {
  if (!ipv4Regex.test(ip)) return false;

  const octets = ip.split('.').map(Number);
  return octets.every(octet => octet >= 0 && octet <= 255);
};

// Update DNS record with current IP
const updateDNS = async (req, res) => {
  try {
    const { domain, provider } = req.domainInfo;
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    // Validate IP address format
    if (!isValidIpv4(ip)) {
      return res.status(400).json({ error: 'Invalid IPv4 address format' });
    }
    
    // Get the appropriate DNS provider
    const providerImpl = getProviderImplementation(provider);
    
    if (!providerImpl) {
      return res.status(500).json({ error: `DNS provider '${provider}' not supported` });
    }
    
    // Check if provider is configured
    const providerConfig = getProviderConfig(provider);
    if (!providerConfig) {
      return res.status(500).json({ error: `DNS provider '${provider}' not configured` });
    }
    
    // Update the DNS record
    const result = await providerImpl.updateRecord(domain, ip);
    
    // Update last IP and timestamp in database
    await prisma.domainToken.update({
      where: { domain },
      data: {
        lastIp: ip,
        lastUpdated: new Date()
      }
    });
    
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Error updating DNS:', error);
    return res.status(500).json({ error: 'Failed to update DNS record' });
  }
};

// Get DNS record information
const getDNSInfo = async (req, res) => {
  try {
    const { domain } = req.domainInfo;
    
    // Get domain configuration from database
    const domainConfig = await prisma.domainToken.findUnique({
      where: { domain },
      select: {
        domain: true,
        provider: true,
        lastIp: true,
        lastUpdated: true
      }
    });
    
    if (!domainConfig) {
      return res.status(404).json({ error: 'Domain configuration not found' });
    }
    
    return res.status(200).json(domainConfig);
  } catch (error) {
    console.error('Error getting DNS info:', error);
    return res.status(500).json({ error: 'Failed to get DNS information' });
  }
};

module.exports = {
  updateDNS,
  getDNSInfo
};