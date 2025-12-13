-- Profiles Table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  referral_code text,
  niche text,
  bio text,
  contact_email text,
  looking_for_collab boolean default true,
  coin_balance integer default 100,
  streak_count integer default 0,
  subscription_tier text default 'free',
  last_login_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone
);

-- Add columns if they don't exist (for existing databases)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'full_name') then
    alter table profiles add column full_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'avatar_url') then
    alter table profiles add column avatar_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'referral_code') then
    alter table profiles add column referral_code text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'niche') then
    alter table profiles add column niche text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'bio') then
    alter table profiles add column bio text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'contact_email') then
    alter table profiles add column contact_email text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'looking_for_collab') then
    alter table profiles add column looking_for_collab boolean default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'updated_at') then
    alter table profiles add column updated_at timestamp with time zone;
  end if;
end $$;

-- Enable RLS for profiles
alter table profiles enable row level security;

-- Policies for profiles
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists scheduled_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  content text,
  media_url text,
  platform text check (platform in ('instagram', 'tiktok', 'youtube', 'twitter', 'linkedin')),
  scheduled_at timestamp with time zone not null,
  status text default 'pending' check (status in ('pending', 'published', 'failed')),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table scheduled_posts enable row level security;

-- Policies
create policy "Users can view their own scheduled posts"
  on scheduled_posts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own scheduled posts"
  on scheduled_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own scheduled posts"
  on scheduled_posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own scheduled posts"
  on scheduled_posts for delete
  using (auth.uid() = user_id);

-- Connected Accounts Table
create table if not exists connected_accounts (
  user_id uuid references auth.users not null,
  platform text not null, -- 'instagram', 'tiktok', etc.
  access_token text not null,
  account_id text, -- Instagram Business Account ID
  account_name text,
  created_at timestamp with time zone default now(),
  primary key (user_id, platform)
);

alter table connected_accounts enable row level security;

create policy "Users can view their own connected accounts"
  on connected_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert/update their own connected accounts"
  on connected_accounts for all
  using (auth.uid() = user_id);
