# S02: Form UX & OAuth Branding — Research

**Date:** 2026-03-12

## Summary

This slice covers two independent requirements: **QA-04** (form Enter-key submission / focus chaining) and **QA-05** (OAuth consent branding documentation). Both are low-to-medium complexity with no dependencies on other slices.

**QA-04** requires adding `useRef`-based focus chaining and `onSubmitEditing` handlers to auth forms (login, signup, reset-password) and verifying the RecipeForm's existing patterns are complete. The codebase has zero existing `.focus()` calls — this is greenfield. The auth forms are inline JSX (not abstracted components), so changes are direct per-file edits. The RecipeForm and collection create form also need attention, but their structure is different (add-to-list inputs vs sequential forms).

**QA-05** is a documentation task. The Google OAuth consent screen shows `ugixgcbysrwabwzbsjxr.supabase.co` instead of "Berven Book" because the Google Cloud Console OAuth consent screen hasn't been branded. Apple Sign In also needs its display name verified. No code changes required — this is entirely console/dashboard configuration documentation.

## Recommendation

### QA-04: Form Enter-Key Submission
Add `useRef` + `onSubmitEditing` + `returnKeyType` to all sequential auth forms. The pattern is straightforward React Native:

1. Create a ref for each TextInput after the first
2. Set `returnKeyType="next"` on all fields except the last
3. Set `returnKeyType="go"` (or `"done"`) on the last field
4. Wire `onSubmitEditing` on each field to `.focus()` the next ref, or call the submit function on the last field

**In-scope forms (sequential input → submit):**
- `app/(auth)/login.tsx` — 2 fields (email → password → submit). Currently: password has `onSubmitEditing={onLogin}`, email has nothing.
- `app/(auth)/signup.tsx` — 4 fields (name → email → password → confirm → submit). Currently: only confirmPassword has `onSubmitEditing={onSignup}`.
- `app/(auth)/reset-password.tsx` — 1 field (password → submit). Currently: no `onSubmitEditing` at all.
- `app/(tabs)/collections/create.tsx` — 2 fields (name → description → submit). Currently: no `onSubmitEditing`. Description is multiline, so Enter inserts newline — name should submit or focus description.

**Already correct:**
- `app/(auth)/forgot-password.tsx` — single email field already has `returnKeyType="go"` + `onSubmitEditing={onSubmit}`. ✅

**Out of scope (add-to-list pattern, not sequential form):**
- `src/components/recipes/RecipeForm.tsx` — ingredients, steps, and tags inputs use `onSubmitEditing` to add items to a list (already wired). The metadata fields (prep/cook/servings) don't chain because they're independent numeric inputs in a row layout. Title and description don't chain to ingredients because the form sections are separated by photos and bulk-add toggles. RecipeForm's pattern is correct for its use case.
- `src/features/scan/DraftEditor.tsx` / `DraftManager.tsx` — inline editing fields, not sequential forms.
- `src/features/comments/CommentInput.tsx` — multiline comment box, Enter inserts newline.
- `src/components/public/PublicSearchBar.tsx` — search input, no form submission.
- `app/(tabs)/recipes/index.tsx` — search input.
- `app/(tabs)/collections/[id].tsx` — search input for adding recipes.
- `app/(tabs)/family/index.tsx` — single family name field in a create modal (could benefit from `onSubmitEditing` but low priority).
- `app/(tabs)/family/[id].tsx` — email input in invite modal (single field, could benefit from `onSubmitEditing`).
- `app/(tabs)/profile.tsx` — display name inline edit (single field with Save/Cancel buttons).

### QA-05: OAuth Branding Documentation
Write a step-by-step guide covering:
1. **Google Cloud Console** — OAuth consent screen app name, logo, support email, authorized domains
2. **Apple Developer** — Service ID display name for Sign in with Apple
3. **Supabase Dashboard** — verify provider configuration points to correctly branded Google/Apple apps

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Focus chaining | React Native `TextInput.focus()` via `useRef` | Standard RN pattern, no library needed |
| OAuth branding | Google Cloud Console + Apple Developer Console | Dashboard configuration, not code |

## Existing Code and Patterns

