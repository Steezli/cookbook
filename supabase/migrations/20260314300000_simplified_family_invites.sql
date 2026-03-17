-- Migration: simplified family invites
--
-- Replaces token-based share-link invite flow with direct invite-by-email.
-- Inviter checks if user exists; recipient sees pending invites in-app.

-- 1. Allow users to see invites addressed to their email
--    (they're not family members yet, so the existing member-based policy won't work)
CREATE POLICY "Users can see invites to their email"
  ON public.family_invites
  FOR SELECT
  USING (
    lower(email) = lower(
      (SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid())
    )
  );

-- 2. New RPC: send_family_invite — checks if email exists, creates invite without token
--    Returns: 'sent' if user exists and invite created
--             'no_account' if email not found in profiles
--             'already_member' if user is already in the family
--             'already_invited' if a pending invite already exists
CREATE OR REPLACE FUNCTION public.send_family_invite(
  p_family_id uuid,
  p_email text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_target_user_id uuid;
  v_normalized_email text;
  v_existing_member boolean;
  v_existing_invite boolean;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '28000';
  END IF;

  -- Must be admin of the family
  IF NOT is_family_admin(p_family_id, v_caller_id) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  v_normalized_email := lower(trim(p_email));

  -- Check if user exists
  SELECT user_id INTO v_target_user_id
    FROM profiles
   WHERE lower(email) = v_normalized_email
   LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RETURN 'no_account';
  END IF;

  -- Can't invite yourself
  IF v_target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'cannot invite yourself' USING errcode = 'P0001';
  END IF;

  -- Check if already a member
  SELECT EXISTS(
    SELECT 1 FROM family_memberships
     WHERE family_id = p_family_id AND user_id = v_target_user_id
  ) INTO v_existing_member;

  IF v_existing_member THEN
    RETURN 'already_member';
  END IF;

  -- Check for existing pending invite
  SELECT EXISTS(
    SELECT 1 FROM family_invites
     WHERE family_id = p_family_id
       AND lower(email) = v_normalized_email
       AND accepted_at IS NULL
       AND revoked_at IS NULL
       AND expires_at > now()
  ) INTO v_existing_invite;

  IF v_existing_invite THEN
    RETURN 'already_invited';
  END IF;

  -- Create invite (token_hash is a dummy since we don't use tokens anymore,
  -- but column is NOT NULL so we fill it with a random value)
  INSERT INTO family_invites (family_id, email, token_hash, created_by_user_id, expires_at)
  VALUES (
    p_family_id,
    v_normalized_email,
    digest(gen_random_uuid()::text, 'sha256'),
    v_caller_id,
    now() + interval '30 days'
  );

  RETURN 'sent';
END;
$$;

-- 3. New RPC: accept_invite_by_id — accept a pending invite by its ID
CREATE OR REPLACE FUNCTION public.accept_invite_by_id(p_invite_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invite family_invites%rowtype;
  v_user_email text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '28000';
  END IF;

  -- Get user's email
  SELECT lower(email) INTO v_user_email FROM profiles WHERE user_id = v_user_id;

  -- Find the invite — must be addressed to this user's email
  SELECT * INTO v_invite
    FROM family_invites
   WHERE id = p_invite_id
     AND lower(email) = v_user_email
     AND accepted_at IS NULL
     AND revoked_at IS NULL
     AND expires_at > now();

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'invite not found or expired' USING errcode = 'P0002';
  END IF;

  -- Add as member
  INSERT INTO family_memberships (family_id, user_id, role)
  VALUES (v_invite.family_id, v_user_id, 'member')
  ON CONFLICT (family_id, user_id) DO NOTHING;

  -- Mark accepted
  UPDATE family_invites
     SET accepted_at = now(),
         accepted_by_user_id = v_user_id
   WHERE id = v_invite.id
     AND accepted_at IS NULL;

  RETURN v_invite.family_id;
END;
$$;

-- 4. New RPC: decline_invite — decline/dismiss a pending invite
CREATE OR REPLACE FUNCTION public.decline_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '28000';
  END IF;

  SELECT lower(email) INTO v_user_email FROM profiles WHERE user_id = v_user_id;

  UPDATE family_invites
     SET revoked_at = now()
   WHERE id = p_invite_id
     AND lower(email) = v_user_email
     AND accepted_at IS NULL
     AND revoked_at IS NULL;
END;
$$;
