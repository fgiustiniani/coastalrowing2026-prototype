-- APPLICATA SU SUPABASE coastalrowing2026 (ref ocynnjwpyhjophmhqqam) il 21/09/2026.
-- Introduce l'anagrafica delle esigenze turno-attività e la inizializza a partire
-- dalle assegnazioni attive, aggiungendo le esigenze contenute in "Attività_da aggiungere.xlsx".

begin;

create table if not exists public.volunteer_activity_requirements (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.volunteer_shifts(id),
  activity_id uuid not null references public.volunteer_activities(id),
  required_count integer not null check (required_count between 1 and 999),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, activity_id)
);

create index if not exists volunteer_activity_requirements_shift_active_idx
  on public.volunteer_activity_requirements(shift_id, active);
create index if not exists volunteer_activity_requirements_activity_active_idx
  on public.volunteer_activity_requirements(activity_id, active);

alter table public.volunteer_activity_requirements enable row level security;

revoke all on table public.volunteer_activity_requirements from public, anon, authenticated;
grant select, insert, update, delete on table public.volunteer_activity_requirements to service_role;

insert into public.volunteer_activities (name, active)
values ('Gestione barche in spiaggia-Movimentazione C4x', true)
on conflict (name) do update set
  active = true,
  updated_at = now();

with current_counts as (
  select
    a.shift_id,
    a.activity_id,
    count(*)::integer as required_count
  from public.volunteer_assignments a
  where a.active
    and a.shift_id is not null
  group by a.shift_id, a.activity_id
),
addition_source(day_label, shift_label, activity_name, required_count) as (
  values
    ('Giovedì 1 ottobre','15:00–18:00','Posizionamento striscioni FIC',3),
    ('Sabato 3 ottobre','07:00–10:00','Gestione barche in spiaggia-Movimentazione C1x',3),
    ('Sabato 3 ottobre','07:00–10:00','Gestione barche in spiaggia-Movimentazione C2x',4),
    ('Sabato 3 ottobre','07:00–10:00','Gestione barche in spiaggia-Movimentazione C4x',6),
    ('Sabato 3 ottobre','10:00–13:00','Gestione barche in spiaggia-Movimentazione C1x',3),
    ('Sabato 3 ottobre','10:00–13:00','Gestione barche in spiaggia-Movimentazione C2x',4),
    ('Sabato 3 ottobre','10:00–13:00','Gestione barche in spiaggia-Movimentazione C4x',6),
    ('Sabato 3 ottobre','14:00–17:00','Gestione barche in spiaggia-Movimentazione C1x',3),
    ('Sabato 3 ottobre','14:00–17:00','Gestione barche in spiaggia-Movimentazione C2x',4),
    ('Sabato 3 ottobre','14:00–17:00','Gestione barche in spiaggia-Movimentazione C4x',6),
    ('Domenica 4 ottobre','07:00–10:00','Gestione barche in spiaggia-Movimentazione C1x',3),
    ('Domenica 4 ottobre','07:00–10:00','Gestione barche in spiaggia-Movimentazione C2x',4),
    ('Domenica 4 ottobre','07:00–10:00','Gestione barche in spiaggia-Movimentazione C4x',6),
    ('Domenica 4 ottobre','10:00–13:00','Gestione barche in spiaggia-Movimentazione C1x',3),
    ('Domenica 4 ottobre','10:00–13:00','Gestione barche in spiaggia-Movimentazione C2x',4),
    ('Domenica 4 ottobre','10:00–13:00','Gestione barche in spiaggia-Movimentazione C4x',6),
    ('Domenica 4 ottobre','14:00–18:00','Barche noleggiate-carico',10),
    ('Domenica 4 ottobre','14:00–18:00','Sistemazione e rimozione transenne in spiaggia',10),
    ('Domenica 4 ottobre','14:00–18:00','Allestimento gazebi, tavoli e sedie',10),
    ('Domenica 4 ottobre','14:00–18:00','Supporto montaggio/smontaggio impianto audio',3)
),
addition_counts as (
  select
    s.id as shift_id,
    a.id as activity_id,
    src.required_count
  from addition_source src
  join public.volunteer_shifts s
    on s.active
   and s.day_label = src.day_label
   and s.shift_label = src.shift_label
  join public.volunteer_activities a
    on a.active
   and a.name = src.activity_name
),
combined as (
  select shift_id, activity_id, required_count from current_counts
  union all
  select shift_id, activity_id, required_count from addition_counts
),
totals as (
  select
    shift_id,
    activity_id,
    sum(required_count)::integer as required_count
  from combined
  group by shift_id, activity_id
)
insert into public.volunteer_activity_requirements
  (shift_id, activity_id, required_count, active)
select
  shift_id,
  activity_id,
  required_count,
  true
from totals
on conflict (shift_id, activity_id) do update set
  required_count = excluded.required_count,
  active = true,
  updated_at = now();

commit;
