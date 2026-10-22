<?php
declare(strict_types=1);

require __DIR__ . '/cli-common.php';

if ($argc < 2 || $argc > 3 || ($argc === 3 && (string)$argv[2] !== '--per-file-passphrase')) {
    fwrite(STDERR, "Usage: php database/backup.php <private-backup-directory> [--per-file-passphrase]\n");
    fwrite(STDERR, "Default mode uses the private backup_key for unattended cron jobs; the option creates a NABDB2 file with its own passphrase.\n");
    exit(2);
}

$config = nab_cli_config();
nab_cli_require_backup_crypto();
$perFilePassphrase = $argc === 3;
$key = $perFilePassphrase ? null : nab_cli_backup_key($config);
$passphrase = null;
if ($perFilePassphrase) {
    $passphrase = nab_cli_read_passphrase('New backup passphrase');
    $repeat = nab_cli_read_passphrase('Repeat backup passphrase');
    if (!hash_equals($passphrase, $repeat)) nab_cli_fail('The passphrases do not match.');
}
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

$databaseName = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
$lockName = 'nab-write-' . substr(hash('sha256', $databaseName), 0, 50);
$lockStmt = $pdo->prepare('SELECT GET_LOCK(?, 10)');
$lockStmt->execute([$lockName]);
if ((int)$lockStmt->fetchColumn() !== 1) nab_cli_fail('Could not acquire the application write lock. Try again shortly.');
try {
    $pdo->beginTransaction();
    $payload = [
        'format' => $perFilePassphrase ? 'nab-encrypted-backup-v2' : 'nab-encrypted-backup-v1',
        'schema_version' => 1,
        'created_at' => gmdate('Y-m-d\\TH:i:s\\Z'),
        'tables' => [
            'nab_users' => $pdo->query('SELECT id, username, display_name, role_id, title, tone, password_hash, is_active, permissions_json, photo, auth_version, created_at, updated_at FROM nab_users ORDER BY id FOR UPDATE')->fetchAll(),
            'nab_state' => $pdo->query('SELECT state_key, state_json, updated_at, updated_by FROM nab_state ORDER BY state_key FOR UPDATE')->fetchAll(),
        ],
    ];
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if (strlen($json) > 250 * 1024 * 1024) throw new RuntimeException('Backup exceeds the 250 MB payload limit.');
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $releaseLock = $pdo->prepare('SELECT RELEASE_LOCK(?)');
    $releaseLock->execute([$lockName]);
    nab_cli_fail('Could not read database contents: ' . $error->getMessage());
}
$releaseLock = $pdo->prepare('SELECT RELEASE_LOCK(?)');
$releaseLock->execute([$lockName]);
unset($payload);

$compressed = gzencode($json, 9, ZLIB_ENCODING_GZIP);
$headerOverhead = $perFilePassphrase ? 55 : 35;
if ($compressed === false || strlen($compressed) > 250 * 1024 * 1024 - $headerOverhead) nab_cli_fail('Could not compress the backup or encrypted file exceeds 250 MB.');
if ($perFilePassphrase) {
    $contents = nab_cli_encrypt_v2($compressed, (string)$passphrase);
} else {
    $nonce = random_bytes(12);
    $tag = '';
    $ciphertext = openssl_encrypt($compressed, 'aes-256-gcm', (string)$key, OPENSSL_RAW_DATA, $nonce, $tag, 'NABDB1', 16);
    if ($ciphertext === false || strlen($tag) !== 16) nab_cli_fail('Could not encrypt the backup.');
    $contents = "NABDB1\0" . $nonce . $tag . $ciphertext;
}
$filename = 'nab-backup-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.nabbak';
$path = $directory . DIRECTORY_SEPARATOR . $filename;
$temporaryPath = $path . '.tmp-' . bin2hex(random_bytes(8));
$written = @file_put_contents($temporaryPath, $contents, LOCK_EX);
if ($written !== strlen($contents) || !@rename($temporaryPath, $path)) {
    @unlink($temporaryPath);
    @unlink($path);
    nab_cli_fail('Could not write the encrypted backup file.');
}
@chmod($path, 0600);

$retentionDays = max(1, min(3650, (int)($config['backup_retention_days'] ?? 30)));
$cutoff = time() - ($retentionDays * 86400);
foreach (glob($directory . DIRECTORY_SEPARATOR . 'nab-backup-*.nabbak') ?: [] as $oldFile) {
    if ($oldFile !== $path && is_file($oldFile) && filemtime($oldFile) < $cutoff) @unlink($oldFile);
}

fwrite(STDOUT, 'Encrypted backup created (' . ($perFilePassphrase ? 'NABDB2 per-file passphrase' : 'NABDB1 private backup_key') . '): ' . $path . PHP_EOL);
fwrite(STDOUT, 'Retention cleanup: files older than ' . $retentionDays . ' days are removed.' . PHP_EOL);
