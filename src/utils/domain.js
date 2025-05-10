/**
 * Domain parsing utilities
 */

// List of known multi-part TLDs
const multiPartTlds = [
  // Global
  'co.uk', 'co.nz', 'co.jp', 'co.za', 'co.in', 'co.id', 'co.il', 'co.th',
  'com.au', 'com.br', 'com.mx', 'com.tr', 'com.sg', 'com.hk', 'com.tw',
  'org.uk', 'net.uk', 'me.uk', 'gov.uk', 'ac.uk', 'edu.au',
  
  // China specific
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 
  'ac.cn', 'ah.cn', 'bj.cn', 'cq.cn', 'fj.cn', 
  'gd.cn', 'gs.cn', 'gz.cn', 'gx.cn', 'ha.cn', 
  'hb.cn', 'he.cn', 'hi.cn', 'hl.cn', 'hn.cn', 
  'jl.cn', 'js.cn', 'jx.cn', 'ln.cn', 'nm.cn', 
  'nx.cn', 'qh.cn', 'sc.cn', 'sd.cn', 'sh.cn', 
  'sn.cn', 'sx.cn', 'tj.cn', 'xj.cn', 'xz.cn', 
  'yn.cn', 'zj.cn'
];

/**
 * Parse domain to get rootDomain and subDomain
 * e.g. machine1.example.com -> { rootDomain: 'example.com', subDomain: 'machine1' }
 * Also handles complex TLDs like: sub.example.co.uk or sub.example.com.cn
 * 
 * @param {string} domainName - The full domain name to parse
 * @returns {object} - Object containing rootDomain and subDomain
 */
const parseDomain = (domainName) => {
  const parts = domainName.split('.');
  
  if (parts.length < 2) {
    throw new Error('Invalid domain name format');
  }
  
  // Handle cases like example.com
  if (parts.length === 2) {
    return {
      rootDomain: domainName,
      subDomain: '@'
    };
  }
  
  // Check for multi-part TLDs
  for (const tld of multiPartTlds) {
    if (domainName.endsWith('.' + tld)) {
      const tldParts = tld.split('.');
      // Extract the domain name (e.g., example.co.uk -> example)
      const domainPartIndex = parts.length - tldParts.length - 1;
      if (domainPartIndex > 0) {
        const rootDomain = parts.slice(domainPartIndex).join('.');
        const subDomain = parts.slice(0, domainPartIndex).join('.');
        return { rootDomain, subDomain };
      }
    }
  }
  
  // Default case: handle as standard domain (e.g., sub.example.com)
  const rootDomain = parts.slice(-2).join('.');
  const subDomain = parts.slice(0, -2).join('.');
  
  return {
    rootDomain,
    subDomain
  };
};

/**
 * Validate domain name format
 * @param {string} domainName - The domain to validate
 * @returns {boolean} - Whether the domain is valid
 */
const validateDomain = (domainName) => {
  // Simple regex to validate domain name format
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domainName);
};

module.exports = {
  parseDomain,
  validateDomain,
  multiPartTlds
};