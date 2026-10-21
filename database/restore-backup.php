<?php
declare(strict_types=1);

require __DIR__ . '/cli-common.php';

if ($argc !== 3 || (string)$argv[2] !== '--confirm') {
    fwrite(STDERR, "Usage: php database/restore-backup.php <encrypted-backup.nabbak> --confirm\n");
    fwrite(STDERR, "WARNING: this replaces all Nab users and application state in the configured database.\n");
    exit(2);
}

$config = nab_cli_config();
$key = nab_cli_backup_key($config);
$backupPath = realpath((string)$argv[1]);
if ($backupPath === false || !is_file($backupPath) || !is_readable($backupPath)) nab_cli_fail('Backup file not found or not readable.');
$size = filesize($backupPath);
if ($size === false || $size < 36 || $size > 250 * 1024 * 1024) nab_cli_fail('Backup file size is invalid or exceeds 250 MB.');
$binary = file_get_contents($backupPath);
if ($binary === false || substr($binary, 0, 7) !== "NABDB1\0") nab_cli_fail('Backup header is invalid.');
$nonce = substr($binary, 7, 12);
$tag = substr($binary, 19, 16);
$ciphertext = substr($binary, 35);
$compressed = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag, 'NABDB1');
if ($compressed === false) nab_cli_fail('Backup authentication failed. Check the backup_key and file integrity.');
$json = gzdecode($compressed);
if ($json === false) nab_cli_fail('Backup decompression failed.');
try {
    $payload = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    nab_cli_fail('Backup data is invalid.');
}
if (!is_array($payload) || ($payload['format'] ?? '') !== 'nab-encrypted-backup-v1' || (int)($payload['schema_version'] ?? 0) !== 1) {
    nab_cli_fail('Unsupported backup format/schema version.');
}
$users = $payload['tables']['nab_users'] ?? null;
$states = $payload['tables']['nab_state'] ?? null;
if (!is_array($users) || !is_array($states) || count($users) < 1 || count($users) > 10000 || count($states) > 1000) {
    nab_cli_fail('Backup table structure is invalid.');
}

$pdo = nab_cli_db($config);
try {
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM nab_state');
    $pdo->exec('DELETE FROM nab_login_attempts');
    $pdo->exec('DELETE FROM nab_users');
    $insertUser = $pdo->prepare('INSERT INTO nab_users (id, username, display_name, role_id, title, tone, password_hash, is_active, permissions_json, photo, auth_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($users as $row) {
        if (!is_array($row) || !isset($row['id'], $row['username'], $row['display_name'], $row['role_id'], $row['title'], $row['password_hash'], $row['permissions_json'])) {
            throw new RuntimeException('A user row is incomplete.');
        }
        $insertUser->execute([
            (int)$row['id'], (string)$row['username'], (string)$row['display_name'], (string)$row['role_id'],
            (string)$row['title'], (string)($row['tone'] ?? 'blue'), (string)$row['password_hash'],
            !empty($row['is_active']) ? 1 : 0, (string)$row['permissions_json'], $row['photo'] ?? null,
            max(1, (int)($row['auth_version'] ?? 1)) + 1,
            (string)($row['created_at'] ?? gmdate('Y-m-d H:i:s')),
            gmdate('Y-m-d H:i:s'),
        ]);
    }
    $insertState = $pdo->prepare('INSERT INTO nab_state (state_key, state_json, updated_at, updated_by) VALUES (?, ?, ?, ?)');
    foreach ($states as $row) {
        if (!is_array($row) || !isset($row['state_key'], $row['state_json'])) throw new RuntimeException('A state row is incomplete.');
        $updatedBy = isset($row['updated_by']) ? (int)$row['updated_by'] : null;
        $insertState->execute([
            (string)$row['state_key'], (string)$row['state_json'],
            (string)($row['updated_at'] ?? gmdate('Y-m-d H:i:s')), $updatedBy,
        ]);
    }
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    nab_cli_fail('Restore failed; transaction rolled back. ' . $error->getMessage());
}

fwrite(STDOUT, 'Restore completed. User auth versions were incremented, so previous sessions are invalid.' . PHP_EOL);
