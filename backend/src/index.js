// src/index.js  (FINAL version)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database.js';
import routes from './routes/index.js';
import { notFound, globalError } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT ||  7860;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (
  !origin ||
  allowedOrigins.includes(origin) ||
  origin.endsWith('.vercel.app')
) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

app.use('/api/', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { error: 'Too many requests.' }
}));

const aiLimiter = rateLimit({ windowMs: 60000, max: 10, message: { error: 'AI rate limit exceeded.' } });
app.use('/api/chat', aiLimiter);
app.use('/api/detect-bugs', aiLimiter);
app.use('/api/efficiency', aiLimiter);
app.use('/api/generate-docs', aiLimiter);

const analyzeLimiter = rateLimit({ windowMs: 3600000, max: 20, message: { error: 'Analyze limit: 20/hour.' } });
app.use('/api/analyze', analyzeLimiter);

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use('/api', routes);
app.use(notFound);
app.use(globalError);

async function start() {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n RepoMind AI Backend running on port ${PORT}\n`);
});
}

start().catch(err => { console.error('Fatal:', err); process.exit(1); });
