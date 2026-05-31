// src/middleware/errorHandler.js
export function notFound(req, res) {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
}

export function globalError(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Log full error in dev, sanitize in prod
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // OpenAI API errors
  if (err.constructor?.name === 'APIError') {
    return res.status(502).json({
      error: 'AI service error',
      detail: isDev ? err.message : 'Failed to communicate with AI service'
    });
  }

  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
}
