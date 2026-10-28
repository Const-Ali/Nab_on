<?php
declare(strict_types=1);

require __DIR__ . '/cli-common.php';

if ($argc !== 3 || (string)$argv[2] !== '--confirm') {
    fwrite(STDERR, "Usage: php database/restore-backup.php <encrypted-backup.nabbak> --confirm\n");
    fwrite(STDERR, "WARNING: this replaces all Nab users and application state in the configured database. Run database/backup.php first and keep a separate copy.\n");
    exit(2);
}

$config = nab_cli_config();
nab_cli_require_backup_crypto();
$backupPath = realpath((string)$argv[1]);
if ($backupPath === false || !is_file($backupPath) || !is_readable($backupPath)) nab_cli_fail('Backup file not found or not readable.');
$size = filesize($backupPath);
if ($size === false || $size < 36 || $size > 250 * 1024 * 1024) nab_cli_fail('Backup file size is invalid or exceeds 250 MB.');
$binary = file_get_contents($backupPath);
if ($binary === false) nab_cli_fail('Could not read backup file.');
$header = substr($binary, 0, 7);

if ($header === "NABDB2\0") {
    $expectedFormat = 'nab-encrypted-backup-v2';
    if (strlen($binary) < 56) nab_cli_fail('NABDB2 backup file is incomplete.');
    $iterationData = unpack('Niterations', substr($binary, 7, 4));
    $iterations = (int)($iterationData['iterations'] ?? 0);
    if ($iterations < 200000 || $iterations > 1000000) nab_cli_fail('NABDB2 KDF parameters are invalid.');
    $passphrase = nab_cli_read_passphrase('Backup file passphrase');
    $salt = substr($binary, 11, 16);
    $nonce = substr($binary, 27, 12);
    $tag = substr($binary, 39, 16);
    $ciphertext = substr($binary, 55);
    $key = hash_pbkdf2('sha256', $passphrase, $salt, $iterations, 32, true);
    $compressed = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag, 'NABDB2');
    unset($passphrase, $key);
} elseif ($header === "NABDB1\0") {
    $expectedFormat = 'nab-encrypted-backup-v1';
    $key = nab_cli_backup_key($config);
    $nonce = substr($binary, 7, 12);
    $tag = substr($binary, 19, 16);
    $ciphertext = substr($binary, 35);
    $compressed = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag, 'NABDB1');
    unset($key);
} else {
    nab_cli_fail('Backup header is invalid; expected NABDB1 or NABDB2.');
}
unset($binary);
if ($compressed === false) nab_cli_fail('Backup authentication failed. Check the passphrase/key and file integrity.');
$json = gzdecode($compressed, 250 * 1024 * 1024);
unset($compressed);
if ($json === false) nab_cli_fail('Backup decompression failed.');
try {
    $payload = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    nab_cli_fail('Backup data is invalid.');
}
unset($json);
$allowedFormats = ['nab-encrypted-backup-v1', 'nab-encrypted-backup-v2'];
if (!is_array($payload) || !in_array((string)($payload['format'] ?? ''), $allowedFormats, true)
    || (string)($payload['format'] ?? '') !== $expectedFormat || (int)($payload['schema_version'] ?? 0) !== 1) {
    nab_cli_fail('Unsupported backup format/schema version.');
}
$tables = $payload['tables'] ?? null;
if (!is_array($tables)) nab_cli_fail('Backup table structure is invalid.');
$users = $tables['nab_users'] ?? null;
$states = $tables['nab_state'] ?? null;
if (!is_array($users) || !is_array($states) || count($users) < 1 || count($users) > 10000 || count($states) > 50000) {
    nab_cli_fail('Backup table structure is invalid.');
}

