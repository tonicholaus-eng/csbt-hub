# NICH v26 Baseline Interactions Stability Fix

The v25 local log proved two things: (1) the stable-model guard correctly switched stale `gemini-3.7-flash` to `gemini-3.6-flash`; (2) Gemini rejected the optional Interactions configuration, then the compatibility request was killed by a hard 10-second timeout.

v26 makes the documented minimal Interactions request the primary path: model + text + uploaded image URI only. It removes response_format, media resolution and generation_config from the request for now, gives the primary image call up to 34 seconds, and puts the exact compact JSON shape directly in the prompt. The browser-side original-image preservation and trade-grid zoom fallback remain intact.
