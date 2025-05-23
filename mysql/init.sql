-- init.sql: Initialize database schema and seed data

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT IGNORE INTO users (id, username, password_hash) VALUES
(1, 'admin', '$2b$12$7XNfc8mXADaty0pQzc9Z3el.vEBoA5m3MZQ2p6sAqjvRxYDnBoIRm');

-- Admin settings
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT PRIMARY KEY,
    buy_logic ENUM('fixed_percent','offset_ltp') NOT NULL DEFAULT 'fixed_percent',
    buy_percent DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    stoploss_percent DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    auto_sell_cutoff TIME NOT NULL DEFAULT '15:20:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT IGNORE INTO admin_settings (id, buy_logic, buy_percent, stoploss_percent, auto_sell_cutoff) VALUES
(1, 'fixed_percent', 1.00, 1.00, '15:20:00');

-- Zerodha accounts
CREATE TABLE IF NOT EXISTS zerodha_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  api_key VARCHAR(100) NOT NULL,
  api_secret VARCHAR(100) NOT NULL,
  access_token VARCHAR(200) NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Instruments
CREATE TABLE IF NOT EXISTS instruments (
  instrument_token BIGINT PRIMARY KEY,
  tradingsymbol VARCHAR(50) NOT NULL,
  name VARCHAR(100),
  exchange VARCHAR(10)
);

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist_symbols (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL UNIQUE,
  instrument_token BIGINT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zerodha_account_id INT NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  qty INT NOT NULL,
  target_percent DECIMAL(5,2) NOT NULL,
  ltp_at_upload DECIMAL(12,2) NOT NULL,
  target_price DECIMAL(12,2) NOT NULL,
  stoploss_price DECIMAL(12,2) NOT NULL,
  status ENUM('pending','executed','failed','completed') NOT NULL DEFAULT 'pending',
  reason VARCHAR(255),
  executed_price DECIMAL(12,2),
  executed_at DATETIME,
  stoploss_triggered_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order logs
CREATE TABLE IF NOT EXISTS order_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  type VARCHAR(20),
  product VARCHAR(10),
  notes TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Positions
CREATE TABLE IF NOT EXISTS positions (
  zerodha_account_id INT NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  average_price DECIMAL(10,2) NOT NULL,
  pnl DECIMAL(12,2) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (zerodha_account_id, symbol)
);

-- Cron logs
CREATE TABLE IF NOT EXISTS cron_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_name VARCHAR(50) NOT NULL,
  status ENUM('success','failure') NOT NULL,
  message TEXT,
  ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
