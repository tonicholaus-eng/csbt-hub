# Apply NICH Free AI to the Public Website

NICH is already connected to the website through:

```text
Browser chat -> /api/nich -> Gemini free tier -> local CSBT engine fallback
```

The Gemini key stays inside the server-side API route. Website visitors never receive the key.

## Recommended free deployment: Vercel

### 1. Create a free Gemini API key

Create a key in Google AI Studio. Keep the project on the Free Tier and do not enable billing if you do not want paid usage.

### 2. Upload the project to GitHub

Do not upload `.env.local`, API keys, `node_modules`, or `.next`.

### 3. Import the GitHub repository into Vercel

Vercel recognizes the project as Next.js automatically.

### 4. Add these Environment Variables in Vercel

```env
NICH_AI_PROVIDER=gemini
GEMINI_API_KEY=your_google_ai_studio_key
NICH_GEMINI_MODELS=gemini-3.5-flash,gemini-3.5-flash-lite
NICH_GEMINI_MAX_TOKENS=1200
```

Add the Supabase variables too when the community feed is enabled:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never use this name:

```env
NEXT_PUBLIC_GEMINI_API_KEY
```

Anything beginning with `NEXT_PUBLIC_` can be included in browser code.

### 5. Deploy

After deployment, open:

```text
https://your-domain.com/api/nich
```

It should report:

```json
{
  "provider": "gemini",
  "hostedRuntime": true,
  "geminiConfigured": true
}
```

Then test the NICH chat page on the website.

## Free-plan behavior

- Gemini handles natural conversation and reasoning while free quota is available.
- Exact CSBT values, trade totals, and W/F/L verdicts still come from the local deterministic engine.
- When Gemini is unavailable or its free quota is exhausted, NICH still answers using the deterministic engine.
- All public visitors share the same Gemini project quota.
- A free hosted tier is quota-limited; it is not unlimited.
- Free-tier Gemini requests may be used by Google to improve its products.

## Local development

Use this in `.env.local`:

```env
NICH_AI_PROVIDER=auto
NICH_OLLAMA_URL=http://127.0.0.1:11434
NICH_OLLAMA_MODEL=qwen3.5:4b
GEMINI_API_KEY=
```

`auto` uses Ollama locally. In recognized hosted environments, it skips a loopback Ollama address and uses Gemini instead.

## Other hosting providers

This also works on a Next.js host that supports server-side route handlers, including Netlify or a Node server. Static-only hosting such as GitHub Pages cannot run `/api/nich`.

## Automatic Elve Shark value updates

The project includes `.github/workflows/update-elve-shark-values.yml`.

After the repository is pushed to GitHub and Actions are enabled, the workflow checks Elve Shark values daily. It validates the new snapshot, regenerates CSBT data, and commits only when values changed. The previous snapshot remains available if extraction or validation fails.

When the GitHub repository is connected to Vercel, the updater commit normally starts a new deployment through the repository integration. The live website continues using the last committed valid snapshot until that deployment finishes.

You can run the same process manually before deployment:

```bash
npm run refresh:values
```

See `VALUE_SYSTEMS.md` for the full data flow and limitations of the page-data extractor.
