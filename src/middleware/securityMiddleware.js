// securityMiddleware.js
const xss = require('xss');

const HIGH_CONFIDENCE_PATTERNS = [
  /<script\b[^>]*>([\s\S]*?)<\/script>/i,
  /<\s*\/\s*script\s*>/i,
  /\beval\s*\(/i,
  /\bjavascript\s*:/i,
  /\bunion\s+select\b/i,
  /\bdrop\s+table\b/i,
  /\bdrop\s+database\b/i,
];

// Fields that often contain secrets — mask these in logs
const SENSITIVE_HEADER_KEYS = ['authorization', 'cookie', 'set-cookie'];

function maskSensitiveHeaders(headers = {}) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.includes(k.toLowerCase())) {
      out[k] = '[MASKED]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

function scanValueForPatterns(value) {
  if (typeof value !== 'string') return null;
  for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(value)) return { pattern: pattern.toString(), sample: value.slice(0, 200) };
  }
  return null;
}

// Walk object/array and scan only string values
function scanObject(obj, path = '') {
  if (obj == null) return null;
  if (typeof obj === 'string') {
    const match = scanValueForPatterns(obj);
    if (match) return { path, ...match };
    return null;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const r = scanObject(obj[i], `${path}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      try {
        const r = scanObject(obj[key], path ? `${path}.${key}` : key);
        if (r) return r;
      } catch (e) {
        // ignore traversal errors for safety
      }
    }
  }
  return null;
}

function sanitizeStringsInPlace(obj) {
  if (obj == null) return;
  if (typeof obj === 'string') return xss(obj);
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string') obj[i] = xss(obj[i]);
      else sanitizeStringsInPlace(obj[i]);
    }
    return;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') obj[key] = xss(obj[key]);
      else sanitizeStringsInPlace(obj[key]);
    }
  }
}

function securityMiddleware(req, res, next) {
  try {
    // 1) Scan body, query, params for high-confidence malicious patterns
    const sources = { body: req.body, query: req.query, params: req.params };
    for (const [name, data] of Object.entries(sources)) {
      const match = scanObject(data);
      if (match) {
        // Log *minimal* info and mask sensitive headers
        const safeLog = {
          ip: req.ip || req.connection?.remoteAddress || 'unknown',
          route: req.originalUrl || req.url,
          source: name,
          matchPath: match.path,
          matchedPattern: match.pattern,
          valueSample: match.sample.length > 120 ? match.sample.slice(0, 120) + '...' : match.sample,
          headers: maskSensitiveHeaders(req.headers),
        };
        console.warn('🚨 Blocked suspicious request (high-confidence):', safeLog);
        return res.status(400).json({
          success: false,
          error: 'Suspicious request blocked by security middleware',
        });
      }
    }

    // 2) Sanitize strings using xss (in-place)
    if (req.body && typeof req.body === 'object') sanitizeStringsInPlace(req.body);
    if (req.query && typeof req.query === 'object') sanitizeStringsInPlace(req.query);
    if (req.params && typeof req.params === 'object') sanitizeStringsInPlace(req.params);

    // 3) Continue
    next();
  } catch (error) {
    console.error('Security middleware error:', error && error.message ? error.message : error);
    return res.status(500).json({ error: 'Security check failed' });
  }
}

module.exports = securityMiddleware;
