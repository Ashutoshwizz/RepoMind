'use client';
// src/components/features/ChatPanel.tsx
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { repoApi } from '@/lib/api';
import { Send, Bot, User, FileCode, Loader2, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ filePath: string; startLine: number; endLine: number; snippet: string }>;
}

const SUGGESTED_QUESTIONS = [
  'How does authentication work?',
  'Where is the database connection configured?',
  'What API routes are available?',
  'How do I run this project locally?',
  'What environment variables are required?',
  'Where is error handling implemented?',
];

export default function ChatPanel({ repoId }: { repoId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await repoApi.chat(repoId, question, sessionId);
      setSessionId(data.sessionId);

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer,
        citations: data.citations
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to get answer');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-h-[800px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {messages.length === 0 && (
          <div className="py-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
                style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <Sparkles className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Chat with your codebase
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Ask anything about this repository. AI will cite specific files.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="glass-card p-3 text-left text-sm transition-all hover:border-sky-400/30"
                  style={{ color: 'var(--text-secondary)' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
                <Bot className="w-4 h-4 text-sky-400" />
              </div>
            )}

            <div className={`max-w-[80%] space-y-2`}>
              <div className="rounded-xl p-4 text-sm leading-relaxed"
                style={{
                  background: msg.role === 'user'
                    ? 'rgba(14,165,233,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  color: 'var(--text-primary)'
                }}>
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="space-y-1">
                  {msg.citations.map((c, ci) => (
                    <div key={ci} className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                      <FileCode className="w-3 h-3 flex-shrink-0" />
                      <span>{c.filePath}</span>
                      {c.startLine > 0 && (
                        <span style={{ color: 'rgba(167,139,250,0.6)' }}>:{c.startLine}-{c.endLine}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <User className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
              <Bot className="w-4 h-4 text-sky-400" />
            </div>
            <div className="glass-card p-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Searching codebase...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this codebase... (Enter to send)"
            rows={1}
            className="flex-1 glass-input px-4 py-3 text-sm resize-none"
            style={{ minHeight: '48px', maxHeight: '120px', color: 'var(--text-primary)' }}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
            style={{
              background: loading || !input.trim() ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.9)',
              color: 'white',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              height: '48px'
            }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Shift+Enter for newline · Answers grounded in actual code with file citations
        </p>
      </div>
    </div>
  );
}
