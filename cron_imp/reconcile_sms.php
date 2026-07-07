#!/usr/bin/env php
<?php
declare(strict_types=1);

require_once __DIR__ . '/sms_worker.php';

try {
    $limit = null;
    foreach (array_slice($argv, 1) as $arg) {
        if (str_starts_with($arg, '--limit=')) {
            $limit = (int) substr($arg, 8);
        }
    }

    $result = reconcile_sms_queue(pdo_connection(), $limit);
    echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit(0);
} catch (Throwable $error) {
    log_stderr('reconcile_sms.php failed', ['error' => $error->getMessage()]);
    fwrite(STDERR, $error->getTraceAsString() . PHP_EOL);
    exit(1);
}
