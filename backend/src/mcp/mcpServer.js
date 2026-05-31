// src/mcp/mcpServer.js
/**
 * MCP Tool Layer — RepoMind AI
 *
 * Registers tools that OpenAI calls via tool_choice instead of hallucinating.
 * Tools are called by the AI to fetch real data from MongoDB / disk.
 */

import { semanticSearch, getFileChunks } from '../services/embeddingService.js';
import RepoChunk from '../models/RepoChunk.js';
import Repository from '../models/Repository.js';
import fs from 'fs-extra';
import path from 'path';

// ─── Tool Definitions (OpenAI format) ─────────────────────────────────────────

export const MCP_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_code',
      description: 'Search the repository codebase using semantic similarity. Use this to find where specific functionality is implemented.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language query about what to find in the code'
          },
          topK: {
            type: 'number',
            description: 'Number of results to return (default 6, max 12)',
            default: 6
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the full content of a specific file in the repository',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Relative path to the file within the repository'
          }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List all files in the repository or in a specific directory',
      parameters: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: 'Optional directory path to list files from (empty = root)',
            default: ''
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'detect_bugs',
      description: 'Analyze specific code chunks for bugs, vulnerabilities, and issues. Returns severity, location, fix suggestion, and confidence score.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'File path to analyze for bugs'
          },
          focusArea: {
            type: 'string',
            description: 'Specific area to focus on: null_checks, async_issues, security, validation, memory, race_conditions, or all',
            default: 'all'
          }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'architecture_map',
      description: 'Generate the folder/file architecture map of the repository',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'efficiency_analysis',
      description: 'Analyze code efficiency: find repeated code, slow patterns, bad architecture, and estimate gains from fixing them',
      parameters: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            description: 'File path or directory to focus on, or "all" for full repo',
            default: 'all'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'estimate_time_saved',
      description: 'Estimate debugging and maintenance time saved by fixing detected issues',
      parameters: {
        type: 'object',
        properties: {
          issueCount: {
            type: 'number',
            description: 'Number of issues to estimate savings for'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_docs',
      description: 'Generate documentation for a specific file or function',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'File to generate docs for'
          }
        },
        required: ['filePath']
      }
    }
  }
];

// ─── Tool Executors ────────────────────────────────────────────────────────────

