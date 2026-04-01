# Deploy to TestFlight

## Local Build (skip EAS queue)

```bash
# Build locally — outputs IPA to project root
eas build --platform ios --profile preview --local --output ./build.ipa

# Submit to App Store Connect / TestFlight
eas submit --platform ios --profile preview --path ./build.ipa
```

Build appears in TestFlight after Apple processes it (10-30 min). No review required.

## Version Bump

Before building, bump the version in `app.config.ts`:

```ts
version: '0.1.2', // increment this
```

Build number auto-increments via `appVersionSource: "remote"` in `eas.json`.

## EAS Cloud Build (if you don't mind the queue)

```bash
eas build --platform ios --profile preview --auto-submit
```

Free tier has long queue times. Local build is faster.

## Supabase Migrations

After merging DB changes, push migrations to remote:

```bash
npx supabase db push
```
