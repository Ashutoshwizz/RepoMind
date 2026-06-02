// src/controllers/analyzeController.js
import Repository from '../models/Repository.js';
import RepoChunk from '../models/RepoChunk.js';
import AnalysisReport from '../models/AnalysisReport.js';
import ChatSession from '../models/ChatSession.js';
import { parseGitHubUrl, validateGitHubUrl, runIngestionPipeline } from '../services/pipelineService.js';
import { chatWithRepo, detectBugs, analyzeEfficiency, generateReadme } from '../services/aiService.js';
import { executeTool } from '../mcp/mcpServer.js';

// POST /analyze — Submit a repo URL for analysis
export async function analyzeRepo(req, res) {
  try {
    const { url } = req.body;

    if (!validateGitHubUrl(url)) {
      return res.status(400).json({ error: 'Invalid GitHub URL format' });
    }

    const { owner, name } = parseGitHubUrl(url);

    // Check if already exists
    let repo = await Repository.findOne({ url });

    if (repo && repo.status === 'ready') {
      return res.json({ repositoryId: repo._id, status: 'ready', cached: true });
    }

    if (!repo) {
      repo = await Repository.create({ url, owner, name });
    }

    // Run pipeline async (don't await — let client poll)
    runIngestionPipeline(repo._id).catch(console.error);

    res.status(202).json({
      repositoryId: repo._id,
      status: repo.status,
      message: 'Repository ingestion started. Poll /repo/:id for status.'
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /repo/:id — Get repository status and data
export async function getRepo(req, res) {
  try {
    const repo = await Repository.findById(req.params.id).select('-clonePath');
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    const chunkCount = await RepoChunk.countDocuments({ repositoryId: repo._id });

    res.json({ ...repo.toObject(), chunkCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /chat — Chat with a repository
export async function chatRepo(req, res) {
  try {
    const { repositoryId, question, sessionId } = req.body;

    const repo = await Repository.findById(repositoryId);
    if (!repo) return res.status(404).json({ error: 'Repository not found' });
    if (repo.status !== 'ready') return res.status(400).json({ error: 'Repository not ready yet' });

    // Load or create session
    let session = sessionId ? await ChatSession.findById(sessionId) : null;
    if (!session) {
      session = await ChatSession.create({ repositoryId });
    }

    // Get chat history for context
    const chatHistory = session.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    const { answer, citations } = await chatWithRepo(
      repositoryId,
      repo.clonePath,
      question,
      chatHistory
    );

    // Save messages
    session.messages.push({ role: 'user', content: question || '' });
   session.messages.push({
  role: 'assistant',
  content: answer || 'No response generated.'
});
    await session.save();

    res.json({
      answer,
      citations,
      sessionId: session._id
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /detect-bugs — Run bug detection
export async function detectBugsHandler(req, res) {

  try {

    const {
      repositoryId,
      files
    } = req.body;

    const repo =
      await Repository.findById(repositoryId);

    if (!repo) {
      return res.status(404).json({
        error: 'Repository not found'
      });
    }

    if (repo.status !== 'ready') {
      return res.status(400).json({
        error: 'Repository not ready'
      });
    }

    const report =
      await AnalysisReport.create({

        repositoryId,

        type: 'bug_detection',

        status: 'running',

        metadata: {
          startedAt: new Date(),
          analysisMode: 'deep_engineering_review'
        }

      });

    // async background analysis
    detectBugs(
      repositoryId,
      repo.clonePath,
      files,
      {
        mode: 'deep',

        include: [
          'bugs',
          'performance',
          'security',
          'architecture',
          'maintainability',
          'optimization',
          'developer_experience'
        ],

        minimumFindings: 5,

        requireOptimizations: true,

        requireTimeSavedEstimates: true
      }

    )
    .then(async (results) => {

      const findings =
        Array.isArray(results)
          ? results
          : results.findings || [];

      const stats = {

        critical:
          findings.filter(
            f => f.severity === 'critical'
          ).length,

        high:
          findings.filter(
            f => f.severity === 'high'
          ).length,

        medium:
          findings.filter(
            f => f.severity === 'medium'
          ).length,

        low:
          findings.filter(
            f => f.severity === 'low'
          ).length,

        optimizations:
          findings.filter(
            f =>
              f.category === 'performance' ||
              f.category === 'optimization'
          ).length
      };

      await AnalysisReport.findByIdAndUpdate(
        report._id,
        {

          bugs: findings,

          stats,

          status: 'complete',

          completedAt: new Date()

        }
      );

    })
    .catch(async (err) => {

      console.error(
        'Bug Detection Error:',
        err
      );

      await AnalysisReport.findByIdAndUpdate(
        report._id,
        {

          status: 'error',

          errorMessage:
            err.message,

          completedAt:
            new Date()

        }
      );

    });

    return res.status(202).json({

      reportId:
        report._id,

      message:
        'Deep repository analysis started.',

      capabilities: [

        'Bug Detection',
        'Performance Optimization',
        'Security Review',
        'Architecture Suggestions',
        'Code Efficiency',
        'Developer Experience Improvements',
        'Estimated Impact Analysis',
        'Time Saved Estimates'

      ]

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      error:
        err.message

    });

  }

}

// POST /efficiency — Efficiency analysis
export async function efficiencyHandler(req, res) {
  try {
    const { repositoryId } = req.body;

    const repo = await Repository.findById(repositoryId);
    if (!repo) return res.status(404).json({ error: 'Repository not found' });
    if (repo.status !== 'ready') return res.status(400).json({ error: 'Repository not ready' });

    const report = await AnalysisReport.create({
      repositoryId,
      type: 'efficiency',
      status: 'running'
    });

    analyzeEfficiency(repositoryId, repo.clonePath)
      .then(async (result) => {
        await AnalysisReport.findByIdAndUpdate(
  report._id,
  {

    efficiencyIssues:
      result.issues || [],

    metrics:
      result.metrics || {},

    overallScore:
      result.overallScore || 0,

    scoreReasoning:
      result.scoreReasoning || '',

    topRecommendation:
      result.topRecommendation || '',

    timeSaved:
      result.timeSaved || {},

    status: 'complete'
  }
);
      })
      .catch(console.error);

    res.status(202).json({ reportId: report._id });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /report/:id — Get analysis report
export async function getReport(req, res) {
  try {
    const report = await AnalysisReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /generate-docs — Generate README
export async function generateDocsHandler(req, res) {
  try {
    const { repositoryId } = req.body;

    const repo = await Repository.findById(repositoryId);
    if (!repo) return res.status(404).json({ error: 'Repository not found' });
    if (repo.status !== 'ready') return res.status(400).json({ error: 'Repository not ready' });

    const readme = await generateReadme(repositoryId, repo.clonePath, {
      name: repo.name,
      techStack: repo.metadata?.techStack
    });
  

    const report = await AnalysisReport.create({
      repositoryId,
      type: 'efficiency',
      generatedReadme: readme,
      status: 'complete'
    });

    res.json({ reportId: report._id, readme });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /architecture/:repositoryId — Architecture map
export async function getArchitecture(req, res) {
  try {
    const repo = await Repository.findById(req.params.repositoryId);
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    const result = await executeTool(
      'architecture_map',
      {},
      { repositoryId: repo._id, clonePath: repo.clonePath }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
