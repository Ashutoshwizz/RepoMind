// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'RepoMind AI — GitHub Repo Intelligence Platform',
  description: 'Analyze any GitHub repository with AI. Detect bugs, understand architecture, chat with your codebase.',
  keywords: ['GitHub', 'AI', 'code analysis', 'bug detection', 'developer tools'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(13, 17, 23, 0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.9)'
            }
          }}
        />
      </body>
    </html>
  );
}
