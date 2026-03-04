-- Allow users to insert their own profile
-- Needed for ensureProfile() when trigger didn't fire (pre-existing users)

create policy profiles_insert_own
on public.profiles
for insert
with check (user_id = auth.uid());
