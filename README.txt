CSBT HUB public-browsing auth fix

Changed files:
- src/components/nich/assistant/NichAssistant.tsx
- src/components/nich/GlobalNichAssistant.tsx

Behavior after this patch:
- Signed-out visitors are no longer forced into the global Nich account gate.
- Public pages remain visible and scrollable while Supabase resolves the session.
- The global Nich assistant no longer blocks browsing for guests.
- Existing feature-level auth guards remain unchanged (Exchange actions, save/wishlist/alerts, posting/voting, profile features, etc.).

To apply manually, copy the two files into the same paths in your project.
Then run your normal build/test/deploy workflow.
