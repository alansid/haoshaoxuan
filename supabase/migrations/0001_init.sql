-- 每位使用者只能讀寫自己的資料（RLS）。排程推播用 service role 讀取，不受 RLS 限制。

-- 個人設定
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  goal text not null default 'fat-loss' check (goal in ('fat-loss', 'maintain', 'gain')),
  meal_budget integer not null default 300 check (meal_budget between 50 and 10000),
  daily_budget integer not null default 900 check (daily_budget between 50 and 10000),
  venues text[] not null default array['convenience', 'cafe', 'bento'],
  restrictions text not null default '' check (char_length(restrictions) <= 100),
  onboarded boolean not null default false,
  challenge jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (user_id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 飲食紀錄
create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  venue text check (venue in ('convenience', 'cafe', 'bento')),
  items text[] not null check (cardinality(items) between 1 and 10),
  cost integer check (cost >= 0),
  kcal_est integer check (kcal_est >= 0),
  eaten_at timestamptz not null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meal_logs_user_eaten_at on public.meal_logs (user_id, eaten_at desc);

alter table public.meal_logs enable row level security;

create policy "meal_logs_select_own" on public.meal_logs for select using (user_id = auth.uid());
create policy "meal_logs_insert_own" on public.meal_logs for insert with check (user_id = auth.uid());
create policy "meal_logs_update_own" on public.meal_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meal_logs_delete_own" on public.meal_logs for delete using (user_id = auth.uid());

-- AI 每日一句建議（每人每天一則，避免重複呼叫 AI）
create table public.daily_tips (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  text text not null check (char_length(text) <= 300),
  primary key (user_id, day)
);

alter table public.daily_tips enable row level security;

create policy "daily_tips_select_own" on public.daily_tips for select using (user_id = auth.uid());
create policy "daily_tips_insert_own" on public.daily_tips for insert with check (user_id = auth.uid());
create policy "daily_tips_update_own" on public.daily_tips for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 推播訂閱（每週回顧通知）
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_select_own" on public.push_subscriptions for select using (user_id = auth.uid());
create policy "push_insert_own" on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy "push_update_own" on public.push_subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push_delete_own" on public.push_subscriptions for delete using (user_id = auth.uid());

-- AI 對話次數（每人每日），供 CHAT_DAILY_LIMIT 使用
create table public.chat_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.chat_usage enable row level security;

create policy "chat_usage_select_own" on public.chat_usage for select using (user_id = auth.uid());

-- 以台灣時間切日，原子地把今天的次數 +1；只能替自己加
create function public.increment_chat_usage() returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.chat_usage (user_id, day, count)
  values (auth.uid(), (now() at time zone 'Asia/Taipei')::date, 1)
  on conflict (user_id, day) do update set count = public.chat_usage.count + 1
  returning count;
$$;

revoke all on function public.increment_chat_usage() from public, anon;
grant execute on function public.increment_chat_usage() to authenticated;
