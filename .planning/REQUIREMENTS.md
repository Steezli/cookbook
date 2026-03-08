# Requirements: Cookbook (Family Recipe Vault)

**Defined:** 2026-03-03
**Core Value:** Families can save and share treasured recipes (like Grandma's) without losing control over who gets to see them.

## v1.1 Requirements

Requirements for v1.1 Design & Responsive milestone. Each maps to roadmap phases.

### Design Foundation

- [x] **DESIGN-01**: Design token system (tokens.ts) extracting all cookbook.pen $ variables as TypeScript constants
- [x] **DESIGN-02**: Breakpoint detection hook (useBreakpoint) returning mobile/tablet/web at 390/768/1440px thresholds
- [x] **DESIGN-03**: Font loading for Bricolage Grotesque (display) and DM Sans (body) via @expo-google-fonts
- [x] **DESIGN-04**: Missing screen designs created in cookbook.pen: Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review (all 3 breakpoints each)

### Navigation

- [x] **NAV-01**: Root navigation converted from flat Stack to Tabs route group with (tabs)/, (public)/, (auth)/ separation
- [x] **NAV-02**: Mobile bottom tab bar matching cookbook.pen spec (5 tabs: Home, Search, Scan, Favorites, Profile)
- [x] **NAV-03**: Web left sidebar (260px) matching cookbook.pen spec (Home, My Recipes, Collections, Scan Recipe, Family, Settings)
- [x] **NAV-04**: Tablet header navigation matching cookbook.pen spec
- [x] **NAV-05**: Page container component providing consistent padding/max-width per breakpoint

### Screen Rebuilds

- [x] **SCREEN-01**: Home screen rebuilt to cookbook.pen spec at all 3 breakpoints with feature navigation (greeting, search, featured recipes, quick actions)
- [x] **SCREEN-02**: Recipe list screen rebuilt with responsive grid (1-col mobile, 2-col tablet, 3-col web) and photo thumbnails
- [x] **SCREEN-03**: Recipe detail screen rebuilt to cookbook.pen spec at all 3 breakpoints
- [x] **SCREEN-04**: Create/Edit recipe screens rebuilt to cookbook.pen spec at all 3 breakpoints
- [x] **SCREEN-04a**: Cooking Mode walkthrough screen at all 3 breakpoints — step-by-step guided cooking with per-step ingredients
- [x] **SCREEN-05**: Collections screens rebuilt to cookbook.pen spec at all 3 breakpoints
- [ ] **SCREEN-06**: Family management screens rebuilt to cookbook.pen spec at all 3 breakpoints
- [ ] **SCREEN-07**: Scan/Draft screens rebuilt to cookbook.pen spec at all 3 breakpoints with scan photo display in draft review
- [ ] **SCREEN-08**: Auth screens (Login, Sign Up, Forgot Password) rebuilt to cookbook.pen spec at all 3 breakpoints
- [x] **SCREEN-09**: Profile/Settings screen implemented to cookbook.pen spec at all 3 breakpoints
- [ ] **SCREEN-10**: Invite screen implemented to cookbook.pen spec at all 3 breakpoints

### Public Browsing

- [x] **PUB-01**: Public recipe browse screen with search bar and filter chips (unauthenticated)
- [x] **PUB-02**: Public recipe detail screen with read-only view and author attribution
- [x] **PUB-03**: Public navigation header with logo, Sign In, and Get Started CTA
- [x] **PUB-04**: Cursor-based pagination for public recipe listing

### Advertising

- [ ] **ADS-01**: Ad banner component (320x50 mobile, 728x90 web) with platform branching (AdMob native, placeholder web)
- [ ] **ADS-02**: Ad placement on public browsing screens only (never authenticated screens)
- [ ] **ADS-03**: ATT permission prompt on iOS for ad tracking

## v1.2 Requirements

Deferred to next milestone. Tracked but not in current roadmap.

### Monetization

- **SUB-01**: Subscription gating on scan feature via RevenueCat entitlement
- **SUB-02**: Paywall UI displayed when non-subscriber accesses scan
- **SUB-03**: Web subscription checkout via RevenueCat Web Billing / Stripe

### SEO

- **SEO-01**: Recipe structured data markup (schema.org/Recipe) for search engine indexing
- **SEO-02**: Server-rendered public recipe pages for SEO crawlers

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Ads on authenticated/family screens | Destroys family vault trust proposition — conflicts with core value |
| Interstitial/full-screen ads | Breaks cooking flow, violates AdMob best practices for recipe apps |
| Auto-redirect unauthenticated users to login | Blocks organic discovery funnel and SEO crawlers |
| Paywall at cold start | Users must experience scan value before being asked to pay |
| Bottom tab bar on web | Web users find it jarring and keyboard-inaccessible |
| Offline mode | Conflicts with real-time RLS model; Supabase offline story immature |
| Grocery list integration | Expands scope significantly, needs product validation first |
| Affiliate ingredient links | Meaningful revenue only at significant traffic volume |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DESIGN-01 | Phase 8 | Complete |
| DESIGN-02 | Phase 8 | Complete |
| DESIGN-03 | Phase 8 | Complete |
| DESIGN-04 | Phase 8 | Complete |
| NAV-01 | Phase 9 | Complete |
| NAV-02 | Phase 9 | Complete |
| NAV-03 | Phase 9 | Complete |
| NAV-04 | Phase 9 | Complete |
| NAV-05 | Phase 9 | Complete |
| SCREEN-01 | Phase 10 | Complete |
| SCREEN-02 | Phase 10 | Complete |
| SCREEN-03 | Phase 10 | Complete |
| SCREEN-04 | Phase 10 | Complete |
| SCREEN-04a | Phase 10 | Complete |
| PUB-01 | Phase 11 | Complete |
| PUB-02 | Phase 11 | Complete |
| PUB-03 | Phase 11 | Complete |
| PUB-04 | Phase 11 | Complete |
| SCREEN-05 | Phase 12 | Complete |
| SCREEN-06 | Phase 12 | Pending |
| SCREEN-07 | Phase 12 | Pending |
| SCREEN-08 | Phase 12 | Pending |
| SCREEN-09 | Phase 12 | Complete |
| SCREEN-10 | Phase 12 | Pending |
| ADS-01 | Phase 13 | Pending |
| ADS-02 | Phase 13 | Pending |
| ADS-03 | Phase 13 | Pending |

**Coverage:**
- v1.1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-08 after v1.1 milestone audit*
