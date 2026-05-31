// src/models/AnalysisReport.js
import mongoose from 'mongoose';

const bugSchema = new mongoose.Schema({
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
  problem: String,
  location: { filePath: String, line: Number, function: String },
  suggestedFix: String,
  fixedExample: String,
  confidenceScore: Number
});

const efficiencyIssueSchema = new mongoose.Schema({

  type: String,

  title: String,

  description: String,

  location: {
    filePath: String,
    line: Number
  },

  impact: {
    type: String,
    enum:['high','medium','low']
  },

  suggestion: String,

  estimatedSpeedGain: String,

  estimatedProductivityGain: String

});

const analysisReportSchema = new mongoose.Schema({
  repositoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repository',
    required: true
  },
  type: {
    type: String,
    enum: ['bug_detection', 'efficiency', 'time_estimate', 'full'],
    required: true
  },
  bugs: [bugSchema],
  efficiencyIssues: [efficiencyIssueSchema],
  timeSaved: {
    currentDebugHours: Number,
    afterFixHours: Number,
    percentReduction: Number,
    reasoning: String
  },
  architectureMap: {
    tree: Object,
    mermaidDiagram: String
  },
  metrics: {
  type: mongoose.Schema.Types.Mixed,
  default: {}
},

overallScore: {
  type: Number,
  default: 0
},

scoreReasoning: {
  type: String,
  default: ''
},

topRecommendation: {
  type: String,
  default: ''
},
  generatedReadme: String,
  status: { type: String, enum: ['running', 'complete', 'error'], default: 'running' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('AnalysisReport', analysisReportSchema);
