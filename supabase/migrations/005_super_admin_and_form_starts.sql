-- ============================================================================
-- Add super admin visibility rules and form start tracking
-- ============================================================================

-- 1. Expand profile role constraint -----------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'admin', 'super_admin'));

-- 2. Helper functions -------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
  );
$$;

create or replace function public.is_super_admin_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_profile_id
      and role = 'super_admin'
  );
$$;

create or replace function public.is_super_admin_email(target_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where lower(trim(email)) = lower(trim(coalesce(target_email, '')))
      and role = 'super_admin'
  );
$$;

create or replace function public.can_access_staff_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or (
      public.is_admin()
      and not public.is_super_admin_profile(target_profile_id)
    );
$$;

create or replace function public.can_access_staff_submission_owner(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or (
      public.is_admin()
      and not public.is_super_admin_profile(target_user_id)
    );
$$;

create or replace function public.can_access_staff_submission_value(target_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.submissions
    where id = target_submission_id
      and public.can_access_staff_submission_owner(user_id)
  );
$$;

create or replace function public.can_access_staff_notification(
  target_sender_id uuid,
  target_recipient_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or (
      public.is_admin()
      and not public.is_super_admin_profile(target_sender_id)
      and not public.is_super_admin_profile(target_recipient_id)
    );
$$;

create or replace function public.can_access_staff_invitation(target_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or (
      public.is_admin()
      and not public.is_super_admin_email(target_email)
    );
$$;

create or replace function public.get_pending_invitation_by_token(target_token text)
returns setof public.invitations
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.invitations
  where token = target_token
    and status = 'pending'
  limit 1;
$$;

-- 3. Add form start tracking ------------------------------------------------
create table if not exists public.form_starts (
  id         uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.forms(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  started_at  timestamptz not null default now(),
  unique (form_id, user_id)
);

comment on table public.form_starts is 'Tracks the first time a user opens a form.';

create index if not exists idx_form_starts_form on public.form_starts (form_id);
create index if not exists idx_form_starts_user on public.form_starts (user_id);

alter table public.form_starts enable row level security;

-- 4. Replace blanket admin policies ----------------------------------------
drop policy if exists "Admins have full access to profiles" on public.profiles;
drop policy if exists "Admins have full access to submissions" on public.submissions;
drop policy if exists "Admins have full access to submission values" on public.submission_values;
drop policy if exists "Admins have full access to invitations" on public.invitations;
drop policy if exists "Admins have full access to notifications" on public.notifications;
drop policy if exists "Anyone can read invitations by token" on public.invitations;

create policy "Super admins have full access to profiles"
  on public.profiles for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Admins can read visible profiles"
  on public.profiles for select
  using (public.can_access_staff_profile(id));

create policy "Admins can update visible profiles"
  on public.profiles for update
  using (public.can_access_staff_profile(id))
  with check (public.can_access_staff_profile(id));

create policy "Admins can delete visible profiles"
  on public.profiles for delete
  using (public.can_access_staff_profile(id));

create policy "Super admins have full access to submissions"
  on public.submissions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Admins can read visible submissions"
  on public.submissions for select
  using (public.can_access_staff_submission_owner(user_id));

create policy "Admins can update visible submissions"
  on public.submissions for update
  using (public.can_access_staff_submission_owner(user_id))
  with check (public.can_access_staff_submission_owner(user_id));

create policy "Admins can delete visible submissions"
  on public.submissions for delete
  using (public.can_access_staff_submission_owner(user_id));

create policy "Super admins have full access to submission values"
  on public.submission_values for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Admins can read visible submission values"
  on public.submission_values for select
  using (public.can_access_staff_submission_value(submission_id));

create policy "Admins can update visible submission values"
  on public.submission_values for update
  using (public.can_access_staff_submission_value(submission_id))
  with check (public.can_access_staff_submission_value(submission_id));

create policy "Admins can delete visible submission values"
  on public.submission_values for delete
  using (public.can_access_staff_submission_value(submission_id));

create policy "Super admins have full access to invitations"
  on public.invitations for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Admins can access visible invitations"
  on public.invitations for select
  using (public.can_access_staff_invitation(email));

create policy "Admins can insert visible invitations"
  on public.invitations for insert
  with check (
    invited_by = auth.uid()
    and public.can_access_staff_invitation(email)
  );

create policy "Admins can update visible invitations"
  on public.invitations for update
  using (public.can_access_staff_invitation(email))
  with check (public.can_access_staff_invitation(email));

create policy "Admins can delete visible invitations"
  on public.invitations for delete
  using (public.can_access_staff_invitation(email));

create policy "Super admins have full access to notifications"
  on public.notifications for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Admins can read visible notifications"
  on public.notifications for select
  using (public.can_access_staff_notification(sender_id, recipient_id));

create policy "Admins can insert visible notifications"
  on public.notifications for insert
  with check (
    sender_id = auth.uid()
    and public.can_access_staff_notification(sender_id, recipient_id)
  );

create policy "Admins can update visible notifications"
  on public.notifications for update
  using (public.can_access_staff_notification(sender_id, recipient_id))
  with check (public.can_access_staff_notification(sender_id, recipient_id));

create policy "Admins can delete visible notifications"
  on public.notifications for delete
  using (public.can_access_staff_notification(sender_id, recipient_id));

create policy "Users can read own form starts"
  on public.form_starts for select
  using (auth.uid() = user_id);

create policy "Users can insert own form starts"
  on public.form_starts for insert
  with check (auth.uid() = user_id);

create policy "Super admins have full access to form starts"
  on public.form_starts for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Admins can read visible form starts"
  on public.form_starts for select
  using (public.can_access_staff_submission_owner(user_id));

create policy "Admins can delete visible form starts"
  on public.form_starts for delete
  using (public.can_access_staff_submission_owner(user_id));
