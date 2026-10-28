<?php
declare(strict_types=1);

require __DIR__ . '/cli-common.php';

if ($argc !== 2) {
    fwrite(STDERR, "Usage: php database/reset-password.php <username>\n");
    exit(2);
}
$username = strtolower(trim((string)$argv[1]));
if (!preg_match('/^[a-z0-9_.-]{3,64}$/', $username)) nab_cli_fail('Username format is invalid.');
$config = nab_cli_config();
$pdo = nab_cli_db($config);
$stmt = $pdo->prepare('SELECT id, username, auth_version FROM nab_users WHERE username = ? LIMIT 1');
$stmt->execute([$username]);
$user = $stmt->fetch();
if (!$user) nab_cli_fail('User not found; no data was changed.');
if ((int)$user['auth_version'] >= 4294967295) nab_cli_fail('Session version is at the database limit; no data was changed.');

// Generate a high-entropy temporary password; it is printed once to this local terminal only.
$temporaryPassword = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
$passwordHash = password_hash($temporaryPassword, PASSWORD_DEFAULT);
$database = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
$lockName = 'nab-write-' . substr(hash('sha256', $database), 0, 50);
$lock = $pdo->prepare('SELECT GET_LOCK(?, 10)');
$lock->execute([$lockName]);
if ((int)$lock->fetchColumn() !== 1) nab_cli_fail('Could not acquire the server write lock; no data was changed.');
try {
    $pdo->beginTransaction();
    // Password-derived TOTP encryption keys cannot be re-created by this recovery command.
    // Remove only this account's authenticator so it can safely enroll again after signing in.
    $totpKey = 'nab:security:totp';
    $readTotp = $pdo->prepare('SELECT state_json FROM nab_state WHERE state_key = ? FOR UPDATE');
    $readTotp->execute([$totpKey]);
    $rawTotp = $readTotp->fetchColumn();
    if ($rawTotp !== false) {
        $records = json_decode((string)$rawTotp, true);
        if (!is_array($records)) throw new RuntimeException('Stored authenticator data is invalid; password was not changed.');
        unset($records[(string)$user['id']]);
        if ($records) {
            $writeTotp = $pdo->prepare('UPDATE nab_state SET state_json = ?, updated_at = UTC_TIMESTAMP(), updated_by = NULL WHERE state_key = ?');
            $writeTotp->execute([json_encode($records, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), $totpKey]);
        } else {
            $deleteTotp = $pdo->prepare('DELETE FROM nab_state WHERE state_key = ?');
            $deleteTotp->execute([$totpKey]);
        }
    }
    $update = $pdo->prepare('UPDATE nab_users SET password_hash = ?, auth_version = auth_version + 1, updated_at = UTC_TIMESTAMP() WHERE id = ?');
    $update->execute([$passwordHash, (int)$user['id']]);
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $release = $pdo->prepare('SELECT RELEASE_LOCK(?)');
    $release->execute([$lockName]);
    nab_cli_fail('Password reset failed: ' . $error->getMessage() . ' No data was changed.');
}
$release = $pdo->prepare('SELECT RELEASE_LOCK(?)');
$release->execute([$lockName]);

fwrite(STDOUT, 'Password reset for ' . $username . '. Existing sessions have been invalidated.' . PHP_EOL);
fwrite(STDOUT, 'Any registered authenticator for this account was removed; re-enroll after signing in if two-factor login is required.' . PHP_EOL);
fwrite(STDOUT, 'Temporary password (shown once): ' . $temporaryPassword . PHP_EOL);
fwrite(STDOUT, 'Sign in locally, change it immediately in Profile, then close this terminal without sharing its output.' . PHP_EOL);
