# Deferred Items - Phase 06

## Pre-existing TypeScript Errors (Out of Scope)

These errors exist in files not modified by Phase 06 plans. Discovered during TypeScript verification.

### src/features/scan/scan-photos.ts
- TS2339: Property 'index' does not exist on type (line 129)
- TS7006: Parameter 'photoUrl' implicitly has 'any' type (line 298)

### src/lib/scan/error-reporting-service.ts
- TS2349: Expression is not callable (line 575)
- TS2740: Type '{}' missing required properties (line 585)
- TS2339: Property 'length' does not exist on PostgrestSingleResponse (lines 607, 612)
- TS2339: Property 'map' does not exist on PostgrestSingleResponse (line 614)
- TS7006: Parameter 'e' implicitly has 'any' type (line 614)
- TS7034/TS7005: Variable 'suggestions' implicitly has 'any[]' (lines 662, 703)
- TS2551: Property 'occurrence_count' does not exist (should be 'occurrenceCount') (line 667)
