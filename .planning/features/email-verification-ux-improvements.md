# Feature Request: Email Verification UX Improvements

**Created:** 2026-02-03  
**Status:** Queued  
**Priority:** Medium  
**Phase:** Phase 6 (Polish) or Post-v1  
**Queued:** 2026-02-03  
**Reason:** Focus on core recipe features first (Phase 2+); no active external user testing yet

---

## Incoming Request

**From:** Orchestrator (via user testing session)  
**Date:** 2026-02-03  
**Context:** User encountered login failure after signup because email verification was required but not completed. No indication during signup flow that email verification was necessary.

**Original feedback:**
> "I was sent an email verification to confirm account creation, that email went to my spam folder and there was no indication as a user when I signed up to expect that email at all."

---

## Problem Statement

### Current User Experience

**What happens now:**
1. User completes signup form and clicks "Create account"
2. Supabase sends verification email (silently)
3. App immediately redirects to main app
4. User attempts to log in → fails silently or with generic error
5. User doesn't know why login failed
6. Verification email may be in spam folder with no warning

**Pain points:**
- No confirmation message after signup
- No indication that email verification is required
- No guidance to check spam folder
- Login failures provide no context about verification status
- No way to resend verification email
- User confusion and frustration

### User Impact

- **Severity:** Medium-High
- **Frequency:** 100% of new signups (until they discover verification email)
- **Recovery:** Difficult (requires finding email in spam, clicking link, then trying login again)
- **First impression:** Negative experience for all new users

---

## UI/UX Design

**Timestamp:** 2026-02-03

### Design Principles

1. **Transparent Communication:** Tell users what to expect at each step
2. **Proactive Guidance:** Warn about common issues (spam folder) upfront
3. **Clear Error Messages:** If login fails due to unverified email, say so explicitly
4. **Easy Recovery:** Provide self-service tools (resend email)

### Proposed User Flow

#### Flow 1: Successful Signup
```
User fills signup form
  ↓
Clicks "Create account"
  ↓
[SUCCESS STATE]
Show confirmation message screen:
  ✉️ "Check your email!"
  "We sent a verification link to [email]"
  "Click the link to verify your account"
  
  ⚠️ "Check your spam folder if you don't see it"
  
  [Button: Resend verification email]
  [Link: Back to login]
  
  (Do NOT auto-redirect to main app)
```

#### Flow 2: Login Before Verification
```
User attempts login with unverified email
  ↓
Supabase returns error
  ↓
[ERROR STATE]
Show clear error message:
  "Please verify your email before logging in"
  "We sent a verification link to [email]"
  
  [Button: Resend verification email]
  [Link: Check your spam folder]
```

#### Flow 3: Resend Verification Email
```
User clicks "Resend verification email"
  ↓
Call supabase.auth.resend()
  ↓
[SUCCESS STATE]
Toast/Alert: "Verification email sent! Check your inbox and spam folder."
```

### UI Mockup Descriptions

**Post-Signup Confirmation Screen:**
```
┌─────────────────────────────────────┐
│                                     │
│         📧                          │
│                                     │
│    Check your email!                │
│                                     │
│  We sent a verification link to:    │
│  user@example.com                   │
│                                     │
│  Click the link to verify your      │
│  account before logging in.         │
│                                     │
│  ⚠️ Check your spam folder if you   │
│  don't see the email.               │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Resend verification email    │ │
│  └───────────────────────────────┘ │
│                                     │
│  Back to login                      │
│                                     │
└─────────────────────────────────────┘
```

**Login Error for Unverified Email:**
```
Alert Dialog:
┌─────────────────────────────────────┐
│ Email not verified                  │
├─────────────────────────────────────┤
│                                     │
│ Please verify your email before     │
│ logging in.                         │
│                                     │
│ We sent a verification link to:     │
│ user@example.com                    │
│                                     │
│ Check your spam folder if you       │
│ don't see it.                       │
│                                     │
│  ┌───────────────┐  ┌───────────┐ │
│  │ Resend Email  │  │    OK     │ │
│  └───────────────┘  └───────────┘ │
└─────────────────────────────────────┘
```

### Files to Modify

1. **`app/(auth)/signup.tsx`**
   - Remove immediate redirect after successful signup
   - Instead, navigate to new verification-pending screen
   - Pass email to next screen via route params

2. **`app/(auth)/verification-pending.tsx`** (NEW)
   - Show confirmation message with email
   - Display spam folder warning
   - Provide "Resend verification email" button
   - Link back to login

3. **`app/(auth)/login.tsx`**
   - Enhance error handling for unverified email
   - Detect "email not confirmed" error from Supabase
   - Show user-friendly error with resend option
   - Provide "Resend verification email" action

4. **`src/features/auth/verification.ts`** (NEW, optional)
   - Helper function: `resendVerificationEmail(email: string)`
   - Helper function: `isEmailNotVerifiedError(error: AuthError)`

---

