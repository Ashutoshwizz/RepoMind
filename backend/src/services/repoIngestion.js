// src/services/repoIngestion.js
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

// File extensions to parse
const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rb', '.rs',
  '.cpp', '.c', '.h', '.cs', '.php', '.swift', '.kt', '.vue', '.svelte',
  '.md', '.json', '.yaml', '.yml', '.toml', '.env.example', '.sh',
  '.sql', '.graphql', '.prisma', '.dockerfile'
]);

// Folders to always ignore
const IGNORED_DIRS = [
  'node_modules', 'dist', 'build', '.next', 'out', '__pycache__',
  '.git', 'vendor', 'target', '.gradle', 'coverage', '.nyc_output',
  'venv', 'env', '.env', 'bower_components', '.cache'
];

const MAX_FILE_SIZE_BYTES = 200 * 1024; // 200KB per file
const CHUNK_SIZE_LINES = 80;
const CHUNK_OVERLAP_LINES = 10;

/**
 * Clone a GitHub repo to disk.
 * @param {string} repoUrl - HTTPS GitHub URL
 * @param {string} repoId  - MongoDB repo ID (used as folder name)
 * @returns {string} clonePath
 */
export async function cloneRepository(repoUrl, repoId) {

  const basePath =
    process.env.REPO_STORAGE_PATH ||
    './tmp/repomind-repos';

  await fs.ensureDir(basePath);

  const clonePath =
    path.join(basePath, repoId.toString());

  // clean previous analysis
  await fs.remove(clonePath);

  const git = simpleGit();

  await git.clone(
      repoUrl,
      clonePath,
      ['--depth', '1', '--single-branch']
  );

  return clonePath;
}

/**
 * Walk the repo and return all parseable files with their content.
 */
export async function parseRepository(clonePath) {
  const files = [];

  // Build ignore pattern
  const ignorePattern = IGNORED_DIRS.map(d => `**/${d}/**`);

  const allFiles = await glob('**/*', {
    cwd: clonePath,
    nodir: true,
    ignore: ignorePattern,
    dot: false,
    absolute: true
  });

  for (const filePath of allFiles) {
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

    try {
      const stat = await fs.stat(filePath);
      if (stat.size > MAX_FILE_SIZE_BYTES) continue;

      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(clonePath, filePath);
      const lines = content.split('\n');

      files.push({
        filePath: relativePath,
        fileName: path.basename(filePath),
        language: detectLanguage(ext),
        content,
        lines: lines.length,
        metadata: extractMetadata(content, ext)
      });
    } catch (err) {
      // Skip unreadable files (binary, etc.)
    }
  }

  return files;
}

/**
 * Split file content into overlapping chunks for embedding.
 */
export function chunkFile(file) {
  const lines = file.content.split('\n');
  const chunks = [];
  let chunkIndex = 0;

  for (let i = 0; i < lines.length; i += CHUNK_SIZE_LINES - CHUNK_OVERLAP_LINES) {
    const end = Math.min(i + CHUNK_SIZE_LINES, lines.length);
    const chunkContent = lines.slice(i, end).join('\n');

    if (chunkContent.trim().length < 20) continue; // skip near-empty chunks

    chunks.push({
      filePath: file.filePath,
      fileName: file.fileName,
      language: file.language,
      content: chunkContent,
      chunkIndex: chunkIndex++,
      startLine: i + 1,
      endLine: end,
      metadata: file.metadata
    });
  }

  return chunks;
}

/**
 * Extract basic metadata from source code using regex.
 */
function extractMetadata(content, ext) {
  const metadata = { functions: [], classes: [], imports: [], exports: [] };

  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    // Functions
    const funcMatches = content.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\()/g);
    for (const m of funcMatches) metadata.functions.push(m[1] || m[2]);

    // Classes
    const classMatches = content.matchAll(/class\s+(\w+)/g);
    for (const m of classMatches) metadata.classes.push(m[1]);

    // Imports
    const importMatches = content.matchAll(/import\s+.*?from\s+['"](.+?)['"]/g);
    for (const m of importMatches) metadata.imports.push(m[1]);

    // Exports
    const exportMatches = content.matchAll(/export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g);
    for (const m of exportMatches) metadata.exports.push(m[1]);
  }

  // Deduplicate
  for (const key of Object.keys(metadata)) {
    metadata[key] = [...new Set(metadata[key])].slice(0, 20);
  }

  return metadata;
}

function detectLanguage(ext) {
  const map = {
    '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
    '.py': 'python', '.java': 'java', '.go': 'go', '.rb': 'ruby', '.rs': 'rust',
    '.cpp': 'cpp', '.c': 'c', '.cs': 'csharp', '.php': 'php', '.swift': 'swift',
    '.kt': 'kotlin', '.vue': 'vue', '.svelte': 'svelte', '.md': 'markdown',
    '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.sql': 'sql',
    '.graphql': 'graphql', '.prisma': 'prisma', '.sh': 'bash'
  };
  return map[ext] || 'text';
}

/**
 * Get tech stack from file list.
 */
export function detectTechStack(files) {
  const stack = new Set();
  const fileNames = files.map(f => f.fileName.toLowerCase());
  const allContent = files.map(f => f.content).join('\n');

  if (fileNames.includes('package.json')) {
    stack.add('Node.js');
    if (allContent.includes('"react"')) stack.add('React');
    if (allContent.includes('"next"')) stack.add('Next.js');
    if (allContent.includes('"vue"')) stack.add('Vue');
    if (allContent.includes('"express"')) stack.add('Express');
    if (allContent.includes('"typescript"')) stack.add('TypeScript');
    if (allContent.includes('"tailwindcss"')) stack.add('TailwindCSS');
    if (allContent.includes('"prisma"')) stack.add('Prisma');
    if (allContent.includes('"mongoose"')) stack.add('MongoDB/Mongoose');
  }
  if (fileNames.includes('requirements.txt') || files.some(f => f.fileName.endsWith('.py'))) stack.add('Python');
  if (fileNames.includes('go.mod')) stack.add('Go');
  if (fileNames.includes('cargo.toml')) stack.add('Rust');
  if (fileNames.includes('pom.xml') || fileNames.includes('build.gradle')) stack.add('Java');
  if (fileNames.some(f => f.includes('docker'))) stack.add('Docker');
  if (allContent.includes('postgresql') || allContent.includes('postgres')) stack.add('PostgreSQL');
  if (allContent.includes('mongodb') || allContent.includes('mongoose')) stack.add('MongoDB');
  if (allContent.includes('redis')) stack.add('Redis');

  return [...stack];
}

/**
 * Cleanup cloned repo from disk.
 */
export async function cleanupRepository(clonePath) {
  try {
    await fs.remove(clonePath);
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}
