-- Indici di supporto per le foreign key del modulo volontari.
-- Nessuna modifica alle tabelle boat_test_*.

create index if not exists volunteer_assignments_supersedes_idx
  on public.volunteer_assignments(supersedes_assignment_id)
  where supersedes_assignment_id is not null;

create index if not exists volunteer_availability_shift_idx
  on public.volunteer_availability(shift_id);
