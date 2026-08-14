# NICH W/F/L Short Output + Vision Specificity Fix

## Default W/F/L output
Plain W/F/L requests now return only:
- Win / Fair / Lose verdict
- Your Offer item breakdown and total
- Their Offer item breakdown and total

No automatic advice, counteroffer suggestion, demand commentary, source note, potion warning, or trade-shape line is appended unless the user explicitly asks for advice/details/demand information.

Successful trade screenshots also suppress the separate "Screenshot recognized" preamble and go straight to the concise local W/F/L result.

## Vision item specificity
The Gemini vision prompt now requires FULL canonical Adopt Me item names and explicitly warns against collapsing specific pets into generic species names (for example Panda vs Giant Panda).

A local safety guard was added for the Panda family. If Gemini returns generic `Panda` from an icon-only screenshot, NICH will no longer silently accept it as authoritative when distinct Panda-family pets are valid possibilities. It will refuse to calculate with the ambiguous item and surface candidates such as Giant Panda instead of using a potentially wrong value.

If Gemini correctly returns `Giant Panda`, it verifies normally against the CSBT database and W/F/L proceeds locally.

## QA
Passed:
- NICH Local Max smoke tests
- NICH Gemini Vision local verification tests
- NICH Credit Saver local parsing tests
- New concise W/F/L assertions
- New Panda/Giant Panda ambiguity assertions
