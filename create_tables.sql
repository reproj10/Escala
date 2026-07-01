-- ================================================
-- UPA Escala — Script de criação das tabelas
-- Cole este SQL no Supabase SQL Editor e clique RUN
-- ================================================

-- Tabela de funcionários
create table if not exists employees (
  id text primary key,
  name text not null,
  cpf text,
  phone text,
  role text,
  coren text,
  shift_type text,
  work_hours text,
  sector text,
  cycle text,
  contract_type text,
  status text default 'active',
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- Tabela de escala mensal
create table if not exists schedule_entries (
  id text primary key,
  employee_id text,
  employee_name text,
  month int,
  year int,
  shift_type text,
  days jsonb,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- Tabela de atestados médicos
create table if not exists medical_certificates (
  id text primary key,
  employee_id text,
  employee_name text,
  cid text,
  description text,
  start_date text,
  end_date text,
  days int,
  file_url text,
  created_date timestamptz default now()
);

-- Tabela de configurações
create table if not exists app_config (
  id text primary key,
  key text unique,
  value jsonb,
  updated_by text
);

-- Tabela de log de auditoria
create table if not exists audit_log (
  id text primary key,
  type text,
  description text,
  employee_name text,
  created_date timestamptz default now()
);

-- Habilitar Row Level Security
alter table employees enable row level security;
alter table schedule_entries enable row level security;
alter table medical_certificates enable row level security;
alter table app_config enable row level security;
alter table audit_log enable row level security;

-- Remover políticas antigas se existirem
drop policy if exists "allow all" on employees;
drop policy if exists "allow all" on schedule_entries;
drop policy if exists "allow all" on medical_certificates;
drop policy if exists "allow all" on app_config;
drop policy if exists "allow all" on audit_log;

-- Criar políticas de acesso público (app interno da UPA)
create policy "allow all" on employees for all using (true) with check (true);
create policy "allow all" on schedule_entries for all using (true) with check (true);
create policy "allow all" on medical_certificates for all using (true) with check (true);
create policy "allow all" on app_config for all using (true) with check (true);
create policy "allow all" on audit_log for all using (true) with check (true);