- `app/(auth)/forgot-password.tsx` — **reference pattern**: single field with `returnKeyType="go"` + `onSubmitEditing={onSubmit}`. Follow this for the last field in every form.
- `app/(auth)/login.tsx` — password field already has `returnKeyType="go"` + `onSubmitEditing={onLogin}`. Only missing: email field needs `returnKeyType="next"` + ref-based focus to password.
- `app/(auth)/signup.tsx` — confirmPassword has `returnKeyType="go"` + `onSubmitEditing={onSignup}`. Missing: name → email → password focus chain.
- `src/components/recipes/RecipeForm.tsx` — add-to-list inputs already use `onSubmitEditing` + `returnKeyType="done"` correctly. No changes needed.
- `src/features/auth/social-auth.ts` — OAuth flow implementation (Google via `signInWithOAuth`, Apple via native `signInAsync` on iOS, OAuth on other platforms). No code changes needed for branding.
- `app.config.ts` — app name is "Berven", bundle ID is `com.steezli.berven`, `usesAppleSignIn: true` is set.

## Constraints

- **React 19 + RN 0.81.5**: `useRef<TextInput>(null)` is the standard pattern. No breaking changes in ref handling.
- **formContent is JSX variable, not a component**: In login.tsx and signup.tsx, the form fields are in a `formContent` JSX variable used across mobile/tablet/web layouts. Refs created in the parent function will work fine since `formContent` is rendered in the same component scope.
- **Multiline TextInputs**: Description fields (collection create, RecipeForm) are `multiline` — Enter inserts newlines, not submits. These should NOT get `onSubmitEditing` for form submission. The preceding single-line field should either skip the multiline field or stop chaining there.
- **No existing tests for auth screens**: Zero test files for login/signup/forgot-password/reset-password. Writing tests for focus chaining would require React Native Testing Library rendering, which is out of scope for this slice (QA-04 is about UX behavior, not test coverage).
- **OAuth branding is console-only**: The Supabase project URL is `ugixgcbysrwabwzbsjxr.supabase.co`. The Google OAuth consent screen needs to show "Berven Book" instead. This is configured in Google Cloud Console, not in code.
- **Apple Sign In display name**: Controlled by the Service ID configuration in Apple Developer portal. The app's bundle ID (`com.steezli.berven`) is already set.

## Common Pitfalls

- **Ref type mismatch** — `useRef<TextInput>(null)` must use the `TextInput` type from react-native, not a generic `HTMLInputElement`. On web, RN maps this to the correct DOM element.
- **Focus on unmounted field** — Not a risk here since all fields are always rendered (no conditional rendering in auth forms).
- **onSubmitEditing on multiline** — Setting `onSubmitEditing` on a `multiline` TextInput changes behavior: Enter submits instead of inserting a newline. Never add `onSubmitEditing` to multiline fields unless also setting `blurOnSubmit={true}`.
- **returnKeyType on web** — `returnKeyType` maps to the `enterkeyhint` HTML attribute on web. `"next"` shows a "Next" button on mobile keyboards and is harmless on web. `"go"` shows "Go" on mobile. Both work correctly.
- **Form already uses formContent JSX pattern** — login.tsx and signup.tsx define `formContent` as a JSX block reused across breakpoint layouts. Refs must be created with `useRef` in the component body (not inside the JSX block), which is already the correct place since `formContent` is a variable, not a component.

## Open Risks

- **OAuth consent screen verification status** — Google may require domain verification and/or OAuth app verification review before the branding changes are fully visible to users. The documentation should note this requirement.
- **Apple display name** — Apple's Sign in with Apple shows the app name from the App Store listing or the Service ID description. If the app hasn't been submitted to the App Store yet, the display name may be the raw Service ID. The documentation should note this.
- **Supabase OAuth redirect** — The Supabase project URL will still appear in the redirect URI (`ugixgcbysrwabwzbsjxr.supabase.co`), even after branding the consent screen. This is normal — the consent screen app name is separate from the redirect URI domain. A custom domain on Supabase would change the redirect URI but is out of scope.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| React Native | `vercel-labs/agent-skills@vercel-react-native-skills` | available (57K installs) |
| React Native | `callstackincubator/agent-skills@react-native-best-practices` | available (7.2K installs) |
| Expo | `expo/skills@building-native-ui` | available (17.1K installs) |

These skills are tangentially relevant (general RN/Expo patterns) but unlikely to provide specific value for the focus-chaining and OAuth documentation work in this slice. Not recommended for installation.

## Sources

- Codebase exploration: auth form files, RecipeForm, DraftEditor, DraftManager, social-auth.ts, app.config.ts
- Domain knowledge: Google Cloud Console OAuth consent screen configuration, Apple Developer Sign in with Apple configuration
- React Native TextInput documentation: `onSubmitEditing`, `returnKeyType`, `ref.focus()` are stable, well-documented APIs
