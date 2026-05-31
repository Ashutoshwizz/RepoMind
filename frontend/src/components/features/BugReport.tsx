'use client';
// src/components/features/BugReport.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { repoApi, pollReport, Bug } from '@/lib/api';
import { Bug as BugIcon, AlertTriangle, ChevronDown, ChevronUp, Loader2, Zap, Shield } from 'lucide-react';

export default function BugReport({ repoId }: { repoId: string }) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function runDetection() {
    setLoading(true);
    try {
      const { data } = await repoApi.detectBugs(repoId);
      const report = await pollReport(data.reportId);
      setBugs(report.bugs || []);
      setRan(true);
      toast.success(`Found ${report.bugs?.length || 0} issues`);
    } catch (err: any) {
      toast.error(err.message || 'Bug detection failed');
    } finally {
      setLoading(false);
    }
  }

  const severityCounts = bugs.reduce((acc, b) => {
    acc[b.severity] = (acc[b.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
            Bug Detector
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            AI-powered static analysis for null errors, async bugs, security issues, and more
          </p>
        </div>
        <button
          onClick={runDetection}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: loading ? 'rgba(248,113,113,0.2)' : 'rgba(248,113,113,0.2)',
            border: '1px solid rgba(248,113,113,0.4)',
            color: '#f87171',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BugIcon className="w-4 h-4" />}
          {loading ? 'Analyzing...' : ran ? 'Re-run Analysis' : 'Run Bug Detection'}
        </button>
      </div>

      {/* Summary cards */}
      {ran && (
        <div className="grid grid-cols-4 gap-3">
          {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
            <SeverityCard key={sev} severity={sev} count={severityCounts[sev] || 0} />
          ))}
        </div>
      )}

      {/* Bug list */}
      {bugs.length > 0 && (
        <div className="space-y-3">
          {bugs.map((bug, i) => (
            <BugCard key={i} bug={bug} index={i}
              isExpanded={expanded === i}
              onToggle={() => setExpanded(expanded === i ? null : i)} />
          ))}
        </div>
      )}

      {ran && bugs.length === 0 && (
        <div className="text-center py-16 glass-card">
          <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No issues found</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The analyzed code looks clean!
          </p>
        </div>
      )}

      {!ran && !loading && (
        <div className="text-center py-20 glass-card">
          <BugIcon className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: '#f87171' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Click "Run Bug Detection" to analyze this repository for issues
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-20">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Analyzing codebase for bugs... This may take a minute.
          </p>
        </div>
      )}
    </div>
  );
}

function SeverityCard({ severity, count }: { severity: string; count: number }) {
  const config = {
    critical: { label: 'Critical', class: 'badge-critical' },
    high: { label: 'High', class: 'badge-high' },
    medium: { label: 'Medium', class: 'badge-medium' },
    low: { label: 'Low', class: 'badge-low' }
  }[severity]!;

  return (
    <div className={`glass-card p-4 text-center border ${config.class}`}>
      <div className="text-2xl font-display font-bold mb-1">{count}</div>
      <div className="text-xs font-mono">{config.label}</div>
    </div>
  );
}

function BugCard({ bug, index, isExpanded, onToggle }: {
  bug: Bug; index: number; isExpanded: boolean; onToggle: () => void
}) {
  const badgeClass = `badge-${bug.severity}`;

  return (
    <div className="glass-card overflow-hidden">
      <button onClick={onToggle} className="w-full p-5 text-left flex items-start gap-4">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5"
          style={{ color: bug.severity === 'critical' ? '#f87171' : bug.severity === 'high' ? '#fb923c' : '#facc15' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className={`px-2 py-0.5 text-xs font-mono rounded border ${badgeClass}`}>
              {bug.severity}
            </span>
            <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
              {bug.location?.filePath}
              {bug.location?.line ? `:${bug.location.line}` : ''}
            </span>
            {bug.confidenceScore && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {Math.round(bug.confidenceScore * 100)}% confidence
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{bug.problem}</p>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> :
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="pt-4">
            <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>SUGGESTED FIX</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{bug.suggestedFix}</p>
          </div>
          {bug.fixedExample && (
            <div>
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>FIXED EXAMPLE</p>
              <pre className="text-xs p-4 rounded-lg overflow-x-auto font-mono"
                style={{ background: 'rgba(34,211,165,0.05)', border: '1px solid rgba(34,211,165,0.15)', color: '#22d3a5' }}>
                {bug.fixedExample}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
