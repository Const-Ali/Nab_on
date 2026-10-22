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

function nab_cli_require_backup_crypto(): void {
    if (!function_exists('openssl_encrypt') || !function_exists('openssl_decrypt') || !function_exists('hash_pbkdf2') || !function_exists('gzencode') || !function_exists('gzdecode')) {
        nab_cli_fail('PHP OpenSSL, PBKDF2, and zlib support are required for encrypted backups.');
    }
}

function nab_cli_read_passphrase(string $prompt, string $environmentName = 'NAB_BACKUP_PASSPHRASE'): string {
    $envValue = getenv($environmentName);
    if (is_string($envValue) && $envValue !== '') {
        $value = $envValue;
    } else {
        $isTty = function_exists('stream_isatty') && @stream_isatty(STDIN);
        if (!$isTty) nab_cli_fail('Set NAB_BACKUP_PASSPHRASE in the process environment or run this command interactively.');
        fwrite(STDERR, $prompt . ': ');
        $hidden = false;
        if (PHP_OS_FAMILY !== 'Windows' && function_exists('exec')) {
            $output = [];
            $status = 1;
            @exec('stty -echo 2>/dev/null', $output, $status);
            $hidden = $status === 0;
        }
        $line = fgets(STDIN);
        if ($hidden) {
            @exec('stty echo 2>/dev/null');
            fwrite(STDERR, PHP_EOL);
        }
        if ($line === false) nab_cli_fail('Could not read the backup passphrase.');
        $value = rtrim($line, "\r\n");
    }
    $characters = preg_match_all('/./us', $value);
    if (!is_int($characters) || $characters < 12 || strlen($value) > 256) {
        nab_cli_fail('Backup passphrases must contain at least 12 characters and no more than 256 bytes.');
    }
    return $value;
}

function nab_cli_encrypt_v2(string $compressed, string $passphrase): string {
    nab_cli_require_backup_crypto();
    if (strlen($compressed) > 250 * 1024 * 1024 - 55) nab_cli_fail('Backup file exceeds the 250 MB limit.');
    $iterations = 600000;
    $salt = random_bytes(16);
    $nonce = random_bytes(12);
    $key = hash_pbkdf2('sha256', $passphrase, $salt, $iterations, 32, true);
    $tag = '';
    $ciphertext = openssl_encrypt($compressed, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag, 'NABDB2', 16);
    if ($ciphertext === false || strlen($tag) !== 16) nab_cli_fail('Could not encrypt the backup with AES-256-GCM.');
    return "NABDB2\0" . pack('N', $iterations) . $salt . $nonce . $tag . $ciphertext;
}


function nab_cli_private_backup_directory(array $config): string {
    $configured = trim((string)($config['backup_directory'] ?? ''));
    if ($configured === '') $configured = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'nab-backups';
    elseif ($configured[0] !== DIRECTORY_SEPARATOR) $configured = dirname(__DIR__) . DIRECTORY_SEPARATOR . $configured;
    if (!is_dir($configured) && !@mkdir($configured, 0700, true) && !is_dir($configured)) nab_cli_fail('Could not create the private safety-backup directory.');
    $directory = realpath($configured);
    if ($directory === false || !is_writable($directory)) nab_cli_fail('Private safety-backup directory is not writable.');
    $documentRootValue = (string)($_SERVER['DOCUMENT_ROOT'] ?? '');
    $documentRoot = $documentRootValue !== '' ? realpath($documentRootValue) : false;
    if ($documentRoot !== false && nab_cli_is_inside($directory, $documentRoot)) nab_cli_fail('Refusing to write a safety backup inside DOCUMENT_ROOT.');
    @chmod($directory, 0700);
    return $directory;
}

function nab_cli_write_safety_backup(array $payload, string $passphrase, array $config, string $purpose): string {
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if (strlen($json) > 250 * 1024 * 1024) nab_cli_fail('Safety backup exceeds the 250 MB limit.');
    $compressed = gzencode($json, 6, ZLIB_ENCODING_GZIP);
    if ($compressed === false || strlen($compressed) > 250 * 1024 * 1024 - 55) nab_cli_fail('Could not compress safety backup or it exceeds the 250 MB limit.');
    $contents = nab_cli_encrypt_v2($compressed, $passphrase);
    $directory = nab_cli_private_backup_directory($config);
    if (!preg_match('/^[a-z0-9-]{1,24}$/', $purpose)) $purpose = 'safety';
    $filename = 'nab-safety-' . $purpose . '-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(32)) . '.nabbak';
    $path = $directory . DIRECTORY_SEPARATOR . $filename;
    $temporaryPath = $path . '.tmp-' . bin2hex(random_bytes(8));
    $written = @file_put_contents($temporaryPath, $contents, LOCK_EX);
    if ($written !== strlen($contents) || !@rename($temporaryPath, $path)) {
        @unlink($temporaryPath);
        @unlink($path);
        nab_cli_fail('Could not write the encrypted safety backup. Restore was not applied.');
    }
    @chmod($path, 0600);
    $retentionDays = max(1, min(3650, (int)($config['backup_retention_days'] ?? 30)));
    $cutoff = time() - $retentionDays * 86400;
    foreach (glob($directory . DIRECTORY_SEPARATOR . 'nab-safety-*.nabbak') ?: [] as $oldFile) {
        if ($oldFile !== $path && is_file($oldFile) && filemtime($oldFile) < $cutoff) @unlink($oldFile);
    }
    return $path;
}

function nab_cli_all_permissions(): array {
    return [
        'view_dashboard', 'view_persons', 'create_person', 'edit_person', 'delete_person',
        'change_status', 'assign_person', 'complete_checklist', 'view_person_notes',
        'create_person_note', 'edit_person_note', 'delete_person_note', 'manage_any_person_note',
        'print_person', 'export_people_csv', 'export_people_excel', 'import_people_excel',
        'view_workflow', 'manage_workflow', 'view_activities', 'export_activities',
        'view_reports', 'print_reports', 'view_audit_log', 'view_users', 'create_user', 'edit_user', 'delete_user', 'manage_users',
        'view_roles', 'create_role', 'edit_role', 'delete_role', 'manage_roles',
        'export_backup', 'restore_backup', 'purge_server_data', 'view_settings', 'manage_settings',
        'view_tasks', 'create_task', 'edit_task', 'change_task_status', 'delete_task',
    ];
}
