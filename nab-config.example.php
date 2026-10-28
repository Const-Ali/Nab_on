<?php
/**
 * Copy this file to ../nab-config.php on the host, OUTSIDE public_html.
 * Never put real database credentials or the setup key in the public directory.
 */
return [
    'db_host' => 'localhost',
    'db_port' => 3306,
    'db_name' => 'YOUR_CPANEL_DATABASE',
    'db_user' => 'YOUR_CPANEL_DATABASE_USER',
    'db_password' => 'CHANGE_ME',
    // Generate a long random value; used once to create the first administrator.
    'setup_key' => 'REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG',
    // Generate a separate random key (e.g. openssl rand -hex 32) before using CLI backups.
    // Keep it only in this private config; do not reuse setup_key or the database password.
    'backup_key' => '',
    // Encrypted CLI backups older than this many days are removed after a successful backup.
    'backup_retention_days' => 30,
    // Must be true on the live HTTPS site. Set false only for local HTTP development.
    'secure_cookie' => true,
];
