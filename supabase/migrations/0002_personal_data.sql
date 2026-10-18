-- 個人化資料（全部選填）：伊緹依此估算每日建議熱量與份量
alter table public.profiles
  add column height_cm numeric(4, 1) check (height_cm between 100 and 250),
  add column weight_kg numeric(4, 1) check (weight_kg between 25 and 300),
  add column sex text check (sex in ('male', 'female', 'undisclosed')),
  add column age integer check (age between 13 and 100),
  add column activity text check (activity in ('sedentary', 'light', 'moderate', 'active'));
