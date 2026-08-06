# CSBT HUB

CSBT HUB is a Next.js website for Adopt Me values, trade checking, demand information, community features, and the NICH assistant.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

On macOS or Linux, use:

```bash
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Main commands

```bash
npm run dev             # Start the local website
npm run build           # Create a production build
npm run lint            # Run ESLint
npm run test:nich       # Test the NICH response engine
npm run generate:data   # Rebuild website value data
npm run data:validate   # Validate generated trading data
npm run update:elve     # Refresh the Elve Shark snapshot
npm run refresh:values  # Refresh, generate, and validate values
```

## NICH assistant

The floating assistant is located in:

```text
src/components/nich/assistant/
```

The close button above the NICH avatar hides the entire floating assistant for the current browser session. Opening the website in a new browser session makes it available again.

## Project structure

```text
public/                         Static website images
scripts/                        Data refresh and validation scripts
source-data/                    Master workbook and source snapshots
src/app/                        Next.js pages and API routes
src/components/                 Reusable interface components
src/components/nich/assistant/  Floating NICH assistant and its logic
src/data/                       Generated website data
src/lib/                        Shared utilities
```

## Environment variables

Copy `.env.example` to `.env.local`, then add the values needed by your deployment. Never commit `.env.local`, API keys, passwords, `node_modules`, or `.next`.

## Deployment

Push the cleaned source project to GitHub and connect the repository to Vercel. Add the required environment variables in the Vercel project settings before redeploying.
