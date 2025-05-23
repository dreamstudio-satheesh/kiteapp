
// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'; // Default if not set
export const WEBSOCKET_HOST = process.env.REACT_APP_WEBSOCKET_HOST || 'localhost:8000'; // Default if not set

// API Endpoints
export const API_ENDPOINTS = {
  TOKEN: `${API_BASE_URL}/token`,
  ZERODHA_ACCOUNTS: `${API_BASE_URL}/zerodha_accounts`,
  ADMIN_SETTINGS: `${API_BASE_URL}/admin_settings`,
  ORDERS_UPLOAD: `${API_BASE_URL}/orders/upload`,
  WATCHLIST: `${API_BASE_URL}/watchlist`,
  GTT_ORDERS: `${API_BASE_URL}/gtt/orders`,
  CRON_LOGS: `${API_BASE_URL}/cron_logs`,
  POSITIONS: `${API_BASE_URL}/positions`, // Assuming this endpoint exists for fetching positions
  ORDER_MONITOR_STATUS: `${API_BASE_URL}/order_monitor/status`, // Assumed endpoint
  BACKEND_HEALTH: `${API_BASE_URL}/health/services`, // Assumed endpoint
};

// WebSocket Endpoints
export const WEBSOCKET_URLS = {
  TICKS: `ws://${WEBSOCKET_HOST}/ws/ticks`,
  ORDERS: `ws://${WEBSOCKET_HOST}/ws/orders`,
};

// Local Storage Keys
export const AUTH_TOKEN_KEY = 'zerodhaAdminAuthToken';

// UI Constants
export const APP_TITLE = 'Zerodha Admin Panel';
export const DEFAULT_TOAST_DURATION = 5000; // ms

export const NAVIGATION_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'HomeIcon' },
  { path: '/accounts', label: 'Accounts', icon: 'UserGroupIcon' },
  { path: '/settings', label: 'Admin Settings', icon: 'CogIcon' },
  { path: '/orders-upload', label: 'Upload Orders', icon: 'UploadIcon' },
  { path: '/order-monitor', label: 'Order Monitor', icon: 'EyeIcon' },
  { path: '/positions', label: 'Positions', icon: 'ChartBarIcon' },
  { path: '/watchlist', label: 'Watchlist', icon: 'StarIcon' },
  { path: '/gtt-orders', label: 'GTT Orders', icon: 'CollectionIcon' },
  { path: '/cron-logs', label: 'Cron Logs', icon: 'DocumentTextIcon' },
];

export const ZERODHA_ACCOUNT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const BUY_LOGIC_OPTIONS = [
  { value: 'fixed_percent', label: 'Fixed Percent' },
  { value: 'offset_ltp', label: 'Offset LTP' },
];

export const ORDER_STATUS_OPTIONS = ['pending', 'executed', 'failed', 'cancelled'];
export const CRON_LOG_JOB_NAME_OPTIONS = ['sync:positions', 'monitor:orders', 'sync:gtt']; // Example values
export const CRON_LOG_STATUS_OPTIONS = ['success', 'failure'];

export const MOCK_ZERODHA_ACCOUNTS_COUNT = 5; // As per requirement "up to 5 Zerodha accounts"