$seenIds = [];
$seenUsernames = [];
$hasActiveAdmin = false;
foreach ($users as &$row) {
    if (!is_array($row)) nab_cli_fail('A user row is invalid.');
    $id = filter_var($row['id'] ?? null, FILTER_VALIDATE_INT);
    $username = strtolower(trim((string)($row['username'] ?? '')));
    $passwordHash = (string)($row['password_hash'] ?? '');
    $displayName = trim((string)($row['display_name'] ?? ''));
    $roleId = trim((string)($row['role_id'] ?? ''));
    $permissionsJson = $row['permissions_json'] ?? null;
    $permissions = is_string($permissionsJson) ? json_decode($permissionsJson, true) : null;
    $hashInfo = password_get_info($passwordHash);
    if ($id === false || $id < 1 || isset($seenIds[$id]) || !preg_match('/^[a-z0-9_.-]{3,64}$/', $username) || isset($seenUsernames[$username])
        || $displayName === '' || strlen($displayName) > 640 || $roleId === '' || strlen($roleId) > 64
        || strlen($passwordHash) > 255 || !is_array($permissions) || !is_array($hashInfo) || empty($hashInfo['algo'])) {
        nab_cli_fail('A user row is incomplete or invalid.');
    }
    $seenIds[$id] = true;
    $seenUsernames[$username] = true;
    $row['id'] = (int)$id;
    $row['username'] = $username;
    if ($roleId === 'admin') {
        $permissions = nab_cli_all_permissions();
        if (!empty($row['is_active'])) $hasActiveAdmin = true;
    } else {
        $permissions = array_values(array_diff(array_values(array_unique(array_intersect(nab_cli_all_permissions(), array_filter($permissions, 'is_string')))), ['purge_server_data']));
    }
    $row['permissions_json'] = json_encode($permissions, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
}
unset($row);
if (!$hasActiveAdmin) nab_cli_fail('Backup must contain at least one active system administrator.');

$seenKeys = [];
foreach ($states as &$row) {
    if (!is_array($row)) nab_cli_fail('A state row is invalid.');
    $stateKey = (string)($row['state_key'] ?? '');
    $stateJson = $row['state_json'] ?? null;
    if ($stateKey === '' || strlen($stateKey) > 190 || isset($seenKeys[$stateKey]) || !is_string($stateJson) || strlen($stateJson) > 250 * 1024 * 1024) {
        nab_cli_fail('A state key/value is invalid.');
    }
    $decodedState = json_decode($stateJson, true);
    if (!is_array($decodedState)) nab_cli_fail('A state value is not valid JSON.');
    if ($stateKey === 'nab:roles') {
        foreach ($decodedState as &$role) {
            if (!is_array($role) || !is_array($role['permissions'] ?? null)) continue;
            if ((string)($role['id'] ?? '') === 'admin') {
                $role['permissions'] = nab_cli_all_permissions();
                $role['builtin'] = true;
            } else {
                $role['permissions'] = array_values(array_diff(array_values(array_filter($role['permissions'], 'is_string')), ['purge_server_data']));
            }
        }
        unset($role);
        $row['state_json'] = json_encode($decodedState, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
    $seenKeys[$stateKey] = true;
    $updatedBy = $row['updated_by'] ?? null;
    $row['updated_by'] = $updatedBy !== null && filter_var($updatedBy, FILTER_VALIDATE_INT) !== false && isset($seenIds[(int)$updatedBy]) ? (int)$updatedBy : null;
}
unset($row, $payload);

$safetyPassphrase = nab_cli_read_passphrase('New safety-backup passphrase', 'NAB_SAFETY_BACKUP_PASSPHRASE');
$safetyRepeat = nab_cli_read_passphrase('Repeat safety-backup passphrase', 'NAB_SAFETY_BACKUP_PASSPHRASE');
if (!hash_equals($safetyPassphrase, $safetyRepeat)) nab_cli_fail('The safety-backup passphrases do not match.');

$pdo = nab_cli_db($config);
$databaseName = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
$lockName = 'nab-write-' . substr(hash('sha256', $databaseName), 0, 50);
$lockStmt = $pdo->prepare('SELECT GET_LOCK(?, 10)');
$lockStmt->execute([$lockName]);
if ((int)$lockStmt->fetchColumn() !== 1) nab_cli_fail('Could not acquire the application write lock. Try again shortly.');
$safetyPath = '';
try {
    $pdo->beginTransaction();
    $currentPayload = [
        'format' => 'nab-encrypted-backup-v2',
        'schema_version' => 1,
        'created_at' => gmdate('c'),
        'tables' => [
            'nab_users' => $pdo->query('SELECT id, username, display_name, role_id, title, tone, password_hash, is_active, permissions_json, photo, auth_version, created_at, updated_at FROM nab_users ORDER BY id FOR UPDATE')->fetchAll(),
            'nab_state' => $pdo->query('SELECT state_key, state_json, updated_at, updated_by FROM nab_state ORDER BY state_key FOR UPDATE')->fetchAll(),
        ],
    ];
    $maximumAuthVersion = 0;
    foreach (($currentPayload['tables']['nab_users'] ?? []) as $currentUser) {
        $maximumAuthVersion = max($maximumAuthVersion, (int)($currentUser['auth_version'] ?? 0));
    }
    foreach ($users as $restoredUser) {
        $maximumAuthVersion = max($maximumAuthVersion, (int)($restoredUser['auth_version'] ?? 0));
    }
    if ($maximumAuthVersion >= 4294967295) throw new RuntimeException('Restore stopped because auth_version reached the INT UNSIGNED limit.');
    $restoredAuthVersion = $maximumAuthVersion + 1;
    $safetyPath = nab_cli_write_safety_backup($currentPayload, $safetyPassphrase, $config, 'before-restore');
    $pdo->exec('DELETE FROM nab_state');
    $pdo->exec('DELETE FROM nab_login_attempts');
    $pdo->exec('DELETE FROM nab_users');
    $insertUser = $pdo->prepare('INSERT INTO nab_users (id, username, display_name, role_id, title, tone, password_hash, is_active, permissions_json, photo, auth_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())');
    foreach ($users as $row) {
        $insertUser->execute([
            (int)$row['id'], (string)$row['username'], (string)$row['display_name'], (string)$row['role_id'],
            (string)($row['title'] ?? ''), (string)($row['tone'] ?? 'blue'), (string)$row['password_hash'],
            !empty($row['is_active']) ? 1 : 0, (string)$row['permissions_json'], $row['photo'] ?? null,
            $restoredAuthVersion,
            (string)($row['created_at'] ?? gmdate('Y-m-d H:i:s')),
        ]);
    }
    $insertState = $pdo->prepare('INSERT INTO nab_state (state_key, state_json, updated_at, updated_by) VALUES (?, ?, ?, ?)');
    foreach ($states as $row) {
        $insertState->execute([
            (string)$row['state_key'], (string)$row['state_json'],
            (string)($row['updated_at'] ?? gmdate('Y-m-d H:i:s')), $row['updated_by'] ?? null,
        ]);
    }
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $releaseLock = $pdo->prepare('SELECT RELEASE_LOCK(?)');
    $releaseLock->execute([$lockName]);
    nab_cli_fail('Restore failed; transaction rolled back. ' . $error->getMessage());
}
$releaseLock = $pdo->prepare('SELECT RELEASE_LOCK(?)');
$releaseLock->execute([$lockName]);

fwrite(STDOUT, 'Restore completed. User auth versions were incremented, so previous sessions are invalid.' . PHP_EOL);
fwrite(STDOUT, 'Safety backup created before restore: ' . $safetyPath . PHP_EOL);
fwrite(STDOUT, 'Keep the safety-backup passphrase separate from that file.' . PHP_EOL);
