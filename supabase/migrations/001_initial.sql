-- ============================================================================
-- GCU73 Portal  -  Initial Migration
-- ============================================================================
-- Creates all application tables, RLS policies, helper functions, triggers,
-- and the storage bucket required by the portal.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Extensions
-- --------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- --------------------------------------------------------------------------
-- 1. Tables
-- --------------------------------------------------------------------------

-- profiles -----------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text        not null,
  full_name  text,
  role       text        not null default 'user'
                         check (role in ('admin', 'user')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application-level user profiles, created automatically on signup.';

-- forms --------------------------------------------------------------------
create table public.forms (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null,
  description text        not null,
  slug        text        not null unique,
  is_active   boolean     not null default true,
  created_by  uuid        not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.forms is 'Admin-defined data-collection forms.';

-- form_fields --------------------------------------------------------------
create table public.form_fields (
  id               uuid primary key default gen_random_uuid(),
  form_id          uuid        not null references public.forms(id) on delete cascade,
  field_type       text        not null
                               check (field_type in (
                                 'text','number','date','textarea',
                                 'media','email','password'
                               )),
  label            text        not null,
  description      text,
  placeholder      text,
  is_required      boolean     not null default false,
  is_sensitive     boolean     not null default false,
  validation_rules jsonb,
  sort_order       integer     not null,
  created_at       timestamptz not null default now()
);

comment on table public.form_fields is 'Ordered field definitions belonging to a form.';

-- submissions --------------------------------------------------------------
create table public.submissions (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid        not null references public.forms(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  submitted_by uuid        not null references public.profiles(id) on delete cascade,
  status       text        not null default 'draft'
                           check (status in ('draft','submitted','update_requested')),
  submitted_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (form_id, user_id)
);

comment on table public.submissions is 'One submission per user per form.';

-- submission_values --------------------------------------------------------
create table public.submission_values (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid        not null references public.submissions(id) on delete cascade,
  field_id      uuid        not null references public.form_fields(id) on delete cascade,
  value         text        not null,
  file_url      text,
  file_name     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (submission_id, field_id)
);

comment on table public.submission_values is 'Individual field values within a submission.';

-- invitations --------------------------------------------------------------
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  email        text        not null,
  form_id      uuid        not null references public.forms(id) on delete cascade,
  token        text        not null unique,
  status       text        not null default 'pending'
                           check (status in ('pending','completed','expired','cancelled')),
  invited_by   uuid        not null references public.profiles(id) on delete cascade,
  expires_at   timestamptz not null,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

comment on table public.invitations is 'Email invitations sent by admins for a specific form.';

-- notifications ------------------------------------------------------------
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid        not null references public.profiles(id) on delete cascade,
  sender_id    uuid        not null references public.profiles(id) on delete cascade,
  type         text        not null
                           check (type in ('update_request','info','reminder','system')),
  title        text        not null,
  message      text        not null,
  form_id      uuid        references public.forms(id) on delete set null,
  is_read      boolean     not null default false,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

comment on table public.notifications is 'In-app notifications for users.';

-- --------------------------------------------------------------------------
-- 2. Indexes
-- --------------------------------------------------------------------------
create index idx_forms_slug          on public.forms        (slug);
create index idx_form_fields_form    on public.form_fields   (form_id, sort_order);
create index idx_submissions_form    on public.submissions   (form_id);
create index idx_submissions_user    on public.submissions   (user_id);
create index idx_sub_values_sub      on public.submission_values (submission_id);
create index idx_invitations_token   on public.invitations   (token);
create index idx_invitations_email   on public.invitations   (email);
create index idx_notifications_recip on public.notifications (recipient_id, is_read);

-- --------------------------------------------------------------------------
-- 3. Updated-at trigger
-- --------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_forms_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();

create trigger trg_submissions_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

create trigger trg_submission_values_updated_at
  before update on public.submission_values
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- 4. Auto-create profile on signup
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------------
-- 5. Helper function: is_admin()
-- --------------------------------------------------------------------------
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
      and role = 'admin'
  );
$$;

-- --------------------------------------------------------------------------
-- 6. Enable RLS
-- --------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.forms             enable row level security;
alter table public.form_fields       enable row level security;
alter table public.submissions       enable row level security;
alter table public.submission_values enable row level security;
alter table public.invitations       enable row level security;
alter table public.notifications     enable row level security;

-- --------------------------------------------------------------------------
-- 7. RLS Policies
-- --------------------------------------------------------------------------

-- profiles -----------------------------------------------------------------
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins have full access to profiles"
  on public.profiles for all
  using (public.is_admin());

-- forms --------------------------------------------------------------------
create policy "Anyone can read active forms"
  on public.forms for select
  using (is_active = true);

create policy "Admins have full access to forms"
  on public.forms for all
  using (public.is_admin());

-- form_fields --------------------------------------------------------------
create policy "Anyone can read form fields of active forms"
  on public.form_fields for select
  using (
    exists (
      select 1 from public.forms
      where forms.id = form_fields.form_id
        and forms.is_active = true
    )
  );

create policy "Admins have full access to form fields"
  on public.form_fields for all
  using (public.is_admin());

-- submissions --------------------------------------------------------------
create policy "Users can read own submissions"
  on public.submissions for select
  using (auth.uid() = user_id);

create policy "Users can insert own submissions"
  on public.submissions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own submissions"
  on public.submissions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins have full access to submissions"
  on public.submissions for all
  using (public.is_admin());

-- submission_values --------------------------------------------------------
create policy "Users can read own submission values"
  on public.submission_values for select
  using (
    exists (
      select 1 from public.submissions
      where submissions.id = submission_values.submission_id
        and submissions.user_id = auth.uid()
    )
  );

create policy "Users can insert own submission values"
  on public.submission_values for insert
  with check (
    exists (
      select 1 from public.submissions
      where submissions.id = submission_values.submission_id
        and submissions.user_id = auth.uid()
    )
  );

create policy "Users can update own submission values"
  on public.submission_values for update
  using (
    exists (
      select 1 from public.submissions
      where submissions.id = submission_values.submission_id
        and submissions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.submissions
      where submissions.id = submission_values.submission_id
        and submissions.user_id = auth.uid()
    )
  );

create policy "Admins have full access to submission values"
  on public.submission_values for all
  using (public.is_admin());

-- invitations --------------------------------------------------------------
create policy "Admins have full access to invitations"
  on public.invitations for all
  using (public.is_admin());

-- notifications ------------------------------------------------------------
create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create policy "Admins have full access to notifications"
  on public.notifications for all
  using (public.is_admin());

-- --------------------------------------------------------------------------
-- 8. Storage bucket: submissions
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- Authenticated users can upload to their own folder
create policy "Users can upload submission files"
  on storage.objects for insert
  with check (
    bucket_id = 'submissions'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own uploaded files
create policy "Users can read own submission files"
  on storage.objects for select
  using (
    bucket_id = 'submissions'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update (overwrite) their own files
create policy "Users can update own submission files"
  on storage.objects for update
  using (
    bucket_id = 'submissions'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
create policy "Users can delete own submission files"
  on storage.objects for delete
  using (
    bucket_id = 'submissions'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can do everything in the submissions bucket
create policy "Admins have full access to submission files"
  on storage.objects for all
  using (
    bucket_id = 'submissions'
    and public.is_admin()
  );
