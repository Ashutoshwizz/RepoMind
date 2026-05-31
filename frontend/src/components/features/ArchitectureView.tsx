'use client';
// src/components/features/ArchitectureView.tsx
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { repoApi, ArchitectureMap } from '@/lib/api';
import { FolderOpen, File, ChevronRight, Loader2, Code2 } from 'lucide-react';

export default function ArchitectureView({ repoId }: { repoId: string }) {
  const [data, setData] = useState<ArchitectureMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tree' | 'list'>('tree');

  useEffect(() => {
    repoApi.getArchitecture(repoId)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load architecture'))
      .finally(() => setLoading(false));
  }, [repoId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
            Architecture Map
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {data.fileCount} files across the repository
          </p>
        </div>
        <div className="flex gap-2">
          {(['tree', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 text-sm font-mono rounded-lg transition-all"
              style={{
                background: view === v ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.04)',
                color: view === v ? '#0ea5e9' : 'var(--text-secondary)',
                border: `1px solid ${view === v ? 'rgba(14,165,233,0.4)' : 'rgba(255,255,255,0.08)'}`
              }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'tree' ? (
        <div className="glass-card p-6">
         <TreeNode
  node={(data as any)?.tree || {}}
  name="/"
  depth={0}
/>
        </div>
      ) : (
        <div className="glass-card p-6">
          <div className="space-y-1">
            {Object.entries(((data as any)?.architecture || {})).map(
  ([category, sections]: [string, any]) => (

    <div key={category} className="mb-6">

      <h3 className="text-lg font-bold mb-3">
        {category}
      </h3>

      {Object.entries(sections || {}).map(
        ([section, files]: [string, any]) => (

          <div key={section} className="mb-4 ml-4">

            <h4 className="font-semibold mb-2">
              {section}
            </h4>

            {(files || []).map((fp: string) => (

              <div
                key={fp}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm font-mono hover:bg-white/5"
              >
                <File
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{
                    color: 'var(--text-muted)'
                  }}
                />

                <span
                  style={{
                    color: 'var(--text-secondary)'
                  }}
                >
                  {fp}
                </span>

              </div>

            ))}

          </div>

        )
      )}

    </div>

  )
)}
          </div>
        </div>
      )}

      {/* Mermaid diagram */}
      {data.mermaidDiagram && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-mono font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
            DIRECTORY DIAGRAM
          </h3>
          <pre className="text-xs font-mono leading-relaxed overflow-x-auto"
            style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
            {data.mermaidDiagram}
          </pre>
        </div>
      )}
    </div>
  );
}

function TreeNode({
  node,
  name,
  depth
}: {
  node: Record<string, any>;
  name: string;
  depth: number;
}) {

  const [open, setOpen] = useState(
    depth < 1
  );

  const isDir =
    typeof node === 'object' &&
    node?._type !== 'file';

  const children =
  isDir
    ? Object.entries(

        node?.children
          ? node.children
          : node

      ).filter(
        ([key]) => key !== '_type'
      )
    : [];

  const indent = depth * 16;

  return (

    <div>

      <div
        className="flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-sm font-mono hover:bg-white/5"
        style={{
          paddingLeft: `${indent + 8}px`,
          color: isDir
            ? 'var(--text-primary)'
            : 'var(--text-secondary)'
        }}
        onClick={() => {

          if (isDir) {
            setOpen(!open);
          }

        }}
      >

        {isDir ? (

          <>

            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${
                open ? 'rotate-90' : ''
              }`}
              style={{
                color:'var(--text-muted)'
              }}
            />

            <FolderOpen
              className="w-3.5 h-3.5 flex-shrink-0 text-amber-400"
            />

          </>

        ) : (

          <>

            <span className="w-3.5 h-3.5 flex-shrink-0" />

            <File
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{
                color:'var(--text-muted)'
              }}
            />

          </>

        )}

        <span>{name}</span>

      </div>

      {isDir && open && (

        <div>

          {children.map(
            ([childName, childNode]) => (

              <TreeNode
                key={childName}
                node={childNode as any}
                name={childName}
                depth={depth + 1}
              />

            )
          )}

        </div>

      )}

    </div>

  );
}