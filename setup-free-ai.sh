#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed. Download it from https://ollama.com/download"
  exit 1
fi

ollama pull qwen3.5:4b

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local"
else
  echo ".env.local already exists; it was not overwritten."
fi

npm install

echo "Free AI setup is complete."
echo "Run: npm run dev"
echo "Open: http://localhost:3000"
