-- ==============================================================================
-- FunnyGame Database Migration: Add Wadi Al-Shati (وادي الشاطئ) Cities & Municipalities
-- Expands region 'south' with 19 distinct local entities for hyper-local leaderboards
-- ==============================================================================

-- 1. Create reference table for Libyan cities if desired for server joins / queries
create table if not exists public.libya_cities (
  id text primary key,
  name_ar text not null,
  name_en text not null,
  region text not null check (region in ('west', 'east', 'south')),
  aliases text[] not null default '{}',
  lat double precision not null default 0.0,
  lng double precision not null default 0.0,
  created_at timestamptz not null default now()
);

-- RLS: viewable by everyone
alter table public.libya_cities enable row level security;

create policy "Libyan cities reference is viewable by everyone"
  on public.libya_cities for select
  using (true);

-- 2. Insert / Update the 19 Wadi Al-Shati Municipalities & Villages
insert into public.libya_cities (id, name_ar, name_en, region, aliases, lat, lng)
values
  ('ly_brak_alshati', 'براك الشاطئ', 'Brak Al-Shati', 'south', array['براك', 'وادي الشاطئ', 'الشاطئ', 'الزوية', 'آقار', 'محروقة', 'تاروت'], 27.5494, 14.2714),
  ('ly_alqarada_alshati', 'القرضة الشاطئ', 'Al-Qarada Al-Shati', 'south', array['القرضة', 'وادي الشاطئ', 'الشاطئ', 'قيرة', 'زلواز', 'الحطية', 'اشكدة', 'ققم', 'ققوم', 'تامزاوة'], 27.5600, 14.1800),
  ('ly_idri_alshati', 'أدري الشاطئ', 'Idri Al-Shati', 'south', array['أدري', 'ادري', 'وادي الشاطئ', 'الشاطئ', 'تامسكت', 'ونزريك', 'وينزريك', 'برقن', 'قطة', 'تمسان', 'تينيسان', 'الدبدب'], 27.5300, 13.0400),
  ('ly_qira', 'قيرة', 'Qira', 'south', array['قيرة الشاطئ', 'وادي الشاطئ', 'الشاطئ', 'القيرة'], 27.5650, 14.2200),
  ('ly_ishkada', 'اشكدة', 'Ishkada', 'south', array['إشكدة', 'اشكدة الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5750, 14.1500),
  ('ly_aqar_alshati', 'آقار الشاطئ', 'Aqar Al-Shati', 'south', array['آقار', 'اقار', 'اقار الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5450, 14.2950),
  ('ly_mahruqah', 'محروقة', 'Mahruqah', 'south', array['المحروقة', 'محروقة الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5400, 14.3200),
  ('ly_alzawiya_alshati', 'الزوية الشاطئ', 'Al-Zawiya Al-Shati', 'south', array['الزوية', 'زوية الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5520, 14.2600),
  ('ly_tarut', 'تاروت', 'Tarut', 'south', array['تاروت الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5350, 14.3500),
  ('ly_quttah', 'قطة', 'Quttah', 'south', array['قطة الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5250, 13.2000),
  ('ly_barqan', 'برقن', 'Barqan', 'south', array['برقن الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5200, 13.1500),
  ('ly_wanzarik', 'ونزريك', 'Wanzarik', 'south', array['ونزريك الشاطئ', 'وينزريك', 'وينزريك الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5150, 13.1000),
  ('ly_tamaskat', 'تامسكت', 'Tamaskat', 'south', array['تامسكت الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5280, 13.0700),
  ('ly_zalwaz', 'زلواز', 'Zalwaz', 'south', array['زلواز الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5550, 14.1950),
  ('ly_alhatiyah', 'الحطية', 'Al-Hatiyah', 'south', array['حطية الشاطئ', 'الحطية الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5620, 14.1650),
  ('ly_qaqam', 'ققم', 'Qaqam', 'south', array['ققم الشاطئ', 'ققوم', 'ققوم الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5700, 14.1700),
  ('ly_tamzawah', 'تامزاوة', 'Tamzawah', 'south', array['تامزاوة الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5580, 14.2100),
  ('ly_tamsan', 'تمسان', 'Tamsan', 'south', array['تمسان الشاطئ', 'تينيسان', 'تينيسان الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5220, 13.1200),
  ('ly_aldabdeb', 'الدبدب', 'Al-Dabdeb', 'south', array['الدبدب الشاطئ', 'وادي الشاطئ', 'الشاطئ'], 27.5100, 13.0100)
on conflict (id) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  region = excluded.region,
  aliases = excluded.aliases,
  lat = excluded.lat,
  lng = excluded.lng;

-- 3. Migrate any legacy user profiles with city_id = 'ly_brak_shati' to 'ly_brak_alshati'
update public.profiles
set city_id = 'ly_brak_alshati',
    city_name = 'براك الشاطئ'
where city_id = 'ly_brak_shati';
