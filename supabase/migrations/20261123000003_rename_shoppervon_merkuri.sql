-- ShopperVON was rebranded to Merkuri (merkuri.app). shoppervon.com is no longer held.
-- Safe on fresh installs (no-op) and on databases seeded before the rename.
do $$
begin
  if exists (select 1 from public.launches where id = 'shoppervon') then
    insert into public.launches (id,name,category,status,tone,tagline,site,interest,roles,milestones,image,video,screenshots,launch_url,target_date,visibility)
      select 'merkuri','Merkuri',category,status,tone,tagline,'merkuri.app',interest,roles,milestones,image,video,screenshots,launch_url,target_date,visibility
      from public.launches where id = 'shoppervon'
    on conflict (id) do nothing;
    update public.launch_updates set launch_id = 'merkuri' where launch_id = 'shoppervon';
    update public.launch_signups set launch_id = 'merkuri' where launch_id = 'shoppervon';
    update public.launch_signups set launches = array_replace(launches,'shoppervon','merkuri') where 'shoppervon' = any(launches);
    delete from public.launches where id = 'shoppervon';
  end if;
end $$;

-- Merkuri listing details (from the Merkuri app manifest)
update public.launches set category = 'Delivery', image = 'img/launches/merkuri.jpg',
  tagline = 'Launch, scale and manage local micro-delivery. Compare real couriers, watch video profiles, compare rates, capture proof of delivery and pay with SecurePay escrow.'
where id = 'merkuri';
