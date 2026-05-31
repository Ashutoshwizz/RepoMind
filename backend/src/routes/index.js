// src/routes/index.js
import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  analyzeRepo,
  getRepo,
  chatRepo,
  detectBugsHandler,
  efficiencyHandler,
  getReport,
  generateDocsHandler,
  getArchitecture
} from '../controllers/analyzeController.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Analyze a repo URL
router.post('/analyze',
  body('url').isURL().withMessage('Valid URL required'),
  validateRequest,
  analyzeRepo
);

// Get repo status/data
router.get('/repo/:id',
  param('id').isMongoId().withMessage('Valid repo ID required'),
  validateRequest,
  getRepo
);

// Chat with a repo
router.post('/chat',
  body('repositoryId').isMongoId(),
  body('question').isString().isLength({ min: 1, max: 2000 }),
  validateRequest,
  chatRepo
);

// Bug detection
router.post('/detect-bugs',
  body('repositoryId').isMongoId(),
  validateRequest,
  detectBugsHandler
);

// Efficiency analysis
router.post('/efficiency',
  body('repositoryId').isMongoId(),
  validateRequest,
  efficiencyHandler
);

// Get report
router.get('/report/:id',
  param('id').isMongoId(),
  validateRequest,
  getReport
);

// Generate docs
router.post('/generate-docs',
  body('repositoryId').isMongoId(),
  validateRequest,
  generateDocsHandler
);

// Architecture map
router.get('/architecture/:repositoryId',
  param('repositoryId').isMongoId(),
  validateRequest,
  getArchitecture
);

export default router;
