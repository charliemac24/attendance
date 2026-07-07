PHP cron worker for SMS queue processing on cPanel.

Files:
- `bootstrap.php`: environment loading and DB connection
- `sms_worker.php`: shared queue/send/reconcile logic
- `process_sms.php`: claims queued notifications and sends SMS via Semaphore
- `reconcile_sms.php`: updates submitted notifications from Semaphore message status

Requirements:
- PHP CLI with `pdo_mysql` and `curl`
- `DATABASE_URL` available in the environment or repo `.env`

Run manually:

```bash
php ~/public_html/attendance/cron_imp/process_sms.php
php ~/public_html/attendance/cron_imp/reconcile_sms.php
```

Optional limit override:

```bash
php ~/public_html/attendance/cron_imp/process_sms.php --limit=10
php ~/public_html/attendance/cron_imp/reconcile_sms.php --limit=100
```

Suggested cPanel cron entries:

Process SMS every minute on weekdays:

```bash
* * * * 1-5 /usr/local/bin/php ~/public_html/attendance/cron_imp/process_sms.php >> ~/process_sms_cron.log 2>&1
```

Reconcile SMS every 5 minutes on weekdays:

```bash
*/5 * * * 1-5 /usr/local/bin/php ~/public_html/attendance/cron_imp/reconcile_sms.php >> ~/reconcile_sms_cron.log 2>&1
```

Notes:
- The worker processes queued rows regardless of school-day.
- Notifications older than 24 hours are expired and removed from `sms_notifications`.
- Stale `processing` rows are reclaimed after 15 minutes.
- Queue rows and linked `sms_logs` are updated directly in MySQL.
