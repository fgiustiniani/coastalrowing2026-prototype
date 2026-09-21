-- APPLICATA al progetto Supabase coastalrowing2026 il 21/09/2026 su autorizzazione esplicita.
-- Anagrafiche attività e programma gare organizzativo.
-- Sorgenti:
-- attività.xlsx sha256 d9a158cd4dd9f16c8e3c91be2eaeee8faa1201c68cbba1812c26dc32c62883eb
-- Programma gare per org.xlsx sha256 69de5661bda2f9690b96157985907c461c6a383c45632c0c99d9bc8396497b42
--
-- Programma gare per org.xlsx non contiene giorno/orario gara.
-- Il programma gare provvisorio PDF consente di valorizzare:
-- - giorno + ora per le specialità Master identificabili univocamente;
-- - solo il giorno per Under 19, Under 23 e Senior, perché il file organizzativo
--   non specifica barca/genere e quindi l'ora individuale non è determinabile senza ulteriori dati.
-- Nessuna tabella boat_test_* viene modificata.

begin;

create table if not exists public.volunteer_race_program (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.volunteer_people(id),
  person_code text not null,
  person_name text not null,
  crew_label text not null,
  race_date date,
  race_time time without time zone,
  source_type text not null default 'excel' check (source_type in ('excel','admin')),
  source_row integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(person_name)) between 2 and 160),
  check (length(btrim(crew_label)) between 1 and 240)
);

create unique index if not exists volunteer_race_program_person_crew_uidx
  on public.volunteer_race_program(person_code, crew_label);
create index if not exists volunteer_race_program_person_active_idx
  on public.volunteer_race_program(person_id, active);
create index if not exists volunteer_race_program_schedule_idx
  on public.volunteer_race_program(race_date, race_time)
  where active;

alter table public.volunteer_race_program enable row level security;
revoke all on table public.volunteer_race_program from public, anon, authenticated;
grant select, insert, update, delete on table public.volunteer_race_program to service_role;

insert into public.volunteer_activities(name, active)
values
  ('Parcheggio villa Marina', true),
  ('Posizionamento striscioni FIC', true),
  ('Riferimento per espositori e food truck', true),
  ('Segreteria gare', true),
  ('Sistemazione e rimozione transenne in spiaggia', true),
  ('Supporto montaggio/smontaggio impianto audio', true),
  ('Supporto raccolta differenziata', true),
  ('Supporto refill acqua', true),
  ('Supporto tecnico', true),
  ('Transenne rotonda bruscoli', true),
  ('Allestimento gazebi, tavoli e sedie', true),
  ('Viabilità parcheggio carrelli', true),
  ('Pilota gommone 1', true),
  ('Pilota gommone 2', true),
  ('Pilota gommone 3', true),
  ('Pilota gommone 4', true),
  ('Pilota gommone 5', true),
  ('Pilota gommone 6', true),
  ('Gestione barche in spiaggia-Addetti ai rientri', true),
  ('Gestione barche in spiaggia-Field Operations Manager C1x', true),
  ('Gestione barche in spiaggia-Field Operations Manager C2x', true),
  ('Gestione barche in spiaggia-Field Operations Manager C4x+', true),
  ('Gestione barche in spiaggia-Info point / check-in', true),
  ('Gestione barche in spiaggia-Movimentazione C1x', true),
  ('Gestione barche in spiaggia-Movimentazione C2x', true),
  ('Gestione barche in spiaggia-Tutor C1x', true),
  ('Gestione barche in spiaggia-Tutor C2x', true),
  ('Gestione barche in spiaggia-Tutor C4x+', true),
  ('Barche noleggiate-scarico', true),
  ('Barche noleggiate-trasporto via mare', true),
  ('Barche noleggiate-sistemazioe in spiaggia', true),
  ('Barche noleggiate-carico', true)
on conflict (name) do update set
  active = true,
  updated_at = now();

update public.volunteer_activities
set active = false, updated_at = now()
where name in (
  'Gestione barche in spiaggia',
  'Piloti gommoni',
  'Scarico/carico barche a noleggio',
  'Spostamento barche via mare',
  'Supporto sitemazione barche'
);

insert into public.volunteer_race_program
  (person_id, person_code, person_name, crew_label, race_date, race_time, source_type, source_row, active)
