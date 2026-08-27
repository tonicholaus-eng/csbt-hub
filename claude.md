# CSBT HUB — Claude Code Project Context

## Purpose

This file contains persistent product context, engineering constraints, and working rules for Claude Code while operating inside the CSBT HUB repository.

Treat this file as architectural intent and project guidance.

Do NOT treat statements in this file as proof that the current repository implements them correctly.

When this file, other documentation, and the source code disagree, inspect the repository and clearly report the discrepancy.

Actual implementation must be verified from source code, configuration, SQL, migrations, generated data, scripts, tests, and runtime/build behavior where available.

---

# Project Identity

CSBT HUB is a Roblox trading intelligence platform.

The primary game implementations are currently:

- Adopt Me
- Murder Mystery 2 (MM2)

The desired long-term architecture is:

CSBT HUB
→ shared platform systems
→ game configuration / adapters
→ Adopt Me / MM2 / future games

The goal is one scalable multi-game platform, not several unrelated websites placed in one repository.

However, do not force abstraction where game-specific behavior genuinely differs.

Always distinguish between:

- shared platform behavior
- Adopt Me-specific behavior
- MM2-specific behavior
- legacy behavior
- duplicated behavior
- intended architecture
- actual implementation

---

# Core Product Areas

Important systems may include:

- Home / landing experiences
- Item Values / Weapon Values
- item and weapon profile pages
- Demand Intelligence
- Trade Calculator
- Inventory
- Wishlist / Watchlist
- CSBT Exchange
- listings
- offers
- Trade Rooms
- Trade Opinions
- CSBT Lounge
- profiles and accounts
- notifications
- moderation
- middleman functionality
- Nich AI
- Supabase persistence
- data synchronization
- generated value datasets
- game switching
- themes and game-specific presentation

Before modifying any major system, trace its actual implementation.

---

# Primary Engineering Rule

UNDERSTAND FIRST. CHANGE SECOND.

For meaningful work:

1. Inspect the target file.
2. Inspect its imports.
3. Search for its callers and consumers.
4. Inspect related types.
5. Inspect related routes.
6. Inspect related API and database usage.
7. Inspect related game-specific implementations.
8. Understand the complete data flow.
9. Identify behavior that must remain unchanged.
10. Only then modify code.

Do not judge code from filenames alone.

Do not call something unused, obsolete, duplicated, or broken without searching for its usages first.

---

# Evidence Standard

When performing repository analysis, classify conclusions as:

VERIFIED
- directly supported by repository evidence

STRONG INFERENCE
- highly likely, but not completely proven

POSSIBLE ISSUE
- plausible concern requiring further validation

UNKNOWN
- insufficient evidence

Never present inference as verified fact.

For bugs use:

- CONFIRMED BUG
- PROBABLE BUG
- EDGE CASE / RISK

For security severity use:

- CRITICAL
- HIGH
- MEDIUM
- LOW
- INFORMATIONAL

Whenever practical, reference exact files and line ranges.

---

# No Fake Data

Never invent:

- item values
- weapon values
- demand
- demand history
- price history
- market movement
- market activity
- popularity
- online counts
- active trader counts
- transaction counts
- listings
- offers
- inventory records
- user totals
- fake analytics
- fake telemetry
- fake recommendations presented as factual

If information does not exist:

- display N/A
- use a truthful empty state
- omit the information
- explicitly state that it is unavailable

Do not silently treat missing numeric data as zero unless existing business logic explicitly defines that behavior.

---

# Adopt Me

Adopt Me is historically the more mature CSBT implementation.

It may act as a reference for:

- product architecture
- UX patterns
- calculator behavior
- account systems
- social/community systems
- values interfaces

Do not blindly copy Adopt Me implementation into MM2.

Use shared architecture only where behavior is genuinely shared.

---

# MM2

MM2 is a first-class CSBT game mode.

Important MM2 product areas include:

