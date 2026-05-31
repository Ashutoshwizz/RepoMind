// src/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2min for AI ops
  headers: { 'Content-Type': 'application/json' }
});

// Types
export interface Repository {
  _id: string;
  url: string;
  owner: string;
  name: string;
  status: 'pending' | 'cloning' | 'parsing' | 'embedding' | 'ready' | 'error';
  metadata: {
    language: string[];
    techStack: string[];
    fileCount: number;
    totalLines: number;
  };
  summary: {
    overview: string;
    features: string[];
    architecture: string;
    setupGuide: string;
  };
  errorMessage?: string;
  chunkCount?: number;
}

export interface Bug {
  severity: 'critical' | 'high' | 'medium' | 'low';
  problem: string;
  location: { filePath: string; line?: number; function?: string };
  suggestedFix: string;
  fixedExample: string;
  confidenceScore: number;
}

export interface ChatResponse {
  answer: string;
  citations: Array<{ filePath: string; startLine: number; endLine: number; snippet: string }>;
  sessionId: string;
}

export interface ArchitectureMap {
  files: string[];
  tree: Record<string, any>;
  mermaidDiagram: string;
  fileCount: number;
}

// API methods
export const repoApi = {
  analyze: (url: string) =>
    api.post<{ repositoryId: string; status: string; cached?: boolean }>('/analyze', { url }),

  getRepo: (id: string) =>
    api.get<Repository>(`/repo/${id}`),

  chat: (repositoryId: string, question: string, sessionId?: string) =>
    api.post<ChatResponse>('/chat', { repositoryId, question, sessionId }),

  detectBugs: (repositoryId: string, files?: string[]) =>
    api.post<{ reportId: string }>('/detect-bugs', { repositoryId, files }),

  efficiency: (repositoryId: string) =>
    api.post<{ reportId: string }>('/efficiency', { repositoryId }),

  getReport: (reportId: string) =>
    api.get(`/report/${reportId}`),

  generateDocs: (repositoryId: string) =>
  api.post<{
    reportId: string;
    readme?: string;
    generatedReadme?: string;
  }>(
    '/generate-docs',
    { repositoryId }
  ),

  getArchitecture: (repositoryId: string) =>
    api.get<ArchitectureMap>(`/architecture/${repositoryId}`)
};

// Poll for repo readiness
export async function pollRepoStatus(
  repoId: string,
  onUpdate: (status: string) => void,
  maxAttempts = 120
): Promise<Repository> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const { data } = await repoApi.getRepo(repoId);
    onUpdate(data.status);
    if (data.status === 'ready' || data.status === 'error') return data;
  }
  throw new Error('Timed out waiting for repository analysis');
}

// Poll for report completion
export async function pollReport(
  reportId: string,
  maxAttempts = 60
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const { data } = await repoApi.getReport(reportId);
    if (data.status === 'complete' || data.status === 'error') return data;
  }
  throw new Error('Report timed out');
}
