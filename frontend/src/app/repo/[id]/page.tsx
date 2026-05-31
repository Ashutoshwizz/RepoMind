'use client';
// src/app/repo/[id]/page.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { repoApi, pollRepoStatus, Repository } from '@/lib/api';
import ChatPanel from '@/components/features/ChatPanel';
import BugReport from '@/components/features/BugReport';
import ArchitectureView from '@/components/features/ArchitectureView';
import EfficiencyReport from '@/components/features/EfficiencyReport';
import ReadmeViewer from '@/components/features/ReadmeViewer';
import {
  GitBranch, MessageSquare, Bug, BarChart2, Code2, FileText,
  ChevronLeft, CheckCircle, AlertCircle, Loader2, Clock, Files
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: GitBranch },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'bugs', label: 'Bug Detector', icon: Bug },
  { id: 'efficiency', label: 'Efficiency', icon: BarChart2 },
  { id: 'architecture', label: 'Architecture', icon: Code2 },
  { id: 'docs', label: 'Docs', icon: FileText },
];

const STATUS_STEPS = ['pending', 'cloning', 'parsing', 'embedding', 'ready'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'Initializing',
  cloning: 'Cloning repository',
  parsing: 'Parsing files',
  embedding: 'Generating embeddings',
  ready: 'Ready'
};

