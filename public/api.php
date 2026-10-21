<?php
declare(strict_types=1);

/* Same-origin PHP/MySQL API. Credentials live in ../nab-config.php, outside the web root. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

function reply(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $message): never {
    reply($status, ['success' => false, 'error' => $message]);
}

function json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    if (strlen($raw) > 10 * 1024 * 1024) fail(413, 'حجم درخواست بیش از حد مجاز است.');
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) fail(400, 'بدنهٔ JSON معتبر نیست.');
    return $decoded;
}

function db_connection(array $config): PDO {
    $host = (string)($config['db_host'] ?? 'localhost');
    $port = (int)($config['db_port'] ?? 3306);
    $name = (string)($config['db_name'] ?? '');
    $user = (string)($config['db_user'] ?? '');
    $pass = (string)($config['db_password'] ?? '');
    if ($name === '' || $user === '') throw new RuntimeException('Database configuration is incomplete.');
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    return new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function text_length(string $value): int {
    if (function_exists('mb_strlen')) return mb_strlen($value, 'UTF-8');
    $count = preg_match_all('/./us', $value, $matches);
    return $count === false ? strlen($value) : $count;
}

function text_substring(string $value, int $start, int $length): string {
    if (function_exists('mb_substr')) return mb_substr($value, $start, $length, 'UTF-8');
    $characters = preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY);
    return $characters === false ? substr($value, $start, $length) : implode('', array_slice($characters, $start, $length));
}

function normalize_digits(string $value): string {
    return strtr($value, [
        '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
        '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
        '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
    ]);
}

function all_permissions(): array {
    return ['view_persons', 'create_person', 'edit_person', 'change_status', 'view_activities', 'manage_users', 'view_reports', 'delete_person'];
}

function default_roles(): array {
    return [
        ['id' => 'admin', 'title' => 'مدیر سیستم', 'permissions' => all_permissions(), 'builtin' => true],
        ['id' => 'assistant', 'title' => 'کارشناس پرونده', 'permissions' => ['view_persons', 'create_person', 'edit_person'], 'builtin' => true],
        ['id' => 'reviewer', 'title' => 'کارشناس مرکز', 'permissions' => ['view_persons', 'change_status', 'view_activities'], 'builtin' => true],
    ];
}

function default_workflow_config(): array {
    return [
        'version' => 1,
        'startStageId' => 'request',
        'stages' => [
            ['id' => 'request', 'label' => 'درخواست پرونده', 'tone' => 'blue', 'nextStageIds' => ['personnel'], 'checklist' => []],
            ['id' => 'personnel', 'label' => 'پرونده پرسنلی', 'tone' => 'indigo', 'nextStageIds' => ['ordinary-card'], 'checklist' => []],
            ['id' => 'ordinary-card', 'label' => 'کارت عادی', 'tone' => 'purple', 'nextStageIds' => ['three-page'], 'checklist' => []],
            ['id' => 'three-page', 'label' => 'سه‌برگی عادی', 'tone' => 'purple', 'nextStageIds' => ['complete-info'], 'checklist' => []],
            ['id' => 'complete-info', 'label' => 'تکمیل اطلاعات', 'tone' => 'amber', 'nextStageIds' => ['active'], 'checklist' => []],
            ['id' => 'active', 'label' => 'پرونده فعال', 'tone' => 'green', 'nextStageIds' => ['center-sent'], 'checklist' => [], 'metric' => 'active'],
            ['id' => 'center-sent', 'label' => 'ارسال به مرکز', 'tone' => 'cyan', 'nextStageIds' => ['center-review'], 'checklist' => []],
            ['id' => 'center-review', 'label' => 'بررسی مرکز', 'tone' => 'orange', 'nextStageIds' => ['approved', 'rejected'], 'checklist' => [], 'metric' => 'review'],
            ['id' => 'approved', 'label' => 'تأیید شده', 'tone' => 'green', 'nextStageIds' => ['company-sent'], 'checklist' => []],
            ['id' => 'rejected', 'label' => 'رد شده', 'tone' => 'red', 'nextStageIds' => ['complete-info'], 'checklist' => [], 'metric' => 'rejected'],
            ['id' => 'company-sent', 'label' => 'ارسال به شرکت', 'tone' => 'pink', 'nextStageIds' => ['completed'], 'checklist' => []],
            ['id' => 'completed', 'label' => 'پایان کار', 'tone' => 'slate', 'nextStageIds' => [], 'checklist' => [], 'isFinal' => true, 'metric' => 'completed'],
        ],
    ];
}

function workflow_config(PDO $pdo): array {
    $stored = state_value($pdo, 'nab:workflow', []);
    $candidate = isset($stored[0]) && is_array($stored[0]) ? $stored[0] : $stored;
    if (!is_array($candidate) || (int)($candidate['version'] ?? 0) !== 1 || !is_array($candidate['stages'] ?? null)) return default_workflow_config();
    return $candidate;
}

function workflow_stage(array $workflow, string $id): ?array {
    foreach (($workflow['stages'] ?? []) as $stage) {
        if (is_array($stage) && (string)($stage['id'] ?? '') === $id) return $stage;
    }
    return null;
}

function normalize_person_stage(array $person, array $workflow, bool $isNew = false): array {
    $stage = null;
    $stageId = trim((string)($person['stageId'] ?? ''));
    if ($stageId !== '') $stage = workflow_stage($workflow, $stageId);
    if (!$stage) {
        $status = trim((string)($person['status'] ?? ''));
        foreach (($workflow['stages'] ?? []) as $candidate) {
            if (is_array($candidate) && (string)($candidate['label'] ?? '') === $status) { $stage = $candidate; break; }
        }
        // Map legacy records by the original stable IDs even if an administrator already renamed a stage.
        if (!$stage) {
            foreach (default_workflow_config()['stages'] as $legacy) {
                if ((string)$legacy['label'] === $status) {
                    $stage = workflow_stage($workflow, (string)$legacy['id']);
                    if ($stage) break;
                }
            }
        }
    }
    if (!$stage) fail(422, 'مرحلهٔ پرونده با گردش‌کار فعلی تطبیق ندارد.');
    if ($isNew && !empty($stage['archived'])) fail(422, 'پروندهٔ جدید نمی‌تواند در مرحلهٔ بایگانی‌شده ثبت شود.');
    if ($isNew && (string)$stage['id'] !== (string)($workflow['startStageId'] ?? 'request')) fail(422, 'پروندهٔ جدید باید از مرحلهٔ آغازین گردش‌کار شروع شود.');
    $person['stageId'] = (string)$stage['id'];
    $person['status'] = (string)$stage['label'];
    if (!isset($person['stageChecklist']) || !is_array($person['stageChecklist'])) $person['stageChecklist'] = [];
    return $person;
}

function user_permissions(array $user): array {
    $permissions = json_decode((string)($user['permissions_json'] ?? '[]'), true);
    if (!is_array($permissions)) return [];
    return array_values(array_intersect(all_permissions(), array_unique($permissions)));
}

function has_permission(array $user, string $permission): bool {
    return in_array($permission, user_permissions($user), true);
}

function safe_user(array $row): array {
    return [
        'name' => (string)$row['display_name'],
        'username' => (string)$row['username'],
        'role' => (string)$row['role_id'],
        'title' => (string)$row['title'],
        'tone' => (string)$row['tone'],
        'active' => (bool)$row['is_active'],
        'permissions' => user_permissions($row),
        'photo' => $row['photo'] !== null && $row['photo'] !== '' ? (string)$row['photo'] : null,
    ];
}

function find_user_by_id(PDO $pdo, int $id): ?array {
    $stmt = $pdo->prepare('SELECT * FROM nab_users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function current_user(PDO $pdo): ?array {
    if (empty($_SESSION['user_id']) || empty($_SESSION['auth_version'])) return null;
    $user = find_user_by_id($pdo, (int)$_SESSION['user_id']);
    if (!$user || !(bool)$user['is_active'] || (int)$user['auth_version'] !== (int)$_SESSION['auth_version']) {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        return null;
    }
    return $user;
}

function require_user(PDO $pdo): array {
    $user = current_user($pdo);
    if (!$user) fail(401, 'نشست شما معتبر نیست یا منقضی شده است؛ دوباره وارد شوید.');
    return $user;
}

function require_csrf(): void {
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';
    if (!is_string($provided) || !is_string($expected) || $expected === '' || !hash_equals($expected, $provided)) {
        fail(403, 'درخواست امن تأیید نشد؛ صفحه را تازه‌سازی کنید.');
    }
}

function state_value(PDO $pdo, string $key, $fallback = []): array {
    $stmt = $pdo->prepare('SELECT state_json FROM nab_state WHERE state_key = ? LIMIT 1');
    $stmt->execute([$key]);
    $raw = $stmt->fetchColumn();
    if ($raw === false) return $fallback;
    $value = json_decode((string)$raw, true);
    return is_array($value) ? $value : $fallback;
}

function state_version(PDO $pdo, string $key): string {
    $stmt = $pdo->prepare('SELECT state_json FROM nab_state WHERE state_key = ? LIMIT 1');
    $stmt->execute([$key]);
    $raw = $stmt->fetchColumn();
    $basis = $raw === false ? "missing\0" . $key : "stored\0" . (string)$raw;
    return hash('sha256', $basis);
}

function state_versions(PDO $pdo, array $user): array {
    $keys = ['nab:people', 'nab:activities', 'nab:audit', 'nab:roles', 'nab:notes', 'nab:workflow', 'nab:tasks:' . (string)$user['username']];
    $versions = [];
    foreach ($keys as $key) $versions[$key] = state_version($pdo, $key);
    return $versions;
}

function verify_expected_state_version(PDO $pdo, string $key, string $expected): void {
    if (!preg_match('/^[a-f0-9]{64}$/', $expected)) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        release_state_write_lock($pdo);
        reply(428, ['success' => false, 'code' => 'missing_state_version', 'error' => 'نسخهٔ ذخیره‌سازی منقضی یا ناسازگار است؛ صفحه را تازه‌سازی کنید.']);
    }
    $current = state_version($pdo, $key);
    if (!hash_equals($current, $expected)) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        release_state_write_lock($pdo);
        reply(409, ['success' => false, 'code' => 'state_conflict', 'error' => 'این داده از نشست دیگری تغییر کرده است. ذخیره متوقف شد تا تغییرها بازنویسی نشوند؛ صفحه را تازه‌سازی کنید و تغییر خود را دوباره اعمال کنید.']);
    }
}

function put_state(PDO $pdo, string $key, array $value, ?int $userId): void {
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $stmt = $pdo->prepare('INSERT INTO nab_state (state_key, state_json, updated_at, updated_by) VALUES (?, ?, UTC_TIMESTAMP(), ?) ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)');
    $stmt->execute([$key, $json, $userId]);
}

function state_write_lock_name(PDO $pdo): string {
    $database = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
    return 'nab-write-' . substr(hash('sha256', $database), 0, 50);
}

function acquire_state_write_lock(PDO $pdo): void {
    $stmt = $pdo->prepare('SELECT GET_LOCK(?, 10)');
    $stmt->execute([state_write_lock_name($pdo)]);
    if ((int)$stmt->fetchColumn() !== 1) fail(503, 'ذخیره‌سازی هم‌زمان در حال انجام است؛ چند لحظه دیگر دوباره تلاش کنید.');
}

function release_state_write_lock(PDO $pdo): void {
    $stmt = $pdo->prepare('SELECT RELEASE_LOCK(?)');
    $stmt->execute([state_write_lock_name($pdo)]);
}

function list_users(PDO $pdo, array $viewer): array {
    $rows = $pdo->query('SELECT * FROM nab_users ORDER BY display_name, username')->fetchAll();
    $canManageUsers = has_permission($viewer, 'manage_users');
    return array_map(static function (array $row) use ($viewer, $canManageUsers): array {
        if ($canManageUsers || (int)$row['id'] === (int)$viewer['id']) return safe_user($row);
        // Non-admin screens need only assignment/mention labels, not other users' permissions or profile photos.
        return [
            'name' => (string)$row['display_name'],
            'username' => (string)$row['username'],
            'title' => (string)$row['title'],
            'active' => (bool)$row['is_active'],
        ];
    }, $rows);
}

function note_owner_username(PDO $pdo, array $note): ?string {
    if (!empty($note['ownerVerified']) && isset($note['authorUsername']) && is_string($note['authorUsername']) && $note['authorUsername'] !== '') {
        return $note['authorUsername'];
    }
    $author = trim((string)($note['author'] ?? ''));
    if ($author === '') return null;
    $stmt = $pdo->prepare('SELECT username FROM nab_users WHERE display_name = ? ORDER BY username LIMIT 2');
    $stmt->execute([$author]);
    $matches = $stmt->fetchAll(PDO::FETCH_COLUMN);
    return count($matches) === 1 ? (string)$matches[0] : null;
}

function notes_payload(PDO $pdo): array {
    $notes = state_value($pdo, 'nab:notes', []);
    foreach ($notes as &$note) {
        if (!is_array($note)) continue;
        $owner = note_owner_username($pdo, $note);
        unset($note['ownerVerified']);
        if ($owner !== null) $note['authorUsername'] = $owner;
        else unset($note['authorUsername']);
    }
    unset($note);
    return $notes;
}

function state_payload(PDO $pdo, array $user): array {
    $canViewPeople = has_permission($user, 'view_persons');
    $canViewActivities = has_permission($user, 'view_activities');
    $canManageUsers = has_permission($user, 'manage_users');
    $workflow = workflow_config($pdo);
    $people = $canViewPeople ? state_value($pdo, 'nab:people', []) : [];
    if ($canViewPeople) {
        foreach ($people as &$person) if (is_array($person)) $person = normalize_person_stage($person, $workflow, false);
        unset($person);
    }
    return [
        'user' => safe_user($user),
        'users' => list_users($pdo, $user),
        'csrf' => (string)($_SESSION['csrf_token'] ?? ''),
        'state_versions' => state_versions($pdo, $user),
        'state' => [
            'nab:people' => $people,
            'nab:workflow' => [$workflow],
            'nab:activities' => $canViewActivities ? state_value($pdo, 'nab:activities', []) : [],
            'nab:audit' => ($canManageUsers || has_permission($user, 'view_reports')) ? state_value($pdo, 'nab:audit', []) : [],
            'nab:roles' => $canManageUsers ? state_value($pdo, 'nab:roles', default_roles()) : [],
            'nab:notes' => $canViewPeople ? notes_payload($pdo) : [],
            'tasks' => state_value($pdo, 'nab:tasks:' . (string)$user['username'], []),
            'legacy_tasks_imported' => state_value($pdo, 'nab:legacy_tasks_imported:' . (string)$user['username'], []),
            'legacy_migration_completed' => $canManageUsers ? state_value($pdo, 'nab:legacy_migration_completed', []) : [],
        ],
    ];
}

function jalali_jdn(int $year, int $month, int $day): int {
    $epbase = $year - ($year >= 0 ? 474 : 473);
    $epyear = 474 + ((($epbase % 2820) + 2820) % 2820);
    return $day
        + ($month <= 7 ? ($month - 1) * 31 : ($month - 1) * 30 + 6)
        + (int)floor(($epyear * 682 - 110) / 2816)
        + ($epyear - 1) * 365
        + (int)floor($epbase / 2820) * 1029983
        + 1948320;
}

function valid_jalali_date(string $value, bool $allowEmpty = false): bool {
    $value = normalize_digits(trim($value));
    if ($value === '') return $allowEmpty;
    if (!preg_match('/^(13|14)\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/', $value, $m)) return false;
    $year = (int)substr($value, 0, 4);
    $month = (int)$m[2];
    $day = (int)$m[3];
    $first = jalali_jdn($year, $month, 1);
    $next = $month === 12 ? jalali_jdn($year + 1, 1, 1) : jalali_jdn($year, $month + 1, 1);
    return $day <= ($next - $first);
}

function valid_national_id(string $value): bool {
    $digits = normalize_digits(trim($value));
    if (!preg_match('/^\d{10}$/', $digits) || preg_match('/^(\d)\1{9}$/', $digits)) return false;
    $sum = 0;
    for ($i = 0; $i < 9; $i++) $sum += ((int)$digits[$i]) * (10 - $i);
    $remainder = $sum % 11;
    $check = (int)$digits[9];
    return $check === ($remainder < 2 ? $remainder : 11 - $remainder);
}

function server_timestamp_ms(): int {
    return (int)floor(microtime(true) * 1000);
}

function server_timestamp_iso(): string {
    return gmdate('Y-m-d\\TH:i:s\\Z');
}

function clean_person(array $person, array $actor, array $workflow, bool $isNew = false): array {
    $person = normalize_person_stage($person, $workflow, $isNew);
    $person['id'] = trim((string)($person['id'] ?? ''));
    $person['firstName'] = trim((string)($person['firstName'] ?? ''));
    $person['lastName'] = trim((string)($person['lastName'] ?? ''));
    $person['fatherName'] = trim((string)($person['fatherName'] ?? ''));
    $person['nationalId'] = normalize_digits(trim((string)($person['nationalId'] ?? '')));
    if ($person['id'] === '' || strlen($person['id']) > 80 || $person['firstName'] === '' || $person['lastName'] === '' || $person['fatherName'] === '') fail(422, 'اطلاعات فرد ناقص است.');
    if (text_length($person['firstName']) > 100 || text_length($person['lastName']) > 100 || text_length($person['fatherName']) > 100) fail(422, 'طول نام بیش از حد مجاز است.');
    if (!valid_national_id($person['nationalId'])) fail(422, 'کد ملی معتبر نیست.');
    if (trim((string)($person['status'] ?? '')) === '') fail(422, 'مرحلهٔ پرونده معتبر نیست.');
    $deadline = (string)($person['deadline'] ?? '');
    if ($deadline !== '' && $deadline !== '—' && !valid_jalali_date($deadline)) fail(422, 'تاریخ مهلت معتبر نیست.');
    if (isset($person['photo']) && is_string($person['photo']) && strlen($person['photo']) > 2 * 1024 * 1024) fail(413, 'حجم عکس بیش از حد مجاز است.');
    $person['updatedBy'] = (string)$actor['display_name'];
    $person['updatedAt'] = server_timestamp_iso();
    $person['ts'] = server_timestamp_ms();
    return $person;
}

function workflow_checklist_missing(array $stage, array $person): array {
    $progress = $person['stageChecklist'][$stage['id'] ?? ''] ?? [];
    $missing = [];
    foreach (($stage['checklist'] ?? []) as $rule) {
        if (!is_array($rule)) continue;
        $ruleId = (string)($rule['id'] ?? '');
        if ($ruleId === '' || empty($progress[$ruleId]['done'])) $missing[] = (string)($rule['label'] ?? $ruleId);
    }
    return $missing;
}

function authorize_stage_checklist(array $before, array $candidate, array $user, array $workflow): array {
    $oldProgress = is_array($before['stageChecklist'] ?? null) ? $before['stageChecklist'] : [];
    $requested = is_array($candidate['stageChecklist'] ?? null) ? $candidate['stageChecklist'] : [];
    $currentId = (string)($before['stageId'] ?? '');
    $stage = workflow_stage($workflow, $currentId);
    if (!$stage) fail(422, 'مرحلهٔ جاری پرونده در گردش‌کار پیدا نشد.');
    $oldCurrent = is_array($oldProgress[$currentId] ?? null) ? $oldProgress[$currentId] : [];
    $requestedCurrent = is_array($requested[$currentId] ?? null) ? $requested[$currentId] : $oldCurrent;
    if (!has_permission($user, 'change_status') && $requestedCurrent !== $oldCurrent) fail(403, 'مجوز تکمیل چک‌لیست مرحله را ندارید.');

    $allowed = [];
    foreach (($stage['checklist'] ?? []) as $rule) {
        if (!is_array($rule) || !isset($rule['id'])) continue;
        $ruleId = (string)$rule['id'];
        $allowed[$ruleId] = true;
    }
    foreach ($requestedCurrent as $ruleId => $_) {
        if (!isset($allowed[(string)$ruleId]) && !array_key_exists((string)$ruleId, $oldCurrent)) fail(422, 'چک‌لیست ارسالی با تعریف فعلی مرحله تطبیق ندارد.');
    }

    $current = [];
    // Keep completion records for rules an administrator has since removed; do not let clients rewrite them.
    foreach ($oldCurrent as $ruleId => $mark) if (!isset($allowed[(string)$ruleId])) $current[(string)$ruleId] = $mark;
    foreach ($allowed as $ruleId => $_) {
        $oldMark = is_array($oldCurrent[$ruleId] ?? null) ? $oldCurrent[$ruleId] : ['done' => false];
        $newMark = is_array($requestedCurrent[$ruleId] ?? null) ? $requestedCurrent[$ruleId] : $oldMark;
        $oldDone = !empty($oldMark['done']);
        $newDone = !empty($newMark['done']);
        if ($oldDone && !$newDone) fail(422, 'موارد تکمیل‌شده قابل پاک‌کردن نیستند؛ برای اصلاح از مدیر سامانه کمک بگیرید.');
        if ($newDone) {
            if (!$oldDone) {
                $current[$ruleId] = ['done' => true, 'checkedBy' => (string)$user['display_name'], 'checkedAt' => server_timestamp_iso()];
            } else {
                $current[$ruleId] = [
                    'done' => true,
                    'checkedBy' => (string)($oldMark['checkedBy'] ?? ''),
                    'checkedAt' => (string)($oldMark['checkedAt'] ?? ''),
                ];
            }
        } else {
            $current[$ruleId] = ['done' => false];
        }
    }
    $result = $oldProgress;
    if ($current) $result[$currentId] = $current;
    else unset($result[$currentId]);
    return $result;
}

function authorize_people_change(PDO $pdo, array $user, array $next): array {
    if (!has_permission($user, 'view_persons')) fail(403, 'مجوز دسترسی به پرونده‌ها را ندارید.');
    if (!is_array($next) || count($next) > 10000) fail(422, 'فهرست پرونده‌ها معتبر نیست.');
    $workflow = workflow_config($pdo);
    $old = state_value($pdo, 'nab:people', []);
    $oldById = [];
    foreach ($old as $row) if (is_array($row) && isset($row['id'])) $oldById[(string)$row['id']] = normalize_person_stage($row, $workflow, false);
    $newById = [];
    foreach ($next as $row) {
        if (!is_array($row) || !isset($row['id'])) fail(422, 'ساختار پرونده معتبر نیست.');
        $id = (string)$row['id'];
        if (isset($newById[$id])) fail(422, 'شناسهٔ پرونده تکراری است.');
        $newById[$id] = $row;
    }
    foreach ($oldById as $id => $oldRow) {
        if (!isset($newById[$id]) && !has_permission($user, 'delete_person')) fail(403, 'مجوز حذف پرونده را ندارید.');
    }
    $clean = [];
    $nationalIds = [];
    foreach ($newById as $id => $row) {
        if (!isset($oldById[$id])) {
            if (!has_permission($user, 'create_person')) fail(403, 'مجوز ایجاد پرونده را ندارید.');
            $row = clean_person($row, $user, $workflow, true);
            // Never accept checklist completions supplied with a new record.
            $row['stageChecklist'] = [];
        } else {
            $before = $oldById[$id];
            if ((string)($before['id'] ?? '') !== $id) fail(422, 'شناسهٔ پرونده قابل تغییر نیست.');
            $row = normalize_person_stage($row, $workflow, false);
            $row['stageChecklist'] = authorize_stage_checklist($before, $row, $user, $workflow);
            $beforeStageId = (string)$before['stageId'];
            $afterStageId = (string)$row['stageId'];
            $stageChanged = $beforeStageId !== $afterStageId;
            if ($stageChanged) {
                if (!has_permission($user, 'change_status')) fail(403, 'مجوز تغییر مرحله را ندارید.');
                $fromStage = workflow_stage($workflow, $beforeStageId);
                $toStage = workflow_stage($workflow, $afterStageId);
                if (!$fromStage || !$toStage || !empty($toStage['archived']) || !in_array($afterStageId, $fromStage['nextStageIds'] ?? [], true)) fail(422, 'این مسیر انتقال در گردش‌کار تعریف نشده است.');
                $missing = workflow_checklist_missing($fromStage, $row);
                if ($missing) fail(422, 'ابتدا چک‌لیست «' . implode('، ', $missing) . '» را تکمیل کنید.');
            }
            $beforeCompare = $before;
            $afterCompare = $row;
            foreach (['updatedAt', 'updatedBy', 'ts'] as $ignored) { unset($beforeCompare[$ignored], $afterCompare[$ignored]); }
            $changed = [];
            foreach (array_unique(array_merge(array_keys($beforeCompare), array_keys($afterCompare))) as $field) {
                if (($beforeCompare[$field] ?? null) !== ($afterCompare[$field] ?? null)) $changed[] = $field;
            }
            if (in_array('status', $changed, true) || in_array('stageId', $changed, true)) {
                if (!has_permission($user, 'change_status')) fail(403, 'مجوز تغییر وضعیت را ندارید.');
            }
            if (in_array('assignee', $changed, true) && !has_permission($user, 'change_status')) fail(403, 'مجوز ارجاع پرونده را ندارید.');
            if (in_array('stageChecklist', $changed, true) && !has_permission($user, 'change_status')) fail(403, 'مجوز تکمیل چک‌لیست مرحله را ندارید.');
            $editable = array_diff($changed, ['status', 'stageId', 'assignee', 'stageChecklist']);
            if (count($editable) > 0 && !has_permission($user, 'edit_person')) fail(403, 'مجوز ویرایش اطلاعات پرونده را ندارید.');
            if (count($changed) > 0) {
                $row = clean_person($row, $user, $workflow, false);
            } else {
                // Metadata-only client changes are discarded; an unchanged record keeps the server's stored stamp.
                foreach (['updatedAt', 'updatedBy', 'ts'] as $serverField) {
                    if (array_key_exists($serverField, $before)) $row[$serverField] = $before[$serverField];
                    else unset($row[$serverField]);
                }
            }
        }
        $nid = normalize_digits((string)($row['nationalId'] ?? ''));
        if (isset($nationalIds[$nid]) && $nationalIds[$nid] !== $id) fail(409, 'کد ملی تکراری است.');
        $nationalIds[$nid] = $id;
        $clean[] = $row;
    }
    return $clean;
}

function event_permission(string $action): ?string {
    $permissions = [
        'ثبت پرونده جدید' => 'create_person',
        'ایجاد پرونده جدید' => 'create_person',
        'افزودن فرد جدید' => 'create_person',
        'تغییر وضعیت' => 'change_status',
        'تغییر وضعیت پرونده' => 'change_status',
        'تکمیل چک‌لیست' => 'change_status',
        'رد پرونده' => 'change_status',
        'ویرایش اطلاعات فرد' => 'edit_person',
        'حذف پرونده' => 'delete_person',
        'ورود به سامانه' => 'view_persons',
        'ثبت یادداشت' => 'view_persons',
        'ویرایش یادداشت' => 'view_persons',
        'حذف یادداشت' => 'view_persons',
    ];
    return $permissions[$action] ?? null;
}

function sanitize_append_only(PDO $pdo, array $user, string $key, array $next): array {
    $old = state_value($pdo, $key, []);
    $oldById = [];
    foreach ($old as $row) if (is_array($row) && isset($row['id'])) $oldById[(string)$row['id']] = $row;
    $seen = [];
    $out = [];
    foreach ($next as $row) {
        if (!is_array($row) || !isset($row['id'])) fail(422, 'رویداد معتبر نیست.');
        $id = (string)$row['id'];
        if (isset($seen[$id])) fail(422, 'شناسهٔ رویداد تکراری است.');
        $seen[$id] = true;
        if (isset($oldById[$id])) {
            $beforeCompare = $oldById[$id];
            $afterCompare = $row;
            foreach (['createdBy', 'createdByRole', 'createdAt', 'ts'] as $serverField) { unset($beforeCompare[$serverField], $afterCompare[$serverField]); }
            if (json_encode($beforeCompare, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) !== json_encode($afterCompare, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) fail(403, 'رویدادهای ثبت‌شده قابل ویرایش نیستند.');
            $out[] = $oldById[$id];
            continue;
        }
        $action = trim((string)($row['action'] ?? ''));
        $needed = event_permission($action);
        if ($needed === null) fail(422, 'نوع رویداد معتبر نیست.');
        if (!has_permission($user, $needed)) fail(403, 'مجوز ثبت این رویداد را ندارید.');
        $row['action'] = text_substring($action, 0, 160);
        $row['createdBy'] = (string)$user['display_name'];
        $row['createdAt'] = server_timestamp_iso();
        $row['ts'] = server_timestamp_ms();
        if ($key === 'nab:activities') $row['createdByRole'] = (string)$user['role_id'];
        $out[] = $row;
    }
    // Hidden activity/audit arrays are returned as empty to restricted users. Missing old rows are preserved,
    // so a client can append permitted events without being able to delete or rewrite the log.
    foreach ($oldById as $id => $row) if (!isset($seen[$id])) $out[] = $row;
    return $out;
}

function authorize_notes(PDO $pdo, array $user, array $next): array {
    if (!has_permission($user, 'view_persons')) fail(403, 'مجوز دسترسی به گفتگوها را ندارید.');
    if (count($next) > 50000) fail(422, 'تعداد یادداشت‌ها بیش از حد مجاز است.');
    $old = state_value($pdo, 'nab:notes', []);
    $oldById = [];
    foreach ($old as $row) if (is_array($row) && isset($row['id'])) $oldById[(string)$row['id']] = $row;
    $nextById = [];
    foreach ($next as $row) {
        if (!is_array($row) || !isset($row['id'], $row['personId'])) fail(422, 'یادداشت معتبر نیست.');
        $id = (string)$row['id'];
        if ($id === '' || strlen($id) > 100 || isset($nextById[$id])) fail(422, 'شناسهٔ یادداشت تکراری یا نامعتبر است.');
        $nextById[$id] = $row;
    }
    $isAdmin = (string)$user['role_id'] === 'admin';
    $username = (string)$user['username'];
    foreach ($oldById as $id => $oldRow) {
        if (!isset($nextById[$id])) {
            $owner = note_owner_username($pdo, $oldRow);
            if (!$isAdmin && $owner !== $username) fail(403, 'فقط نویسنده یا مدیر می‌تواند یادداشت را حذف کند.');
        }
    }
    $out = [];
    foreach ($nextById as $id => $row) {
        if (isset($oldById[$id])) {
            $before = $oldById[$id];
            $owner = note_owner_username($pdo, $before);
            $beforeCompare = $before;
            $afterCompare = $row;
            foreach (['author', 'authorUsername', 'ownerVerified', 'role', 'title', 'createdAt', 'ts', 'editedAt', 'editedAtTs', 'editedBy', 'editedByUsername'] as $serverField) {
                unset($beforeCompare[$serverField], $afterCompare[$serverField]);
            }
            $changed = json_encode($beforeCompare, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) !== json_encode($afterCompare, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($changed) {
                if (!$isAdmin && $owner !== $username) fail(403, 'فقط نویسنده یا مدیر می‌تواند یادداشت را ویرایش کند.');
                $text = trim((string)($row['text'] ?? ''));
                if ($text === '' || text_length($text) > 10000) fail(422, 'متن یادداشت خالی یا بیش از حد طولانی است.');
                $row['author'] = (string)($before['author'] ?? '');
                $row['role'] = (string)($before['role'] ?? 'assistant');
                $row['title'] = (string)($before['title'] ?? 'کارشناس');
                $row['createdAt'] = (string)($before['createdAt'] ?? server_timestamp_iso());
                $row['ts'] = $before['ts'] ?? null;
                if ($owner !== null) {
                    $row['authorUsername'] = $owner;
                    $row['ownerVerified'] = true;
                } else {
                    unset($row['authorUsername'], $row['ownerVerified']);
                }
                $row['edited'] = true;
                $row['editedAt'] = server_timestamp_iso();
                $row['editedAtTs'] = server_timestamp_ms();
                $row['editedBy'] = (string)$user['display_name'];
                $row['editedByUsername'] = $username;
            } else {
                // Ignore metadata-only changes and promote only uniquely identifiable legacy authors.
                $row = $before;
                if ($owner !== null) {
                    $row['authorUsername'] = $owner;
                    $row['ownerVerified'] = true;
                } else {
                    unset($row['authorUsername'], $row['ownerVerified']);
                }
            }
        } else {
            $text = trim((string)($row['text'] ?? ''));
            $personId = trim((string)($row['personId'] ?? ''));
            if ($personId === '' || strlen($personId) > 80 || $text === '' || text_length($text) > 10000) fail(422, 'متن یادداشت خالی یا بیش از حد طولانی است.');
            $row['personId'] = $personId;
            $row['text'] = $text;
            $row['author'] = (string)$user['display_name'];
            $row['authorUsername'] = $username;
            $row['ownerVerified'] = true;
            $row['role'] = (string)$user['role_id'];
            $row['title'] = (string)$user['title'];
            $row['createdAt'] = server_timestamp_iso();
            $row['ts'] = server_timestamp_ms();
            unset($row['editedAt'], $row['editedAtTs'], $row['editedBy'], $row['editedByUsername']);
        }
        $out[] = $row;
    }
    return $out;
}

function check_password_length(string $password): void {
    if (text_length($password) < 12 || text_length($password) > 1024) fail(422, 'رمز عبور باید بین ۱۲ تا ۱۰۲۴ نویسه باشد.');
}

function validate_username(string $username): string {
    $username = strtolower(trim($username));
    if (!preg_match('/^[a-z0-9_.-]{3,64}$/', $username)) fail(422, 'نام کاربری باید ۳ تا ۶۴ نویسه و شامل حروف لاتین، عدد، نقطه، خط تیره یا زیرخط باشد.');
    return $username;
}

function get_user_by_username(PDO $pdo, string $username): ?array {
    $stmt = $pdo->prepare('SELECT * FROM nab_users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function require_manage_users(array $user): void {
    if (!has_permission($user, 'manage_users')) fail(403, 'مجوز مدیریت کاربران را ندارید.');
}

function is_system_admin(array $user): bool {
    return (string)$user['role_id'] === 'admin';
}

function validate_permissions($permissions, array $actor): array {
    if (!is_array($permissions)) fail(422, 'فهرست مجوزها معتبر نیست.');
    $permissions = array_values(array_unique(array_intersect(all_permissions(), $permissions)));
    if (!$permissions) fail(422, 'حداقل یک مجوز باید فعال باشد.');
    if (!is_system_admin($actor) && count(array_diff($permissions, user_permissions($actor))) > 0) fail(403, 'نمی‌توانید مجوزی فراتر از سطح دسترسی خود اعطا کنید.');
    return $permissions;
}

function ensure_another_admin(PDO $pdo, int $targetId): void {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM nab_users WHERE role_id = 'admin' AND is_active = 1 AND id <> ?");
    $stmt->execute([$targetId]);
    if ((int)$stmt->fetchColumn() < 1) fail(409, 'سامانه باید دست‌کم یک مدیر فعال داشته باشد.');
}

function updated_user(PDO $pdo, string $username): array {
    $row = get_user_by_username($pdo, $username);
    if (!$row) fail(404, 'کاربر پیدا نشد.');
    return safe_user($row);
}

function validate_workflow_definition($input): array {
    if (!is_array($input) || (int)($input['version'] ?? 0) !== 1 || !is_array($input['stages'] ?? null)) fail(422, 'تعریف گردش‌کار معتبر نیست.');
    $rawStages = $input['stages'];
    if (count($rawStages) < 2 || count($rawStages) > 60) fail(422, 'گردش‌کار باید بین ۲ تا ۶۰ مرحله داشته باشد.');
    $tones = ['blue', 'indigo', 'purple', 'amber', 'orange', 'green', 'cyan', 'red', 'pink', 'slate'];
    $metrics = ['active', 'review', 'rejected', 'completed'];
    $stages = [];
    $ids = [];
    $labels = [];
    foreach ($rawStages as $raw) {
        if (!is_array($raw)) fail(422, 'یکی از مرحله‌های گردش‌کار معتبر نیست.');
        $id = strtolower(trim((string)($raw['id'] ?? '')));
        $label = trim((string)($raw['label'] ?? ''));
        $tone = (string)($raw['tone'] ?? 'slate');
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{1,63}$/', $id) || isset($ids[$id])) fail(422, 'شناسهٔ مرحله تکراری یا نامعتبر است.');
        if ($label === '' || text_length($label) > 100 || isset($labels[$label])) fail(422, 'عنوان مرحله خالی، طولانی یا تکراری است.');
        if (!in_array($tone, $tones, true)) fail(422, 'رنگ مرحله معتبر نیست.');
        $ids[$id] = true;
        $labels[$label] = true;
        $next = $raw['nextStageIds'] ?? [];
        if (!is_array($next) || count($next) > 20) fail(422, 'مسیرهای مرحله معتبر نیستند.');
        $next = array_values(array_unique(array_map(static fn($v) => trim((string)$v), $next)));
        $checklist = $raw['checklist'] ?? [];
        if (!is_array($checklist) || count($checklist) > 50) fail(422, 'تعداد چک‌لیست یک مرحله بیش از حد مجاز است.');
        $rules = [];
        $ruleIds = [];
        foreach ($checklist as $rule) {
            if (!is_array($rule)) fail(422, 'یکی از موارد چک‌لیست معتبر نیست.');
            $ruleId = strtolower(trim((string)($rule['id'] ?? '')));
            $ruleLabel = trim((string)($rule['label'] ?? ''));
            if (!preg_match('/^[a-z0-9][a-z0-9_-]{1,63}$/', $ruleId) || isset($ruleIds[$ruleId])) fail(422, 'شناسهٔ مورد چک‌لیست تکراری یا نامعتبر است.');
            if ($ruleLabel === '' || text_length($ruleLabel) > 200) fail(422, 'عنوان مورد چک‌لیست خالی یا بیش از حد طولانی است.');
            $ruleIds[$ruleId] = true;
            $rules[] = ['id' => $ruleId, 'label' => $ruleLabel];
        }
        $stage = [
            'id' => $id,
            'label' => $label,
            'tone' => $tone,
            'nextStageIds' => $next,
            'checklist' => $rules,
            'archived' => !empty($raw['archived']),
            'isFinal' => !empty($raw['isFinal']),
        ];
        if (isset($raw['metric']) && in_array((string)$raw['metric'], $metrics, true)) $stage['metric'] = (string)$raw['metric'];
        $stages[] = $stage;
    }
    $start = trim((string)($input['startStageId'] ?? ''));
    $byId = [];
    foreach ($stages as $stage) $byId[$stage['id']] = $stage;
    if (!isset($byId[$start]) || !empty($byId[$start]['archived'])) fail(422, 'مرحلهٔ آغازین باید فعال باشد.');
    $finals = [];
    $active = [];
    foreach ($stages as $stage) {
        if (!empty($stage['archived'])) continue;
        $active[$stage['id']] = true;
        if (!empty($stage['isFinal'])) $finals[$stage['id']] = true;
        if (!empty($stage['isFinal']) && count($stage['nextStageIds']) > 0) fail(422, 'مرحلهٔ پایانی نمی‌تواند مسیر خروجی داشته باشد.');
        if (empty($stage['isFinal']) && count($stage['nextStageIds']) === 0) fail(422, 'مرحلهٔ فعال باید مسیر بعدی داشته باشد یا پایانی باشد.');
        foreach ($stage['nextStageIds'] as $nextId) {
            if ($nextId === $stage['id'] || !isset($byId[$nextId]) || !empty($byId[$nextId]['archived'])) fail(422, 'یکی از مسیرها به مرحلهٔ غیرفعال یا نامعتبر می‌رسد.');
        }
    }
    if (!$finals) fail(422, 'گردش‌کار دست‌کم به یک مرحلهٔ پایانی نیاز دارد.');
    $reachable = [];
    $queue = [$start];
    while ($queue) {
        $id = array_shift($queue);
        if (isset($reachable[$id])) continue;
        $reachable[$id] = true;
        foreach (($byId[$id]['nextStageIds'] ?? []) as $nextId) if (isset($active[$nextId]) && !isset($reachable[$nextId])) $queue[] = $nextId;
    }
    foreach ($active as $id => $_) if (!isset($reachable[$id])) fail(422, 'همهٔ مرحله‌های فعال باید از مرحلهٔ آغازین قابل دسترسی باشند.');
    $canFinish = $finals;
    $changed = true;
    while ($changed) {
        $changed = false;
        foreach ($stages as $stage) {
            if (empty($stage['archived']) && !isset($canFinish[$stage['id']])) {
                foreach ($stage['nextStageIds'] as $nextId) if (isset($canFinish[$nextId])) { $canFinish[$stage['id']] = true; $changed = true; break; }
            }
        }
    }
    foreach ($active as $id => $_) if (!isset($canFinish[$id])) fail(422, 'هر مرحلهٔ فعال باید دست‌کم مسیری به پایان کار داشته باشد.');
    return ['version' => 1, 'startStageId' => $start, 'stages' => $stages];
}

function collapse_workflow_route(string $targetId, array $byId, array $stableIds, array $path, array &$outgoing, bool &$endsAtFinal): void {
    if (isset($stableIds[$targetId])) { $outgoing[$targetId] = true; return; }
    if (!isset($byId[$targetId]) || isset($path[$targetId])) return;
    $path[$targetId] = true;
    $stage = $byId[$targetId];
    $next = $stage['nextStageIds'] ?? [];
    if (!$next) {
        if (!empty($stage['isFinal'])) $endsAtFinal = true;
        return;
    }
    foreach ($next as $nextId) collapse_workflow_route((string)$nextId, $byId, $stableIds, $path, $outgoing, $endsAtFinal);
}

function collapse_stage_outgoing(array $stage, array $byId, array $stableIds): array {
    $outgoing = [];
    $endsAtFinal = false;
    foreach (($stage['nextStageIds'] ?? []) as $nextId) collapse_workflow_route((string)$nextId, $byId, $stableIds, [], $outgoing, $endsAtFinal);
    $ids = array_keys($outgoing);
    sort($ids);
    return [$ids, $endsAtFinal];
}

function require_fixed_workflow_routes(array $oldWorkflow, array $nextWorkflow): void {
    if ((string)($oldWorkflow['startStageId'] ?? '') !== (string)($nextWorkflow['startStageId'] ?? '')) fail(422, 'مرحلهٔ آغازین گردش‌کار قابل تغییر نیست.');
    $oldById = [];
    $nextById = [];
    foreach (($oldWorkflow['stages'] ?? []) as $stage) if (is_array($stage) && isset($stage['id'])) $oldById[(string)$stage['id']] = $stage;
    foreach (($nextWorkflow['stages'] ?? []) as $stage) if (is_array($stage) && isset($stage['id'])) $nextById[(string)$stage['id']] = $stage;
    foreach ($oldById as $id => $stage) {
        if (!isset($nextById[$id])) fail(422, 'برای حفظ پرونده‌ها و سوابق، مرحله‌ها را بایگانی کنید؛ حذف دائمی مجاز نیست.');
        if (!empty($stage['archived']) && empty($nextById[$id]['archived'])) fail(422, 'مرحلهٔ بایگانی‌شده را نمی‌توان بدون بازیابی کنترل‌شده دوباره فعال کرد.');
    }

    // Derive the only allowed existing-edge changes: bypassing old stages that were archived.
    $baseline = $oldById;
    foreach ($oldById as $id => $stage) {
        if (!empty($stage['archived']) || empty($nextById[$id]['archived'])) continue;
        $target = $baseline[$id];
        $targetNext = $target['nextStageIds'] ?? [];
        foreach ($baseline as $sourceId => $source) {
            if ($sourceId === $id || !in_array($id, $source['nextStageIds'] ?? [], true)) continue;
            $rewired = [];
            foreach (($source['nextStageIds'] ?? []) as $edge) {
                if ((string)$edge === $id) foreach ($targetNext as $replacement) $rewired[] = (string)$replacement;
                else $rewired[] = (string)$edge;
            }
            $rewired = array_values(array_unique($rewired));
            $source['nextStageIds'] = $rewired;
            $source['isFinal'] = !$rewired && !empty($target['isFinal']);
            if (!$rewired && !empty($target['isFinal'])) $source['metric'] = $target['metric'] ?? ($source['metric'] ?? null);
            $baseline[$sourceId] = $source;
        }
        $target['archived'] = true;
        $baseline[$id] = $target;
    }

    $stableActiveIds = [];
    foreach ($oldById as $id => $_) if (empty($nextById[$id]['archived'])) $stableActiveIds[$id] = true;
    foreach ($oldById as $id => $_) {
        // Existing stages, including archived stages with live records, must keep the same downstream destinations.
        [$expectedEdges, $expectedFinal] = collapse_stage_outgoing($baseline[$id], $baseline, $stableActiveIds);
        [$actualEdges, $actualFinal] = collapse_stage_outgoing($nextById[$id], $nextById, $stableActiveIds);
        if ($expectedEdges !== $actualEdges || $expectedFinal !== $actualFinal) fail(422, 'مسیرهای موجود ثابت هستند؛ فقط افزودن مرحلهٔ میانی یا بایگانیِ امن مجاز است.');
    }
}

try {
    $action = (string)($_GET['action'] ?? '');
    $body = json_body();
    $configPath = dirname(__DIR__) . '/nab-config.php';
    if (!is_file($configPath)) fail(503, 'فایل امن پیکربندی هاست پیدا نشد؛ راهنمای استقرار را ببینید.');
    $config = require $configPath;
    if (!is_array($config)) fail(503, 'پیکربندی هاست معتبر نیست.');
    $pdo = db_connection($config);

    $remember = $action === 'login' && !empty($body['remember']);
    $cookieSecure = (bool)($config['secure_cookie'] ?? true);
    session_name('NABSESSID');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => $remember ? 60 * 60 * 24 * 30 : 0,
        'path' => '/',
        'secure' => $cookieSecure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();

    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method === 'OPTIONS') reply(204, ['success' => true]);
    if ($method === 'POST' && !in_array($action, ['login', 'setup'], true)) {
        if (!current_user($pdo)) fail(401, 'نشست شما معتبر نیست یا منقضی شده است؛ دوباره وارد شوید.');
        require_csrf();
    }

    if ($action === 'status' && $method === 'GET') {
        $count = (int)$pdo->query('SELECT COUNT(*) FROM nab_users')->fetchColumn();
        reply(200, ['success' => true, 'needs_setup' => $count === 0]);
    }

    if ($action === 'setup' && $method === 'POST') {
        $expected = (string)($config['setup_key'] ?? '');
        $provided = (string)($body['setup_key'] ?? '');
        if (strlen($expected) < 32 || !hash_equals($expected, $provided)) fail(403, 'کلید راه‌اندازی نادرست است.');
        if ((int)$pdo->query('SELECT COUNT(*) FROM nab_users')->fetchColumn() > 0) fail(409, 'راه‌اندازی قبلاً انجام شده است.');
        $username = validate_username((string)($body['username'] ?? ''));
        $name = trim((string)($body['name'] ?? ''));
        $password = (string)($body['password'] ?? '');
        if ($name === '' || text_length($name) > 160) fail(422, 'نام مدیر الزامی است.');
        check_password_length($password);
        $permissions = all_permissions();
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('INSERT INTO nab_users (username, display_name, role_id, title, tone, password_hash, is_active, permissions_json, auth_version, created_at, updated_at) VALUES (?, ?, \'admin\', \'مدیر سیستم\', \'green\', ?, 1, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())');
        $stmt->execute([$username, $name, password_hash($password, PASSWORD_DEFAULT), json_encode($permissions)]);
        $adminId = (int)$pdo->lastInsertId();
        put_state($pdo, 'nab:roles', default_roles(), $adminId);
        put_state($pdo, 'nab:people', [], $adminId);
        put_state($pdo, 'nab:activities', [], $adminId);
        put_state($pdo, 'nab:audit', [], $adminId);
        put_state($pdo, 'nab:notes', [], $adminId);
        $pdo->commit();
        session_regenerate_id(true);
        $user = find_user_by_id($pdo, $adminId);
        $_SESSION['user_id'] = $adminId;
        $_SESSION['auth_version'] = 1;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        reply(201, ['success' => true, 'data' => state_payload($pdo, $user)]);
    }

    if ($action === 'login' && $method === 'POST') {
        $username = strtolower(trim((string)($body['username'] ?? '')));
        $password = (string)($body['password'] ?? '');
        if ($username === '' || $password === '' || strlen($username) > 64 || strlen($password) > 1024) fail(422, 'نام کاربری و رمز عبور را وارد کنید.');
        $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $attemptKey = hash('sha256', $username . '|' . $ip);
        $stmt = $pdo->prepare('SELECT fail_count, locked_until FROM nab_login_attempts WHERE attempt_key = ?');
        $stmt->execute([$attemptKey]);
        $lock = $stmt->fetch();
        if ($lock && $lock['locked_until'] && strtotime((string)$lock['locked_until'] . ' UTC') > time()) fail(429, 'به‌دلیل تلاش‌های ناموفق، ورود موقتاً قفل شده است.');
        $user = get_user_by_username($pdo, $username);
        if (!$user || !(bool)$user['is_active'] || !password_verify($password, (string)$user['password_hash'])) {
            $count = (int)($lock['fail_count'] ?? 0) + 1;
            $lockedUntil = $count >= 5 ? gmdate('Y-m-d H:i:s', time() + 15 * 60) : null;
            $stmt = $pdo->prepare('INSERT INTO nab_login_attempts (attempt_key, fail_count, locked_until, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE fail_count = VALUES(fail_count), locked_until = VALUES(locked_until), updated_at = VALUES(updated_at)');
            $stmt->execute([$attemptKey, $count >= 5 ? 0 : $count, $lockedUntil]);
            fail(401, 'نام کاربری یا رمز عبور نادرست است.');
        }
        $stmt = $pdo->prepare('DELETE FROM nab_login_attempts WHERE attempt_key = ?');
        $stmt->execute([$attemptKey]);
        if (password_needs_rehash((string)$user['password_hash'], PASSWORD_DEFAULT)) {
            $stmt = $pdo->prepare('UPDATE nab_users SET password_hash = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?');
            $stmt->execute([password_hash($password, PASSWORD_DEFAULT), (int)$user['id']]);
        }
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['auth_version'] = (int)$user['auth_version'];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        reply(200, ['success' => true, 'data' => state_payload($pdo, $user)]);
    }

    if ($action === 'bootstrap' && $method === 'GET') {
        $user = require_user($pdo);
        if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        reply(200, ['success' => true, 'data' => state_payload($pdo, $user)]);
    }

    if ($action === 'logout' && $method === 'POST') {
        require_user($pdo);
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        reply(200, ['success' => true]);
    }

    if ($action === 'workflow_save' && $method === 'POST') {
        $user = require_user($pdo);
        if (!is_system_admin($user)) fail(403, 'فقط مدیر سیستم می‌تواند گردش‌کار را مدیریت کند.');
        $expectedVersion = $body['expected_version'] ?? '';
        if (!is_string($expectedVersion) || !preg_match('/^[a-f0-9]{64}$/', $expectedVersion)) fail(428, 'نسخهٔ گردش‌کار در دسترس نیست؛ صفحه را تازه‌سازی کنید.');
        $workflow = validate_workflow_definition($body['workflow'] ?? null);
        acquire_state_write_lock($pdo);
        $pdo->beginTransaction();
        verify_expected_state_version($pdo, 'nab:workflow', $expectedVersion);
        $oldWorkflow = workflow_config($pdo);
        require_fixed_workflow_routes($oldWorkflow, $workflow);
        put_state($pdo, 'nab:workflow', [$workflow], (int)$user['id']);
        $audit = state_value($pdo, 'nab:audit', []);
        $audit[] = [
            'id' => 'workflow-' . bin2hex(random_bytes(12)),
            'action' => 'ویرایش گردش‌کار',
            'target' => 'تعریف مرحله‌ها و چک‌لیست‌های گردش‌کار',
            'createdAt' => server_timestamp_iso(),
            'createdBy' => (string)$user['display_name'],
            'ts' => server_timestamp_ms(),
        ];
        put_state($pdo, 'nab:audit', $audit, (int)$user['id']);
        $versions = state_versions($pdo, $user);
        $version = $versions['nab:workflow'];
        $pdo->commit();
        release_state_write_lock($pdo);
        reply(200, ['success' => true, 'data' => ['version' => $version, 'state_versions' => $versions]]);
    }

    if ($action === 'state_save' && $method === 'POST') {
        $user = require_user($pdo);
        $key = (string)($body['key'] ?? '');
        $value = $body['value'] ?? null;
        $expectedVersion = $body['expected_version'] ?? '';
        if (!is_array($value)) fail(422, 'دادهٔ ارسالی باید آرایه باشد.');
        if (!is_string($expectedVersion) || !preg_match('/^[a-f0-9]{64}$/', $expectedVersion)) fail(428, 'نسخهٔ ذخیره‌سازی در دسترس نیست؛ صفحه را تازه‌سازی کنید.');
        $allowed = ['nab:people', 'nab:activities', 'nab:audit', 'nab:roles', 'nab:notes'];
        if (!in_array($key, $allowed, true)) fail(400, 'کلید ذخیره‌سازی مجاز نیست.');
        acquire_state_write_lock($pdo);
        $pdo->beginTransaction();
        verify_expected_state_version($pdo, $key, $expectedVersion);
        if ($key === 'nab:people') $value = authorize_people_change($pdo, $user, $value);
        elseif ($key === 'nab:notes') $value = authorize_notes($pdo, $user, $value);
        elseif ($key === 'nab:activities' || $key === 'nab:audit') $value = sanitize_append_only($pdo, $user, $key, $value);
        elseif ($key === 'nab:roles') {
            require_manage_users($user);
            $oldRoles = state_value($pdo, 'nab:roles', default_roles());
            $oldBuiltins = [];
            foreach ($oldRoles as $role) if (!empty($role['builtin'])) $oldBuiltins[(string)$role['id']] = true;
            $ids = [];
            foreach ($value as &$role) {
                if (!is_array($role) || !isset($role['id'], $role['title'], $role['permissions'])) fail(422, 'تعریف نقش معتبر نیست.');
                $role['id'] = strtolower(trim((string)$role['id']));
                $role['title'] = trim((string)$role['title']);
                if (!preg_match('/^[a-z0-9_-]{2,64}$/', $role['id']) || $role['title'] === '' || text_length($role['title']) > 100 || isset($ids[$role['id']])) fail(422, 'شناسه یا عنوان نقش معتبر نیست.');
                $ids[$role['id']] = true;
                if (!is_array($role['permissions'])) fail(422, 'مجوزهای نقش معتبر نیستند.');
                $role['permissions'] = array_values(array_unique(array_intersect(all_permissions(), $role['permissions'])));
                if (isset($oldBuiltins[$role['id']])) $role['builtin'] = true;
            }
            unset($role);
            foreach ($oldBuiltins as $id => $_) if (!isset($ids[$id])) fail(403, 'نقش‌های پیش‌فرض قابل حذف نیستند.');
        }
        put_state($pdo, $key, $value, (int)$user['id']);
        $version = state_version($pdo, $key);
        $pdo->commit();
        release_state_write_lock($pdo);
        reply(200, ['success' => true, 'data' => ['version' => $version]]);
    }

    if ($action === 'legacy_import' && $method === 'POST') {
        $user = require_user($pdo);
        if (!is_system_admin($user)) fail(403, 'فقط مدیر سیستم می‌تواند داده‌های قدیمی این مرورگر را منتقل کند.');
        $legacy = $body['state'] ?? null;
        if (!is_array($legacy)) fail(422, 'بستهٔ مهاجرت معتبر نیست.');
        acquire_state_write_lock($pdo);
        $pdo->beginTransaction();
        $existingRoles = state_value($pdo, 'nab:roles', default_roles());
        $existingSharedData = count(state_value($pdo, 'nab:people', []))
            + count(state_value($pdo, 'nab:activities', []))
            + count(state_value($pdo, 'nab:audit', []))
            + count(state_value($pdo, 'nab:notes', []))
            + count(state_value($pdo, 'nab:tasks:' . (string)$user['username'], []));
        $taskMigrationAlreadyCompleted = !empty(state_value($pdo, 'nab:legacy_tasks_imported:' . (string)$user['username'], []));
        $rolesUnchanged = json_encode($existingRoles, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) === json_encode(default_roles(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $userCount = (int)$pdo->query('SELECT COUNT(*) FROM nab_users')->fetchColumn();
        if (!empty(state_value($pdo, 'nab:legacy_migration_completed', [])) || $taskMigrationAlreadyCompleted || $existingSharedData > 0 || !$rolesUnchanged || $userCount > 1) {
            $pdo->rollBack();
            release_state_write_lock($pdo);
            fail(409, 'پایگاه داده قبلاً استفاده شده است؛ مهاجرت اولیه فقط به نصب تازه و خالی مجاز است.');
        }
        $people = $legacy['nab:people'] ?? [];
        if (!is_array($people) || count($people) > 10000) fail(422, 'فهرست پرونده‌های قدیمی معتبر نیست.');
        $workflow = workflow_config($pdo);
        $cleanPeople = [];
        $seenIds = [];
        $seenNationalIds = [];
        foreach ($people as $person) {
            if (!is_array($person)) fail(422, 'یکی از پرونده‌های قدیمی معتبر نیست.');
            $clean = clean_person($person, $user, $workflow, false);
            if (isset($seenIds[$clean['id']]) || isset($seenNationalIds[$clean['nationalId']])) fail(422, 'شناسه یا کد ملی در داده‌های قدیمی تکراری است.');
            $seenIds[$clean['id']] = true;
            $seenNationalIds[$clean['nationalId']] = true;
            $cleanPeople[] = $clean;
        }
        put_state($pdo, 'nab:people', $cleanPeople, (int)$user['id']);

        foreach (['nab:activities', 'nab:audit', 'nab:notes'] as $legacyKey) {
            $rows = $legacy[$legacyKey] ?? [];
            if (!is_array($rows) || count($rows) > 50000) fail(422, 'بخشی از سوابق قدیمی معتبر نیست.');
            $ids = [];
            foreach ($rows as &$row) {
                if (!is_array($row) || !isset($row['id']) || isset($ids[(string)$row['id']])) fail(422, 'یکی از سوابق قدیمی معتبر نیست.');
                $ids[(string)$row['id']] = true;
                if ($legacyKey === 'nab:notes') {
                    if (trim((string)($row['text'] ?? '')) === '' || text_length((string)$row['text']) > 10000) fail(422, 'متن یکی از یادداشت‌های قدیمی معتبر نیست.');
                    // The browser's legacy snapshot cannot claim a verified username owner.
                    // Older notes are resolved by a unique exact display-name match on read.
                    unset($row['authorUsername'], $row['ownerVerified'], $row['editedByUsername']);
                }
            }
            unset($row);
            put_state($pdo, $legacyKey, $rows, (int)$user['id']);
        }

        $legacyRoles = $legacy['nab:roles'] ?? default_roles();
        if (!is_array($legacyRoles) || count($legacyRoles) > 100) fail(422, 'نقش‌های قدیمی معتبر نیستند.');
        $roles = default_roles();
        $reservedRoleIds = array_fill_keys(array_column($roles, 'id'), true);
        $roleIds = [];
        foreach ($legacyRoles as $legacyRole) {
            if (!is_array($legacyRole) || !isset($legacyRole['id'], $legacyRole['title'], $legacyRole['permissions']) || !is_array($legacyRole['permissions'])) fail(422, 'یکی از نقش‌های قدیمی معتبر نیست.');
            $id = strtolower(trim((string)$legacyRole['id']));
            $title = trim((string)$legacyRole['title']);
            if (!preg_match('/^[a-z0-9_-]{2,64}$/', $id) || $title === '' || text_length($title) > 100 || isset($roleIds[$id])) fail(422, 'شناسهٔ یکی از نقش‌های قدیمی معتبر نیست.');
            $roleIds[$id] = true;
            if (isset($reservedRoleIds[$id])) continue;
            $roles[] = [
                'id' => $id,
                'title' => $title,
                'permissions' => array_values(array_unique(array_intersect(all_permissions(), $legacyRole['permissions']))),
                'builtin' => false,
            ];
        }
        put_state($pdo, 'nab:roles', $roles, (int)$user['id']);

        $tasks = $legacy['tasks'] ?? [];
        if (!is_array($tasks) || count($tasks) > 5000) fail(422, 'فهرست کارهای قدیمی معتبر نیست.');
        if ($tasks) put_state($pdo, 'nab:tasks:' . (string)$user['username'], $tasks, (int)$user['id']);
        put_state($pdo, 'nab:legacy_tasks_imported:' . (string)$user['username'], [['by' => (string)$user['username'], 'at' => gmdate('Y-m-d H:i:s')]], (int)$user['id']);
        put_state($pdo, 'nab:legacy_migration_completed', [['by' => (string)$user['username'], 'at' => gmdate('Y-m-d H:i:s')]], (int)$user['id']);
        $pdo->commit();
        release_state_write_lock($pdo);
        reply(200, ['success' => true]);
    }

    if ($action === 'legacy_tasks_import' && $method === 'POST') {
        $user = require_user($pdo);
        $tasks = $body['tasks'] ?? null;
        if (!is_array($tasks) || count($tasks) > 5000) fail(422, 'فهرست کارهای قدیمی معتبر نیست.');
        foreach ($tasks as $task) {
            if (!is_array($task) || !isset($task['id'], $task['title']) || trim((string)$task['title']) === '' || text_length((string)$task['title']) > 500) fail(422, 'یکی از کارهای قدیمی معتبر نیست.');
        }
        acquire_state_write_lock($pdo);
        $pdo->beginTransaction();
        $taskKey = 'nab:tasks:' . (string)$user['username'];
        $markerKey = 'nab:legacy_tasks_imported:' . (string)$user['username'];
        if (!empty(state_value($pdo, $markerKey, [])) || count(state_value($pdo, $taskKey, [])) > 0) {
            $pdo->rollBack();
            release_state_write_lock($pdo);
            fail(409, 'کارهای این حساب قبلاً روی هاست ثبت شده‌اند؛ انتقال اولیه انجام نشد.');
        }
        if ($tasks) put_state($pdo, $taskKey, $tasks, (int)$user['id']);
        put_state($pdo, $markerKey, [['by' => (string)$user['username'], 'at' => gmdate('Y-m-d H:i:s')]], (int)$user['id']);
        $pdo->commit();
        release_state_write_lock($pdo);
        reply(200, ['success' => true]);
    }

    if ($action === 'user_create' && $method === 'POST') {
        $actor = require_user($pdo);
        require_manage_users($actor);
        $username = validate_username((string)($body['username'] ?? ''));
        $name = trim((string)($body['name'] ?? ''));
        $role = trim((string)($body['role'] ?? 'assistant'));
        $title = trim((string)($body['title'] ?? $role));
        $tone = trim((string)($body['tone'] ?? 'blue'));
        $password = (string)($body['password'] ?? '');
        if ($name === '' || text_length($name) > 160) fail(422, 'نام کاربر الزامی است.');
        check_password_length($password);
        $permissions = validate_permissions($body['permissions'] ?? [], $actor);
        if ($role === 'admin' && !is_system_admin($actor)) fail(403, 'فقط مدیر سیستم می‌تواند مدیر دیگری ایجاد کند.');
        $photo = isset($body['photo']) ? (string)$body['photo'] : null;
        if ($photo !== null && strlen($photo) > 2 * 1024 * 1024) fail(413, 'حجم تصویر پروفایل بیش از حد مجاز است.');
        try {
            $stmt = $pdo->prepare('INSERT INTO nab_users (username, display_name, role_id, title, tone, password_hash, is_active, permissions_json, photo, auth_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())');
            $stmt->execute([$username, $name, $role, $title, $tone, password_hash($password, PASSWORD_DEFAULT), json_encode($permissions), $photo]);
        } catch (PDOException $e) {
            if ((string)$e->getCode() === '23000') fail(409, 'این نام کاربری قبلاً استفاده شده است.');
            throw $e;
        }
        reply(201, ['success' => true, 'data' => updated_user($pdo, $username)]);
    }

    if ($action === 'user_update' && $method === 'POST') {
        $actor = require_user($pdo);
        require_manage_users($actor);
        $username = validate_username((string)($body['username'] ?? ''));
        $target = get_user_by_username($pdo, $username);
        if (!$target) fail(404, 'کاربر پیدا نشد.');
        $name = trim((string)($body['name'] ?? ''));
        $role = trim((string)($body['role'] ?? $target['role_id']));
        $title = trim((string)($body['title'] ?? $target['title']));
        $tone = trim((string)($body['tone'] ?? $target['tone']));
        $active = !empty($body['active']);
        $password = (string)($body['password'] ?? '');
        $permissions = validate_permissions($body['permissions'] ?? user_permissions($target), $actor);
        if ($name === '' || text_length($name) > 160) fail(422, 'نام کاربر الزامی است.');
        if (($role === 'admin' || (string)$target['role_id'] === 'admin') && !is_system_admin($actor)) fail(403, 'تغییر حساب مدیر فقط برای علی محمدی مجاز است.');
        if ((string)$target['role_id'] === 'admin' && ($role !== 'admin' || !$active)) ensure_another_admin($pdo, (int)$target['id']);
        if ($password !== '') check_password_length($password);
        $photo = isset($body['photo']) ? (string)$body['photo'] : ($target['photo'] ?? null);
        if ($photo !== null && strlen((string)$photo) > 2 * 1024 * 1024) fail(413, 'حجم تصویر پروفایل بیش از حد مجاز است.');
        $hash = $password !== '' ? password_hash($password, PASSWORD_DEFAULT) : (string)$target['password_hash'];
        $version = (int)$target['auth_version'] + ($password !== '' || !$active ? 1 : 0);
        $stmt = $pdo->prepare('UPDATE nab_users SET display_name = ?, role_id = ?, title = ?, tone = ?, password_hash = ?, is_active = ?, permissions_json = ?, photo = ?, auth_version = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?');
        $stmt->execute([$name, $role, $title, $tone, $hash, $active ? 1 : 0, json_encode($permissions), $photo, $version, (int)$target['id']]);
        reply(200, ['success' => true, 'data' => updated_user($pdo, $username)]);
    }

    if ($action === 'user_delete' && $method === 'POST') {
        $actor = require_user($pdo);
        require_manage_users($actor);
        $username = validate_username((string)($body['username'] ?? ''));
        $target = get_user_by_username($pdo, $username);
        if (!$target) fail(404, 'کاربر پیدا نشد.');
        if ((int)$target['id'] === (int)$actor['id']) fail(403, 'حساب فعال خودتان را نمی‌توانید حذف کنید.');
        if ((string)$target['role_id'] === 'admin') ensure_another_admin($pdo, (int)$target['id']);
        $stmt = $pdo->prepare('DELETE FROM nab_users WHERE id = ?');
        $stmt->execute([(int)$target['id']]);
        reply(200, ['success' => true]);
    }

    if ($action === 'profile_update' && $method === 'POST') {
        $actor = require_user($pdo);
        $name = trim((string)($body['name'] ?? ''));
        $photo = isset($body['photo']) && $body['photo'] !== '' ? (string)$body['photo'] : null;
        $currentPassword = (string)($body['current_password'] ?? '');
        $newPassword = (string)($body['new_password'] ?? '');
        if ($name === '' || text_length($name) > 160) fail(422, 'نام الزامی است.');
        if ($photo !== null && strlen($photo) > 2 * 1024 * 1024) fail(413, 'حجم تصویر پروفایل بیش از حد مجاز است.');
        $passwordHash = (string)$actor['password_hash'];
        $version = (int)$actor['auth_version'];
        if ($newPassword !== '' || $currentPassword !== '') {
            if (!password_verify($currentPassword, $passwordHash)) fail(401, 'رمز فعلی نادرست است.');
            check_password_length($newPassword);
            $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $version++;
        }
        $stmt = $pdo->prepare('UPDATE nab_users SET display_name = ?, photo = ?, password_hash = ?, auth_version = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?');
        $stmt->execute([$name, $photo, $passwordHash, $version, (int)$actor['id']]);
        $_SESSION['auth_version'] = $version;
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$actor['id'];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        reply(200, ['success' => true, 'data' => updated_user($pdo, (string)$actor['username']), 'csrf' => $_SESSION['csrf_token']]);
    }

    if ($action === 'tasks_get' && $method === 'GET') {
        $user = require_user($pdo);
        $key = 'nab:tasks:' . (string)$user['username'];
        reply(200, ['success' => true, 'data' => state_value($pdo, $key, [])]);
    }

    if ($action === 'tasks_save' && $method === 'POST') {
        $user = require_user($pdo);
        $tasks = $body['tasks'] ?? null;
        $expectedVersion = $body['expected_version'] ?? '';
        if (!is_array($tasks) || count($tasks) > 5000) fail(422, 'فهرست کارها معتبر نیست.');
        if (!is_string($expectedVersion) || !preg_match('/^[a-f0-9]{64}$/', $expectedVersion)) fail(428, 'نسخهٔ ذخیره‌سازی در دسترس نیست؛ صفحه را تازه‌سازی کنید.');
        foreach ($tasks as $task) {
            if (!is_array($task) || !isset($task['id'], $task['title']) || text_length((string)$task['title']) > 500) fail(422, 'یکی از کارها معتبر نیست.');
        }
        $taskKey = 'nab:tasks:' . (string)$user['username'];
        acquire_state_write_lock($pdo);
        $pdo->beginTransaction();
        verify_expected_state_version($pdo, $taskKey, $expectedVersion);
        put_state($pdo, $taskKey, $tasks, (int)$user['id']);
        $version = state_version($pdo, $taskKey);
        $pdo->commit();
        release_state_write_lock($pdo);
        reply(200, ['success' => true, 'data' => ['version' => $version]]);
    }

    fail(404, 'مسیر API پیدا نشد.');
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    $errorId = bin2hex(random_bytes(4));
    error_log('[Nab API][' . $errorId . '] ' . $error->getMessage());
    reply(500, ['success' => false, 'error' => 'خطای داخلی سرور رخ داد. شناسه: ' . $errorId]);
}
