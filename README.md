# RepoMind AI — GitHub Repository Intelligence Platform

> Paste any GitHub URL. Get instant codebase intelligence powered by OpenAI GPT-4o + MCP Tools + MongoDB Vector Search.

🔗 **Live Demo:** [opensource-contributingmind.vercel.app](https://opensource-contributingmind.vercel.app)

---

## Features

| Feature | Description |
|---|---|
| 🤖 **Repo Chat** | Ask questions about the codebase. AI cites actual files and line numbers. |
| 🐛 **Bug Detector** | Finds null errors, async bugs, security issues, race conditions, memory leaks. |
| ⚡ **Efficiency Analyzer** | Detects duplicate code, slow queries, bad architecture patterns. |
| ⏱️ **Time Saved Estimator** | Calculates debugging hours saved by fixing detected issues. |
| 🗺️ **Architecture Mapper** | Visual file tree and Mermaid diagram of the project structure. |
| 📄 **README Generator** | Auto-generates professional documentation from your codebase. |

---

## Tech Stack

**Frontend** — Next.js 15, TailwindCSS, TypeScript, Framer Motion  
**Backend** — Node.js, Express, ES Modules  
**Database** — MongoDB Atlas, Atlas Vector Search  
**AI** — OpenAI GPT-4o (via Responses API), `text-embedding-3-small`  
**Tool Layer** — `@modelcontextprotocol/sdk` (MCP Tools)  
**Git Parsing** — `simple-git`, regex-based AST metadata extraction  
**Deployment** — Vercel (frontend), Hugging Face Spaces (backend)

---

## Architecture Overview

```
User → Next.js (Vercel)
         │
         ▼
    Express API (Hugging Face Spaces)
         │
    ┌────┴─────────────────────────────┐
    │                                  │
    ▼                                  ▼
MCP Tool Layer                  MongoDB Atlas
(search_code, read_file,        (repos, chunks,
 detect_bugs, arch_map...)       embeddings, sessions)
    │
    ▼
OpenAI GPT-4o
(tool_choice: auto)
    │
    ▼
Results → Frontend
```

### Ingestion Pipeline

```
git clone (--depth 1)
    ↓
Parse files (80+ extensions, skip node_modules/dist/build)
    ↓
Chunk (80-line windows, 10-line overlap)
    ↓
Embed (text-embedding-3-small, batches of 100)
    ↓
Store in MongoDB Atlas
    ↓
AI Summary (GPT-4o + search_code tool)
    ↓
Status: ready
```

---

## Project Structure

```
repomind-ai/
├── frontend/                    # Next.js 15 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── repo/[id]/       # Repo dashboard
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   └── features/
│   │   │       ├── ChatPanel.tsx
│   │   │       ├── BugReport.tsx
│   │   │       ├── ArchitectureView.tsx
│   │   │       ├── EfficiencyReport.tsx
│   │   │       └── ReadmeViewer.tsx
│   │   └── lib/
│   │       └── api.ts           # Typed API client
│   ├── vercel.json
│   └── package.json
│
└── backend/                     # Express API
    ├── src/
    │   ├── index.js             # Entry point (rate limiting, CORS, security)
    │   ├── config/
    │   │   └── database.js      # MongoDB Atlas connection
    │   ├── models/
    │   │   ├── Repository.js    # Repo metadata + summary
    │   │   ├── RepoChunk.js     # Code chunks + embeddings
    │   │   ├── ChatSession.js   # Chat history
    │   │   └── AnalysisReport.js # Bug/efficiency reports
    │   ├── routes/
    │   │   └── index.js         # All API routes
    │   ├── controllers/
    │   │   └── analyzeController.js  # Route handlers
    │   ├── services/
    │   │   ├── repoIngestion.js  # git clone, parse, chunk
    │   │   ├── embeddingService.js  # OpenAI embeddings + vector search
    │   │   ├── aiService.js     # GPT-4o + MCP agentic loops
    │   │   └── pipelineService.js  # Full ingestion orchestrator
    │   ├── mcp/
    │   │   └── mcpServer.js     # MCP tool definitions + executors
    │   └── middleware/
    │       ├── validation.js    # express-validator wrappers
    │       ├── security.js      # URL validation, prompt injection guard
    │       └── errorHandler.js  # Global error handler
    ├── scripts/
    │   └── setup-atlas-index.js # One-time Atlas Vector Search setup
    ├── Dockerfile
    └── package.json
```

---

## Prerequisites

- Node.js 20+
- MongoDB Atlas account (M10+ cluster for Vector Search)
- OpenAI API key (GPT-4o access)
- Git installed on the backend server

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/repomind-ai.git
cd repomind-ai

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure environment variables

**Backend** (`backend/.env`):
```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/repomind?retryWrites=true&w=majority
OPENAI_API_KEY=sk-...
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
REPO_STORAGE_PATH=/tmp/repomind-repos
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 3. Set up MongoDB Atlas Vector Search Index

This is a **one-time step** required for semantic search to work.

```bash
cd backend
node scripts/setup-atlas-index.js
```

If the script fails, follow the manual steps:
1. Go to **MongoDB Atlas** → your cluster → **Search** tab
2. Click **Create Search Index** → **Atlas Vector Search**
3. Select collection: `repomind.repochunks`
4. Paste this definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "repositoryId"
    }
  ]
}
```

> **Note:** Atlas Vector Search requires **M10+** cluster tier. Free/M0 clusters don't support it — the app will fall back to keyword search automatically.

### 4. Run development servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Reference

All endpoints are prefixed with `/api`.

### `POST /analyze`
Submit a GitHub repository for analysis.

**Request:**
```json
{ "url": "https://github.com/owner/repo" }
```
**Response (202):**
```json
{ "repositoryId": "...", "status": "cloning", "message": "..." }
```

---

### `GET /repo/:id`
Poll repository status and fetch data.

**Response:**
```json
{
  "_id": "...",
  "url": "https://github.com/...",
  "status": "ready",
  "metadata": { "fileCount": 142, "totalLines": 18420, "techStack": ["Node.js", "React"] },
  "summary": { "overview": "...", "features": [...], "setupGuide": "..." }
}
```

**Status values:** `pending` → `cloning` → `parsing` → `embedding` → `ready` | `error`

---

### `POST /chat`
Ask a question about the repository.

**Request:**
```json
{ "repositoryId": "...", "question": "Where is JWT implemented?", "sessionId": "..." }
```
**Response:**
```json
{
  "answer": "JWT is implemented in src/middleware/auth.js...",
  "citations": [{ "filePath": "src/middleware/auth.js", "startLine": 12, "endLine": 28 }],
  "sessionId": "..."
}
```

---

### `POST /detect-bugs`
Start bug detection analysis (async).

**Request:** `{ "repositoryId": "..." }`  
**Response:** `{ "reportId": "..." }` — poll with `GET /report/:id`

---

### `POST /efficiency`
Start efficiency analysis (async).

**Request:** `{ "repositoryId": "..." }`  
**Response:** `{ "reportId": "..." }`

---

### `GET /report/:id`
Get analysis report status and results.

**Response when complete:**
```json
{
  "status": "complete",
  "bugs": [
    {
      "severity": "high",
      "problem": "Missing null check on user object",
      "location": { "filePath": "src/routes/user.js", "line": 42 },
      "suggestedFix": "Add null check before accessing user.id",
      "fixedExample": "if (!user) return res.status(401).json({error: 'Unauthorized'});",
      "confidenceScore": 0.92
    }
  ]
}
```

---

### `POST /generate-docs`
Generate README documentation.

**Request:** `{ "repositoryId": "..." }`  
**Response:** `{ "readme": "# Project Name\n..." }`

---

### `GET /architecture/:repositoryId`
Get architecture map of the repository.

**Response:**
```json
{
  "files": ["src/index.js", "src/routes/..."],
  "tree": { "src": { "routes": {}, "models": {} } },
  "mermaidDiagram": "graph TD\n  Root --> src[src]\n...",
  "fileCount": 142
}
```

---

## MCP Tools Reference

The AI uses these tools (defined in `src/mcp/mcpServer.js`) instead of hallucinating:

| Tool | Description |
|---|---|
| `search_code` | Semantic vector search across all code chunks |
| `read_file` | Read a specific file's content |
| `list_files` | List all files / directory tree |
| `detect_bugs` | Fetch file content for bug analysis |
| `architecture_map` | Build full directory tree |
| `efficiency_analysis` | Fetch chunks for efficiency review |
| `estimate_time_saved` | Heuristic time savings calculator |
| `generate_docs` | Fetch file for documentation generation |

---

## Deployment

### Backend → Hugging Face Spaces

1. Create a new Space on [Hugging Face](https://huggingface.co/spaces) with Docker SDK
2. Push your `backend/` folder to the Space repository
3. Set environment variables under Space Settings → Repository Secrets
4. Space auto-deploys on push

### Frontend → Vercel

1. Import your repo on [Vercel](https://vercel.com)
2. Set `NEXT_PUBLIC_API_URL` to your Hugging Face Space backend URL
3. Deploy — Vercel auto-detects Next.js

---

## Security

- **URL validation** — Only `github.com` URLs accepted; path traversal blocked
- **Prompt injection guard** — Detects and rejects injection patterns in chat
- **Rate limiting** — Per-endpoint limits (AI routes: 10/min, analyze: 20/hr)
- **Input sanitization** — `express-validator` on all routes
- **Helmet** — Security headers on all responses
- **No API key exposure** — All AI calls happen server-side

---

## Roadmap

| Phase | Status | Features |
|---|---|---|
| Phase 1 | ✅ Complete | Repo ingestion, AI summary, chat with citations |
| Phase 2 | ✅ Complete | Bug detection, efficiency analysis, architecture maps, README gen |
| Phase 3 | 🔜 Planned | Private repos (GitHub OAuth), advanced agent tools, team workspaces |

---

## Cost Optimization

- **Chunking** — 80-line chunks with 10-line overlap (minimal token waste)
- **Ignored folders** — `node_modules`, `dist`, `build`, `.git`, `vendor`
- **Max file size** — 200KB limit per file
- **Embedding cache** — Chunks stored in MongoDB; no re-embedding on repeated analysis
- **Retrieval** — Vector search fetches top-K relevant chunks (not full codebase per query)
- **Embedding model** — `text-embedding-3-small` (~20× cheaper than `text-embedding-ada-002`)

---

## License

MIT