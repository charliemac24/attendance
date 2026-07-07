<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

final class SemaphoreRequestException extends RuntimeException
{
    public ?int $httpStatus;
    public mixed $providerResponse;
    public ?int $retryAfterSeconds;
    public bool $shouldRetry;
    public string $kind;
    public ?string $causeMessage;

    public function __construct(
        string $message,
        ?int $httpStatus = null,
        mixed $providerResponse = null,
        ?int $retryAfterSeconds = null,
        bool $shouldRetry = false,
        string $kind = 'unknown',
        ?string $causeMessage = null
    ) {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
        $this->providerResponse = $providerResponse;
        $this->retryAfterSeconds = $retryAfterSeconds;
        $this->shouldRetry = $shouldRetry;
        $this->kind = $kind;
        $this->causeMessage = $causeMessage;
    }
}

function process_sms_queue(PDO $pdo, ?int $requestedLimit = null): array
{
    $config = app_config();
    $limit = clamp_int((int) ($requestedLimit ?? $config['sms_process_batch_size']), 1, 50);
    $now = now_utc();

    $cleaned = purge_expired_sms_notifications($pdo, $now);
    $candidateLimit = min(max($limit * 10, $limit), 500);
    $pendingNotifications = get_pending_sms_notifications($pdo, $candidateLimit, $now);
    $notifications = array_slice($pendingNotifications, 0, $limit);

    $results = [];
    foreach ($notifications as $notification) {
        if (!claim_sms_notification($pdo, (int) $notification['id'], ['queued', 'retry_wait', 'processing'], $now)) {
            continue;
        }

        $results[] = process_single_sms_notification($pdo, $notification, $now);
        usleep((int) $config['sms_send_spacing_ms'] * 1000);
    }

    return [
        'success' => true,
        'processedAt' => $now->format(DateTimeInterface::ATOM),
        'requestedLimit' => $limit,
        'cleaned' => $cleaned,
        'processed' => count($results),
        'results' => $results,
    ];
}

function reconcile_sms_queue(PDO $pdo, ?int $requestedLimit = null): array
{
    $config = app_config();
    $limit = clamp_int((int) ($requestedLimit ?? $config['sms_reconcile_batch_size']), 1, 300);
    $notifications = get_sms_notifications_by_status($pdo, ['submitted'], $limit);
    $grouped = [];

    foreach ($notifications as $notification) {
        if (empty($notification['provider_message_id'])) {
            continue;
        }
        $grouped[(int) $notification['school_id']][] = $notification;
    }

    $results = [];
    foreach ($grouped as $schoolId => $schoolNotifications) {
        $school = get_school($pdo, $schoolId);
        if ($school === null || empty($school['semaphore_api_key'])) {
            continue;
        }

        try {
            $messages = get_semaphore_messages((string) $school['semaphore_api_key'], [
                'limit' => 1000,
                'startDate' => days_ago_iso(-1),
                'endDate' => days_ago_iso(0),
            ]);
        } catch (Throwable $error) {
            $results[] = [
                'schoolId' => $schoolId,
                'status' => 'lookup_failed',
                'reason' => $error->getMessage(),
            ];
            continue;
        }

        $byMessageId = [];
        foreach ($messages as $message) {
            $messageId = get_semaphore_message_id($message);
            if ($messageId !== null && $messageId !== '') {
                $byMessageId[(string) $messageId] = $message;
            }
        }

        foreach ($schoolNotifications as $notification) {
            $providerEntry = $byMessageId[(string) ($notification['provider_message_id'] ?? '')] ?? null;
            if ($providerEntry === null) {
                continue;
            }

            $providerStatus = get_semaphore_provider_status($providerEntry);
            $localStatus = map_semaphore_delivery_status($providerStatus);

            update_notification_log_and_state($pdo, $notification, [
                'status' => $localStatus,
                'provider_status' => $providerStatus,
                'provider_response' => $providerEntry,
                'error_message' => $localStatus === 'failed' ? 'Provider status: ' . (string) $providerStatus : null,
                'processing_error' => null,
                'locked_at' => null,
                'sent_at' => $localStatus === 'sent' ? db_datetime(now_utc()) : null,
            ]);

            $results[] = [
                'notificationId' => (int) $notification['id'],
                'schoolId' => $schoolId,
                'status' => $localStatus,
                'providerStatus' => $providerStatus,
            ];
        }
    }

    return [
        'success' => true,
        'processedAt' => now_utc()->format(DateTimeInterface::ATOM),
        'requestedLimit' => $limit,
        'processed' => count($results),
        'results' => $results,
    ];
}

