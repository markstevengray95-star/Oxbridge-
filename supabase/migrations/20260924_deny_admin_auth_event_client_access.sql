create policy "deny direct authenticated access to admin auth events"
on public.admin_auth_events
for all
to authenticated
using (false)
with check (false);

create policy "deny direct anonymous access to admin auth events"
on public.admin_auth_events
for all
to anon
using (false)
with check (false);
