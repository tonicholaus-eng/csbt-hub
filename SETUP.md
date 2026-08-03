# NICH Completely Free AI Setup

For a public website deployment, follow `WEBSITE_DEPLOYMENT.md`.

## Recommended mode: local Ollama

This is the only mode with no API bill and no provider quota. NICH sends requests to an AI model running on the same computer as the Next.js server.

### 1. Install Ollama

Download and install Ollama for Windows, macOS, or Linux from:

```text
https://ollama.com/download
```

Restart your terminal after installation.

### 2. Download a model

Balanced default:

```bash
ollama pull qwen3.5:4b
```

Then test it:

```bash
ollama run qwen3.5:4b
```

Type a message. Press `Ctrl+D` or enter `/bye` to exit.

### 3. Choose the model size

Use the largest model that runs comfortably:

```text
qwen3.5:2b   Lower-end computers; faster but less capable
qwen3.5:4b   Recommended balance
qwen3.5:9b   Better reasoning and writing
qwen3.5:27b  High-end computer
```

After pulling another model, update `NICH_OLLAMA_MODEL` in `.env.local`.

### 4. Create local settings

Windows Command Prompt:

```bat
copy .env.example .env.local
```

PowerShell, macOS, or Linux:

```bash
cp .env.example .env.local
```

Default settings:

```env
NICH_AI_PROVIDER=auto
NICH_OLLAMA_URL=http://127.0.0.1:11434
NICH_OLLAMA_MODEL=qwen3.5:4b
NICH_OLLAMA_THINK=medium
NICH_OLLAMA_NUM_CTX=8192
```

### 5. Run CSBT HUB

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## How the free fallback works

NICH follows this order:

```text
Ollama model
    ↓ if unavailable
Original deterministic CSBT brain
```

Exact CSBT values and trade calculations always come from the deterministic engine. The language model is not allowed to replace authoritative values.

## Optional public-deployment fallback: Gemini free tier

A hosted Next.js server cannot normally reach Ollama running on your personal computer. For a public site, you may use Google's quota-limited Gemini free tier without enabling billing.

1. Create an API key in Google AI Studio.
2. Do not enable Cloud Billing.
3. Set:

```env
NICH_AI_PROVIDER=auto
GEMINI_API_KEY=your_free_key
NICH_GEMINI_MODEL=gemini-3.5-flash
```

`auto` uses Ollama first during local development. On recognized hosted platforms, it skips a loopback Ollama address and uses Gemini first, then the original rule engine.

Free-tier quotas can change or be exhausted. Free-tier requests may be used by Google to improve its products. Leave `GEMINI_API_KEY` blank for the most private local-only setup.

## Improve intelligence without paying

- Use `qwen3.5:9b` instead of `4b` when your computer can run it.
- Increase `NICH_OLLAMA_NUM_CTX` to `16384` for longer conversations if memory allows.
- Use `NICH_OLLAMA_THINK=high` for difficult questions.
- Keep the model's built-in sampling defaults unless testing shows a clear improvement.
- Keep conversation history concise so the model spends context on relevant information.
- Continue improving the deterministic pet search and trade tools; reliable tools often matter more than a larger prompt.

## Troubleshooting

### NICH only gives the old local response

Check Ollama:

```bash
ollama list
```

Test its API:

```bash
curl http://127.0.0.1:11434/api/chat -d "{"model":"qwen3.5:4b","messages":[{"role":"user","content":"Hello"}],"stream":false}"
```

Confirm `.env.local` contains:

```env
NICH_AI_PROVIDER=auto
NICH_OLLAMA_MODEL=qwen3.5:4b
```

Restart `npm run dev` after changing environment variables.

### The response times out

Use a smaller model:

```bash
ollama pull qwen3.5:2b
```

Then set:

```env
NICH_OLLAMA_MODEL=qwen3.5:2b
NICH_OLLAMA_THINK=low
NICH_OLLAMA_NUM_CTX=4096
```

### The website is deployed but Ollama does not work

`127.0.0.1` refers to the deployed server, not your home computer. Run the Next.js app and Ollama on the same machine, host Ollama on a server you control, or use the optional Gemini free tier.

## Supabase community feed

Supabase setup is separate from NICH AI:

1. Create a Supabase project.
2. Run `src/lib/supabase/community-feed.sql` in the SQL Editor.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Never expose a service-role key.
