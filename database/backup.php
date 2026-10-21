<?php
declare(strict_types=1);

require __DIR__ . '/cli-common.php';

if ($argc < 2) {
    fwrite(STDERR, "Usage: php database/backup.php <private-backup-directory>\n");
    exit(2);
}

$config = nab_cli_config();
$key = nab_cli_backup_key($config);
$pdo = nab_cli_db($config);
$directoryArg = (string)$argv[1];
if (!is_dir($directoryArg) && !@mkdir($directoryArg, 0700, true) && !is_dir($directoryArg)) {
    nab_cli_fail('Could not create the backup directory.');
}
$directory = realpath($directoryArg);
if ($directory === false || !is_writable($directory)) nab_cli_fail('Backup directory is not writable.');
$documentRootValue = (string)($_SERVER['DOCUMENT_ROOT'] ?? '');
$documentRoot = $documentRootValue !== '' ? realpath($documentRootValue) : false;
if ($documentRoot !== false && $documentRoot !== '' && nab_cli_is_inside($directory, $documentRoot)) {
    nab_cli_fail('Refusing to write a backup inside DOCUMENT_ROOT. Choose a private directory outside public_html.');
}
foreach ([dirname(__DIR__) . '/public', dirname(__DIR__) . '/dist'] as $publicPath) {
    $publicRoot = realpath($publicPath);
    if ($publicRoot !== false && nab_cli_is_inside($directory, $publicRoot)) {
        nab_cli_fail('Refusing to write a backup inside the project public/dist directory.');
    }
}
@chmod($directory, 0700);

try {
    $payload = [
        'format' => 'nab-encrypted-backup-v1',
        'schema_version' => 1,
        'created_at' => gmdate('Y-m-d\\TH:i:s\\Z'),
        'tables' => [
            'nab_users' => $pdo->query('SELECT id, username, display_name, role_id, title, tone, password_hash, is_active, permissions_json, photo, auth_version, created_at, updated_at FROM nab_users ORDER BY id')->fetchAll(),
            'nab_state' => $pdo->query('SELECT state_key, state_json, updated_at, updated_by FROM nab_state ORDER BY state_key')->fetchAll(),
        ],
    ];
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    nab_cli_fail('Could not read database contents: ' . $error->getMessage());
}

$compressed = gzencode($json, 9, ZLIB_ENCODING_GZIP);
if ($compressed === false) nab_cli_fail('Could not compress the backup.');
$nonce = random_bytes(12);
$tag = '';
$ciphertext = openssl_encrypt($compressed, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag, 'NABDB1', 16);
if ($ciphertext === false || strlen($tag) !== 16) nab_cli_fail('Could not encrypt the backup.');
$contents = "NABDB1\0" . $nonce . $tag . $ciphertext;
$filename = 'nab-backup-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.nabbak';
$path = $directory . DIRECTORY_SEPARATOR . $filename;
if (file_put_contents($path, $contents, LOCK_EX) === false) nab_cli_fail('Could not write the encrypted backup file.');
@chmod($path, 0600);

$retentionDays = max(1, min(3650, (int)($config['backup_retention_days'] ?? 30)));
$cutoff = time() - ($retentionDays * 86400);
foreach (glob($directory . DIRECTORY_SEPARATOR . 'nab-backup-*.nabbak') ?: [] as $oldFile) {
    if ($oldFile !== $path && is_file($oldFile) && filemtime($oldFile) < $cutoff) @unlink($oldFile);
}

fwrite(STDOUT, 'Encrypted backup created: ' . $path . PHP_EOL);
fwrite(STDOUT, 'Retention cleanup: files older than ' . $retentionDays . ' days are removed.' . PHP_EOL);
