/* The AccountRight UI calls it "To be Printed"; the REST API calls the same
   thing "Print". Store the API value so a push never has to translate, and
   label it in the UI instead. */

update public.myob_settings set delivery_status = 'Print' where delivery_status = 'To be Printed';

alter table public.myob_settings alter column delivery_status set default 'Print';

alter table public.myob_settings drop constraint if exists myob_settings_delivery_status_check;
alter table public.myob_settings add constraint myob_settings_delivery_status_check
  check (delivery_status in ('Print', 'Email', 'PrintAndEmail', 'AlreadyPrintedOrSent'));

/* MYOB will only redirect an authorisation code to a URI registered against the
   developer key, so the office has to tell us which one they registered. */
alter table public.myob_credentials add column if not exists redirect_uri text;
