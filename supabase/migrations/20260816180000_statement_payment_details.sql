/* The printed statement carries the yard's bank details and the two standing
   notes under them. Hard-coding those in the document would make the statement
   lie the moment the account changes, so they live in business settings beside
   the ABN and the trading hours. */

alter table public.business_settings add column if not exists bank_name text;
alter table public.business_settings add column if not exists bank_account_name text;
alter table public.business_settings add column if not exists bank_bsb text;
alter table public.business_settings add column if not exists bank_account_no text;
alter table public.business_settings add column if not exists payment_reference_note text
  default 'Please include your Invoice No. as payment reference.';
alter table public.business_settings add column if not exists card_surcharge_note text
  default 'A 1.5% surcharge applies to credit/debit card payments.';

update public.business_settings
set payment_reference_note = coalesce(payment_reference_note, 'Please include your Invoice No. as payment reference.'),
    card_surcharge_note = coalesce(card_surcharge_note, 'A 1.5% surcharge applies to credit/debit card payments.')
where id = true;