function process_single_sms_notification(PDO $pdo, array $notification, DateTimeImmutable $now): array
{
    $attemptCount = ((int) ($notification['attempt_count'] ?? 0)) + 1;

    try {
        $school = get_school($pdo, (int) $notification['school_id']);
        if ($school === null) {
            update_notification_log_and_state($pdo, $notification, [
                'status' => 'failed',
                'attempt_count' => $attemptCount,
                'last_attempt_at' => db_datetime($now),
                'last_http_status' => null,
                'processing_error' => 'School not found',
                'error_message' => 'School not found',
                'locked_at' => null,
                'sent_at' => null,
            ]);
            return ['id' => (int) $notification['id'], 'status' => 'failed', 'reason' => 'school_not_found'];
        }

        if (!(bool) ($school['sms_enabled'] ?? false)) {
            update_notification_log_and_state($pdo, $notification, [
                'status' => 'failed',
                'attempt_count' => $attemptCount,
                'last_attempt_at' => db_datetime($now),
                'last_http_status' => null,
                'processing_error' => 'SMS is disabled in school settings',
                'error_message' => 'SMS is disabled in school settings',
                'locked_at' => null,
                'sent_at' => null,
            ]);
            return ['id' => (int) $notification['id'], 'status' => 'failed', 'reason' => 'sms_disabled'];
        }

        if (($school['sms_provider'] ?? '') !== 'semaphore') {
            update_notification_log_and_state($pdo, $notification, [
                'status' => 'failed',
                'attempt_count' => $attemptCount,
                'last_attempt_at' => db_datetime($now),
                'last_http_status' => null,
                'processing_error' => 'Unsupported SMS provider: ' . (string) ($school['sms_provider'] ?? ''),
                'error_message' => 'Unsupported SMS provider: ' . (string) ($school['sms_provider'] ?? ''),
                'locked_at' => null,
                'sent_at' => null,
            ]);
            return ['id' => (int) $notification['id'], 'status' => 'failed', 'reason' => 'unsupported_provider'];
        }

        if (!is_string($school['semaphore_api_key'] ?? null) || trim((string) $school['semaphore_api_key']) === '') {
            update_notification_log_and_state($pdo, $notification, [
                'status' => 'failed',
                'attempt_count' => $attemptCount,
                'last_attempt_at' => db_datetime($now),
                'last_http_status' => null,
                'processing_error' => 'Missing Semaphore API key',
                'error_message' => 'Missing Semaphore API key',
                'locked_at' => null,
                'sent_at' => null,
            ]);
            return ['id' => (int) $notification['id'], 'status' => 'failed', 'reason' => 'missing_api_key'];
        }

        update_sms_notification($pdo, (int) $notification['id'], [
            'attempt_count' => $attemptCount,
            'last_attempt_at' => db_datetime($now),
            'processing_error' => null,
            'error_message' => null,
            'locked_at' => db_datetime($now),
            'updated_at' => db_datetime($now),
        ]);

        try {
            $result = send_semaphore_message(
                (string) $school['semaphore_api_key'],
                is_string($school['semaphore_sender_name'] ?? null) && trim((string) $school['semaphore_sender_name']) !== '' ? (string) $school['semaphore_sender_name'] : null,
                normalize_phone((string) ($notification['to_phone'] ?? '')),
                (string) $notification['message']
            );

            $localStatus = map_semaphore_delivery_status($result['providerStatus'] ?? null);
            update_notification_log_and_state($pdo, $notification, [
                'status' => $localStatus,
                'last_http_status' => 200,
                'provider_status' => $result['providerStatus'] ?? null,
                'provider_message_id' => $result['providerMessageId'] ?? null,
                'provider_response' => $result['providerResponse'] ?? null,
                'processing_error' => null,
                'error_message' => null,
                'locked_at' => null,
                'sent_at' => $localStatus === 'sent' ? db_datetime($now) : null,
            ]);

            return [
                'id' => (int) $notification['id'],
                'status' => $localStatus,
                'providerStatus' => $result['providerStatus'] ?? null,
            ];
        } catch (SemaphoreRequestException $error) {
            if ($error->kind === 'network') {
                try {
                    $duplicate = find_matching_semaphore_message(
                        (string) $school['semaphore_api_key'],
                        normalize_phone((string) ($notification['to_phone'] ?? '')),
                        (string) $notification['message']
                    );

                    if ($duplicate !== null) {
                        $providerStatus = get_semaphore_provider_status($duplicate);
                        $localStatus = map_semaphore_delivery_status($providerStatus);

                        update_notification_log_and_state($pdo, $notification, [
                            'status' => $localStatus,
                            'last_http_status' => null,
                            'provider_status' => $providerStatus,
                            'provider_message_id' => get_semaphore_message_id($duplicate),
                            'provider_response' => $duplicate,
                            'processing_error' => $error->causeMessage ?? $error->getMessage(),
                            'error_message' => null,
                            'locked_at' => null,
                            'sent_at' => $localStatus === 'sent' ? db_datetime($now) : null,
                        ]);

                        return ['id' => (int) $notification['id'], 'status' => $localStatus, 'deduped' => true];
                    }
                } catch (Throwable $lookupError) {
                    log_stderr('Semaphore duplicate lookup failed', [
                        'notificationId' => (int) $notification['id'],
                        'error' => $lookupError->getMessage(),
                    ]);
                }
            }

            $shouldRetry = $error->shouldRetry && $attemptCount < (int) app_config()['sms_max_retry_attempts'];
            if ($shouldRetry) {
                $retryDelaySeconds = get_retry_delay_seconds($attemptCount, $error->retryAfterSeconds);
                update_notification_log_and_state($pdo, $notification, [
                    'status' => 'retry_wait',
                    'next_attempt_at' => db_datetime($now->modify('+' . $retryDelaySeconds . ' seconds')),
                    'last_http_status' => $error->httpStatus,
                    'provider_response' => $error->providerResponse,
                    'processing_error' => $error->causeMessage ?? $error->getMessage(),
                    'error_message' => $error->getMessage(),
                    'locked_at' => null,
                    'sent_at' => null,
                ]);

                return ['id' => (int) $notification['id'], 'status' => 'retry_wait', 'retryInSeconds' => $retryDelaySeconds];
            }

            update_notification_log_and_state($pdo, $notification, [
                'status' => 'failed',
                'last_http_status' => $error->httpStatus,
                'provider_response' => $error->providerResponse,
                'processing_error' => $error->causeMessage ?? $error->getMessage(),
                'error_message' => $error->getMessage(),
                'locked_at' => null,
                'sent_at' => null,
            ]);

            return ['id' => (int) $notification['id'], 'status' => 'failed', 'reason' => $error->getMessage()];
        }
    } catch (Throwable $error) {
        log_stderr('Unexpected SMS notification processing failure', [
            'notificationId' => (int) $notification['id'],
            'error' => $error->getMessage(),
        ]);

        try {
            update_notification_log_and_state($pdo, $notification, [
                'status' => 'failed',
                'attempt_count' => $attemptCount,
                'last_attempt_at' => db_datetime($now),
                'last_http_status' => null,
                'provider_response' => null,
                'processing_error' => $error->getMessage(),
                'error_message' => $error->getMessage(),
                'locked_at' => null,
                'sent_at' => null,
            ]);
        } catch (Throwable $updateError) {
            log_stderr('Failed to unlock SMS notification after unexpected failure', [
                'notificationId' => (int) $notification['id'],
                'error' => $updateError->getMessage(),
            ]);
        }

        return ['id' => (int) $notification['id'], 'status' => 'failed', 'reason' => $error->getMessage()];
    }
}

