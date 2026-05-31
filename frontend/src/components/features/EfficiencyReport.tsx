'use client';
// src/components/features/EfficiencyReport.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { repoApi, pollReport } from '@/lib/api';
import { Zap, TrendingUp, Clock, Loader2, BarChart2 } from 'lucide-react';

export default function EfficiencyReport({ repoId }: { repoId: string }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

async function runAnalysis() {

  console.log('RUN CLICKED');

  setLoading(true);

  try {

    console.log('Calling efficiency API...');

    const { data } =
      await repoApi.efficiency(repoId);

    console.log(
      'REPORT ID:',
      data
    );

    const result =
      await pollReport(
        data.reportId
      );

    console.log(
      'FINAL RESULT:',
      result
    );

    setReport(result);

    setRan(true);

    toast.success(
      'Efficiency analysis complete'
    );

  } catch (err:any) {

    console.error(
      'EFFICIENCY ERROR:',
      err
    );

    toast.error(
      err.message ||
      'Analysis failed'
    );

  } finally {

    setLoading(false);

  }
}

  const issues =
  report?.efficiencyIssues ||
  report?.issues ||
  [];
  const timeSaved = report?.timeSaved;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        
        <div>
          <h2 className="text-xl font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
            Efficiency Analyzer
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Find repeated code, slow patterns, and estimate productivity gains
          </p>
        </div>
        <button onClick={runAnalysis} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
          style={{
            background: 'rgba(167,139,250,0.15)',
            border: '1px solid rgba(167,139,250,0.3)',
            color: '#a78bfa',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Analyzing...' : ran ? 'Re-analyze' : 'Run Analysis'}
        </button>
      </div>

      {report?.metrics && (

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

  <div className="glass-card p-5">
    <p className="text-xs opacity-70 mb-2">
      Maintainability Score
    </p>

    <h3 className="text-3xl font-bold">
      {report.metrics.maintainability?.score}/100
    </h3>

    <p className="text-emerald-400 text-sm mt-2 capitalize">
      {report.metrics.maintainability?.status}
    </p>
  </div>

  <div className="glass-card p-5">
    <p className="text-xs opacity-70 mb-2">
      Estimated Load Time
    </p>

    <h3 className="text-3xl font-bold">
      {report.metrics.estimatedLoadTime?.current}
    </h3>

    <p className="text-cyan-400 text-sm mt-2">
      {report.metrics.estimatedLoadTime?.improvement}
    </p>
  </div>

  <div className="glass-card p-5">
    <p className="text-xs opacity-70 mb-2">
      Bundle Size
    </p>

    <h3 className="text-3xl font-bold">
      {report.metrics.estimatedBundleSize?.current}
    </h3>

    <p className="text-yellow-400 text-sm mt-2">
      {report.metrics.estimatedBundleSize?.improvement}
    </p>
  </div>

  <div className="glass-card p-5">
    <p className="text-xs opacity-70 mb-2">
      Scalability
    </p>

    <h3 className="text-2xl font-bold capitalize">
      {report.metrics.scalability}
    </h3>

    <p className="text-purple-400 text-sm mt-2">
      Optimization opportunities detected
    </p>
  </div>

</div>

)}

    

      {issues.length > 0 && (
        <div className="space-y-3">
          <h3
  className="text-lg font-semibold"
  style={{
    color:'var(--text-primary)'
  }}
>
  Top Optimization Opportunities
</h3>
          {issues.map((issue: any, i: number) => (
            <div key={i} className="glass-card p-5">
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  issue.impact === 'high' ? 'bg-red-400' :
                  issue.impact === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                      {issue.type}
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {issue.location?.filePath}
                    </span>
                  </div>
                  <div className="space-y-3">

  <p
    className="text-sm"
    style={{
      color:'var(--text-primary)'
    }}
  >
    {issue.description}
  </p>

  {issue.suggestion && (

    <div
      className="rounded-lg p-3"
      style={{
        background:'rgba(16,185,129,0.08)',
        border:'1px solid rgba(16,185,129,0.18)'
      }}
    >

      <div className="text-xs mb-1 text-emerald-400">
        RECOMMENDED OPTIMIZATION
      </div>

      <div
        className="text-sm"
        style={{
          color:'var(--text-secondary)'
        }}
      >
        {issue.suggestion}
      </div>

    </div>

  )}

</div>
                  
                  {(issue.estimatedSpeedGain || issue.estimatedProductivityGain) && (
                    <div className="flex gap-3 mt-2 text-xs font-mono">
                      {issue.estimatedSpeedGain && (
                        <span style={{ color: '#22d3a5' }}>⚡ {issue.estimatedSpeedGain} speed gain</span>
                      )}
                      {issue.estimatedProductivityGain && (
                        <span style={{ color: '#0ea5e9' }}>📈 {issue.estimatedProductivityGain} productivity gain</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!ran && !loading && (
        <div className="text-center py-20 glass-card">
          <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: '#a78bfa' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Click "Run Analysis" to detect efficiency issues
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-20">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Analyzing code patterns...</p>
        </div>
      )}
    </div>
  );
}
