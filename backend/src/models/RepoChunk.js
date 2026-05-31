// src/models/RepoChunk.js
import mongoose from 'mongoose';

const repoChunkSchema = new mongoose.Schema({
  repositoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repository',
    required: true,
    index: true
  },
  filePath: { type: String, required: true },
  fileName: String,
  language: String,
  content: { type: String, required: true },
  chunkIndex: Number,
  startLine: Number,
  endLine: Number,
  // Atlas Vector Search field
  embedding: {
    type: [Number],
    index: false // Managed by Atlas Search index
  },
  metadata: {
    functions: [String],
    classes: [String],
    imports: [String],
    exports: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

// Compound index for efficient repo-scoped queries
repoChunkSchema.index({ repositoryId: 1, filePath: 1 });

export default mongoose.model('RepoChunk', repoChunkSchema);
