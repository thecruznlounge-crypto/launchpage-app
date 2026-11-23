# LaunchPage.link PWA

Backend-ready starter for LaunchPage.link: a validation and traction layer for upcoming brands.

## Included
- Mobile-first public homepage
- Launch directory
- Individual launch detail template
- Opportunity Radar / "I Can Help" flow
- Collective Founders Club signup
- Saved launches using localStorage
- HQ traction dashboard
- PWA manifest and service worker
- Seeded projects: VOYUS, TourVue, ThenWe, Kayaos, PiggyBrain, RateStar, ShopperVON, Snaplery, Domin8, ThriftEyes, VEWR, BlockMogul, OneDrful

## Upload to cPanel
Upload all files in this folder to `public_html` for launchpage.link.

## Supabase-ready tables
Suggested tables:

```sql
create table launches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text,
  status text,
  tagline text,
  website text,
  created_at timestamptz default now()
);

create table launch_milestones (
  id uuid primary key default gen_random_uuid(),
  launch_id uuid references launches(id) on delete cascade,
  title text not null,
  completed boolean default false
);

create table launch_signups (
  id uuid primary key default gen_random_uuid(),
  launch_slug text,
  name text,
  email text not null,
  phone text,
  role text,
  roles text[],
  launches text[],
  note text,
  referral_code text,
  created_at timestamptz default now()
);
```

## Next upgrades
- Supabase auth
- Admin create/edit launch
- Email notifications
- Referral links
- Custom domains for launch pages
- Export waitlist CSV