select
  p.id,
  src.person_code,
  p.display_name,
  src.crew_label,
  case
    when src.crew_label ilike '%UNDER 19%' then date '2026-10-03'
    when src.crew_label ilike '%UNDER 23%' then date '2026-10-03'
    when src.crew_label ilike '%SENIOR%' then date '2026-10-04'
    when src.crew_label ilike '%MASTER%' then
      case
        when src.crew_label ilike '%43-54%' and src.crew_label ilike '%Mix%' then
          case when src.crew_label ilike '%C2X%' then date '2026-10-03' else date '2026-10-04' end
        when src.crew_label ilike '%55-64%' and src.crew_label ilike '%Mix%' then
          case when src.crew_label ilike '%C2X%' then date '2026-10-03' else date '2026-10-04' end
        when src.crew_label ilike '%C4X+ MASTER F 55-64%' then date '2026-10-04'
        else date '2026-10-03'
      end
    else null
  end,
  case
    when src.crew_label ilike '%C4X+ MASTER F 43-54%' then time '08:00'
    when src.crew_label ilike '%C4X+ MASTER M 55-64%' then time '08:20'
    when src.crew_label ilike '%C2X MASTER Mix 43-54%' then time '10:20'
    when src.crew_label ilike '%C4X+ MASTER M OVER 64%' then time '10:40'
    when src.crew_label ilike '%C4X+ MASTER M 43-54%' then time '12:20'
    when src.crew_label ilike '%C2X MASTER Mix 55-64%' then time '12:40'
    when src.crew_label ilike '%C4X+ MASTER MIX OVER 64%' then time '12:40'
    when src.crew_label ilike '%C4X+ MASTER Mix 43-54%' then time '10:00'
    when src.crew_label ilike '%C4X+ MASTER Mix 55-64%' then time '08:20'
    when src.crew_label ilike '%C4X+ MASTER F 55-64%' then time '10:20'
    else null
  end,
  'excel',
  src.source_row,
  true
