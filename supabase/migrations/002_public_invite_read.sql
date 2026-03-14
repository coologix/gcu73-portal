-- Allow anyone to read pending invitations by token (for invite page validation)
create policy "Anyone can read invitations by token"
  on public.invitations for select
  using (status = 'pending');
