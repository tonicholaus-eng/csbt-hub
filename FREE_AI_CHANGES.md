# Free AI conversion summary

## Removed

- OpenAI API endpoint calls
- `OPENAI_API_KEY`
- Paid-model configuration
- ChatGPT Plus/API billing dependency

## Added

- Local Ollama chat integration
- Hosted Gemini free-tier integration for the public website
- Deployment-aware `auto` mode
- Automatic Gemini model fallback from `gemini-3.5-flash` to `gemini-3.5-flash-lite`
- `/api/nich` status endpoint for deployment checks
- Automatic fallback to the original deterministic NICH brain
- Windows and macOS/Linux local setup scripts
- Public website deployment instructions

## Preserved

- Exact CSBT pet values
- Nearby-value searches
- Trade calculations and W/F/L verdicts
- Existing chat history and local storage
- Rate limiting and input validation
- Protection against AI responses changing authoritative numbers
