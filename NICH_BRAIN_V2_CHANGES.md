# NICH Brain V2 — Free Intelligence Upgrade

This upgrade improves NICH without replacing the CSBT database or deterministic trade calculator.

## Main improvements

- Fixes the help-menu false positive caused by ordinary sentences containing words such as `examples`.
- Separates direct value lookups from broad questions about demand, strategy, risk, and negotiation.
- Understands greetings combined with a real question, such as `Hello, what is Frost Dragon worth?`.
- Handles quantities and combined values, such as `2 Neon Turtles`.
- Uses fuzzy item matches when they are confident and asks for clarification when a name is ambiguous.
- Improves follow-ups such as `the third one`, `the other one`, `former`, `latter`, `swap sides`, and variant changes.
- Supports modification of the previous trade with add/remove follow-ups.
- Improves nearby-value results with unique items, value differences, category filtering, and adaptive suggestions.
- Improves trade output with grouped quantities, percentage difference, potion warnings, demand caveats, and useful counteroffer suggestions.
- Adds stronger local answers about demand, downgrade risk, negotiation, and scam safety even when Ollama is unavailable.
- Adds all existing CSBT pages to website navigation knowledge.

## CPU-friendly AI behavior

NICH now avoids calling Ollama for tasks the local CSBT engine can answer exactly and instantly:

- greetings and basic help
- direct pet or Pet Wear value lookups
- nearby-value searches
- calculator instructions
- normal navigation
- straightforward W/F/L calculations

Ollama is reserved for broader reasoning, explanations, strategy, and ordinary questions. This reduces waiting time and CPU usage while preserving the free AI layer where it adds real value.

Default local settings are optimized for CPU use:

```env
NICH_OLLAMA_THINK=false
NICH_OLLAMA_NUM_CTX=4096
NICH_OLLAMA_MAX_TOKENS=500
NICH_OLLAMA_KEEP_ALIVE=30m
NICH_OLLAMA_TIMEOUT_MS=120000
```

## Verification

The upgraded brain passed strict TypeScript checking and automated routing tests covering:

- exact help requests
- the previous `give three examples` bug
- greeting plus lookup
- quantity lookup
- broad demand questions
- nearby-value search
- ordinal follow-ups
- variant follow-ups
- trade comparison and side swapping

Run the included test locally with:

```powershell
npm run test:nich
```

Then start the website with:

```powershell
npm run dev
```
