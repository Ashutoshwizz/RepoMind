// src/services/embeddingService.js
import Groq from 'groq-sdk';
import RepoChunk from '../models/RepoChunk.js';

const groq =
new Groq({
  apiKey:
  process.env.GROQ_API_KEY
});

import { pipeline } from '@xenova/transformers';
const EMBEDDING_MODEL =
'Xenova/bge-small-en-v1.5';
const EMBEDDING_BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs per request
let embedder = null;

/**
 * Generate embeddings for an array of text strings.
 */
async function generateEmbeddings(texts) {

  if (!embedder) {

    embedder = await pipeline(
      'feature-extraction',
      EMBEDDING_MODEL
    );

  }

  const embeddings = [];

  for (const text of texts) {

 const output = await embedder(text, {
  pooling: 'mean',
  normalize: true,
  truncation: true
});

    embeddings.push(
      Array.from(output.data)
    );
  }

  return embeddings;
}

/**
 * Store all chunks with embeddings in MongoDB.
 * @param {string} repositoryId
 * @param {Array} chunks - from chunkFile()
 */
export async function embedAndStoreChunks(repositoryId, chunks) {
  const results = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const MAX_EMBED_CHARS = 1800;

const texts = batch.map(c => {

  const safeContent =
    c.content.length > MAX_EMBED_CHARS
      ? c.content.slice(0, MAX_EMBED_CHARS)
      : c.content;

  return `File: ${c.filePath}\n\n${safeContent}`;
});

    let embeddings;
    try {
      embeddings = await generateEmbeddings(texts);
    } catch (err) {
      console.error(`Embedding batch ${i} failed:`, err.message);
      // Store chunks without embeddings so they can be searched via text
      embeddings = batch.map(() => []);
    }

    const docs = batch.map((chunk, idx) => ({
      repositoryId,
      ...chunk,
      embedding: embeddings[idx]
    }));

    const saved = await RepoChunk.insertMany(docs);
    results.push(...saved);

    // Small delay to respect rate limits
    if (i + EMBEDDING_BATCH_SIZE < chunks.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

/**
 * Vector search: find most relevant chunks for a query.
 * Uses MongoDB Atlas $vectorSearch aggregation.
 */
export async function semanticSearch(repositoryId, query, topK = 8) {
  let queryEmbedding;
  try {
    const embeddings = await generateEmbeddings([query]);
    queryEmbedding = embeddings[0];
  } catch (err) {
    console.error('Query embedding failed, falling back to text search:', err.message);
    return textSearch(repositoryId, query, topK);
  }

  try {
    const results = await RepoChunk.aggregate([
      {
        $vectorSearch: {
          index: 'repo_chunks_vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: topK * 10,
          limit: topK,
          filter: { repositoryId: repositoryId }
        }
      },
      {
        $project: {
          filePath: 1,
          fileName: 1,
          content: 1,
          startLine: 1,
          endLine: 1,
          language: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ]);

    return results;
  } catch (err) {
    // Fallback to text search if Atlas Vector Search index not set up
    console.warn('Vector search unavailable, falling back to text search:', err.message);
    return textSearch(repositoryId, query, topK);
  }
}

/**
 * Fallback: basic regex/text search across chunks.
 */
async function textSearch(repositoryId, query, topK = 8) {
  const keywords = query.split(/\s+/).filter(w => w.length > 2);
  const regexPattern = keywords.join('|');

  const results = await RepoChunk.find({
    repositoryId,
    content: { $regex: regexPattern, $options: 'i' }
  })
    .limit(topK)
    .select('filePath fileName content startLine endLine language metadata');

  return results;
}

/**
 * Get all chunks for a specific file in a repo.
 */
export async function getFileChunks(repositoryId, filePath) {
  return RepoChunk.find({ repositoryId, filePath })
    .sort({ chunkIndex: 1 })
    .select('content startLine endLine');
}

/**
 * Generate a single embedding for a text string.
 */
export async function embedText(text) {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0];
}
