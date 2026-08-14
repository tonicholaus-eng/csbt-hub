# Gemini 3.6 Vision Fix 2

This revision changes NICH screenshot recognition to Google's current Gemini Interactions API for Gemini 3.6 Flash.

Key changes:
- Uses `POST /v1beta/interactions` for image understanding.
- Sends inline images with `type: image`, `mime_type`, and base64 `data`.
- Uses Interactions API `generation_config.thinking_level` (`minimal` by default).
- Uses top-level `response_format` for structured JSON.
- If structured output is rejected with HTTP 400, retries once with prompt-enforced JSON using the same Interactions image format.
- Parses Interactions `steps[].content[].text` and Interactions token usage fields.
- Preserves CSBT database verification and local W/F/L authority.
- Does not include `.env.local` or any Gemini API key.

After replacing files, restart `npm run dev` before retesting screenshots.
