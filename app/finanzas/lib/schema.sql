-- Esquema persistible del módulo Finanzas (Postgres / Supabase).
-- Regla del dominio: se guardan entidades y eventos; los saldos se derivan
-- en la aplicación (app/finanzas/lib/derive.ts). Ninguna tabla guarda
-- valor actual, capital vigente, rentabilidad, balance ni saldo.
--
-- Espejo TypeScript: app/finanzas/lib/types.ts.
-- Montos en CLP enteros (bigint). Fechas de negocio como date.
-- Pendiente para la fase de persistencia real: auth, RLS y seeds.

create table users (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

-- ── DAP ──────────────────────────────────────────────────────────────────────
-- La entidad solo identifica el instrumento; plazo, tasa y montos viven en
-- los eventos. La apertura/renovación más reciente define el devengo vigente.

create table daps (
  id uuid primary key default gen_random_uuid(),
  banco text not null,
  titular_user_id uuid not null references users (id),
  created_at timestamptz not null default now()
);

create table dap_events (
  id uuid primary key default gen_random_uuid(),
  dap_id uuid not null references daps (id),
  fecha date not null,
  tipo text not null check (tipo in ('apertura', 'renovacion', 'retiro', 'cierre')),
  -- apertura:   monto_total, dias, tasa
  -- renovacion: monto_total (nuevo total), aporte (0 si solo renueva), dias, tasa
  -- retiro:     monto, razon
  -- cierre:     nota
  monto_total bigint check (monto_total >= 0),
  aporte bigint,
  monto bigint check (monto > 0),
  dias integer check (dias > 0),
  tasa numeric(8, 4) check (tasa >= 0), -- % del período
  razon text,
  nota text,
  created_at timestamptz not null default now(),
  check (
    (tipo = 'apertura' and monto_total is not null and dias is not null and tasa is not null)
    or (tipo = 'renovacion' and monto_total is not null and aporte is not null and dias is not null and tasa is not null)
    or (tipo = 'retiro' and monto is not null)
    or (tipo = 'cierre')
  )
);

create index dap_events_dap_fecha on dap_events (dap_id, fecha, created_at);

-- ── Fintual ──────────────────────────────────────────────────────────────────
-- Objetivo grupal: una bolsa por persona; personal: una sola bolsa.
-- Depósitos y retiros pertenecen a una bolsa. La variación pertenece solo al
-- objetivo y se registra como total acumulado declarado (el delta se deriva).

create table fintual_goals (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('grupal', 'personal')),
  created_at timestamptz not null default now()
);

create table fintual_goal_bags (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references fintual_goals (id),
  user_id uuid not null references users (id),
  created_at timestamptz not null default now(),
  unique (goal_id, user_id)
);

create table fintual_events (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references fintual_goals (id),
  fecha date not null,
  tipo text not null check (tipo in ('deposito', 'retiro', 'variacion')),
  -- deposito/retiro: bag_id, monto, nota
  -- variacion:       variacion_total (nunca lleva bag_id: es del objetivo)
  bag_id uuid references fintual_goal_bags (id),
  monto bigint check (monto > 0),
  variacion_total bigint,
  nota text,
  created_at timestamptz not null default now(),
  check (
    (tipo in ('deposito', 'retiro') and bag_id is not null and monto is not null and variacion_total is null)
    or (tipo = 'variacion' and variacion_total is not null and bag_id is null and monto is null)
  )
);

create index fintual_events_goal_fecha on fintual_events (goal_id, fecha, created_at);

-- ── Caja ─────────────────────────────────────────────────────────────────────
-- Caja acumulativa. El ajuste declara el saldo correcto a una fecha;
-- el delta se deriva al plegar los eventos.

create table cash_boxes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

create table cash_box_events (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references cash_boxes (id),
  fecha date not null,
  tipo text not null check (tipo in ('aporte', 'gasto', 'ajuste')),
  -- aporte: monto, nota
  -- gasto:  monto, descripcion
  -- ajuste: nuevo_saldo, nota
  monto bigint check (monto > 0),
  nuevo_saldo bigint,
  descripcion text,
  nota text,
  created_at timestamptz not null default now(),
  check (
    (tipo = 'aporte' and monto is not null and nuevo_saldo is null)
    or (tipo = 'gasto' and monto is not null and descripcion is not null and nuevo_saldo is null)
    or (tipo = 'ajuste' and nuevo_saldo is not null and monto is null)
  )
);

create index cash_box_events_box_fecha on cash_box_events (box_id, fecha, created_at);