from (
  values
  ('2', 'Adversi Lorenzo', 'Eq. 5 – C4X+ MASTER M 55-64', 2),
  ('2', 'Adversi Lorenzo', 'Eq. 7 – C4X+ MASTER Mix 43-54', 2),
  ('3', 'Andriulli Diego', 'Senior', 3),
  ('4', 'Arcangeli Fabio Massimo', 'Eq. 6 – C4X+ MASTER M OVER 64', 4),
  ('4', 'Arcangeli Fabio Massimo', 'Eq. 9 – C4X+ MASTER MIX OVER 64 (riserva)', 4),
  ('5', 'Attili Paolo', 'Eq. 8 – C4X+ MASTER Mix 55-64', 5),
  ('6', 'Azzolini Alberto', 'Senior', 6),
  ('7', 'Bacchia Lisa', 'Eq. 1 – C4X+ MASTER F 43-54', 7),
  ('7', 'Bacchia Lisa', 'Eq. 10 – C2X MASTER Mix 43-54', 7),
  ('239', 'Baldassarri Matteo', 'Eq. 5 – C4X+ MASTER M 55-64', 8),
  ('14', 'Barp Elena', 'Eq. 1 – C4X+ MASTER F 43-54', 9),
  ('148', 'Bianchi Filippo', 'Under 19', 10),
  ('19', 'Bocconcelli Andrea', 'Senior', 11),
  ('21', 'Buoncompagni Alessandro', 'Eq. 5 – C4X+ MASTER M 55-64', 12),
  ('21', 'Buoncompagni Alessandro', 'Eq. 8 – C4X+ MASTER Mix 55-64', 12),
  ('22', 'Calcagnini Aldo', 'Eq. 6 – C4X+ MASTER M OVER 64 (riserva)', 13),
  ('22', 'Calcagnini Aldo', 'Eq. 9 – C4X+ MASTER MIX OVER 64', 13),
  ('151', 'Campana Alida', 'Under 23', 14),
  ('23', 'Caniparoli Valentina', 'Eq. 3 – C4X+ MASTER F 43-54', 15),
  ('215', 'Comandini Alessandro', 'Eq. 5 – C4X+ MASTER M 55-64', 16),
  ('36', 'Coracci Silvia', 'Eq. 7 – C4X+ MASTER Mix 43-54', 17),
  ('155', 'Cospito Elena', 'Under 23', 18),
  ('276', 'De Wandeler Cirera Nayra Adriana', 'Eq. 1 – C4X+ MASTER F 43-54', 19),
  ('192', 'Di Martino Paolo', 'Eq. 6 – C4X+ MASTER M OVER 64', 20),
  ('45', 'Fabbrini Francesca', 'Eq. 2 – C4X+ MASTER F 55-64', 21),
  ('45', 'Fabbrini Francesca', 'Eq. 9 – C4X+ MASTER MIX OVER 64', 21),
  ('158', 'Fehervari Giulio', 'Under 19', 22),
  ('1', 'Giustiniani Fabio', 'Eq. 4 – C4X+ MASTER M 43-54', 23),
  ('161', 'Giustiniani Flavia', 'Under 23', 24),
  ('162', 'Giustiniani Paolo', 'Under 23', 25),
  ('65', 'Lobuono Antonella Assunta', 'Eq. 2 – C4X+ MASTER F 55-64', 26),
  ('65', 'Lobuono Antonella Assunta', 'Eq. 11 – C2X MASTER Mix 55-64', 26),
  ('66', 'Lobuono Marialuisa', 'Eq. 2 – C4X+ MASTER F 55-64', 27),
  ('68', 'Lue Verri Silvia', 'Eq. 3 – C4X+ MASTER F 43-54', 28),
  ('70', 'Maietta Simone', 'Eq. 4 – C4X+ MASTER M 43-54', 29),
  ('70', 'Maietta Simone', 'Eq. 10 – C2X MASTER Mix 43-54', 29),
  ('245', 'Motta Francesco', 'Eq. 4 – C4X+ MASTER M 43-54', 30),
  ('245', 'Motta Francesco', 'Eq. 7 – C4X+ MASTER Mix 43-54', 30),
  ('216', 'Patalossi Raffaella', 'Eq. 1 – C4X+ MASTER F 43-54', 31),
  ('216', 'Patalossi Raffaella', 'Eq. 7 – C4X+ MASTER Mix 43-54', 31),
  ('171', 'Pierleoni Gloria', 'Senior', 32),
  ('172', 'Podrini Alessandro', 'Under 19', 33),
  ('90', 'Polegato Daniela', 'Eq. 8 – C4X+ MASTER Mix 55-64', 34),
  ('96', 'Ruggeri Valeria', 'Eq. 2 – C4X+ MASTER F 55-64', 35),
  ('99', 'Sabatini Patrizia', 'Eq. 3 – C4X+ MASTER F 43-54', 36),
  ('230', 'Sacripanti Luana', 'Eq. 8 – C4X+ MASTER Mix 55-64', 37),
  ('218', 'Shumilova Ekaterina', 'Eq. 3 – C4X+ MASTER F 43-54', 38),
  ('201', 'Tanda Guillermo', 'Eq. 6 – C4X+ MASTER M OVER 64', 39),
  ('201', 'Tanda Guillermo', 'Eq. 11 – C2X MASTER Mix 55-64', 39),
  ('182', 'Tarini Mattia', 'Under 19', 40),
  ('106', 'Tatali Francesco', 'Senior', 41),
  ('109', 'Terenzi Gianluca', 'Eq. 4 – C4X+ MASTER M 43-54', 42),
  ('114', 'Urbinati Stefano', 'Eq. 6 – C4X+ MASTER M OVER 64', 43),
  ('185', 'Vimini Tommaso', 'Under 19', 44),
  ('223', 'Domenicucci Giuseppina', 'Eq. 9 – C4X+ MASTER MIX OVER 64', 45),
  ('281', 'Fabbrini Fabrizio', 'Eq. 9 – C4X+ MASTER MIX OVER 64', 46)
) as src(person_code, person_name, crew_label, source_row)
join public.volunteer_people p
  on p.person_code = src.person_code
on conflict (person_code, crew_label) do update set
  person_id = excluded.person_id,
  person_name = excluded.person_name,
  race_date = excluded.race_date,
  race_time = excluded.race_time,
  source_type = excluded.source_type,
  source_row = excluded.source_row,
  active = true,
  updated_at = now();

commit;