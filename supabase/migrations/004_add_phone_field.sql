-- ============================================================================
-- Add 'tel' field type and Phone Number field to default form
-- ============================================================================

-- 1. Expand field_type check constraint to include 'tel'
alter table public.form_fields drop constraint form_fields_field_type_check;
alter table public.form_fields add constraint form_fields_field_type_check
  check (field_type in (
    'text','number','date','textarea',
    'media','email','password','tel'
  ));

-- 2. Shift Passport Photo from sort_order 7 → 8 to make room
update public.form_fields
set sort_order = 8
where form_id = (select id from public.forms where slug = 'gcu73-insurance')
  and label = 'Passport Photo';

-- 3. Insert Phone Number field at sort_order 7
insert into public.form_fields
  (form_id, field_type, label, description, placeholder, is_required, is_sensitive, validation_rules, sort_order)
select
  forms.id,
  'tel',
  'Phone Number',
  'Your phone number including country code (e.g. +234 801 234 5678).',
  '+234',
  true,
  false,
  null,
  7
from public.forms
where slug = 'gcu73-insurance'
  and not exists (
    select 1
    from public.form_fields
    where form_fields.form_id = forms.id
      and form_fields.label = 'Phone Number'
  );
