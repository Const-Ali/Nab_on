<?php
declare(strict_types=1);

// This helper and its scripts intentionally run only under PHP CLI, never through a web request.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

function nab_cli_fail(string $message, int $status = 1): never {
    fwrite(STDERR, $message . PHP_EOL);
    exit($status);
}

function nab_cli_config(): array {
    $path = dirname(__DIR__) . '/nab-config.php';
    if (!is_file($path)) nab_cli_fail('Private config not found outside the project web root.');
    $config = require $path;
    if (!is_array($config)) nab_cli_fail('Private config is invalid.');
    return $config;
}

function nab_cli_db(array $config): PDO {
    $host = (string)($config['db_host'] ?? 'localhost');
    $port = (int)($config['db_port'] ?? 3306);
    $name = (string)($config['db_name'] ?? '');
    $user = (string)($config['db_user'] ?? '');
    $pass = (string)($config['db_password'] ?? '');
    if ($name === '' || $user === '') nab_cli_fail('Database name/user are missing in the private config.');
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    try {
        return new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable $error) {
        nab_cli_fail('Could not connect to MySQL/MariaDB: ' . $error->getMessage());
    }
}

function nab_cli_backup_key(array $config): string {
    $secret = $config['backup_key'] ?? null;
    if (!is_string($secret) || strlen($secret) < 32) {
        nab_cli_fail('Set a random backup_key of at least 32 characters in the private nab-config.php first.');
    }
    return hash('sha256', $secret, true);
}

function nab_cli_is_inside(string $path, string $root): bool {
    $root = rtrim($root, DIRECTORY_SEPARATOR);
    return $path === $root || str_starts_with($path, $root . DIRECTORY_SEPARATOR);
}
