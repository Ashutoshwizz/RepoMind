// src/middleware/security.js
/**
 * Security middleware suite for RepoMind AI.
 * - URL validation & sanitization
 * - Prompt injection prevention
 * - Path traversal protection
 * - Request size limits
 */

const ALLOWED_GITHUB_HOSTS = ['github.com', 'www.github.com'];

// Block known malicious prompt patterns
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+instructions/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /system\s*:\s*you/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /\]\s*\[/,
  /jailbreak/i,
  /DAN\s+mode/i,
];

/**
 * Validate that a URL is a legitimate GitHub repo URL.
 */
export function validateRepoUrl(req, res, next) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  if (!ALLOWED_GITHUB_HOSTS.includes(parsed.hostname)) {
    return res.status(400).json({ error: 'Only GitHub URLs are supported' });
  }

  const pathParts = parsed.pathname.replace(/^\//, '').split('/');
  if (pathParts.length < 2 || !pathParts[0] || !pathParts[1]) {
    return res.status(400).json({ error: 'URL must point to a repository (github.com/owner/repo)' });
  }

  // Sanitize: strip query params and fragments, normalize .git suffix
  const cleanUrl = `https://github.com/${pathParts[0]}/${pathParts[1].replace(/\.git$/, '')}`;
  req.body.url = cleanUrl;

  next();
}

/**
 * Detect and block prompt injection attempts in chat questions.
 */
export function sanitizeChatInput(req, res, next) {
  const { question } = req.body;
  if (!question) return next();

  // Check for injection patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(question)) {
      return res.status(400).json({
        error: 'Invalid question format. Please ask a genuine question about the codebase.'
      });
    }
  }

  // Truncate extremely long inputs (prevent token exhaustion)
  if (question.length > 2000) {
    req.body.question = question.slice(0, 2000);
  }

  next();
}

/**
 * Validate MongoDB ObjectId to prevent NoSQL injection.
 */
export function validateObjectId(req, res, next) {
  const id = req.params.id || req.params.repositoryId || req.body.repositoryId;
  if (id && !/^[a-fA-F0-9]{24}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  next();
}
