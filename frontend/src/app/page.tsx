'use client';
// src/app/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { repoApi } from '@/lib/api';
import {
  GitBranch, Zap, Bug, MessageSquare, BarChart2,
  ArrowRight, Shield, Clock, Code2, Sparkles, Terminal
} from 'lucide-react';

const FEATURES = [
  { icon: MessageSquare, label: 'Repo Chat', desc: 'Ask anything about your codebase. Get answers with file citations.', color: 'text-sky-400' },
  { icon: Bug, label: 'Bug Detector', desc: 'Find null errors, async bugs, security issues, and race conditions.', color: 'text-red-400' },
  { icon: BarChart2, label: 'Efficiency Analyzer', desc: 'Identify repeated code, slow queries, and bad architecture patterns.', color: 'text-violet-400' },
  { icon: Clock, label: 'Time Saved', desc: 'Estimate debugging hours saved with AI-assisted analysis.', color: 'text-emerald-400' },
  { icon: Code2, label: 'Architecture Map', desc: 'Visual folder tree and dependency diagram of your project.', color: 'text-amber-400' },
  { icon: Shield, label: 'README Generator', desc: 'Auto-generate professional documentation from your codebase.', color: 'text-cyan-400' },
];

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Initializing...',
  cloning: 'Cloning repository...',
  parsing: 'Parsing files...',
  embedding: 'Generating embeddings...',
  ready: 'Ready!'
};

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setStatusMsg('Submitting...');

    try {
      const { data } = await repoApi.analyze(url.trim());

      if (data.cached || data.status === 'ready') {
        toast.success('Repository already analyzed!');
        router.push(`/repo/${data.repositoryId}`);
        return;
      }

      toast.success('Analysis started!');
      router.push(`/repo/${data.repositoryId}?analyzing=true`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start analysis');
      setLoading(false);
      setStatusMsg('');
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">

        {/* Header */}
        <div className="text-center mb-20">
          {/* Logo */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 glass-card border"
            style={{ borderColor: 'rgba(14,165,233,0.3)' }}>
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-mono text-sky-400">AI-Powered Repository Intelligence</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-display font-bold mb-6 leading-tight">
            <span className="gradient-text">RepoMind</span>
            <span style={{ color: 'var(--text-primary)' }}> AI</span>
          </h1>

          <p className="text-xl mb-4 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Paste any GitHub URL. Get instant codebase intelligence —
            bug detection, architecture maps, chat, and more.
          </p>

          <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
            Powered by OpenAI + MCP Tools + MongoDB Vector Search
          </p>
        </div>

        {/* URL Input */}
        <div className="max-w-2xl mx-auto mb-20">
          <form onSubmit={handleAnalyze}>
            <div className="relative">
              <div className="flex items-center gap-3 p-1 glass-card rounded-xl"
                style={{ border: '1px solid rgba(14,165,233,0.3)' }}>
                <div className="flex items-center gap-2 px-4">
                  <Terminal className="w-4 h-4" style={{ color: 'var(--brand-blue)' }} />
                  <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>$</span>
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="flex-1 bg-transparent py-4 text-sm font-mono focus:outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 mr-1"
                  style={{
                    background: loading ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.9)',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {statusMsg}
                    </>
                  ) : (
                    <>
                      Analyze
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          <p className="text-xs mt-3 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
            Supports public GitHub repositories · Private repo support coming in Phase 3
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
          {FEATURES.map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="glass-card p-6 group cursor-default">
              <div className={`${color} mb-4 opacity-80 group-hover:opacity-100 transition-opacity`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                {label}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Tech Stack */}
        <div className="text-center">
          <p className="text-xs font-mono mb-4" style={{ color: 'var(--text-muted)' }}>BUILT WITH</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Next.js 15', 'Express', 'MongoDB Atlas', 'OpenAI GPT-4o', 'MCP Tools', 'Vector Search'].map(tech => (
              <span key={tech} className="px-3 py-1 text-xs font-mono rounded-full glass-card"
                style={{ color: 'var(--text-secondary)', borderColor: 'rgba(255,255,255,0.08)' }}>
                {tech}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
