# ScholarBridge cloud persistence

ScholarBridge uses `public.user_state` as the canonical per-user cloud backup for browser state whose key begins with `oxbridge-`. The root `CloudProgressSync` component restores and continuously reconciles those values for the authenticated Supabase user.

Structured mirrors are also maintained for account/profile and interview data:

- `profiles`
- `student_intelligence`
- `interview_sessions`
- `interview_turns`
- `memory_items`

All user-owned tables use Row Level Security and restrict reads/writes to `auth.uid()` ownership. Browser code uses only the Supabase publishable key; the service-role key must never be exposed to clients.

The sync baseline stored under `__oxbridge_cloud_sync_baseline_v1` is local metadata only. It stores fingerprints, not user content, and prevents newer offline edits or deletions from being overwritten by an older cloud copy after a reload.
