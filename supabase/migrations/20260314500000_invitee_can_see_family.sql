-- Allow users to see family name when they have a pending invite to it

CREATE POLICY "Invitees can see family name"
  ON public.families
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_invites fi
       WHERE fi.family_id = families.id
         AND lower(fi.email) = lower(
           (SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid())
         )
         AND fi.accepted_at IS NULL
         AND fi.revoked_at IS NULL
         AND fi.expires_at > now()
    )
  );
