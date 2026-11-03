/**
 * Prompt Sanitizer and Injection Defense Utility
 * Redacts credentials/tokens and mitigates prompt injection attacks.
 */

// Common credential patterns
const CREDENTIAL_PATTERNS: { regex: RegExp; replacement: string }[] = [
  // Private keys
  {
    regex: /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z]+)? PRIVATE KEY-----/gi,
    replacement: '[REDACTED_PRIVATE_KEY]',
  },
  // JWT tokens
  {
    regex: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
    replacement: '[REDACTED_JWT_TOKEN]',
  },
  // Bearer Authorization headers
  {
    regex: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
    replacement: 'Bearer [REDACTED_TOKEN]',
  },
  // OpenAI / Anthropic / general API keys
  {
    regex: /\bsk-(?:proj-|ant-)?[a-zA-Z0-9_-]{20,}\b/g,
    replacement: '[REDACTED_API_KEY]',
  },
  // Generic password assignments in logs/code: password = "..." or "password": "..."
  {
    regex: /(["']?(?:password|passwd|secret|api_key|access_token|private_key)["']?\s*[:=]\s*["'])([^"'\r\n]{4,})(["'])/gi,
    replacement: '$1[REDACTED_SECRET]$3',
  },
];

// Suspicious injection patterns designed to override system instructions
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
  /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
  /you\s+are\s+now\s+(?:in\s+)?(?:DAN|developer|jailbreak|unrestricted)\s+mode/i,
  /bypass\s+(?:all\s+)?safety\s+(?:guidelines|rules|filters)/i,
  /system\s*:\s*you\s+must\s+reveal/i,
];

export interface SanitizeResult {
  sanitized: string;
  hasRedactions: boolean;
  injectionDetected: boolean;
  injectionFlags: string[];
}

/**
 * Sanitize prompt content by redacting sensitive secrets and detecting prompt injection vectors.
 */
export function sanitizePromptInput(input: string): SanitizeResult {
  if (!input) {
    return {
      sanitized: '',
      hasRedactions: false,
      injectionDetected: false,
      injectionFlags: [],
    };
  }

  let sanitized = input;
  let hasRedactions = false;

  for (const { regex, replacement } of CREDENTIAL_PATTERNS) {
    if (regex.test(sanitized)) {
      hasRedactions = true;
      sanitized = sanitized.replace(regex, replacement);
    }
  }

  const injectionFlags: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      injectionFlags.push(pattern.source);
    }
  }

  // Neutralize delimiter spoofing (e.g. user injecting closing delimiters)
  sanitized = sanitized.replace(/```/g, "'''");

  return {
    sanitized,
    hasRedactions,
    injectionDetected: injectionFlags.length > 0,
    injectionFlags,
  };
}

/**
 * Wraps dynamic content within safe XML-like tags for LLM prompts to isolate user text
 */
export function formatPromptBlock(tag: string, content: string): string {
  const { sanitized } = sanitizePromptInput(content);
  return `<${tag}>\n${sanitized.trim()}\n</${tag}>`;
}
