create policy "deny_client_school_organizations" on public.school_organizations
for all to authenticated using (false) with check (false);

create policy "deny_client_school_organization_members" on public.school_organization_members
for all to authenticated using (false) with check (false);
