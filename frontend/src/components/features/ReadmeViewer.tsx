'use client';
// src/components/features/ReadmeViewer.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { repoApi } from '@/lib/api';
import { FileText, Loader2, Copy, Check } from 'lucide-react';

export default function ReadmeViewer({ repoId }: { repoId: string }) {
  const [readme, setReadme] = useState('');
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const { data } = await repoApi.generateDocs(repoId);

console.log(
  'README API RESPONSE:',
  data
);

setReadme(
  data.readme ||
  data.generatedReadme ||
  ''
);
      setRan(true);
      toast.success('README generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(readme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard!');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
            README Generator
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Auto-generate professional documentation from your codebase
          </p>
        </div>
        <div className="flex gap-2">
          {ran && (
            <button onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: 'rgba(34,211,165,0.15)',
              border: '1px solid rgba(34,211,165,0.3)',
              color: '#22d3a5',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Generating...' : ran ? 'Regenerate' : 'Generate README'}
          </button>
        </div>
      </div>

      {readme && (
        <div className="glass-card p-6">
          <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto"
            style={{ color: 'var(--text-secondary)' }}>
            {readme}
          </pre>
        </div>
      )}

      {!ran && !loading && (
        <div className="text-center py-20 glass-card">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30 text-emerald-400" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Click "Generate README" to create documentation
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-20">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Generating documentation...</p>
        </div>
      )}
    </div>
  );
}
