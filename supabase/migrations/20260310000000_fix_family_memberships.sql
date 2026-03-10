-- Migration: fix_family_memberships
--
-- Fixes three issues diagnosed in .planning/debug/family-detail-failures.md:
--
-- 1. PostgREST cannot resolve profiles() embedded join because family_memberships.user_id
--    only has a FK to auth.users(id) (which PostgREST cannot see). Adding a second FK
--    to public.profiles(user_id) enables PostgREST embedding. The FK to auth.users
--    remains for referential integrity.
--
-- 2. families table has no DELETE RLS policy, so admin delete silently fails.
--
-- 3. PostgREST schema cache may be stale (does not know about create_family_invite RPC
--    or the new FK). NOTIFY triggers a reload.

-- 1. Add FK from family_memberships.user_id to public.profiles(user_id)
--    so PostgREST can resolve profiles(email, display_name) embedded joins.
ALTER TABLE family_memberships
  ADD CONSTRAINT family_memberships_profile_fk
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- 2. Allow family admins to delete their families.
CREATE POLICY "Admins can delete families" ON families
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM family_memberships
      WHERE family_memberships.family_id = families.id
        AND family_memberships.user_id = auth.uid()
        AND family_memberships.role = 'admin'
    )
  );

-- 3. Reload PostgREST schema cache so the new FK and RPC are visible immediately.
--    create_family_invite is defined in phase1_foundation.sql — after this NOTIFY
--    PostgREST will discover it without a server restart.
NOTIFY pgrst, 'reload schema';
