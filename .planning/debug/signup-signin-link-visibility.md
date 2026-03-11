---
status: diagnosed
trigger: "signup screen sign-in-instead link not visible/clear enough — needs same text-link treatment as login screen"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: Signup screen uses a bordered secondary button for "Sign In Instead" placed after social buttons, while login screen uses an inline text link with accentWarm highlight placed directly below the primary button
test: Compare signup.tsx lines 359-377 with login.tsx lines 237-246
expecting: Inconsistent patterns confirmed
next_action: Apply fix matching login screen pattern

## Symptoms

expected: Signup screen should have a clearly visible "Already have an account? Sign In" text link, matching the login screen's "Don't have an account? Sign Up" pattern
actual: Signup screen has a full-width bordered secondary button labeled "Sign In Instead" pushed below social login buttons — low visibility, inconsistent with login screen
errors: none (visual/UX issue)
reproduction: Navigate to signup screen, observe bottom of form
started: Since initial auth screen implementation

## Eliminated

(none needed — root cause is clear from code comparison)

## Evidence

- timestamp: 2026-03-10
  checked: app/(auth)/login.tsx lines 236-246
  found: Login screen uses inline text-link pattern — "Don't have an account? [Sign Up]" with accentWarm color on "Sign Up", fontFamilyBodyBold, placed in a centered View with marginTop 12, directly below the Sign In button and ABOVE the divider/social buttons
  implication: This is the correct pattern that was already fixed for login

- timestamp: 2026-03-10
  checked: app/(auth)/signup.tsx lines 359-377
  found: Signup screen uses a full-width Pressable button with bgCard background, borderDefault border, radiusPill, height 48, textPrimary color text "Sign In Instead" — placed AFTER all social login buttons at the very bottom of the form
  implication: Two problems — (1) styled as a bulky secondary button instead of a lightweight text link, (2) positioned after social buttons where it gets lost

## Resolution

root_cause: The signup screen's "Sign In Instead" navigation uses a bordered secondary button (lines 359-377) placed after all social login buttons, instead of the lightweight text-link pattern used on the login screen. The login screen was fixed to use an inline "Don't have an account? Sign Up" text with accentWarm-colored bold text, centered directly below the primary action button and above the social login divider.
fix: Replace the bordered button block (lines 359-377) with the same text-link pattern from login.tsx — a centered View with marginTop 12 containing "Already have an account? [Sign In]" where "Sign In" uses fontFamilyBodyBold + accentWarm color. Move it to directly below the "Create Account" button (after line 261) and above the "or" divider.
verification:
files_changed: []

### Specific Code Change Needed

**Remove** (signup.tsx lines 359-377):
```jsx
{/* Sign In Instead (Secondary) button */}
<Link href={{ pathname: '/(auth)/login', params: { next } }} asChild>
  <Pressable
    style={({ pressed }) => ({
      height: 48,
      backgroundColor: bgCard,
      borderRadius: radiusPill,
      borderWidth: 1,
      borderColor: borderDefault,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: pressed ? 0.8 : 1,
    })}
  >
    <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: 15, color: textPrimary }}>
      Sign In Instead
    </Text>
  </Pressable>
</Link>
```

**Add** (after Create Account button, before the "or" divider — after line 261):
```jsx
{/* Sign in prompt — matches login screen pattern */}
<View style={{ alignItems: 'center', marginTop: 12 }}>
  <Link href={{ pathname: '/(auth)/login', params: { next } }} asChild>
    <Pressable>
      <Text style={{ fontFamily: fontFamilyBody, fontSize: 14, color: textSecondary }}>
        Already have an account?{' '}
        <Text style={{ fontFamily: fontFamilyBodyBold, color: accentWarm }}>Sign In</Text>
      </Text>
    </Pressable>
  </Link>
</View>
```