- MM2 Home
- Weapon Values
- weapon profiles
- Demand Intelligence
- Trade Calculator
- CSBT Exchange
- Trade Opinions
- CSBT Lounge

Expected MM2 route families include:

- /mm2
- /mm2/values
- /mm2/values/[id]
- /mm2/demand
- /mm2/calculator
- /mm2/exchange
- /mm2/exchange/[id]
- /mm2/exchange/rooms/[id]
- /mm2/exchange/middleman
- /mm2/exchange/moderation
- /mm2/trade-opinions
- /mm2/lounge

Verify current routes before relying on this list.

Legacy routes may also exist.

---

# MM2 Route Isolation

MM2 community functionality must remain inside MM2 mode.

Do not accidentally redirect:

- /mm2/exchange
- /mm2/trade-opinions
- /mm2/lounge

into Adopt Me equivalents.

Deep routes must also preserve MM2 context.

Never invent application routes.

---

# Multi-Game Architecture

Important game-scoping concepts may include:

- game_id
- fixedGameId
- routeBasePath
- exchangeBasePath
- tradeOpinionsBasePath
- loungeBasePath

The desired architecture is conceptually:

shared feature engine
→ game context / adapter
→ Adopt Me / MM2 / future games

Do not assume this abstraction is already complete.

When reviewing architecture, identify:

- what is truly shared
- what is duplicated
- what remains Adopt Me-coupled
- what remains MM2-coupled
- what should remain game-specific

Do not abstract for abstraction's sake.

---

# Shared Community Systems

CSBT Exchange, Trade Opinions, and CSBT Lounge are conceptually shared platform systems.

Where possible, game-specific implementations should configure shared engines rather than duplicate entire features.

Always verify current implementation before changing them.

Pay particular attention to:

- game scope
- route bases
- Supabase queries
- listing ownership
- trade-room routing
- historical Adopt Me compatibility

---

# Historical / Legacy Social Data

Historical Adopt Me records may predate explicit multi-game scoping.

Be careful with:

- missing game_id values
- legacy records
- fallback behavior
- migrations
- backfills
- schema evolution

Never solve compatibility problems by deleting historical data.

Prefer:

- backwards-compatible interpretation
- safe migrations
- non-destructive backfills
- explicit normalization

---

# MM2 Data

Important MM2 application datasets may exist in locations such as:

- src/data/mm2Items.json
- src/data/mm2ItemsIndex.json
- src/data/mm2Meta.json
- src/data/mm2Categories.json
- source-data/
- scripts/

Before modifying generated data, trace the real source-of-truth pipeline.

Typical conceptual pipeline:

source
→ normalization / synchronization
→ master data
→ generator
→ application JSON

Do not manually patch generated outputs when the actual fix belongs upstream.

---

# Data Source of Truth

Before changing data, determine which source is authoritative.

Possible sources include:

- spreadsheets
- CSV files
- external providers
- source-data files
- generation scripts
- generated JSON
- Supabase tables

Do not create competing sources of truth.

If documentation disagrees with implementation, report the disagreement.

---

# MM2 Values

MM2 may use value-source concepts such as:

- SUPREME
- GCASH

Potential field mappings may include:

SUPREME → SOURCE_VALUE
GCASH → GCASH_VALUE

Verify current implementation before relying on these mappings.

If the selected value source has no value, do not fabricate one or silently substitute another source unless existing product logic explicitly requires it.

Use a truthful missing-data state such as N/A or CHECK depending on the existing system.

---

# Trade Calculators

Trade calculators are correctness-critical.

Before changing calculator logic, understand:

- selected-item representation
- quantities
- duplicates
- variants
- value-source selection
- offer totals
- value differences
- W/F/L classification
- URL state
- persistence
- sharing
- saved trades
- Balance Finder
- Exchange integration
- Trade Opinions integration

Do not casually change calculation semantics.

