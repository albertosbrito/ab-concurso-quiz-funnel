import 'dotenv/config';
import { pool } from './connection.js';

const statements = [
  `create extension if not exists pgcrypto`,
  `create table if not exists leads (
    id uuid primary key default gen_random_uuid(),
    instagram_user_id text unique,
    username text,
    first_source text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists funnel_sessions (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references leads(id),
    funnel_key text not null,
    current_step_id text,
    status text not null default 'active',
    lead_token text not null unique,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists funnel_answers (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references funnel_sessions(id),
    step_id text not null,
    question text,
    answer text not null,
    normalized_answer text,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists funnel_events (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references funnel_sessions(id),
    lead_id uuid references leads(id),
    event_type text not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists checkout_clicks (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references funnel_sessions(id),
    lead_id uuid references leads(id),
    product_key text not null,
    checkout_url text not null,
    user_agent text,
    ip_hash text,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists sales (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references funnel_sessions(id),
    lead_id uuid references leads(id),
    product_key text not null,
    external_order_id text,
    buyer_name text,
    buyer_email text,
    amount_cents integer,
    status text not null,
    raw_payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists idx_funnel_sessions_lead_status on funnel_sessions(lead_id, status)`,
  `create index if not exists idx_funnel_events_type_created on funnel_events(event_type, created_at)`,
  `create index if not exists idx_checkout_clicks_created on checkout_clicks(created_at)`
];

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada.');
  }

  for (const statement of statements) {
    await pool.query(statement);
  }

  console.log('Migração concluída com sucesso.');
  await pool.end();
}

migrate().catch(async (error) => {
  console.error('Falha na migração:', error);
  await pool.end();
  process.exit(1);
});