function purge_expired_sms_notifications(PDO $pdo, DateTimeImmutable $now): int
{
    $expiryHours = (int) app_config()['sms_notification_expiry_hours'];
    $cutoff = $now->modify('-' . $expiryHours . ' hours');
    $statuses = ['queued', 'retry_wait', 'processing'];

    $sql = "SELECT id, sms_log_id, created_at
            FROM sms_notifications
            WHERE status IN ('queued', 'retry_wait', 'processing')
            ORDER BY updated_at ASC, created_at ASC
            LIMIT 5000";
    $rows = $pdo->query($sql)->fetchAll();

    $notificationIds = [];
    $smsLogIds = [];
    foreach ($rows as $row) {
        $createdAt = isset($row['created_at']) ? new DateTimeImmutable((string) $row['created_at'], new DateTimeZone('UTC')) : null;
        if ($createdAt !== null && $createdAt >= $cutoff) {
            continue;
        }

        $notificationIds[] = (int) $row['id'];
        if (!empty($row['sms_log_id'])) {
            $smsLogIds[] = (int) $row['sms_log_id'];
        }
    }

    if ($notificationIds === []) {
        return 0;
    }

    mark_sms_logs_failed($pdo, $smsLogIds, 'Expired from SMS queue after ' . $expiryHours . ' hours');

    $placeholders = implode(',', array_fill(0, count($notificationIds), '?'));
    $stmt = $pdo->prepare("DELETE FROM sms_notifications WHERE id IN ($placeholders)");
    $stmt->execute($notificationIds);

    return $stmt->rowCount();
}