## Backend Implementation

**Timestamp:** (Awaiting routing)

### API/Service Changes

**No backend changes required** - Supabase handles email verification.

**Supabase API calls needed:**
```typescript
// Resend verification email
supabase.auth.resend({
  type: 'signup',
  email: email
})

// Error detection (from login attempt)
// Supabase returns error.message like:
// "Email not confirmed" or "email_not_confirmed"
```

### Error Detection Logic

```typescript
function isEmailNotVerifiedError(error: AuthError): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('email not confirmed') ||
    msg.includes('email_not_confirmed') ||
    msg.includes('not verified')
  );
}
```

---

## Frontend Implementation

**Timestamp:** (Awaiting routing)

### Implementation Tasks

**Task 1: Create verification-pending screen**
- File: `app/(auth)/verification-pending.tsx`
- Display email passed via route params
- Show confirmation message and spam warning
- Implement "Resend verification email" button
- Add loading/success/error states for resend

**Task 2: Update signup flow**
- File: `app/(auth)/signup.tsx`
- After successful signup, navigate to `/verification-pending?email={email}`
- Do NOT redirect to main app immediately

**Task 3: Enhance login error handling**
- File: `app/(auth)/login.tsx`
- Detect email verification errors
- Show user-friendly error dialog with resend option
- Implement resend verification from login screen

**Task 4: Create verification helpers (optional)**
- File: `src/features/auth/verification.ts`
- Extract resend logic into reusable function
- Extract error detection into helper

### Technical Considerations

**Dependencies:**
- No new dependencies needed
- Uses existing Supabase auth methods

**State Management:**
- Local component state for loading/success/error on resend
- Pass email via route params (no global state needed)

**Error Handling:**
- Handle resend failures (rate limiting, network errors)
- Show appropriate error messages to user

**Testing:**
- Test resend functionality (check email received)
- Test error detection on login
- Verify spam folder warning is visible
- Test navigation flow after signup

---

## PM Routing Decision

**Timestamp:** 2026-02-03

### Why This Matters

This addresses a **critical onboarding UX issue** affecting 100% of new users. Poor first impressions can cause user drop-off before they experience the app's value.

**Priority rationale:**
- **Impact:** High (affects all new signups)
- **Effort:** Low-Medium (3 file changes, no backend work)
- **Risk:** Low (additive changes, doesn't break existing functionality)
- **Dependencies:** None (can be implemented anytime post-Phase 1)

### Recommended Workflow

**Standard implementation (not urgent):**
1. UI/UX Designer: Document designs (DONE above)
2. Frontend Developer: Implement 3 file changes
3. Tech Lead: Review and test user flows

**Suggested timing:**
- **Not blocking Phase 2** (Recipe Core is independent)
- Implement as **Phase 1.5 enhancement** or **Phase 6 polish**
- Can be done in parallel with Phase 2 work if desired

### Next Steps for User

**Option A:** Implement now (recommended if users are actively testing)
- Route to Frontend Developer
- Create verification-pending screen
- Update signup and login flows
- Quick win for UX

**Option B:** Queue for later
- Add to backlog/Phase 6 (polish)
- Focus on Phase 2 (Recipe Core) first
- Acceptable if no active external testing yet

**User decision needed:** When should this be implemented?

---

## Success Criteria

**Feature is complete when:**

1. ✅ After signup, user sees confirmation screen with:
   - Message indicating email was sent
   - Warning to check spam folder
   - Working "Resend verification email" button

2. ✅ When unverified user tries to log in:
   - Clear error message explains verification is required
   - Option to resend verification email
   - Guidance to check spam folder

3. ✅ "Resend verification email" functionality:
   - Actually sends email via Supabase
   - Shows success confirmation
   - Handles errors gracefully (rate limits, network issues)

4. ✅ User can complete full flow:
   - Sign up → See confirmation → Check email → Verify → Log in successfully

5. ✅ No regression:
   - Users who already verified can still log in normally
   - Email verification still enforced server-side
   - Signup flow still validates password requirements

---

## Technical Notes

### Supabase Configuration

**Email settings to verify in Supabase dashboard:**
- Auth → Email Templates → Confirm signup
- Check email template is enabled
- Consider customizing template to mention spam folder
- Verify sender domain/email is configured correctly

### Future Enhancements

**Not in scope for v1, but consider later:**
- Magic link login (skip password verification)
- Show verification status in user profile
- Admin panel to manually verify users
- Tracking/analytics on verification completion rate
- A/B test different messaging for spam folder warning

---

## Related Requirements

**Maps to existing requirement:**
- **AUTH-01**: User can create an account with email/password
  - Enhancement: Add clear feedback about email verification

**Does not require new requirement** - this is a UX improvement on existing auth functionality.

---

## Awaiting

**Status:** Proposed  
**Awaiting:** User decision on timing (implement now vs. queue for later)  
**Next action:** If approved, route to Frontend Developer for implementation
