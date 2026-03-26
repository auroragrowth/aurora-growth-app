-- Indexes to speed up per-user broker connection lookups.
-- The unique constraint on (user_id, broker, mode) creates a unique index,
-- but an explicit index on user_id alone helps range scans like getAllUserConnections().

create index if not exists idx_broker_connections_user_id
  on public.broker_connections(user_id);
