<?php
declare(strict_types=1);

date_default_timezone_set('UTC');

const CRON_IMP_ROOT = __DIR__;
const APP_ROOT = __DIR__ . DIRECTORY_SEPARATOR . '..';

load_env_file(APP_ROOT . DIRECTORY_SEPARATOR . '.env');

function load_env_file(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }

        $parts = explode('=', $trimmed, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $value = trim($parts[1]);

        if ($key === '') {
            continue;
        }

        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }

        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

function env_value(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }

    return $value;
}

function app_config(): array
{
    static $config = null;

    if ($config !== null) {
        return $config;
    }

    $config = [
        'database_url' => env_value('DATABASE_URL'),
        'sms_process_batch_size' => 10,
        'sms_reconcile_batch_size' => 100,
        'sms_send_spacing_ms' => 400,
        'sms_max_retry_attempts' => 3,
        'sms_stale_lock_minutes' => 15,
        'sms_notification_expiry_hours' => 24,
        'sms_duplicate_lookback_days' => 1,
    ];

    if (!$config['database_url']) {
        throw new RuntimeException('DATABASE_URL is required');
    }

    return $config;
}

function pdo_connection(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $databaseUrl = app_config()['database_url'];
    $parts = parse_url($databaseUrl);
    if ($parts === false || ($parts['scheme'] ?? '') !== 'mysql') {
        throw new RuntimeException('Unsupported DATABASE_URL format');
    }

    $host = $parts['host'] ?? '127.0.0.1';
    $port = (int) ($parts['port'] ?? 3306);
    $user = rawurldecode($parts['user'] ?? '');
    $pass = rawurldecode($parts['pass'] ?? '');
    $dbName = ltrim((string) ($parts['path'] ?? ''), '/');

    if ($dbName === '') {
        throw new RuntimeException('Database name is missing in DATABASE_URL');
    }

    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $dbName);

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function now_utc(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('UTC'));
}

function db_datetime(DateTimeInterface $value): string
{
    $utc = (new DateTimeImmutable($value->format(DateTimeInterface::ATOM)))->setTimezone(new DateTimeZone('UTC'));
    return $utc->format('Y-m-d H:i:s');
}

function days_ago_iso(int $offsetDays): string
{
    return now_utc()->modify(($offsetDays >= 0 ? '+' : '') . $offsetDays . ' days')->format('Y-m-d');
}

function normalize_phone(string $phone): string
{
    $digits = preg_replace('/[^0-9]/', '', $phone) ?? '';

    if (str_starts_with($digits, '0') && strlen($digits) === 11) {
        return '63' . substr($digits, 1);
    }

    if (str_starts_with($digits, '63')) {
        return $digits;
    }

    if (str_starts_with($digits, '9') && strlen($digits) === 10) {
        return '63' . $digits;
    }

    return $digits;
}

function json_encode_db(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }

    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function log_stderr(string $message, array $context = []): void
{
    $line = $message;
    if ($context !== []) {
        $encoded = json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $line .= ' ' . ($encoded === false ? '[context encode failed]' : $encoded);
    }

    fwrite(STDERR, $line . PHP_EOL);
}

function clamp_int(int $value, int $min, int $max): int
{
    if ($value < $min) {
        return $min;
    }
    if ($value > $max) {
        return $max;
    }
    return $value;
}
