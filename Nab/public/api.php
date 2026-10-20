<?php
/**
 * سامانه ناب (Nab CRM) — بک‌اند مستقل و سبک برای هاست‌های اشتراکی و سرورها
 * پشتیبانی از SQLite (بدون نیاز به تنظیم دیتابیس) و MySQL (قابل تنظیم)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ========================================================
// ۱. تنظیمات دیتابیس (پیش‌فرض: SQLite خودکار و بدون دردسر)
// اگر می‌خواهید از MySQL استفاده کنید، مقادیر زیر را تغییر دهید:
// ========================================================
$DB_DRIVER = 'sqlite'; // 'sqlite' یا 'mysql'

// تنظیمات MySQL (در صورت انتخاب mysql):
$MYSQL_HOST = 'localhost';
$MYSQL_DB   = 'nab_db';
$MYSQL_USER = 'root';
$MYSQL_PASS = '';

// ========================================================
// ۲. اتصال به دیتابیس و ایجاد جداول در صورت عدم وجود
// ========================================================
try {
    if ($DB_DRIVER === 'sqlite') {
        $dbPath = __DIR__ . '/data_nab.sqlite';
        $pdo = new PDO("sqlite:" . $dbPath);
    } else {
        $pdo = new PDO("mysql:host={$MYSQL_HOST};dbname={$MYSQL_DB};charset=utf8mb4", $MYSQL_USER, $MYSQL_PASS);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // ساخت جدول ذخیره‌سازی کلید-مقدار امن و همگام
    $pdo->exec("CREATE TABLE IF NOT EXISTS nab_store (
        store_key VARCHAR(190) PRIMARY KEY,
        store_value LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// ========================================================
// ۳. پردازش درخواست‌های API
// ========================================================
$action = $_GET['action'] ?? '';
$inputRaw = file_get_contents('php://input');
$input = json_decode($inputRaw, true) ?? [];

switch ($action) {
    // تست وضعیت سرور
    case 'ping':
        echo json_encode(['success' => true, 'status' => 'online', 'time' => date('Y-m-d H:i:s'), 'db' => $DB_DRIVER]);
        break;

    // دریافت تمامی داده‌ها (پرونده‌ها، کارها، لاگ‌ها، کاربران، یادداشت‌ها)
    case 'get_all':
        try {
            $stmt = $pdo->query("SELECT store_key, store_value FROM nab_store");
            $rows = $stmt->fetchAll();
            $data = [];
            foreach ($rows as $r) {
                $data[$r['store_key']] = json_decode($r['store_value'], true);
            }
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    // دریافت یک کلید خاص
    case 'get':
        $key = $_GET['key'] ?? '';
        if (!$key) {
            echo json_encode(['success' => false, 'error' => 'Key is required']);
            break;
        }
        try {
            $stmt = $pdo->prepare("SELECT store_value FROM nab_store WHERE store_key = ?");
            $stmt->execute([$key]);
            $val = $stmt->fetchColumn();
            echo json_encode(['success' => true, 'key' => $key, 'value' => $val ? json_decode($val, true) : null]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    // ذخیره یا به‌روزرسانی داده یک کلید
    case 'save':
        $key = $input['key'] ?? '';
        $value = $input['value'] ?? null;
        if (!$key) {
            echo json_encode(['success' => false, 'error' => 'Key is required']);
            break;
        }
        try {
            $jsonValue = json_encode($value, JSON_UNESCAPED_UNICODE);
            if ($DB_DRIVER === 'sqlite') {
                $stmt = $pdo->prepare("INSERT INTO nab_store (store_key, store_value) VALUES (?, ?) ON CONFLICT(store_key) DO UPDATE SET store_value = excluded.store_value");
            } else {
                $stmt = $pdo->prepare("INSERT INTO nab_store (store_key, store_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE store_value = VALUES(store_value)");
            }
            $stmt->execute([$key, $jsonValue]);
            echo json_encode(['success' => true, 'message' => "Saved {$key}"]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    // همگام‌سازی چند کلید همزمان (Batch Sync)
    case 'batch_save':
        $items = $input['items'] ?? [];
        if (!is_array($items) || empty($items)) {
            echo json_encode(['success' => false, 'error' => 'Items array required']);
            break;
        }
        try {
            $pdo->beginTransaction();
            foreach ($items as $k => $v) {
                $jsonValue = json_encode($v, JSON_UNESCAPED_UNICODE);
                if ($DB_DRIVER === 'sqlite') {
                    $stmt = $pdo->prepare("INSERT INTO nab_store (store_key, store_value) VALUES (?, ?) ON CONFLICT(store_key) DO UPDATE SET store_value = excluded.store_value");
                } else {
                    $stmt = $pdo->prepare("INSERT INTO nab_store (store_key, store_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE store_value = VALUES(store_value)");
                }
                $stmt->execute([$k, $jsonValue]);
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'synced_count' => count($items)]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action parameter']);
        break;
}
