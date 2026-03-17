-- Fix: send_family_invite needs extensions in search_path for digest()

CREATE OR REPLACE FUNCTION public.send_family_invite(
  p_family_id uuid,
  p_email text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  IF NOT is_family_admin(p_family_id, v_caller_id) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  v_normalized_email := lower(trim(p_email));

  SELECT user_id INTO v_target_user_id
    FROM profiles
   WHERE lower(email) = v_normalized_email
   LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RETURN 'no_account';
  END IF;

  IF v_target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'cannot invite yourself' USING errcode = 'P0001';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM family_memberships
     WHERE family_id = p_family_id AND user_id = v_target_user_id
  ) INTO v_existing_member;

  IF v_existing_member THEN
    RETURN 'already_member';
  END IF;

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
