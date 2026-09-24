-- APPLICATA AL DATABASE CONDIVISO coastalrowing2026 IL 24/09/2026 SU AUTORIZZAZIONE ESPLICITA.
-- Aggiunge il gruppo all'anagrafica volontari e importa i valori dal file Persone(1).xlsx.
-- Chiave di aggiornamento: volunteer_people.person_code = colonna A "Codice".
-- Alla preparazione risultavano 145 codici corrispondenti; PIL01 e PC05 vengono creati come persone esterne non selezionabili.

begin;

alter table public.volunteer_people
  add column if not exists person_group text;

insert into public.volunteer_people (
  person_code,
  display_name,
  source_type,
  selectable,
  active
)
select
  incoming.person_code,
  incoming.display_name,
  'external',
  false,
  true
from (
  values
    ('PIL01', 'Pilota abilitato 01 – DA CONFERMARE'),
    ('PC05', 'Protezione Civile 05')
) as incoming(person_code, display_name)
where not exists (
  select 1
  from public.volunteer_people p
  where p.person_code = incoming.person_code
);

update public.volunteer_people as p
set person_group = incoming.person_group,
    updated_at = now()
from (
  values
    ('1','Master'),('101','Master'),('103','Master'),('104','Master'),('105','Master'),('106','Senior'),('107','Master'),('109','Master'),('110','Master'),('114','Master'),('117','Master'),('12','Master'),('13','Master'),('138','Master'),('14','Master'),('15','Master'),('18','Master'),('186','Master'),('19','Senior'),('192','Master'),('199','Master'),('2','Master'),('204','Master'),('206','Master'),('21','Master'),('211','Master'),('212','Master'),('213','Master'),('215','Master'),('216','Master'),('218','Master'),('223','Master'),('23','Master'),('230','Master'),('234','Master'),('239','Master'),('240','Master'),('242','Master'),('243','Master'),('244','Master'),('245','Master'),('254','Master'),('269','Master'),('27','Master'),('276','Master'),('277','Master'),('28','Master'),('281','Master'),('3','Senior'),('32','Master'),('36','Master'),('37','Master'),('38','Master'),('39','Master'),('4','Master'),('41','Master'),('42','Master'),('43','Senior'),('45','Master'),('46','Master'),('5','Master'),('54','Master'),('6','Senior'),('65','Master'),('66','Master'),('68','Master'),('7','Master'),('70','Master'),('71','Master'),('76','Master'),('77','Master'),('79','Senior'),('80','Master'),('81','Master'),('84','Master'),('90','Master'),('92','Master'),('96','Master'),('97','Master'),('98','Master'),('99','Master'),('144','Gruppo A'),('145','Gruppo B'),('148','Gruppo A'),('151','Gruppo A'),('155','Gruppo A'),('156','Gruppo B'),('158','Gruppo A'),('161','Gruppo A'),('162','Gruppo A'),('171','Gruppo A'),('172','Gruppo A'),('175','Gruppo A'),('182','Gruppo A'),('185','Gruppo A'),('227','Gruppo B'),('232','Gruppo A'),('233','Gruppo B'),('248','Gruppo A'),('255','Gruppo B'),('256','Gruppo B'),('257','Gruppo A'),('258','Gruppo B'),('259','Gruppo B'),('260','Gruppo B'),('262','Gruppo B'),('264','Gruppo B'),('265','Gruppo B'),('266','Gruppo B'),('267','Gruppo A'),('268','Gruppo B'),('270','Gruppo A'),('272','Gruppo B'),('279','Gruppo A'),('PIL01','Piloti gommoni'),('PIL02','Piloti gommoni'),('PIL03','Piloti gommoni'),('PIL04','Piloti gommoni'),('PIL05','Piloti gommoni'),('PIL06','Piloti gommoni'),('PC01','Protezione Civile'),('PC02','Protezione Civile'),('PC03','Protezione Civile'),('PC04','Protezione Civile'),('PC05','Protezione Civile'),('VG01','Vigili in pensione'),('VG02','Vigili in pensione'),('VG03','Vigili in pensione'),('VG04','Vigili in pensione'),('VG05','Vigili in pensione'),('VG06','Vigili in pensione'),('VX01','VolontarX'),('VX02','VolontarX'),('VX03','VolontarX'),('VX04','VolontarX'),('VX05','VolontarX'),('VX06','VolontarX'),('288','Master'),('287','Master'),('286','Master'),('285','Master'),('284','Master'),('283','Master'),('282','Master'),('280','Master'),('201','Master'),('22','Master')
) as incoming(person_code, person_group)
where p.person_code = incoming.person_code
  and p.person_group is distinct from incoming.person_group;

commit;

-- Rollback della colonna, se necessario:
-- alter table public.volunteer_people drop column if exists person_group;
-- PIL01 e PC05 sono stati creati da questa migrazione. Rimuoverli solo dopo aver verificato
-- che non siano referenziati da assegnazioni, invii, programma gare o altri dati collegati.
