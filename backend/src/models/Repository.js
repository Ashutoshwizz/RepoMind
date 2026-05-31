// src/models/Repository.js
import mongoose from 'mongoose';

const repositorySchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  owner: String,
  name: String,
  clonePath: String,
  status: {
    type: String,
    enum: ['pending', 'cloning', 'parsing', 'embedding', 'ready', 'error'],
    default: 'pending'
  },
  metadata: {
    language: [String],
    techStack: [String],
    fileCount: Number,
    totalLines: Number,
    lastCommit: String,
    description: String
  },
  summary: {
    overview: String,
    features: [String],
    architecture: String,
    setupGuide: String
  },
  errorMessage: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

repositorySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Repository', repositorySchema);
