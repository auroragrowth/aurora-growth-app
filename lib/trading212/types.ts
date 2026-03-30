/**
 * Single source of truth for the trading212_connections table schema.
 * One row per user per mode (live / demo).
 */

export type BrokerMode = "live" | "demo";

export type BrokerConnectionRecord = {
  id: string;
  user_id: string;
  broker: string;
  mode: BrokerMode;
  base_url: string;
  api_key_encrypted: string;
  api_key: string | null;
  api_secret_encrypted: string | null;
  account_id: string | null;
  account_name: string | null;
  account_currency: string | null;
  account_type: string | null;
  display_name: string | null;
  is_active: boolean;
  is_connected: boolean;
  last_tested_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};