export default function RepoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoId = params.id as string;

  const [repo, setRepo] = useState<Repository | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(false);

  const isAnalyzing = searchParams.get('analyzing') === 'true';

  useEffect(() => {
    async function init() {
      try {
        const { data } = await repoApi.getRepo(repoId);
        setRepo(data);

        if (data.status !== 'ready' && data.status !== 'error' && !pollRef.current) {
          pollRef.current = true;
          const final = await pollRepoStatus(repoId, (status) => {
            setRepo(prev => prev ? { ...prev, status: status as any } : null);
          });
          setRepo(final);
          if (final.status === 'ready') toast.success('Repository analysis complete!');
          if (final.status === 'error') toast.error('Analysis failed: ' + final.errorMessage);
        }
      } catch (err) {
        toast.error('Failed to load repository');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [repoId]);

  if (loading) return <LoadingScreen />;
  if (!repo) return <ErrorScreen message="Repository not found" />;

  const isReady = repo.status === 'ready';
  const stepIndex = STATUS_STEPS.indexOf(repo.status);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Background */}
      <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      <div className="relative z-10">
        {/* Top Bar */}
        <div className="sticky top-0 z-50 border-b" style={{ background: 'rgba(7,11,18,0.9)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="w-px h-5 bg-white/10" />
                <div className="flex items-center gap-3">
                  <GitBranch className="w-4 h-4 text-sky-400" />
                  <span className="font-mono text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {repo.owner}/{repo.name}
                  </span>
                  <StatusBadge status={repo.status} />
                </div>
              </div>

              {isReady && (
                <div className="flex items-center gap-4 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <Files className="w-3 h-3" />
                    {repo.metadata?.fileCount?.toLocaleString()} files
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {repo.metadata?.totalLines?.toLocaleString()} lines
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar for analysis */}
        {!isReady && repo.status !== 'error' && (
          <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col items-center">
            <AnalysisProgress repo={repo} stepIndex={stepIndex} />
          </div>
        )}

        {repo.status === 'error' && (
          <div className="max-w-7xl mx-auto px-6 py-16">
            <ErrorScreen message={repo.errorMessage || 'Analysis failed'} />
          </div>
        )}

        {isReady && (
          <>
            {/* Tabs */}
            <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex gap-1 overflow-x-auto">
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className="flex items-center gap-2 px-4 py-4 text-sm font-medium transition-all border-b-2 whitespace-nowrap"
                      style={{
                        color: activeTab === id ? 'var(--brand-blue)' : 'var(--text-secondary)',
                        borderBottomColor: activeTab === id ? 'var(--brand-blue)' : 'transparent'
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
              {activeTab === 'overview' && <OverviewTab repo={repo} />}
              {activeTab === 'chat' && <ChatPanel repoId={repoId} />}
              {activeTab === 'bugs' && <BugReport repoId={repoId} />}
              {activeTab === 'efficiency' && <EfficiencyReport repoId={repoId} />}
              {activeTab === 'architecture' && <ArchitectureView repoId={repoId} />}
              {activeTab === 'docs' && <ReadmeViewer repoId={repoId} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ repo }: { repo: Repository }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Summary */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-display font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Project Overview
          </h2>
          <div
  className="space-y-3 text-sm leading-relaxed"
  style={{ color:'var(--text-secondary)' }}
>

  {repo.summary?.overview ? (

    <p>{repo.summary.overview}</p>

  ) : (

    <>
      <p>
        This repository has been analyzed by RepoMind AI.
      </p>

      <p>
        The system examined the codebase structure,
        technologies, modules, and repository layout
        to understand how the project works.
      </p>

      <p>
        Open Architecture, Bug Detector,
        Efficiency Analyzer, or Docs tabs
        for deeper insights.
      </p>
    </>

  )}

</div>
        </div>

        {repo.summary?.features?.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Key Features
            </h2>
            <ul className="space-y-2">
              {repo.summary.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-emerald-400 mt-0.5">▸</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {repo.summary?.setupGuide && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-display font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Setup Guide
            </h2>
            <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--text-secondary)' }}>
              {repo.summary.setupGuide}
            </pre>
          </div>
        )}
      </div>

      {/* Stats sidebar */}
      <div className="space-y-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-mono font-medium mb-4 text-sky-400">Repository Stats</h3>
          <div className="space-y-3">
            <Stat label="Files" value={repo.metadata?.fileCount?.toLocaleString() || '—'} />
            <Stat label="Lines of Code" value={repo.metadata?.totalLines?.toLocaleString() || '—'} />
            <Stat label="Languages" value={repo.metadata?.language?.length?.toString() || '0'} />
            <Stat label="Status" value={repo.status} />
          </div>
        </div>

        {repo.metadata?.techStack?.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-mono font-medium mb-4 text-sky-400">Tech Stack</h3>
            <div className="flex flex-wrap gap-2">
              {repo.metadata.techStack.map(t => (
                <span key={t} className="px-2 py-1 text-xs font-mono rounded glass-card"
                  style={{ color: 'var(--text-secondary)' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {repo.summary?.architecture && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-mono font-medium mb-3 text-sky-400">Architecture</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {repo.summary.architecture}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    ready: { color: '#22d3a5', bg: 'rgba(34,211,165,0.1)', label: 'Ready' },
    error: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Error' },
    cloning: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', label: 'Cloning...' },
    parsing: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'Parsing...' },
    embedding: { color: '#fb923c', bg: 'rgba(251,146,60,0.1)', label: 'Embedding...' },
    pending: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Pending' }
  }[status] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: status };

  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-mono"
      style={{ color: config.color, background: config.bg, border: `1px solid ${config.color}40` }}>
      {config.label}
    </span>
  );
}

function AnalysisProgress({ repo, stepIndex }: { repo: Repository; stepIndex: number }) {
  return (
    <div className="w-full max-w-lg glass-card p-8 text-center">
      <div className="flex justify-center mb-6">
        <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
      </div>
      <h2 className="text-xl font-display font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Analyzing Repository
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
        {STATUS_LABELS[repo.status] || repo.status}...
      </p>

      <div className="space-y-3">
        {STATUS_STEPS.filter(s => s !== 'ready').map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: i < stepIndex ? 'rgba(34,211,165,0.2)' :
                  i === stepIndex ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${i < stepIndex ? '#22d3a5' : i === stepIndex ? '#0ea5e9' : 'rgba(255,255,255,0.1)'}`
              }}>
              {i < stepIndex ? (
                <CheckCircle className="w-3 h-3 text-emerald-400" />
              ) : i === stepIndex ? (
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-white/20" />
              )}
            </div>
            <span className="text-sm text-left" style={{
              color: i < stepIndex ? '#22d3a5' : i === stepIndex ? 'var(--text-primary)' : 'var(--text-muted)'
            }}>
              {STATUS_LABELS[step]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Analysis Failed</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      <button onClick={() => router.push('/')}
        className="px-4 py-2 rounded-lg text-sm"
        style={{ background: 'rgba(14,165,233,0.2)', color: '#0ea5e9' }}>
        Try Again
      </button>
    </div>
  );
}
