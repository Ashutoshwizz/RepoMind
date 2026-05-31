// src/services/pipelineService.js
/**
 * Main ingestion pipeline for RepoMind AI.
 * Orchestrates: clone → parse → chunk → embed → summarize
 */
import Repository from '../models/Repository.js';
import RepoChunk from '../models/RepoChunk.js';
import {
  cloneRepository,
  parseRepository,
  chunkFile,
  detectTechStack
} from './repoIngestion.js';
import { embedAndStoreChunks } from './embeddingService.js';
import { generateRepoSummary } from './aiService.js';

/**
 * Extract owner/name from GitHub URL.
 */
export function parseGitHubUrl(url) {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/\s.]+?)(?:\.git)?(?:\/.*)?$/);
  if (!match) throw new Error('Invalid GitHub URL');
  return { owner: match[1], name: match[2] };
}

/**
 * Validate GitHub URL format.
 */
export function validateGitHubUrl(url) {
  const pattern = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\.git)?(\/.*)?$/;
  return pattern.test(url);
}

/**
 * Run the full ingestion pipeline for a repository.
 * Updates repository status throughout.
 */
export async function runIngestionPipeline(repositoryId) {
  const repo = await Repository.findById(repositoryId);
  if (!repo) throw new Error('Repository not found');

  try {
    // ── Step 1: Clone ──────────────────────────────────────────────
    await Repository.findByIdAndUpdate(repositoryId, { status: 'cloning' });
    console.log(`[Pipeline] Cloning ${repo.url}...`);

    const clonePath = await cloneRepository(repo.url, repositoryId.toString());
    await Repository.findByIdAndUpdate(repositoryId, { clonePath });

    // ── Step 2: Parse Files ────────────────────────────────────────
    await Repository.findByIdAndUpdate(repositoryId, { status: 'parsing' });
    console.log(`[Pipeline] Parsing files...`);

    const files = await parseRepository(clonePath);
    const techStack = detectTechStack(files);

    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);

    await Repository.findByIdAndUpdate(repositoryId, {
      'metadata.techStack': techStack,
      'metadata.fileCount': files.length,
      'metadata.totalLines': totalLines,
      'metadata.language': [...new Set(files.map(f => f.language))]
    });

    console.log(`[Pipeline] Parsed ${files.length} files (${totalLines} lines)`);

    // ── Step 3: Chunk ──────────────────────────────────────────────
    const allChunks = [];
    for (const file of files) {
      const chunks = chunkFile(file);
      allChunks.push(...chunks);
    }

    console.log(`[Pipeline] Created ${allChunks.length} chunks`);

    // ── Step 4: Embed & Store ──────────────────────────────────────
    await Repository.findByIdAndUpdate(repositoryId, { status: 'embedding' });
    console.log(`[Pipeline] Generating embeddings...`);

    await embedAndStoreChunks(repositoryId, allChunks);

    // ── Step 5: AI Summary ─────────────────────────────────────────
    console.log(`[Pipeline] Generating AI summary...`);

    const summary = await generateRepoSummary({
      repositoryId,
      clonePath,
      files: files.slice(0, 5),
      techStack,
      fileCount: files.length
    });

    // ── Step 6: Mark Ready ─────────────────────────────────────────
    await Repository.findByIdAndUpdate(repositoryId, {
      status: 'ready',
      summary: {
        overview: summary.overview || '',
        features: summary.features || [],
        architecture: summary.architecture || '',
        setupGuide: summary.setupGuide || ''
      },
      'metadata.techStack':
Array.isArray(summary.techStack)
    ? summary.techStack
    : techStack
    });

    console.log(`[Pipeline] ✅ Repository ${repositoryId} ready`);
    return { success: true, repositoryId };

  } catch (err) {
    console.error(`[Pipeline] ❌ Error:`, err.message);
    await Repository.findByIdAndUpdate(repositoryId, {
      status: 'error',
      errorMessage: err.message
    });
    throw err;
  }
}