export async function executeTool(toolName, args, context) {
  const { repositoryId, clonePath } = context;

  switch (toolName) {
    case 'search_code':
      return await searchCode(repositoryId, args.query, args.topK || 6);

    case 'read_file':
      return await readFile(repositoryId, clonePath, args.filePath);

    case 'list_files':
      return await listFiles(repositoryId, args.directory || '');

    case 'detect_bugs':
      return await detectBugsForFile(repositoryId, clonePath, args.filePath, args.focusArea || 'all');

    case 'architecture_map':
      return await buildArchitectureMap(repositoryId);

    case 'efficiency_analysis':
      return await analyzeEfficiency(repositoryId, args.scope || 'all');

    case 'estimate_time_saved':
      return estimateTimeSaved(args.issueCount || 0);

    case 'generate_docs':
      return await generateFileDocs(repositoryId, clonePath, args.filePath);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── Tool Implementations ──────────────────────────────────────────────────────

async function searchCode(repositoryId, query, topK) {
  const results = await semanticSearch(repositoryId, query, topK);
  return {
    query,
    results: results.map(r => ({
      filePath: r.filePath,
      lines: `${r.startLine}-${r.endLine}`,
      language: r.language,
      content: r.content,
      relevanceScore: r.score || 'N/A',
      functions: r.metadata?.functions || [],
      classes: r.metadata?.classes || []
    }))
  };
}

async function readFile(repositoryId, clonePath, filePath) {
  // Security: prevent path traversal
  const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(clonePath, safePath);

  if (!fullPath.startsWith(clonePath)) {
    return { error: 'Path traversal detected' };
  }

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    return {
      filePath: safePath,
      content,
      lineCount: lines.length
    };
  } catch {
    // Try loading from DB chunks
    const chunks = await getFileChunks(repositoryId, safePath);
    if (chunks.length === 0) return { error: `File not found: ${safePath}` };
    return {
      filePath: safePath,
      content: chunks.map(c => c.content).join('\n'),
      lineCount: chunks[chunks.length - 1]?.endLine || 0
    };
  }
}

async function listFiles(repositoryId, directory) {
  const query = directory
    ? { repositoryId, filePath: { $regex: `^${directory}` } }
    : { repositoryId };

  const chunks = await RepoChunk.find(query)
    .distinct('filePath');

  // Group by directory
  const tree = {};
  for (const fp of chunks) {
    const parts = fp.split('/');
    let node = tree;
    for (const part of parts.slice(0, -1)) {
      if (!node[part]) node[part] = {};
      node = node[part];
    }
    const filename = parts[parts.length - 1];
    node[filename] = 'file';
  }

  return { files: chunks, tree, count: chunks.length };
}

async function detectBugsForFile(repositoryId, clonePath, filePath, focusArea) {
  const fileData = await readFile(repositoryId, clonePath, filePath);
  if (fileData.error) return fileData;

  // Return the file content for OpenAI to analyze
  // OpenAI will be prompted to detect bugs in a structured format
  return {
    filePath,
    content: fileData.content,
    focusArea,
    instruction: `Analyze this code for ${focusArea} bugs. Return structured JSON with: severity, problem, location (line), suggestedFix, fixedExample, confidenceScore (0-1).`
  };
}

async function buildArchitectureMap(repositoryId) {

  const files =
    await RepoChunk.find({
      repositoryId
    }).distinct('filePath');

  const tree = {};

  const grouped = {
    Backend: {},
    Frontend: {},
    Config: {},
    Root: {}
  };

  for (const fp of files) {

    // normalize windows paths
    const normalized =
      fp.replace(/\\/g, '/');

    const parts =
      normalized.split('/');

    // ---------- TREE BUILDING ----------

    let current = tree;

    for (let i = 0; i < parts.length; i++) {

      const part = parts[i];

      const isFile =
        i === parts.length - 1;

      if (isFile) {

        current[part] = {
          _type: 'file'
        };

      } else {

        if (!current[part]) {

          current[part] = {
            _type: 'directory',
            children: {}
          };

        }

        current =
          current[part].children;
      }
    }

    // ---------- GROUPED ARCHITECTURE ----------

    let category = 'Root';

    if (
      normalized.includes('controller') ||
      normalized.includes('route') ||
      normalized.includes('model') ||
      normalized.includes('middleware') ||
      normalized.includes('service') ||
      normalized.includes('backend')
    ) {
      category = 'Backend';
    }

    else if (
      normalized.includes('components') ||
      normalized.includes('pages') ||
      normalized.includes('frontend') ||
      normalized.includes('app/')
    ) {
      category = 'Frontend';
    }

    else if (
      normalized.includes('.env') ||
      normalized.includes('config') ||
      normalized.includes('package.json') ||
      normalized.includes('docker') ||
      normalized.includes('vercel')
    ) {
      category = 'Config';
    }

    const section =
      parts.length > 1
        ? parts[parts.length - 2]
        : 'root';

    if (!grouped[category][section]) {

      grouped[category][section] = [];

    }

    grouped[category][section]
      .push(parts[parts.length - 1]);
  }

  return {

    tree,

    architecture:
      Object.fromEntries(

        Object.entries(grouped)

          .map(([category, sections]) => [

            category,

            Object.fromEntries(

              Object.entries(sections)

                .sort((a, b) =>
                  a[0].localeCompare(b[0])
                )

            )

          ])

      ),

    fileCount: files.length,

    simplifiedView: true,

    summary: {

      backendSections:
        Object.keys(grouped.Backend).length,

      frontendSections:
        Object.keys(grouped.Frontend).length,

      configFiles:
        Object.keys(grouped.Config).length
    }
  };
}


async function analyzeEfficiency(repositoryId, scope) {
  const query = scope === 'all'
    ? { repositoryId }
    : { repositoryId, filePath: { $regex: scope } };

  const chunks = await RepoChunk.find(query)
    .select('filePath content metadata')
    .limit(30);
 
  return {
    scope,
    chunks: chunks.map(c => ({
      filePath: c.filePath,
      content: c.content.slice(0, 1000), // truncate for prompt
      functions: c.metadata?.functions || []
    })),
    instruction: 'Analyze these code chunks for efficiency issues: repeated code, bad patterns, slow queries, unnecessary rerenders, maintainability problems. Estimate speed/productivity gains.'
  };
}

function estimateTimeSaved(issueCount) {
  // Heuristic estimation based on industry averages
  const avgHoursPerBug = 3.5; // avg debugging time per bug
  const fixEfficiency = 0.75; // AI-assisted fix reduces effort by 75%
  const currentHours = issueCount * avgHoursPerBug;
  const afterHours = currentHours * (1 - fixEfficiency);

  return {
    issueCount,
    currentDebugHours: Math.round(currentHours * 10) / 10,
    afterFixHours: Math.round(afterHours * 10) / 10,
    percentReduction: Math.round(fixEfficiency * 100),
    reasoning: `Based on industry average of ${avgHoursPerBug}h per bug. AI-assisted fixes reduce effort by ~${fixEfficiency * 100}% through automated detection, root cause analysis, and fix suggestions. ${issueCount} issues × ${avgHoursPerBug}h = ${currentHours}h → reduced to ${afterHours}h.`
  };
}

async function generateFileDocs(repositoryId, clonePath, filePath) {
  const fileData = await readFile(repositoryId, clonePath, filePath);
  if (fileData.error) return fileData;

  return {
    filePath,
    content: fileData.content,
    instruction: 'Generate comprehensive documentation for this file including: overview, function/class descriptions, parameters, return values, usage examples, and any important notes.'
  };
}
