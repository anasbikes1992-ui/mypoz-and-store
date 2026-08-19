<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Product Authentication Invariants
- **Grabber POS (grabber-pos)**: Uses Supabase project `vtawrxmkahpgwgydibox` (mypoz-and-store, ap-southeast-1). Admin access requires `profiles.role = 'owner'`.
- **Jarvis Consultant (jarvis-consultant)**: Customer auth uses Supabase project ehboyqzljulgphxjcqjz. Admin auth uses /admin/login backed by ADMIN_EMAIL and scrypt ADMIN_PASSWORD_HASH.
- **PearlHub Pro (pearl-hub-pro)**: Customer and provider auth use Supabase project jfabjzamplmmusryxfvp.
- **Admin Provisioning**: Always use non-destructive scripts (e.g., 
ode --env-file=.env.local scripts/upsert-admin.mjs) to verify or provision test admin credentials in development/staging.
