-- 飲食紀錄：每位使用者只能讀寫自己的紀錄（RLS）
create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  venue text check (venue in ('convenience', 'cafe', 'bento')),
  items text not null check (char_length(items) between 1 and 500),
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
