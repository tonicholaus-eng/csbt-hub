# CSBT HUB with NICH Free AI

This Next.js project contains the CSBT price checker and the NICH assistant.

## NICH intelligence design

NICH uses a zero-payment hybrid system:

1. The deterministic CSBT engine controls exact pet values, nearby-value searches, trade totals, and W/F/L verdicts.
2. Ollama runs a local open model during development or when the site is hosted on the same computer.
3. Gemini's free tier powers natural conversation on a publicly deployed website.
4. When every AI provider is unavailable, the original local NICH engine still answers.

There is no OpenAI dependency and no paid API key is required.


## Dual value systems

CSBT keeps two independent sources:

- **GCash Value** — Regular, Neon, and Mega from `source-data/trading-data.xlsx`.
- **Elve Shark Value** — Regular, Neon, and Mega from the validated local Elve snapshot.

Ranges in the master workbook use the lower bound, so `7-9` becomes `7`. GCash and Elve values are never mixed in one trade calculation.

Useful commands:

```bash
npm run generate:data
npm run data:validate
npm run update:elve
npm run refresh:values
```

The daily GitHub Actions updater is defined in `.github/workflows/update-elve-shark-values.yml`. See `VALUE_SYSTEMS.md` for setup, validation, and backup behavior.

## Local setup

On Windows, double-click:

```text
SETUP_FREE_AI.bat
```

Or run manually:

```bash
ollama pull qwen3.5:4b
copy .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Public website setup

Read `WEBSITE_DEPLOYMENT.md`. The deployed website uses a server-side Gemini free-tier key, while exact CSBT calculations remain local and deterministic.

## Important

- Ollama is unlimited but only available to a site that can reach the Ollama server.
- A public serverless website cannot reach Ollama running at `127.0.0.1` on your personal computer.
- Gemini's free tier is hosted and suitable for the website, but it has quotas.
- Do not commit `.env.local`, API keys, passwords, `node_modules`, or `.next`.