Demand should not silently alter value calculations unless existing business logic explicitly requires it.

---

# Nich AI

Nich is an AI subsystem that may include:

- assistant interface
- prompts
- trade sessions
- item resolver
- image/vision processing
- quotas
- persistence
- model requests
- API endpoints

Nich is primarily associated with Adopt Me unless the current repository explicitly supports MM2.

Do not insert Nich into MM2 without explicit product intent.

---

# Supabase

Supabase is a critical backend system.

Potential persisted domains include:

- profiles
- Exchange listings
- offers
- Trade Rooms
- Trade Opinions
- voting
- Lounge
- notifications
- watchlists
- moderation
- value history

Before changing Supabase-backed functionality, inspect:

- frontend caller
- server/client Supabase usage
- RPCs
- SQL
- migrations
- RLS policies
- ownership logic
- game scoping
- indexes
- foreign keys
- legacy compatibility

Frontend restrictions alone are not sufficient authorization.

---

# Security

Never expose or commit:

- API keys
- service-role keys
- authentication secrets
- private tokens
- passwords

Be careful with sensitive environment files such as:

- .env
- .env.local
- .dev.vars

Do not include them in exported project archives.

Security reviews should specifically consider:

- IDOR
- trusting client-provided user IDs
- ownership validation
- RLS coverage
- moderation privilege escalation
- dynamic-route validation
- unsafe redirects
- query-parameter validation
- XSS
- secret exposure
- AI endpoint abuse
- missing rate limits

Authentication is not the same as authorization.

---

# Destructive Operations

Do not perform destructive operations unless the user explicitly authorizes them.

Do not automatically:

- DROP database objects
- TRUNCATE tables
- delete production data
- run destructive migrations
- deploy
- push
- force push
- git reset --hard
- git clean
- delete project directories
- rewrite source datasets

Prefer reversible changes.

---

# Git Safety

Before large modifications, inspect:

- git status
- git diff

Do not overwrite unrelated user changes.

Do not revert unfamiliar code merely because Claude did not create it.

Do not commit or push unless explicitly requested.

---

# Next.js / React

Verify exact framework versions from package.json.

Be careful with:

- App Router
- Server Components
- Client Components
- "use client"
- async route params
- hydration
- browser-only APIs
- duplicate data fetching
- dynamic routes
- loading states
- error boundaries
- large datasets shipped to the browser

Do not add "use client" unnecessarily.

Do not move server logic into the browser without a clear reason.

---

# Styling

MM2 and Adopt Me may use very different visual systems.

MM2-specific styling must not unintentionally alter Adopt Me.

Prefer:

- CSS Modules
- scoped selectors
- game-specific classes

Be cautious when editing global CSS.

Before appending new overrides:

1. search existing declarations
2. determine which styles currently win
3. consolidate where practical
4. avoid unnecessary !important
5. avoid specificity wars

---

# MM2 Visual Identity

MM2 should generally feel:

- dark
- premium
- weapon-oriented
- graphite
- gunmetal
- crimson
- sophisticated
- unmistakably MM2

Avoid automatically defaulting to:

- generic cyberpunk
- giant red haze
- random diagonal lines
- fake HUD decoration
- meaningless technical labels
- excessive particles
- generic SaaS cards
- generic dashboard templates

Lighting should preferably appear to originate from something meaningful such as:

- weapon displays
- terminals
- signage
- facility fixtures
- active navigation
- illuminated panel edges

---

# Project Assets

Before adding or replacing artwork, inspect the existing public assets.

For MM2, inspect relevant directories such as:

- public/themes/mm2/

Prefer strong existing project artwork over generic placeholders.

Do not replace good project assets without a clear reason.

---

# Responsiveness

Meaningful UI changes must account for:

- large desktop
- 1600px
- 1440px
- laptop
- tablet
- mobile

Do not simply shrink desktop layouts.

Recompose where necessary.

Do not improve desktop by breaking mobile navigation or content.

