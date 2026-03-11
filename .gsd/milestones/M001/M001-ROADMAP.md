# M001: Migration

**Vision:** A cross-platform app (Expo/React Native) for capturing handwritten family recipes via photo scanning, translating them into clean searchable recipes with AI-powered OCR, and organizing them within privacy-controlled family spaces.

## Success Criteria


## Slices

- [x] **S01: Foundation (3 plans) — completed 2026 02 03** `risk:medium` `depends:[]`
  > After this: unit tests prove Foundation (3 plans) — completed 2026-02-03 works
- [x] **S02: Recipe Core (7 plans) — completed 2026 02 04** `risk:medium` `depends:[S01]`
  > After this: unit tests prove Recipe Core (7 plans) — completed 2026-02-04 works
- [x] **S03: Scan to Draft (7 plans) — completed 2026 02 06** `risk:medium` `depends:[S02]`
  > After this: unit tests prove Scan to Draft (7 plans) — completed 2026-02-06 works
- [x] **S04: Trust + Collaboration (6 plans) — completed 2026 02 07** `risk:medium` `depends:[S03]`
  > After this: unit tests prove Trust + Collaboration (6 plans) — completed 2026-02-07 works
- [x] **S05: Fix Scan Integration (7 plans) — completed 2026 03 02** `risk:medium` `depends:[S04]`
  > After this: unit tests prove Fix Scan Integration (7 plans) — completed 2026-03-02 works
- [x] **S06: Native Compatibility (3 plans) — completed 2026 03 04** `risk:medium` `depends:[S05]`
  > After this: unit tests prove Native Compatibility (3 plans) — completed 2026-03-04 works
- [x] **S07: Home Navigation Photo Polish** `risk:medium` `depends:[S06]`
  > After this: Create the design token system and responsive breakpoint hook that every subsequent phase will import.
- [x] **S08: Navigation Restructure** `risk:medium` `depends:[S07]`
  > After this: Install the lucide icon library, fix jest config for .
- [x] **S09: Core Screens** `risk:medium` `depends:[S08]`
  > After this: Create Wave 0 test stubs and their corresponding pure utility modules for RecipeCard and Cooking Mode.
- [x] **S10: Public Browsing** `risk:medium` `depends:[S09]`
  > After this: Create the data layer for public browsing: cursor-based pagination for public recipe search, author attribution via SECURITY DEFINER RPCs, and unit tests for both.
- [x] **S11: Audit Cleanup** `risk:medium` `depends:[S10]`
  > After this: Extract all hardcoded hex colors and raw font family strings into design tokens, then update every consumer file to import from tokens.
- [x] **S12: Remaining Screens** `risk:medium` `depends:[S11]`
  > After this: Rebuild auth screens (Login, Sign Up, Forgot Password) to match cookbook.
- [x] **S13: Advertising — AdMob banner integration on public screens, ATT permission prompt, platform Branched ad components** `risk:medium` `depends:[S12]`
  > After this: unit tests prove Advertising — AdMob banner integration on public screens, ATT permission prompt, platform-branched ad components works
