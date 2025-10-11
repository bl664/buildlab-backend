// src/middleware/securityMiddleware.js
const xss = require('xss');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Maximum size for deep scanning (bytes)
  MAX_DEEP_SCAN_SIZE: 50000, // 50KB - scan payloads smaller than this
  
  // Maximum string length to scan with regex
  MAX_STRING_LENGTH: 10000, // 10KB per string
  
  // Maximum depth for object traversal
  MAX_OBJECT_DEPTH: 10,
  
  // Rate limiting for logging
  LOG_INTERVAL: 60000, // Log same IP max once per minute
  
  // Sensitive header keys to mask in logs
  SENSITIVE_HEADERS: ['authorization', 'cookie', 'set-cookie', 'x-api-key'],
  
  // Skip security checks for certain paths
  SKIP_PATHS: ['/health', '/metrics'],
};

// ============================================================================
// HIGH-CONFIDENCE ATTACK PATTERNS (Optimized)
// ============================================================================

// Pre-compiled regex patterns for better performance
const ATTACK_PATTERNS = [
  // XSS patterns
  {
    name: 'script_tag',
    pattern: /<script[\s\S]*?>/i,
    severity: 'high',
  },
  {
    name: 'script_close_tag',
    pattern: /<\/script>/i,
    severity: 'high',
  },
  {
    name: 'javascript_protocol',
    pattern: /javascript\s*:/i,
    severity: 'high',
  },
  {
    name: 'eval_function',
    pattern: /\beval\s*\(/i,
    severity: 'high',
  },
  {
    name: 'on_event_handler',
    pattern: /\bon\w+\s*=/i,
    severity: 'medium',
  },
  
  // SQL Injection patterns
  {
    name: 'sql_union',
    pattern: /\bunion\s+(all\s+)?select\b/i,
    severity: 'high',
  },
  {
    name: 'sql_drop_table',
    pattern: /\bdrop\s+table\b/i,
    severity: 'high',
  },
  {
    name: 'sql_drop_database',
    pattern: /\bdrop\s+database\b/i,
    severity: 'high',
  },
  {
    name: 'sql_delete_from',
    pattern: /\bdelete\s+from\b.*\bwhere\b/i,
    severity: 'medium',
  },
  
  // Command Injection patterns
  {
    name: 'command_injection',
    pattern: /[;&|`$(){}[\]<>]/,
    severity: 'low', // Only flag if combined with other indicators
  },
];

// Cache for logging rate limiting
const logCache = new Map();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Masks sensitive headers for safe logging
 */
function maskSensitiveHeaders(headers = {}) {
  const masked = {};
  for (const [key, value] of Object.entries(headers)) {
    if (CONFIG.SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      masked[key] = '[MASKED]';
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

/**
 * Calculates approximate payload size efficiently
 */
function estimatePayloadSize(data) {
  if (!data) return 0;
  if (typeof data === 'string') return data.length;
  if (typeof data === 'number' || typeof data === 'boolean') return 8;
  
  // Quick estimate for objects/arrays
  try {
    return JSON.stringify(data).length;
  } catch {
    return 0;
  }
}

/**
 * Scans a single string value against attack patterns
 * Returns match details or null
 */
function scanString(value, maxLength = CONFIG.MAX_STRING_LENGTH) {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  
  // Truncate very long strings to prevent DoS
  const scanValue = value.length > maxLength 
    ? value.slice(0, maxLength) 
    : value;
  
  // Test against patterns (early exit on first match)
  for (const { name, pattern, severity } of ATTACK_PATTERNS) {
    if (pattern.test(scanValue)) {
      return {
        pattern: name,
        severity,
        sample: value.slice(0, 200), // Limited sample
        length: value.length,
      };
    }
  }
  
  return null;
}

/**
 * Recursively scans object/array with depth and size limits
 * Optimized for performance - exits early on first match
 */
function scanObject(obj, path = '', depth = 0) {
  // Depth limit to prevent stack overflow
  if (depth > CONFIG.MAX_OBJECT_DEPTH) {
    return null;
  }
  
  if (obj == null) {
    return null;
  }
  
  // Scan strings
  if (typeof obj === 'string') {
    const match = scanString(obj);
    if (match) {
      return { path, ...match };
    }
    return null;
  }
  
  // Scan arrays
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = scanObject(obj[i], `${path}[${i}]`, depth + 1);
      if (result) return result; // Early exit
    }
    return null;
  }
  
  // Scan objects
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    
    for (const key of keys) {
      try {
        const result = scanObject(
          obj[key],
          path ? `${path}.${key}` : key,
          depth + 1
        );
        if (result) return result; // Early exit
      } catch (err) {
        // Skip problematic properties (getters, circular refs, etc.)
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Sanitizes strings in-place using XSS library
 * Optimized to handle only strings and skip complex nested structures if too large
 */
function sanitizeObject(obj, depth = 0) {
  if (depth > CONFIG.MAX_OBJECT_DEPTH || obj == null) {
    return;
  }
  
  if (typeof obj === 'string') {
    return xss(obj);
  }
  
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string') {
        obj[i] = xss(obj[i]);
      } else if (typeof obj[i] === 'object') {
        sanitizeObject(obj[i], depth + 1);
      }
    }
    return;
  }
  
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      try {
        if (typeof obj[key] === 'string') {
          obj[key] = xss(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key], depth + 1);
        }
      } catch (err) {
        // Skip problematic properties
        continue;
      }
    }
  }
}

/**
 * Rate-limited logging to prevent log spam
 */
function logSecurityEvent(ip, details) {
  const now = Date.now();
  const lastLog = logCache.get(ip);
  
  // Only log if this IP hasn't been logged recently
  if (!lastLog || now - lastLog > CONFIG.LOG_INTERVAL) {
    console.warn('🚨 Security Alert:', details);
    logCache.set(ip, now);
  }
  
  // Cleanup old entries (prevent memory leak)
  if (logCache.size > 10000) {
    const cutoff = now - CONFIG.LOG_INTERVAL;
    for (const [key, timestamp] of logCache.entries()) {
      if (timestamp < cutoff) {
        logCache.delete(key);
      }
    }
  }
}

/**
 * Extracts client IP safely
 */
function getClientIP(req) {
  return (
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================

/**
 * Production-ready security middleware
 * Balances security with performance
 */
function securityMiddleware(req, res, next) {
  try {
    // Skip security checks for certain paths
    if (CONFIG.SKIP_PATHS.some(path => req.path === path)) {
      return next();
    }
    
    // Calculate total payload size
    const bodySize = estimatePayloadSize(req.body);
    const querySize = estimatePayloadSize(req.query);
    const paramsSize = estimatePayloadSize(req.params);
    const totalSize = bodySize + querySize + paramsSize;
    
    // Strategy 1: Skip deep scan for very large payloads (already limited by express)
    // Just do basic sanitization
    if (totalSize > CONFIG.MAX_DEEP_SCAN_SIZE) {
      // Only sanitize, skip pattern matching to avoid CPU spike
      if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
      }
      if (req.query && typeof req.query === 'object') {
        sanitizeObject(req.query);
      }
      if (req.params && typeof req.params === 'object') {
        sanitizeObject(req.params);
      }
      
      return next();
    }
    
    // Strategy 2: Deep scan for smaller payloads
    const sources = {
      body: req.body,
      query: req.query,
      params: req.params,
    };
    
    for (const [sourceName, data] of Object.entries(sources)) {
      const match = scanObject(data);
      
      if (match && match.severity === 'high') {
        // High severity threat detected - block and log
        const clientIP = getClientIP(req);
        
        logSecurityEvent(clientIP, {
          ip: clientIP,
          method: req.method,
          path: req.originalUrl || req.url,
          source: sourceName,
          matchPath: match.path,
          pattern: match.pattern,
          severity: match.severity,
          sample: match.sample,
          userAgent: req.headers['user-agent'] || 'unknown',
          timestamp: new Date().toISOString(),
        });
        
        return res.status(400).json({
          success: false,
          error: 'Request blocked by security policy',
        });
      }
      
      // Medium/low severity - log but allow (after sanitization)
      if (match && match.severity === 'medium') {
        const clientIP = getClientIP(req);
        logSecurityEvent(clientIP, {
          ip: clientIP,
          path: req.path,
          pattern: match.pattern,
          severity: match.severity,
          action: 'sanitized',
        });
      }
    }
    
    // Sanitize all string inputs
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      sanitizeObject(req.params);
    }
    
    // Continue to next middleware
    next();
  } catch (error) {
    // Security middleware should never crash the app
    console.error('Security middleware error:', error.message);
    
    // In case of error, still allow request but log it
    // (Fail open for availability, but log for monitoring)
    next();
  }
}

// ============================================================================
// VALIDATION & HEALTH CHECK
// ============================================================================

/**
 * Validates security middleware configuration
 */
function validateSecurityConfig() {
  const errors = [];
  
  if (CONFIG.MAX_DEEP_SCAN_SIZE < 1000) {
    errors.push('MAX_DEEP_SCAN_SIZE too small (min 1000 bytes)');
  }
  
  if (CONFIG.MAX_OBJECT_DEPTH < 5) {
    errors.push('MAX_OBJECT_DEPTH too small (min 5)');
  }
  
  if (ATTACK_PATTERNS.length === 0) {
    errors.push('No attack patterns configured');
  }
  
  if (errors.length > 0) {
    console.error('❌ Security Middleware Configuration Errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Invalid security configuration');
  }
  
  console.log(`✅ Security middleware configured (${ATTACK_PATTERNS.length} patterns)`);
  return true;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = securityMiddleware;
module.exports.validateSecurityConfig = validateSecurityConfig;
module.exports.CONFIG = CONFIG; // Export for testing/customization

// // securityMiddleware.js
// const xss = require('xss');

// const HIGH_CONFIDENCE_PATTERNS = [
//   /<script\b[^>]*>([\s\S]*?)<\/script>/i,
//   /<\s*\/\s*script\s*>/i,
//   /\beval\s*\(/i,
//   /\bjavascript\s*:/i,
//   /\bunion\s+select\b/i,
//   /\bdrop\s+table\b/i,
//   /\bdrop\s+database\b/i,
// ];

// // Fields that often contain secrets — mask these in logs
// const SENSITIVE_HEADER_KEYS = ['authorization', 'cookie', 'set-cookie'];

// function maskSensitiveHeaders(headers = {}) {
//   const out = {};
//   for (const [k, v] of Object.entries(headers)) {
//     if (SENSITIVE_HEADER_KEYS.includes(k.toLowerCase())) {
//       out[k] = '[MASKED]';
//     } else {
//       out[k] = v;
//     }
//   }
//   return out;
// }

// function scanValueForPatterns(value) {
//   if (typeof value !== 'string') return null;
//   for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
//     if (pattern.test(value)) return { pattern: pattern.toString(), sample: value.slice(0, 200) };
//   }
//   return null;
// }

// // Walk object/array and scan only string values
// function scanObject(obj, path = '') {
//   if (obj == null) return null;
//   if (typeof obj === 'string') {
//     const match = scanValueForPatterns(obj);
//     if (match) return { path, ...match };
//     return null;
//   }
//   if (Array.isArray(obj)) {
//     for (let i = 0; i < obj.length; i++) {
//       const r = scanObject(obj[i], `${path}[${i}]`);
//       if (r) return r;
//     }
//     return null;
//   }
//   if (typeof obj === 'object') {
//     for (const key of Object.keys(obj)) {
//       try {
//         const r = scanObject(obj[key], path ? `${path}.${key}` : key);
//         if (r) return r;
//       } catch (e) {
//         // ignore traversal errors for safety
//       }
//     }
//   }
//   return null;
// }

// function sanitizeStringsInPlace(obj) {
//   if (obj == null) return;
//   if (typeof obj === 'string') return xss(obj);
//   if (Array.isArray(obj)) {
//     for (let i = 0; i < obj.length; i++) {
//       if (typeof obj[i] === 'string') obj[i] = xss(obj[i]);
//       else sanitizeStringsInPlace(obj[i]);
//     }
//     return;
//   }
//   if (typeof obj === 'object') {
//     for (const key of Object.keys(obj)) {
//       if (typeof obj[key] === 'string') obj[key] = xss(obj[key]);
//       else sanitizeStringsInPlace(obj[key]);
//     }
//   }
// }

// function securityMiddleware(req, res, next) {
//   const bodySize = JSON.stringify(req.body || {}).length;
//   if (bodySize > 100000) { // 100KB
//     console.warn('Skipping deep security scan for large payload');
//     // Just do basic XSS sanitization
//     if (req.body) sanitizeStringsInPlace(req.body);
//     return next();
//   }

//   setImmediate(() => {
//   try {
//     // console.log("security middleware")
//     // 1) Scan body, query, params for high-confidence malicious patterns
//     const sources = { body: req.body, query: req.query, params: req.params };
//     for (const [name, data] of Object.entries(sources)) {
//       const match = scanObject(data);
//       // console.log("match is ", match)
//       if (match) {
//         // console.log("yes match")
//         // Log *minimal* info and mask sensitive headers
//         const safeLog = {
//           ip: req.ip || req.connection?.remoteAddress || 'unknown',
//           route: req.originalUrl || req.url,
//           source: name,
//           matchPath: match.path,
//           matchedPattern: match.pattern,
//           valueSample: match.sample.length > 120 ? match.sample.slice(0, 120) + '...' : match.sample,
//           headers: maskSensitiveHeaders(req.headers),
//         };
//         console.warn('🚨 Blocked suspicious request (high-confidence):', safeLog);
//         return res.status(400).json({
//           success: false,
//           error: 'Suspicious request blocked by security middleware',
//         });
//       } 
//     }
//     // 2) Sanitize strings using xss (in-place)
//     if (req.body && typeof req.body === 'object') sanitizeStringsInPlace(req.body);
//     if (req.query && typeof req.query === 'object') sanitizeStringsInPlace(req.query);
//     if (req.params && typeof req.params === 'object') sanitizeStringsInPlace(req.params);

//     // 3) Continue
//     next();
//   } catch (error) {
//     console.error('Security middleware error:', error && error.message ? error.message : error);
//     return res.status(500).json({ error: 'Security check failed' });
//   }
//   });
// }

// module.exports = securityMiddleware;
