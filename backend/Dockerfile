# Dockerfile — RepoMind AI Backend
FROM node:20-slim

# Install git (required for simple-git cloning)
RUN apt-get update && apt-get install -y git curl wget zstd

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source
COPY src/ ./src/
COPY scripts/ ./scripts/

# Create temp directory for repo clones
RUN mkdir -p /tmp/repomind-repos

EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:7860/api/health || exit 1

CMD bash -c "ollama serve & sleep 10 && ollama pull qwen2.5-coder:3b && node src/index.js"
