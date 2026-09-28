-- NON APPLICATA AL DATABASE CONDIVISO.
-- Preparata il 28/09/2026 per raccogliere la taglia T-shirt dei volontari.
-- Applicare solo dopo autorizzazione esplicita, perché Supabase è condiviso con produzione.
-- Non modifica assegnazioni, risposte, disponibilità o storico.

begin;

alter table public.volunteer_people
  add column if not exists tshirt_size text;

alter table public.volunteer_people
  drop constraint if exists volunteer_people_tshirt_size_check;

alter table public.volunteer_people
  add constraint volunteer_people_tshirt_size_check
  check (tshirt_size is null or tshirt_size in ('S', 'M', 'L', 'XL'));

comment on column public.volunteer_people.tshirt_size is
  'Taglia T-shirt staff scelta dal volontario: S, M, L, XL.';

commit;

-- Rollback, se necessario:
-- alter table public.volunteer_people drop constraint if exists volunteer_people_tshirt_size_check;
-- alter table public.volunteer_people drop column if exists tshirt_size;