---

# Accessibility

Preserve or improve:

- semantic HTML
- keyboard access
- focus states
- link/button semantics
- dialog behavior
- readable contrast
- labels
- alt text
- reduced-motion behavior
- screen-reader accessibility

Decorative artwork should use appropriate empty alt text or aria-hidden behavior.

---

# Performance

Be conscious of:

- large JSON datasets
- unnecessary client-side rendering
- oversized images
- repeated filtering
- duplicate fetches
- expensive blur effects
- persistent animations
- hydration cost
- database-query count
- API waterfalls

Do not claim measured performance improvement unless measurement was actually performed.

---

# Validation

Never say a check passed unless it actually ran successfully.

Distinguish between:

- syntax check
- type check
- lint
- unit test
- integration test
- data validation
- production build
- runtime verification
- visual verification

They are not interchangeable.

Inspect package.json before selecting commands.

If a production build cannot run, state the exact limitation instead of claiming success.

---

# Implementation Workflow

For significant engineering tasks:

1. Inspect the relevant system.
2. Define the exact scope.
3. Identify behavior that must remain unchanged.
4. Implement only the required changes.
5. Run appropriate non-destructive validation.
6. Report exactly what changed and what was verified.

Avoid unrelated cleanup during scoped work.

---

# Deep Repository Audit Mode

When asked to deeply analyze the entire repository:

DO NOT immediately edit application code.

Recommended investigation order:

1. Repository inventory
2. Configuration
3. Route map
4. Component architecture
5. Adopt Me
6. MM2
7. Shared multi-game systems
8. Data pipelines
9. Supabase/database
10. Authentication and authorization
11. Nich AI
12. Security
13. Performance
14. Testing
15. Deployment
16. Technical debt
17. Product architecture

Maintain a repository coverage ledger.

Do not declare a repository-wide audit complete while major directories remain unreviewed.

---

# Large Repository Rule

Do not become shallow simply because the repository is large.

Analyze in logical batches where necessary.

When explicitly authorized, maintain reports under:

docs/audit/

Use those reports as persistent architectural memory.

Do not rely entirely on conversation context.

---

# Audit Report Standard

Reports should contain evidence, not generic engineering advice.

Useful structure:

Finding
Evidence
Why it matters
Impact
Recommendation
Affected files
Confidence

Architecture diagrams must reflect the actual implementation discovered in the repository.

---

# Long-Term Product Architecture

A future Roblox game should ideally require something closer to:

- game definition/config
- item/value adapter
- game-specific data pipeline
- game-specific calculator rules where necessary
- theme/assets
- route configuration

rather than duplicating the entire product.

But do not prematurely generalize behavior that is legitimately game-specific.

The principle is:

SHARED ARCHITECTURE WHERE BEHAVIOR IS SHARED.
GAME-SPECIFIC LOGIC WHERE BEHAVIOR DIFFERS.

---

# Non-Negotiable CSBT Rules

Never knowingly:

1. fabricate market information
2. fabricate demand
3. fabricate users or activity counts
4. invent routes
5. redirect MM2 community flows into Adopt Me
6. break game scoping
7. contaminate Adopt Me styling with MM2 changes
8. destroy historical Supabase data to solve compatibility
9. expose secrets
10. claim builds/tests passed when they did not
11. silently change calculator semantics
12. treat missing data as zero without explicit business logic
13. edit generated data without tracing its source pipeline
14. add fake dashboard data to make a page look populated
15. deploy, push, or perform destructive actions without explicit authorization

---

# When Something Is Unclear

If the repository can answer the question:

SEARCH THE REPOSITORY FIRST.

Ask the user only when the missing information is a real:

- product decision
- business rule
- design preference
- external requirement

Do not ask questions merely because repository investigation would take effort.

---

# Final Working Principle

Inspect deeply.

Verify assumptions.

Preserve correctness.

Then change only what is necessary.