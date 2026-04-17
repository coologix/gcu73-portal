-- ============================================================================
-- GCU73 Portal  -  Seed Data
-- ============================================================================
-- Seeds the admin profile, the initial insurance form, and its field
-- definitions. Run after the initial migration (001_initial.sql).
-- ============================================================================

-- Placeholder UUIDs for local bootstrap staff users.
-- In production, staff profiles are expected to originate from auth signups.
do $$
declare
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
  v_super_admin_id uuid := '00000000-0000-0000-0000-000000000002';
  v_form_id  uuid;
begin
  -- --------------------------------------------------------------------
  -- 1. Bootstrap auth users
  -- --------------------------------------------------------------------
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    'admin@gcu73.org',
    crypt('LocalAdminOtpOnly123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'sub', v_admin_id::text,
      'email', 'admin@gcu73.org',
      'full_name', 'Patrick Jude Mbano',
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now();

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_admin_id::text,
    v_admin_id,
    jsonb_build_object(
      'sub', v_admin_id::text,
      'email', 'admin@gcu73.org',
      'full_name', 'Patrick Jude Mbano',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
  set identity_data = excluded.identity_data,
      updated_at = now();

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_super_admin_id,
    'authenticated',
    'authenticated',
    'superadmin@gcu73.org',
    crypt('LocalSuperAdminOtpOnly123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'sub', v_super_admin_id::text,
      'email', 'superadmin@gcu73.org',
      'full_name', 'Portal Super Admin',
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now();

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_super_admin_id::text,
    v_super_admin_id,
    jsonb_build_object(
      'sub', v_super_admin_id::text,
      'email', 'superadmin@gcu73.org',
      'full_name', 'Portal Super Admin',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
  set identity_data = excluded.identity_data,
      updated_at = now();

  -- --------------------------------------------------------------------
  -- 2. Staff profiles
  -- --------------------------------------------------------------------
  insert into public.profiles (id, email, full_name, role)
  values (
    v_admin_id,
    'admin@gcu73.org',
    'Patrick Jude Mbano',
    'admin'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role;

  insert into public.profiles (id, email, full_name, role)
  values (
    v_super_admin_id,
    'superadmin@gcu73.org',
    'Portal Super Admin',
    'super_admin'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role;

  -- --------------------------------------------------------------------
  -- 3. Insurance data-collection form
  -- --------------------------------------------------------------------
  insert into public.forms (id, title, description, slug, is_active, created_by)
  values (
    gen_random_uuid(),
    'Government College Umuahia Class of Jan 1973 - Group Life Insurance',
    'Collect personal and identification data from GCU ''73 class members for the group life insurance enrollment. All information provided is kept strictly confidential and used solely for insurance processing.',
    'gcu73-insurance',
    true,
    v_admin_id
  )
  returning id into v_form_id;

  -- --------------------------------------------------------------------
  -- 4. Form fields (ordered 1-8)
  -- --------------------------------------------------------------------

  -- 1) Surname
  insert into public.form_fields
    (form_id, field_type, label, description, placeholder, is_required, is_sensitive, validation_rules, sort_order)
  values (
    v_form_id,
    'text',
    'Surname',
    'Your family name as it appears on official documents.',
    'Enter your surname',
    true,
    false,
    null,
    1
  );

  -- 2) Other Names
  insert into public.form_fields
    (form_id, field_type, label, description, placeholder, is_required, is_sensitive, validation_rules, sort_order)
  values (
    v_form_id,
    'text',
    'Other Names',
    'Your first name and any middle names.',
    'Enter your other names',
    true,
    false,
    null,
    2
  );

  -- 3) Date of Birth
  insert into public.form_fields
    (form_id, field_type, label, description, placeholder, is_required, is_sensitive, validation_rules, sort_order)
  values (
    v_form_id,
    'date',
    'Date of Birth',
    'Your date of birth as recorded on official documents.',
    null,
    true,
    false,
    null,
    3
  );

  -- 4) NIN (National Identification Number)
  insert into public.form_fields
    (form_id, field_type, label, description, placeholder, is_required, is_sensitive, validation_rules, sort_order)
  values (
    v_form_id,
    'password',
    'NIN',
    'Your 11-digit National Identification Number. This is treated as sensitive data.',
    'Enter your 11-digit NIN',
    true,
    true,
    '{"pattern": "^[0-9]{11}$", "min_length": 11, "max_length": 11}'::jsonb,
    4
  );

  -- 5) BVN (Bank Verification Number)
  insert into public.form_fields
    (form_id, field_type, label, description, placeholder, is_required, is_sensitive, validation_rules, sort_order)
  values (
    v_form_id,
    'password',
    'BVN',
    'Your 11-digit Bank Verification Number. This is treated as sensitive data.',
    'Enter your 11-digit BVN',
    true,
    true,
    '{"pattern": "^[0-9]{11}$", "min_length": 11, "max_length": 11}'::jsonb,
    5
  );

  -- 6) Email Address
  insert into public.form_fields
    (form_id, field_type, label, description, placeholder, is_required, is_sensitive, validation_rules, sort_order)
  values (
    v_form_id,
    'email',
    'Email Address',
    'A valid email address where you can be reached.',
    'you@example.com',
    true,
    false,
    '{"pattern": "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"}'::jsonb,
    6
  );

  -- 7) Phone Number
  insert into public.form_fields
    (form_id, field_type, label, description, placeholder, is_required, is_sensitive, validation_rules, sort_order)
  values (
    v_form_id,
    'tel',
    'Phone Number',
    'Your phone number including country code (e.g. +234 801 234 5678).',
    '+234',
    true,
    false,
    null,
    7
  );

  -- 8) Passport Photo
  insert into public.form_fields
    (form_id, field_type, label, description, placeholder, is_required, is_sensitive, validation_rules, sort_order)
  values (
    v_form_id,
    'media',
    'Passport Photo',
    'A recent passport-sized photograph. Accepted formats: JPG, JPEG, PNG. Max size: 5 MB.',
    null,
    true,
    false,
    '{"max_file_size_mb": 5, "allowed_extensions": ["jpg", "jpeg", "png"]}'::jsonb,
    8
  );

end;
$$;
