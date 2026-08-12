# CSBT Exchange

CSBT Exchange is the evolved trading layer for CSBT HUB. It reuses the existing CSBT profile, inventory, wishlist, value database, notifications, Trade Voting, and Nich systems instead of creating a separate marketplace silo.

## Member experience

- **For You smart matching** — ranks listings using inventory compatibility, value compatibility, wishlist fit, demand, trading preferences, and listing freshness.
- **Browse + Trade Feed** — browse all active listings or scroll a compact trade feed.
- **Flexible listings** — Specific Items, Similar Value, Upgrade, Downgrade, Wishlist, or Open to Offers.
- **GCash / Elve Shark** — listings and offers use a selected value source with value snapshots.
- **Smart Offer Builder** — builds Fair, Demand-Friendly, Lowball Attempt, and Competitive suggestions from the member's saved inventory.
- **Counteroffers** — offers form a validated negotiation chain instead of requiring a brand-new listing.
- **Compatibility score** — explains inventory fit, buildable value fit, wishlist overlap, demand, both traders' preferences, and listing freshness rather than showing value alone.
- **Nich Trading Copilot** — listing pages can open Nich with a prebuilt listing/match context.
- **Wishlist + inventory opportunities** — new listings can generate notifications when a user wants an item you own or lists an item you want.
- **Demand-spike alerts** — Exchange demand milestones can notify users who own the item.
- **Trade Rooms** — accepted offers become a locked transaction snapshot with statuses, structured chat, completion confirmation, event history, and reviews.
- **Trade Lock** — the original accepted items are preserved; changed in-game offers should not be trusted without a new CSBT offer.
- **Reviews + Trust Score** — trust uses actual platform behavior instead of only star ratings.
- **Category reputation** — completed trades are counted by item category.
- **Safety Scan** — listing pages surface unverified Roblox identity, limited Exchange history, off-platform wording, and missing-value precision issues.
- **Reports + blocks** — users can report suspicious listings/traders and block accounts.
- **Market Intelligence** — source-specific supply, wanted quantity, accepted-item signals, 24h views/searches/offers, popular searches, and early CSBT Market estimates from accepted trade data.
- **Demand integration** — the existing Demand page now includes a live Exchange Demand Pulse using real WANT listings and accepted-trade activity.
- **Realtime updates** — listings, offers, rooms, messages, and staff queues refresh through Supabase Realtime.

## CSBT Trust Score

The score is behavior-based and can consider:

- completed Exchange trades
- completion rate
- account age
- Roblox verification
- review average
- completed middleman-protected cases
- upheld Exchange safety reports

It is not a guarantee that a trader is safe. The locked Trade Room and Safe Trader rules remain important.

## CSBT staff systems

### Middleman Desk

`/exchange/middleman`

Approved middlemen can:

- choose Online / Busy / Offline status
- see pending member requests
- claim a case
- open the locked room as a neutral third party
- participate in structured room chat
- mark a case In Progress / Completed
- build a completed-case history

### Moderation Desk

`/exchange/moderation`

Approved Exchange staff can:

- review scam-risk, fake-listing, switch-attempt, spam, harassment, and other reports
- mark reports Reviewing / Upheld / Dismissed
- automatically close an open reported listing when a report is upheld
- feed upheld safety actions into the Trust Score

## Market data direction

The `marketplace_events` stream collects structured Exchange activity. Accepted offers create per-item `ACCEPTED_ITEM` signals using a **transaction-implied value**: each server-validated catalog snapshot is adjusted by the accepted trade's opposite-side ratio. When enough real activity exists, CSBT can use this to supplement GCash and Elve Shark with a genuine **CSBT Market** signal based on what traders actually accept.

Listing and offer item identities/variants are validated server-side against the latest rows in `value_history`, and offer totals are recomputed inside Supabase. Browser-supplied totals are not trusted for market analytics.

No historical accepted-trade data is fabricated. New market metrics begin collecting after Exchange goes live.
