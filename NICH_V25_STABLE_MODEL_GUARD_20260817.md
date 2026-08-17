# NICH V25 Stable Model Guard

Root causes seen in local logs:
- local env was still selecting a non-current `gemini-3.7-flash` model id; current Google docs list `gemini-3.6-flash` as the stable Flash production model.
- the Interactions backend rejected `minimal` thinking for that configured model.
- fallback requests could still carry optional fields and return generic HTTP 400.

V25:
- pins effective primary vision to `gemini-3.6-flash`; unsupported local overrides are ignored with a warning.
- normalizes `minimal` to `low` for Interactions compatibility.
- keeps `gemini-3.5-flash-lite` only as the stable fallback model.
- adds `Api-Revision: 2026-05-20`.
- on any HTTP 400 from the structured request, retries the SAME model using the compatibility floor: model + text + image only, with no resolution, no response format and no generation config.
- GET metadata now shows configured vs effective model/thinking.
