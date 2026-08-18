# Admin Account Provisioning Guide

This guide documents how to create or update an admin user (`role = 'owner'`) for Grabber POS Studio.

## Execution

Run the non-destructive admin upsert script with desired credentials:

```bash
npx cross-env UPSERT_ADMIN_EMAIL="anasazeez1992@gmail.com" UPSERT_ADMIN_PASSWORD="YourPasswordHere" node --env-file=.env.local scripts/upsert-admin.mjs
```

## What This Script Does

1. **Supabase Auth**: Upserts the user record in Supabase Auth (`email_confirm: true`).
2. **Profile Authorization**: Sets `profiles.role = 'owner'` and attaches the user to the default organization branch.
3. **Verification**: Attempts a `signInWithPassword` using the Supabase client anon key before returning.
