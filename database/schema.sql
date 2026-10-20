-- Run once in the target MySQL/MariaDB database (utf8mb4).
-- Keep this database outside the public web directory and use a dedicated DB user.

CREATE TABLE IF NOT EXISTS nab_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  role_id VARCHAR(64) NOT NULL,
  title VARCHAR(160) NOT NULL,
  tone VARCHAR(32) NOT NULL DEFAULT 'blue',
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  permissions_json LONGTEXT NOT NULL,
  photo LONGTEXT NULL,
  auth_version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nab_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nab_state (
  state_key VARCHAR(190) NOT NULL,
  state_json LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  PRIMARY KEY (state_key),
  CONSTRAINT fk_nab_state_updated_by FOREIGN KEY (updated_by) REFERENCES nab_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nab_login_attempts (
  attempt_key CHAR(64) NOT NULL,
  fail_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (attempt_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