function get_pending_sms_notifications(PDO $pdo, int $limit, DateTimeImmutable $now): array
{
    $staleBefore = $now->modify('-' . (int) app_config()['sms_stale_lock_minutes'] . ' minutes');
    $stmt = $pdo->prepare(
        "SELECT *
         FROM sms_notifications
         WHERE (
           (status IN ('queued', 'retry_wait') AND (next_attempt_at IS NULL OR next_attempt_at <= :now))
           OR
           (status = 'processing' AND locked_at <= :stale_before)
         )
         ORDER BY next_attempt_at ASC, created_at ASC
         LIMIT :limit"
    );
    $stmt->bindValue(':now', db_datetime($now));
    $stmt->bindValue(':stale_before', db_datetime($staleBefore));
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function get_sms_notifications_by_status(PDO $pdo, array $statuses, int $limit): array
{
    if ($statuses === []) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($statuses), '?'));
    $stmt = $pdo->prepare(
        "SELECT *
         FROM sms_notifications
         WHERE status IN ($placeholders)
         ORDER BY updated_at ASC, created_at ASC
         LIMIT ?"
    );

    $index = 1;
    foreach ($statuses as $status) {
        $stmt->bindValue($index++, $status);
    }
    $stmt->bindValue($index, $limit, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->fetchAll();
}

function claim_sms_notification(PDO $pdo, int $id, array $expectedStatuses, DateTimeImmutable $now): bool
{
    if ($expectedStatuses === []) {
        return false;
    }

    $staleBefore = $now->modify('-' . (int) app_config()['sms_stale_lock_minutes'] . ' minutes');
    $statusList = implode(',', array_map(static fn(string $status): string => $pdo->quote($status), $expectedStatuses));

    $stmt = $pdo->prepare(
        "UPDATE sms_notifications
         SET status = 'processing', locked_at = :lock_now, updated_at = :updated_now
         WHERE id = :id
           AND status IN ($statusList)
           AND (
             (status IN ('queued', 'retry_wait') AND (next_attempt_at IS NULL OR next_attempt_at <= :eligible_now))
             OR
             (status = 'processing' AND locked_at <= :stale_before)
           )"
    );

    $stmt->execute([
        ':lock_now' => db_datetime($now),
        ':updated_now' => db_datetime($now),
        ':eligible_now' => db_datetime($now),
        ':stale_before' => db_datetime($staleBefore),
        ':id' => $id,
    ]);

    return $stmt->rowCount() > 0;
}

function update_notification_log_and_state(PDO $pdo, array $notification, array $data): void
{
    $notificationData = $data;
    if (!array_key_exists('updated_at', $notificationData)) {
        $notificationData['updated_at'] = db_datetime(now_utc());
    }

    update_sms_notification($pdo, (int) $notification['id'], $notificationData);

    if (!empty($notification['sms_log_id'])) {
        update_sms_log($pdo, (int) $notification['sms_log_id'], [
            'status' => $data['status'] ?? null,
            'provider_message_id' => $data['provider_message_id'] ?? null,
            'provider_response' => $data['provider_response'] ?? null,
            'sent_at' => $data['sent_at'] ?? null,
            'error_message' => $data['error_message'] ?? ($data['processing_error'] ?? null),
            'template_type' => $notification['template_type'] ?? null,
            'to_phone' => $notification['to_phone'] ?? 'N/A',
            'message' => $notification['message'] ?? '',
            'school_id' => (int) $notification['school_id'],
            'student_id' => $notification['student_id'] !== null ? (int) $notification['student_id'] : null,
        ]);
    }
}

function update_sms_notification(PDO $pdo, int $id, array $data): void
{
    execute_update($pdo, 'sms_notifications', $id, $data);
}

function update_sms_log(PDO $pdo, int $id, array $data): void
{
    execute_update($pdo, 'sms_logs', $id, $data);
}

