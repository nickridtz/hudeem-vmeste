-- ═══════════════════════════════════════════════════
--  Худеем Вместе — Database Schema
--  Запустить в: Neon → SQL Editor
-- ═══════════════════════════════════════════════════

-- Таблица пользователей
create table if not exists users (
  id            text primary key default gen_random_uuid()::text,
  login         text unique not null,
  password_hash text not null,
  role          text not null default 'user',
  created_at    timestamptz default now(),
  display_name  text not null default '',
  avatar        text default '👤',
  height_cm     integer default 170,
  start_weight  numeric(5,1) not null default 100,
  goal_weight   numeric(5,1) not null default 80,
  start_date    date not null default current_date,
  goal_date     date not null default (current_date + interval '3 months')
);

-- Таблица замеров веса
create table if not exists weight_entries (
  id         text primary key default gen_random_uuid()::text,
  user_id    text references users(id) on delete cascade,
  date       date not null,
  weight     numeric(5,1) not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Таблица записей еды
create table if not exists food_entries (
  id                  text primary key default gen_random_uuid()::text,
  user_id             text references users(id) on delete cascade,
  date                date not null,
  barcode             text default '',
  name                text not null,
  brand               text default '',
  portion_grams       numeric(6,1) not null,
  calories_per_100g   numeric(6,1) default 0,
  protein_per_100g    numeric(5,1) default 0,
  fat_per_100g        numeric(5,1) default 0,
  carbs_per_100g      numeric(5,1) default 0,
  created_at          timestamptz default now()
);

-- Таблица целей по калориям
create table if not exists calorie_goals (
  user_id  text primary key references users(id) on delete cascade,
  calories integer default 1800
);

-- Замеры тела (см)
create table if not exists body_measurements (
  id         text primary key default gen_random_uuid()::text,
  user_id    text references users(id) on delete cascade,
  date       date not null,
  waist      numeric(5,1),
  chest      numeric(5,1),
  hips       numeric(5,1),
  thigh      numeric(5,1),
  arm        numeric(5,1),
  created_at timestamptz default now(),
  unique(user_id, date)
);

