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
$stmt = $pdo->prepare('SELECT id, username FROM nab_users WHERE username = ? LIMIT 1');
$stmt->execute([$username]);
$user = $stmt->fetch();
if (!$user) nab_cli_fail('User not found; no data was changed.');

// Generate a high-entropy temporary password; it is printed once to this local terminal only.
$temporaryPassword = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
$passwordHash = password_hash($temporaryPassword, PASSWORD_DEFAULT);
$update = $pdo->prepare('UPDATE nab_users SET password_hash = ?, auth_version = auth_version + 1, updated_at = UTC_TIMESTAMP() WHERE id = ?');
$update->execute([$passwordHash, (int)$user['id']]);

fwrite(STDOUT, 'Password reset for ' . $username . '. Existing sessions have been invalidated.' . PHP_EOL);
fwrite(STDOUT, 'Temporary password (shown once): ' . $temporaryPassword . PHP_EOL);
fwrite(STDOUT, 'Sign in locally, change it immediately in Profile, then close this terminal without sharing its output.' . PHP_EOL);
