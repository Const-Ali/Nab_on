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

function list_users(PDO $pdo): array {
    $rows = $pdo->query('SELECT * FROM nab_users ORDER BY display_name, username')->fetchAll();
    return array_map('safe_user', $rows);
}

function state_payload(PDO $pdo, array $user): array {
    $canViewPeople = has_permission($user, 'view_persons');
    $canViewActivities = has_permission($user, 'view_activities');
    $canManageUsers = has_permission($user, 'manage_users');
    return [
        'user' => safe_user($user),
        'users' => list_users($pdo),
        'csrf' => (string)($_SESSION['csrf_token'] ?? ''),
        'state' => [
            'nab:people' => $canViewPeople ? state_value($pdo, 'nab:people', []) : [],
            'nab:activities' => $canViewActivities ? state_value($pdo, 'nab:activities', []) : [],
            'nab:audit' => ($canManageUsers || has_permission($user, 'view_reports')) ? state_value($pdo, 'nab:audit', []) : [],
            'nab:roles' => $canManageUsers ? state_value($pdo, 'nab:roles', default_roles()) : [],
            'nab:notes' => $canViewPeople ? state_value($pdo, 'nab:notes', []) : [],
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

function clean_person(array $person, array $actor): array {
    $person['id'] = trim((string)($person['id'] ?? ''));
    $person['firstName'] = trim((string)($person['firstName'] ?? ''));
    $person['lastName'] = trim((string)($person['lastName'] ?? ''));
    $person['fatherName'] = trim((string)($person['fatherName'] ?? ''));
    $person['nationalId'] = normalize_digits(trim((string)($person['nationalId'] ?? '')));
    if ($person['id'] === '' || strlen($person['id']) > 80 || $person['firstName'] === '' || $person['lastName'] === '' || $person['fatherName'] === '') fail(422, 'اطلاعات فرد ناقص است.');
    if (text_length($person['firstName']) > 100 || text_length($person['lastName']) > 100 || text_length($person['fatherName']) > 100) fail(422, 'طول نام بیش از حد مجاز است.');
    if (!valid_national_id($person['nationalId'])) fail(422, 'کد ملی معتبر نیست.');
    $allowedStatuses = ['درخواست پرونده', 'پرونده پرسنلی', 'کارت عادی', 'سه‌برگی عادی', 'تکمیل اطلاعات', 'پرونده فعال', 'ارسال به مرکز', 'بررسی مرکز', 'تأیید شده', 'رد شده', 'ارسال به شرکت', 'پایان کار'];
    if (!in_array($person['status'] ?? '', $allowedStatuses, true)) fail(422, 'وضعیت پرونده معتبر نیست.');
    $deadline = (string)($person['deadline'] ?? '');
    if ($deadline !== '' && $deadline !== '—' && !valid_jalali_date($deadline)) fail(422, 'تاریخ مهلت معتبر نیست.');
    if (isset($person['photo']) && is_string($person['photo']) && strlen($person['photo']) > 2 * 1024 * 1024) fail(413, 'حجم عکس بیش از حد مجاز است.');
    $person['updatedBy'] = (string)$actor['display_name'];
    return $person;
}

function authorize_people_change(PDO $pdo, array $user, array $next): array {
    if (!has_permission($user, 'view_persons')) fail(403, 'مجوز دسترسی به پرونده‌ها را ندارید.');
    if (!is_array($next) || count($next) > 10000) fail(422, 'فهرست پرونده‌ها معتبر نیست.');
    $old = state_value($pdo, 'nab:people', []);
    $oldById = [];
    foreach ($old as $row) if (is_array($row) && isset($row['id'])) $oldById[(string)$row['id']] = $row;
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
            $row = clean_person($row, $user);
        } else {
            $before = $oldById[$id];
            if ((string)($before['id'] ?? '') !== $id) fail(422, 'شناسهٔ پرونده قابل تغییر نیست.');
            $beforeCompare = $before;
            $afterCompare = $row;
            foreach (['updatedAt', 'updatedBy', 'ts'] as $ignored) { unset($beforeCompare[$ignored], $afterCompare[$ignored]); }
            $changed = [];
            foreach (array_unique(array_merge(array_keys($beforeCompare), array_keys($afterCompare))) as $field) {
                if (($beforeCompare[$field] ?? null) !== ($afterCompare[$field] ?? null)) $changed[] = $field;
            }
            if (in_array('status', $changed, true) && !has_permission($user, 'change_status')) fail(403, 'مجوز تغییر وضعیت را ندارید.');
            if (in_array('assignee', $changed, true) && !has_permission($user, 'change_status')) fail(403, 'مجوز ارجاع پرونده را ندارید.');
            $editable = array_diff($changed, ['status', 'assignee']);
            if (count($editable) > 0 && !has_permission($user, 'edit_person')) fail(403, 'مجوز ویرایش اطلاعات پرونده را ندارید.');
            if (count($changed) > 0) $row = clean_person($row, $user);
        }
        $nid = normalize_digits((string)($row['nationalId'] ?? ''));
        if (isset($nationalIds[$nid]) && $nationalIds[$nid] !== $id) fail(409, 'کد ملی تکراری است.');
        $nationalIds[$nid] = $id;
        $clean[] = $row;
    }
    return $clean;
}

function event_permission(string $action): ?string {
    if (str_contains($action, 'افزودن') || str_contains($action, 'ثبت پرونده')) return 'create_person';
    if (str_contains($action, 'تغییر وضعیت') || str_contains($action, 'رد پرونده')) return 'change_status';
    if (str_contains($action, 'حذف پرونده')) return 'delete_person';
    if (str_contains($action, 'ویرایش اطلاعات')) return 'edit_person';
    if (str_contains($action, 'کاربر') || str_contains($action, 'نقش')) return 'manage_users';
    return 'view_persons';
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
            if (json_encode($oldById[$id], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) !== json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) fail(403, 'رویدادهای ثبت‌شده قابل ویرایش نیستند.');
            $out[] = $oldById[$id];
            continue;
        }
        $action = trim((string)($row['action'] ?? ''));
        $needed = event_permission($action);
        if ($needed !== null && !has_permission($user, $needed)) fail(403, 'مجوز ثبت این رویداد را ندارید.');
        $row['action'] = text_substring($action, 0, 160);
        $row['createdBy'] = (string)$user['display_name'];
        if ($key === 'nab:activities') {
            $row['createdByRole'] = (string)$user['role_id'];
            $row['createdAt'] = (string)($row['createdAt'] ?? gmdate('Y-m-d H:i:s'));
            $row['ts'] = time() * 1000;
        } else {
            $row['createdAt'] = gmdate('Y-m-d H:i:s');
        }
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
        if (isset($nextById[$id])) fail(422, 'شناسهٔ یادداشت تکراری است.');
        $nextById[$id] = $row;
    }
    $isAdmin = (string)$user['role_id'] === 'admin';
    foreach ($oldById as $id => $oldRow) {
        if (!isset($nextById[$id]) && !$isAdmin && (string)($oldRow['author'] ?? '') !== (string)$user['display_name']) fail(403, 'فقط نویسنده یا مدیر می‌تواند یادداشت را حذف کند.');
    }
    $out = [];
    foreach ($nextById as $id => $row) {
        if (isset($oldById[$id])) {
            $before = $oldById[$id];
            if (json_encode($before, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) !== json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) {
                if (!$isAdmin && (string)($before['author'] ?? '') !== (string)$user['display_name']) fail(403, 'فقط نویسنده یا مدیر می‌تواند یادداشت را ویرایش کند.');
                $row['author'] = (string)$before['author'];
                $row['role'] = (string)$before['role'];
                $row['title'] = (string)$before['title'];
                $row['edited'] = true;
            }
        } else {
            $text = trim((string)($row['text'] ?? ''));
            if ($text === '' || text_length($text) > 10000) fail(422, 'متن یادداشت خالی یا بیش از حد طولانی است.');
            $row['author'] = (string)$user['display_name'];
            $row['role'] = (string)$user['role_id'];
            $row['title'] = (string)$user['title'];
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

    if ($action === 'state_save' && $method === 'POST') {
        $user = require_user($pdo);
        $key = (string)($body['key'] ?? '');
        $value = $body['value'] ?? null;
        if (!is_array($value)) fail(422, 'دادهٔ ارسالی باید آرایه باشد.');
        $allowed = ['nab:people', 'nab:activities', 'nab:audit', 'nab:roles', 'nab:notes'];
        if (!in_array($key, $allowed, true)) fail(400, 'کلید ذخیره‌سازی مجاز نیست.');
        acquire_state_write_lock($pdo);
        $pdo->beginTransaction();
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
        $pdo->commit();
        release_state_write_lock($pdo);
        reply(200, ['success' => true]);
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
        $cleanPeople = [];
        $seenIds = [];
        $seenNationalIds = [];
        foreach ($people as $person) {
            if (!is_array($person)) fail(422, 'یکی از پرونده‌های قدیمی معتبر نیست.');
            $oldUpdater = (string)($person['updatedBy'] ?? '');
            $clean = clean_person($person, $user);
            if (isset($seenIds[$clean['id']]) || isset($seenNationalIds[$clean['nationalId']])) fail(422, 'شناسه یا کد ملی در داده‌های قدیمی تکراری است.');
            $seenIds[$clean['id']] = true;
            $seenNationalIds[$clean['nationalId']] = true;
            if ($oldUpdater !== '') $clean['updatedBy'] = $oldUpdater;
            $cleanPeople[] = $clean;
        }
        put_state($pdo, 'nab:people', $cleanPeople, (int)$user['id']);

        foreach (['nab:activities', 'nab:audit', 'nab:notes'] as $legacyKey) {
            $rows = $legacy[$legacyKey] ?? [];
            if (!is_array($rows) || count($rows) > 50000) fail(422, 'بخشی از سوابق قدیمی معتبر نیست.');
            $ids = [];
            foreach ($rows as $row) {
                if (!is_array($row) || !isset($row['id']) || isset($ids[(string)$row['id']])) fail(422, 'یکی از سوابق قدیمی معتبر نیست.');
                $ids[(string)$row['id']] = true;
                if ($legacyKey === 'nab:notes' && (trim((string)($row['text'] ?? '')) === '' || text_length((string)$row['text']) > 10000)) fail(422, 'متن یکی از یادداشت‌های قدیمی معتبر نیست.');
            }
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
        if (($role === 'admin' || (string)$target['role_id'] === 'admin') && !is_system_admin($actor)) fail(403, 'تغییر حساب مدیر فقط برای مدیر سیستم مجاز است.');
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
        if (!is_array($tasks) || count($tasks) > 5000) fail(422, 'فهرست کارها معتبر نیست.');
        foreach ($tasks as $task) {
            if (!is_array($task) || !isset($task['id'], $task['title']) || text_length((string)$task['title']) > 500) fail(422, 'یکی از کارها معتبر نیست.');
        }
        acquire_state_write_lock($pdo);
        $pdo->beginTransaction();
        put_state($pdo, 'nab:tasks:' . (string)$user['username'], $tasks, (int)$user['id']);
        $pdo->commit();
        release_state_write_lock($pdo);
        reply(200, ['success' => true]);
    }

    fail(404, 'مسیر API پیدا نشد.');
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[Nab API] ' . $error->getMessage());
    reply(500, ['success' => false, 'error' => 'خطای داخلی سرور رخ داد. شناسه: ' . bin2hex(random_bytes(4))]);
}
