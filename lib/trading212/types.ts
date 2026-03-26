/**
 * Single source of truth for the broker_connections table schema.
 * Must match: supabase/migrations/fix_broker_connections.sql
 */

export type TradingMode = "paper" | "live";

export type BrokerConnectionRecord = {
  id: string;
  user_id: string;
  broker: string;
  mode: TradingMode;
  api_key_encrypted: string;
  api_secret_encrypted: string | null;
  account_id: string | null;
  account_currency: string | null;
  account_type: string | null;
  display_name: string | null;
  is_active: boolean;
  last_tested_at: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};
