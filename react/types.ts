

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface User {
  username: string;
}

export enum ZerodhaAccountStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface ZerodhaAccount {
  id?: string; // Optional: ID might not be present for new accounts
  name: string;
  api_key: string;
  api_secret: string;
  access_token: string;
  status: ZerodhaAccountStatus;
}

export enum BuyLogic {
  FIXED_PERCENT = "fixed_percent",
  OFFSET_LTP = "offset_ltp",
}

export interface AdminSettings {
  buy_logic: BuyLogic;
  buy_percent: number;
  stoploss_percent: number;
  auto_sell_cutoff: string; // Format "HH:MM:SS" or "HH:MM"
}

export interface OrderResponse {
  id: string; // Assuming an ID is returned for each uploaded order
  zerodha_account_id: string;
  symbol: string;
  qty: number;
  target_percent: number;
  ltp_at_upload: number;
  target_price: number;
  stoploss_price: number;
  status: "pending" | "executed" | "failed" | "cancelled";
  reason?: string;
  executed_price?: number;
  executed_at?: string; // ISO Date string
  stoploss_triggered_at?: string; // ISO Date string
}

export interface WatchlistItem {
  id: string; // Or tradingsymbol if that's the unique ID
  tradingsymbol: string;
  ltp?: number; // LTP can be updated via WebSocket
}

export interface GTTOrder {
  id: string; // Assuming GTT orders have an ID
  // Define other GTT order fields based on API (not fully specified in docs)
  tradingsymbol: string;
  trigger_price: number;
  last_price: number;
  status: string;
}

export interface CronLog {
  id: string;
  job_name: string;
  status: "success" | "failure";
  message?: string;
  timestamp: string; // ISO Date string
  // Additional fields if provided by API
}

export interface Position {
  // FIX: Add optional id to conform to Table component's generic constraint
  id?: string; 
  instrument: string;
  qty: number;
  avg_cost: number;
  ltp: number;
  invested?: number; // Calculated: Qty * Avg Cost
  current_value?: number; // Calculated: Qty * LTP
  pnl?: number; // Calculated: Current Value - Invested
  net_change_percent?: number; // Calculated: ((LTP - Avg Cost) / Avg Cost) * 100
  day_change_percent?: number; // From API or tick
  // Additional Insights
  two_days_change?: string | number; // string if "—"
  week_change?: string | number; // string if "—"
  buy_date?: string; // ISO Date string
  stop_loss_target?: string; // Or specific fields for SL and Target
  notes?: string;
  // For internal mapping if positions are per account
  zerodha_account_id?: string; 
}

export interface TickData {
  instrument_token: string; // or symbol
  ltp: number;
  timestamp: string; // ISO Date string
}

export interface OrderUpdateData {
  order_id: string;
  status: "pending" | "executed" | "failed" | "cancelled";
  price?: number;
  // other relevant fields
}

export interface OrderMonitorStatus {
    status: 'running' | 'stopped' | 'error';
    last_check_time?: string; // ISO Date string
    message?: string;
}

export interface BackendServiceStatus {
    service_name: string;
    status: 'operational' | 'degraded' | 'down';
    last_updated: string; // ISO Date string
}

// General API error structure
export interface ApiError {
  detail?: string | { msg: string }[]; // FastAPI often returns { detail: "message" } or validation errors
  message?: string; // Fallback
}

// For table component
export interface ColumnDefinition<T, K extends keyof T> {
  key: K;
  header: string;
  render?: (item: T) => React.ReactNode; // Optional custom render function
  sortable?: boolean;
}

export enum ToastType {
  SUCCESS = "success",
  ERROR = "error",
  INFO = "info",
  WARNING = "warning",
}

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}
