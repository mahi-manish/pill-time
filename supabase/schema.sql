-- Create profiles table
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text check (role in ('patient', 'caretaker')) default 'patient',
  caretaker_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;

-- Create policies for profiles
create policy "Users can insert their own profile."
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can view their own profile."
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile."
  on profiles for update
  using (auth.uid() = id);

-- Create medications table
create table medications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  dosage text,
  frequency text default 'Once daily',
  instructions text,
  reminder_time time without time zone not null,
  notifications_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table medications enable row level security;

-- Create policies for medications
create policy "Users can view their own medications."
  on medications for select
  using (auth.uid() = user_id);

create policy "Users can insert their own medications."
  on medications for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own medications."
  on medications for update
  using (auth.uid() = user_id);

create policy "Users can delete their own medications."
  on medications for delete
  using (auth.uid() = user_id);

-- Create medication_logs table
create table medication_logs (
  id uuid default gen_random_uuid() primary key,
  medication_id uuid references medications on delete cascade not null,
  user_id uuid references auth.users not null,
  date date not null,
  taken boolean default false,
  marked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(medication_id, date)
);

-- Enable RLS
alter table medication_logs enable row level security;

-- Create policies for medication_logs
create policy "Users can view their own logs."
  on medication_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own logs."
  on medication_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own logs."
  on medication_logs for update
  using (auth.uid() = user_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
-- Create alerts table
create table alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  medication_id uuid references medications on delete cascade,
  type text not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table alerts enable row level security;

create policy "Users can view their own alerts."
  on alerts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own alerts."
  on alerts for insert
  with check (auth.uid() = user_id);
