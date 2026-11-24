-- App logos and Hunnyhive store slugs for launches.
alter table public.launches add column if not exists logo text;
alter table public.launches add column if not exists hh_slug text;
update public.launches set logo = 'img/logos/' || id || '.png'
  where logo is null and id in ('voyus','tourvue','thenwe','kayaos','piggybrain','ratestar','merkuri','snaplery','domin8','thrifteyes','vewr','blockmogul','onedrful');
update public.launches set hh_slug = case id when 'thrifteyes' then 'thrifteye' else id end
  where hh_slug is null and id in ('voyus','tourvue','thenwe','kayaos','piggybrain','ratestar','merkuri','snaplery','domin8','thrifteyes','vewr','blockmogul','onedrful');
