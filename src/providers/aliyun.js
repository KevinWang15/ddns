// Aliyun DNS Provider Implementation
const Core = require('@alicloud/pop-core');
const { getProviderConfig } = require('../config/providers');
const { parseDomain } = require('../utils/domain');

/**
 * Create Aliyun DNS client
 */
const createClient = (config) => {
  if (!config) {
    config = getProviderConfig('aliyun');
  }

  if (!config) {
    throw new Error('Aliyun configuration not found');
  }

  return new Core({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    endpoint: config.endpoint,
    apiVersion: config.apiVersion
  });
};

/**
 * Get domain record
 */
const getDomainRecord = async (domainName) => {
  const client = createClient();
  const { rootDomain, subDomain } = parseDomain(domainName);
  
  const params = {
    DomainName: rootDomain,
    RRKeyWord: subDomain,
    Type: 'A'
  };
  
  try {
    const result = await client.request('DescribeDomainRecords', params, {
      method: 'POST'
    });
    
    if (result.DomainRecords.Record && result.DomainRecords.Record.length > 0) {
      return result.DomainRecords.Record.find(record => 
        record.RR === subDomain && record.Type === 'A'
      );
    }
    
    return null;
  } catch (error) {
    console.error('Error getting domain record:', error);
    // Create a sanitized error object to prevent leaking sensitive data
    const safeError = new Error(`Failed to get domain record: ${error.message}`);
    safeError.code = error.code || 'PROVIDER_ERROR';
    safeError.statusCode = 500;
    throw safeError;
  }
};

/**
 * Add new domain record
 */
const addDomainRecord = async (domainName, ip, ttl = 600) => {
  const client = createClient();
  const { rootDomain, subDomain } = parseDomain(domainName);
  
  const params = {
    DomainName: rootDomain,
    RR: subDomain,
    Type: 'A',
    Value: ip,
    TTL: ttl
  };
  
  try {
    const result = await client.request('AddDomainRecord', params, {
      method: 'POST'
    });
    
    return result;
  } catch (error) {
    console.error('Error adding domain record:', error);
    // Create a sanitized error object to prevent leaking sensitive data
    const safeError = new Error(`Failed to add domain record: ${error.message}`);
    safeError.code = error.code || 'PROVIDER_ERROR';
    safeError.statusCode = 500;
    throw safeError;
  }
};

/**
 * Update existing domain record
 */
const updateDomainRecord = async (recordId, subDomain, ip, ttl = 600) => {
  const client = createClient();
  
  const params = {
    RecordId: recordId,
    RR: subDomain,
    Type: 'A',
    Value: ip,
    TTL: ttl
  };
  
  try {
    const result = await client.request('UpdateDomainRecord', params, {
      method: 'POST'
    });
    
    return result;
  } catch (error) {
    console.error('Error updating domain record:', error);
    // Create a sanitized error object to prevent leaking sensitive data
    const safeError = new Error(`Failed to update domain record: ${error.message}`);
    safeError.code = error.code || 'PROVIDER_ERROR';
    safeError.statusCode = 500;
    throw safeError;
  }
};

/**
 * Update DNS record
 * Main function exposed to the controller
 */
const updateRecord = async (domainName, ip, ttl = 600) => {
  try {
    // Check if record exists
    const existingRecord = await getDomainRecord(domainName);
    const { subDomain } = parseDomain(domainName);
    
    if (existingRecord) {
      // If record exists and IP has changed, update it
      if (existingRecord.Value !== ip) {
        return await updateDomainRecord(existingRecord.RecordId, subDomain, ip, ttl);
      }
      
      // IP hasn't changed, no need to update
      return { 
        status: 'unchanged',
        message: 'IP address is already up to date'
      };
    }
    
    // Record doesn't exist, create it
    return await addDomainRecord(domainName, ip, ttl);
  } catch (error) {
    console.error('Error updating DNS record:', error);
    // Create a sanitized error object to prevent leaking sensitive data
    const safeError = new Error(`Failed to update DNS record: ${error.message}`);
    safeError.code = error.code || 'PROVIDER_ERROR';
    safeError.statusCode = 500;
    throw safeError;
  }
};

module.exports = {
  updateRecord,
  getDomainRecord
};