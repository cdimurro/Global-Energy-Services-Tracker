import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client with server-side API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP

function checkRateLimit(identifier) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(identifier) || [];

  // Filter out requests outside the current window
  const recentRequests = userRequests.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW
  );

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(identifier, recentRequests);

  return true;
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client identifier (IP address)
  const identifier = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

  // Check rate limit
  if (!checkRateLimit(identifier)) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.'
    });
  }

  try {
    const { messages, systemPrompt, model = 'claude-sonnet-4-20250514', maxTokens = 2048 } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    if (!systemPrompt) {
      return res.status(400).json({ error: 'Invalid request: systemPrompt required' });
    }

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    // Return the response
    return res.status(200).json(response);

  } catch (error) {
    console.error('Error calling Anthropic API:', error);

    // Handle specific error types
    if (error.status === 401) {
      return res.status(500).json({ error: 'API authentication failed' });
    }

    if (error.status === 429) {
      return res.status(429).json({ error: 'API rate limit exceeded. Please try again later.' });
    }

    return res.status(500).json({
      error: 'Failed to process request',
      message: error.message
    });
  }
}
