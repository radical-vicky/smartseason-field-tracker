create type public.app_role as enum ('admin', 'agent');
create type public.field_stage as enum ('planted', 'growing', 'ready', 'harvested');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  crop_type text not null,
  planting_date date not null,
  stage public.field_stage not null default 'planted',
  stage_changed_at timestamptz not null default now(),
  assigned_agent_id uuid references auth.users(id) on delete set null,
  location text,
  area_hectares numeric,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fields enable row level security;

create table public.field_updates (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  note text,
  previous_stage public.field_stage,
  new_stage public.field_stage,
  created_at timestamptz not null default now()
);
alter table public.field_updates enable row level security;

create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger fields_updated_at before update on public.fields
for each row execute function public.update_updated_at();

create or replace function public.track_stage_change()
returns trigger language plpgsql as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
  end if;
  return new;
end;
$$;

create trigger fields_track_stage before update on public.fields
for each row execute function public.track_stage_change();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare selected_role public.app_role;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);
  selected_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'agent');
  insert into public.user_roles (user_id, role) values (new.id, selected_role);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create policy "Profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "Users read own roles" on public.user_roles for select to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins see all fields" on public.fields for select to authenticated
using (public.has_role(auth.uid(), 'admin'));
create policy "Agents see assigned fields" on public.fields for select to authenticated
using (assigned_agent_id = auth.uid());
create policy "Admins insert fields" on public.fields for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update any field" on public.fields for update to authenticated
using (public.has_role(auth.uid(), 'admin'));
create policy "Agents update assigned field" on public.fields for update to authenticated
using (assigned_agent_id = auth.uid());
create policy "Admins delete fields" on public.fields for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins read all updates" on public.field_updates for select to authenticated
using (public.has_role(auth.uid(), 'admin'));
create policy "Agents read updates on assigned fields" on public.field_updates for select to authenticated
using (exists (select 1 from public.fields f where f.id = field_updates.field_id and f.assigned_agent_id = auth.uid()));
create policy "Authors insert their own updates" on public.field_updates for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.fields f where f.id = field_id and f.assigned_agent_id = auth.uid())
  )
);