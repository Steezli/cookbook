# Phase 3: Scan to Draft (Photo → Structured) - Context

**Gathered:** 2026-02-04

**Status:** Ready for planning

---

## Phase Boundary

**Phase 3:** Scan to Draft (Photo → Structured)
**Goal:** Photos become editable recipe drafts that users can finalize

**Requirements:**
- SCAN-01: User can upload a photo to start a scan job and see progress/status
- SCAN-02: Scan job produces structured draft (ingredients/steps/units) + preserves raw extracted text
- SCAN-03: User can review/edit any field before saving as normal recipe
- SCAN-04: User can see scan status and retry failed scans

**Fixed Boundary:** Scope limited to SCAN-01..04 only - no new features outside scan-to-draft domain.

---

## Key Decisions Made

### Implementation Strategy

1. **AI/OCR Service:** Google Cloud Vision API
   - Chosen for highest quality OCR results
   - Accept higher cost for better accuracy with family recipes (handwriting, complex ingredients)
   - Competitive analysis shows OpenAI Vision API produces superior structured extraction

2. **Draft Data Model:** Separate tables for drafts vs published recipes
   - `scan_drafts` table for structured OCR results + raw text
   - Standard `recipes` table for published recipes
   - Migration path: draft → recipe on user approval
   - Preserves raw extracted text for user reference

3. **Job Processing:** Supabase Edge Functions with queue system
   - Reliable processing with automatic retries on failures
   - Progress tracking via database status updates
   - Cost controls through rate limiting per subscription tier

4. **Error Handling:** Multi-tiered confidence handling
   - Low confidence: Auto-enhance OCR with AI assistance
   - Medium confidence: Manual correction required before save
   - High confidence: Direct approval to save as recipe
   - Failed scans: Retry with exponential backoff (max 3 attempts)
   - All failures preserve raw text for manual entry

5. **Performance:** Client-side pre-processing
   - Image compression and resizing before upload
   - Quality estimation to prevent failed scans
   - Lazy loading of scan results to improve perceived performance

---

## Technical Constraints

### Database Schema
- New tables: `scan_jobs`, `scan_drafts`
- New columns: `recipes.status` enum (draft/scan_draft/published)
- Relationships: jobs → drafts (one-to-many), drafts → recipes (one-to-one)
- RLS policies: Users can only access their own drafts and scan jobs

### API Integration
- Google Cloud Vision API for OCR and image analysis
- Supabase client for database operations
- Edge functions for heavy processing (OCR, structured extraction)
- Realtime subscriptions for live job status updates

### Cost Management
- Base scan credit system: 5 scans per month included
- Additional scans: $0.50 each (subject to change)
- Subscription tiers: Basic (5 scans), Premium (20 scans), Unlimited
- Rate limiting: 3 concurrent jobs per user

---

## User Experience Flow

1. **Photo Upload** → Compression check → Job creation → Queue
2. **Scan Progress** → Realtime updates (queuing, processing, completed)
3. **Draft Review** → Structured editor with confidence indicators
4. **Refinement** → AI-assisted editing tools (fix units, combine ingredients)
5. **Save Decision** → Convert draft to recipe or save as draft

---

## Integration Points

- Recipe Core (Phase 2) already has photo infrastructure
- Extend with AI service integration and job queue system
- Reuse existing authentication and family permission systems
- Preserve all current privacy controls (RLS policies)
- Leverage Supabase Edge Functions for cost-effective AI processing

---

## Next Steps

**Immediate:** `/gsd-plan-phase 3`
- Create detailed implementation plans for:
  - SCAN-01: Photo capture & upload with job system
  - SCAN-02: OCR service integration & structured extraction  
  - SCAN-03: Draft editing interface with confidence indicators
  - SCAN-04: Job status tracking & error handling

**After Planning:** `/gsd-execute-phase 3`
- Implement all 4 SCAN requirements
- Test end-to-end scan-to-recipe workflow
- Verify all success criteria met

**Dependencies Identified:**
- Google Cloud Vision API setup required
- Supabase Edge Functions deployment
- Subscription system implementation for cost controls
- Database migrations for new tables and status field

---

**Decision Locked:** These choices will guide Phase 3 implementation. No scope expansion beyond SCAN-01..04.