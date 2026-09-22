-- Allow authenticated users to create only their own user_plans row.
-- This mirrors the RLS policy applied to the live database.
create policy "user_plans_insert_own"
on public.user_plans
for insert
to authenticated
with check ((select auth.uid()) = user_id);