function execute_update(PDO $pdo, string $table, int $id, array $data): void
{
    $allowed = [];
    $params = [':id' => $id];

    foreach ($data as $column => $value) {
        if ($value === null) {
            $allowed[] = sprintf('%s = NULL', $column);
            continue;
        }

        if (in_array($column, ['provider_response'], true)) {
            $value = json_encode_db($value);
        }

        $paramName = ':p_' . preg_replace('/[^a-z0-9_]/i', '_', $column);
        $allowed[] = sprintf('%s = %s', $column, $paramName);
        $params[$paramName] = $value;
    }

    if ($allowed === []) {
        return;
    }

    $sql = sprintf('UPDATE %s SET %s WHERE id = :id', $table, implode(', ', $allowed));
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
}

function mark_sms_logs_failed(PDO $pdo, array $ids, string $errorMessage): int
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn(int $id): bool => $id > 0)));
    if ($ids === []) {
        return 0;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $params = array_merge([$errorMessage], $ids);
    $stmt = $pdo->prepare("UPDATE sms_logs SET status = 'failed', error_message = ?, sent_at = NULL WHERE id IN ($placeholders)");
    $stmt->execute($params);
    return $stmt->rowCount();
}

function get_school(PDO $pdo, int $schoolId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM schools WHERE id = ? LIMIT 1');
    $stmt->execute([$schoolId]);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

function send_semaphore_message(string $apiKey, ?string $senderName, string $toPhone, string $message): array
{
    $fields = [
        'apikey' => $apiKey,
        'number' => $toPhone,
        'message' => $message,
    ];
    if ($senderName !== null && trim($senderName) !== '') {
        $fields['sendername'] = $senderName;
    }

    [$status, $headers, $body] = curl_request('https://api.semaphore.co/api/v4/messages', 'POST', http_build_query($fields), [
        'Content-Type: application/x-www-form-urlencoded',
    ]);

    $parsed = decode_provider_body($body);
    if ($status < 200 || $status >= 300) {
        $providerMessage = summarize_provider_error($parsed);
        $retryAfter = isset($headers['retry-after']) ? (int) $headers['retry-after'] : null;

        if ($status === 429) {
            throw new SemaphoreRequestException(
                'Semaphore rate limited request (' . $status . ')',
                $status,
                $parsed,
                $retryAfter,
                true,
                'rate_limit'
            );
        }

        if ($status === 401) {
            throw new SemaphoreRequestException(
                'Semaphore authentication failed (' . $status . ')',
                $status,
                $parsed,
                null,
                false,
                'auth'
            );
        }

        if ($status === 400) {
            throw new SemaphoreRequestException(
                'Semaphore rejected request: ' . $providerMessage,
                $status,
                $parsed,
                null,
                false,
                'bad_request'
            );
        }

        if ($status >= 500 && is_array($parsed)) {
            throw new SemaphoreRequestException(
                'Semaphore business error: ' . $providerMessage,
                $status,
                $parsed,
                null,
                false,
                'business'
            );
        }

        throw new SemaphoreRequestException(
            'Semaphore request failed (' . $status . ')',
            $status,
            $parsed,
            null,
            false,
            'unknown'
        );
    }

    return [
        'providerResponse' => $parsed,
        'providerMessageId' => get_semaphore_message_id($parsed),
        'providerStatus' => get_semaphore_provider_status($parsed),
        'rateLimitRemaining' => isset($headers['x-ratelimit-remaining']) ? (int) $headers['x-ratelimit-remaining'] : null,
        'rateLimitLimit' => isset($headers['x-ratelimit-limit']) ? (int) $headers['x-ratelimit-limit'] : null,
    ];
}

function get_semaphore_messages(string $apiKey, array $params): array
{
    $query = ['apikey' => $apiKey];
    if (!empty($params['limit'])) {
        $query['limit'] = (string) $params['limit'];
    }
    if (!empty($params['page'])) {
        $query['page'] = (string) $params['page'];
    }
    if (!empty($params['startDate'])) {
        $query['startDate'] = (string) $params['startDate'];
    }
    if (!empty($params['endDate'])) {
        $query['endDate'] = (string) $params['endDate'];
    }

    $url = 'https://api.semaphore.co/api/v4/messages?' . http_build_query($query);
    [$status, , $body] = curl_request($url, 'GET');
    $parsed = decode_provider_body($body);

    if ($status < 200 || $status >= 300) {
        throw new SemaphoreRequestException(
            'Semaphore retrieve messages failed (' . $status . ')',
            $status,
            $parsed,
            null,
            false,
            'unknown'
        );
    }

    return is_array($parsed) ? $parsed : [];
}

function find_matching_semaphore_message(string $apiKey, string $toPhone, string $message): ?array
{
    $messages = get_semaphore_messages($apiKey, [
        'limit' => 200,
        'startDate' => days_ago_iso(-(int) app_config()['sms_duplicate_lookback_days']),
        'endDate' => days_ago_iso(0),
    ]);

    foreach ($messages as $entry) {
        $recipient = normalize_phone((string) ($entry['recipient'] ?? ''));
        if ($recipient === $toPhone && (string) ($entry['message'] ?? '') === $message) {
            return $entry;
        }
    }

    return null;
}

function curl_request(string $url, string $method, ?string $body = null, array $headers = []): array
{
    $responseHeaders = [];
    $ch = curl_init($url);
    if ($ch === false) {
        throw new SemaphoreRequestException('Failed to initialize cURL', null, null, null, true, 'network');
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_HEADERFUNCTION => static function ($curl, string $headerLine) use (&$responseHeaders): int {
            $trimmed = trim($headerLine);
            if ($trimmed !== '' && str_contains($trimmed, ':')) {
                [$name, $value] = explode(':', $trimmed, 2);
                $responseHeaders[strtolower(trim($name))] = trim($value);
            }
            return strlen($headerLine);
        },
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $responseBody = curl_exec($ch);
    if ($responseBody === false) {
        $message = curl_error($ch);
        curl_close($ch);
        throw new SemaphoreRequestException(
            $message !== '' ? $message : 'Failed to reach Semaphore',
            null,
            null,
            null,
            true,
            'network',
            $message !== '' ? $message : null
        );
    }

    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [$status, $responseHeaders, $responseBody];
}

function decode_provider_body(string $body): mixed
{
    $trimmed = trim($body);
    if ($trimmed === '') {
        return null;
    }

    $decoded = json_decode($trimmed, true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : $trimmed;
}

function summarize_provider_error(mixed $providerResponse): string
{
    if (is_string($providerResponse) && trim($providerResponse) !== '') {
        return trim($providerResponse);
    }

    if (is_array($providerResponse) && $providerResponse !== []) {
        $parts = [];
        foreach ($providerResponse as $entry) {
            if (is_string($entry) && trim($entry) !== '') {
                $parts[] = trim($entry);
                continue;
            }

            if (is_array($entry)) {
                foreach ($entry as $key => $value) {
                    if (is_string($value) && trim($value) !== '') {
                        $parts[] = $key . ': ' . trim($value);
                    }
                }
            }
        }

        if ($parts !== []) {
            return implode('; ', $parts);
        }
    }

    if (is_array($providerResponse)) {
        foreach (['error', 'message'] as $key) {
            if (isset($providerResponse[$key]) && is_string($providerResponse[$key]) && trim($providerResponse[$key]) !== '') {
                return trim($providerResponse[$key]);
            }
        }
    }

    return 'Unknown provider error';
}

function get_semaphore_message_id(mixed $providerResponse): ?string
{
    $first = is_array($providerResponse) && array_is_list($providerResponse) ? ($providerResponse[0] ?? null) : $providerResponse;
    if (!is_array($first)) {
        return null;
    }

    $value = $first['message_id'] ?? $first['id'] ?? null;
    return $value === null ? null : (string) $value;
}

function get_semaphore_provider_status(mixed $providerResponse): ?string
{
    $first = is_array($providerResponse) && array_is_list($providerResponse) ? ($providerResponse[0] ?? null) : $providerResponse;
    if (!is_array($first) || !isset($first['status'])) {
        return null;
    }

    $status = trim((string) $first['status']);
    return $status === '' ? null : $status;
}

function map_semaphore_delivery_status(?string $providerStatus): string
{
    $normalized = strtolower(trim((string) ($providerStatus ?? '')));
    if ($normalized === '' || $normalized === 'pending' || $normalized === 'queued') {
        return 'submitted';
    }
    if ($normalized === 'sent') {
        return 'sent';
    }
    if ($normalized === 'failed' || $normalized === 'refunded') {
        return 'failed';
    }
    return 'submitted';
}

function get_retry_delay_seconds(int $attemptCount, ?int $retryAfterSeconds = null): int
{
    if ($retryAfterSeconds !== null && $retryAfterSeconds > 0) {
        return $retryAfterSeconds;
    }
    if ($attemptCount <= 1) {
        return 60;
    }
    if ($attemptCount === 2) {
        return 300;
    }
    return 900;
}
