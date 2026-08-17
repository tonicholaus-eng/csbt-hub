# NICH v28.1 pre-deploy hotfix

This patch fixes the two remaining release-gate issues from the v28 local test.

1. **Sugar Skull Dog -> Sugar Axolotl confusion regression**
   - Confusion-family candidates are now derived from both Gemini's raw name and the locally chosen catalog candidate.
   - This preserves `Sugar Axolotl` as an alternative even when `Sugar Skull Dog` is not itself present as a canonical CSBT item.
   - The existing regression test should now pass instead of losing the rescue alternative.

2. **Unused `VISION_SCHEMA` lint warning**
   - The baseline Interactions path no longer uses response-schema objects.
   - Removed the dead `VISION_ITEM_SCHEMA` / `VISION_SCHEMA` constants rather than suppressing the warning.

No workbook, environment, UI, deployment, or unrelated project files are included.
The visible/runtime recognition marker remains **Vision v28**.
