# MM2 Social Mode Fix

The shared CSBT social engines remain reusable, but MM2 now renders them inside MM2-local routes and the MM2 navigation shell.

## MM2 routes
- `/mm2/exchange`
- `/mm2/exchange/[id]`
- `/mm2/exchange/rooms/[id]`
- `/mm2/exchange/middleman`
- `/mm2/exchange/moderation`
- `/mm2/trade-opinions`
- `/mm2/lounge`

## Behavior
- MM2 sidebar/community buttons no longer navigate to the Adopt Me/global shell.
- MM2 Exchange is locked to the MM2 database.
- MM2 Trade Opinions is locked to MM2 trades.
- MM2 Lounge is scoped to MM2 posts/presence.
- Listing detail, Trade Room, moderation/middleman, Lounge and Trade Opinion cross-links preserve the MM2 route shell.
- MM2 calculator social links preserve trade context with local MM2 URLs.
- Shared components still support the original global routes for Adopt Me/multi-game use.
