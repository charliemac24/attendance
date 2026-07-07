SET @sms_notifications_sms_log_id_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND column_name = 'sms_log_id'
);
--> statement-breakpoint
SET @sms_notifications_sms_log_id_sql := IF(
  @sms_notifications_sms_log_id_exists = 0,
  'ALTER TABLE `sms_notifications` ADD COLUMN `sms_log_id` int NULL AFTER `status`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_sms_log_id_stmt FROM @sms_notifications_sms_log_id_sql;
--> statement-breakpoint
EXECUTE sms_notifications_sms_log_id_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_sms_log_id_stmt;
--> statement-breakpoint

SET @sms_notifications_attempt_count_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND column_name = 'attempt_count'
);
--> statement-breakpoint
SET @sms_notifications_attempt_count_sql := IF(
  @sms_notifications_attempt_count_exists = 0,
  'ALTER TABLE `sms_notifications` ADD COLUMN `attempt_count` int NOT NULL DEFAULT 0 AFTER `sms_log_id`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_attempt_count_stmt FROM @sms_notifications_attempt_count_sql;
--> statement-breakpoint
EXECUTE sms_notifications_attempt_count_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_attempt_count_stmt;
--> statement-breakpoint

SET @sms_notifications_next_attempt_at_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND column_name = 'next_attempt_at'
);
--> statement-breakpoint
SET @sms_notifications_next_attempt_at_sql := IF(
  @sms_notifications_next_attempt_at_exists = 0,
  'ALTER TABLE `sms_notifications` ADD COLUMN `next_attempt_at` datetime NULL AFTER `attempt_count`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_next_attempt_at_stmt FROM @sms_notifications_next_attempt_at_sql;
--> statement-breakpoint
EXECUTE sms_notifications_next_attempt_at_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_next_attempt_at_stmt;
--> statement-breakpoint

SET @sms_notifications_last_attempt_at_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND column_name = 'last_attempt_at'
);
--> statement-breakpoint
SET @sms_notifications_last_attempt_at_sql := IF(
  @sms_notifications_last_attempt_at_exists = 0,
  'ALTER TABLE `sms_notifications` ADD COLUMN `last_attempt_at` datetime NULL AFTER `next_attempt_at`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_last_attempt_at_stmt FROM @sms_notifications_last_attempt_at_sql;
--> statement-breakpoint
EXECUTE sms_notifications_last_attempt_at_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_last_attempt_at_stmt;
--> statement-breakpoint

SET @sms_notifications_last_http_status_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND column_name = 'last_http_status'
);
--> statement-breakpoint
SET @sms_notifications_last_http_status_sql := IF(
  @sms_notifications_last_http_status_exists = 0,
  'ALTER TABLE `sms_notifications` ADD COLUMN `last_http_status` int NULL AFTER `last_attempt_at`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_last_http_status_stmt FROM @sms_notifications_last_http_status_sql;
--> statement-breakpoint
EXECUTE sms_notifications_last_http_status_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_last_http_status_stmt;
--> statement-breakpoint

SET @sms_notifications_provider_status_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND column_name = 'provider_status'
);
--> statement-breakpoint
SET @sms_notifications_provider_status_sql := IF(
  @sms_notifications_provider_status_exists = 0,
  'ALTER TABLE `sms_notifications` ADD COLUMN `provider_status` varchar(32) NULL AFTER `last_http_status`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_provider_status_stmt FROM @sms_notifications_provider_status_sql;
--> statement-breakpoint
EXECUTE sms_notifications_provider_status_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_provider_status_stmt;
--> statement-breakpoint

SET @sms_notifications_processing_error_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND column_name = 'processing_error'
);
--> statement-breakpoint
SET @sms_notifications_processing_error_sql := IF(
  @sms_notifications_processing_error_exists = 0,
  'ALTER TABLE `sms_notifications` ADD COLUMN `processing_error` text NULL AFTER `provider_response`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_processing_error_stmt FROM @sms_notifications_processing_error_sql;
--> statement-breakpoint
EXECUTE sms_notifications_processing_error_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_processing_error_stmt;
--> statement-breakpoint

SET @sms_notifications_locked_at_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND column_name = 'locked_at'
);
--> statement-breakpoint
SET @sms_notifications_locked_at_sql := IF(
  @sms_notifications_locked_at_exists = 0,
  'ALTER TABLE `sms_notifications` ADD COLUMN `locked_at` datetime NULL AFTER `processing_error`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_locked_at_stmt FROM @sms_notifications_locked_at_sql;
--> statement-breakpoint
EXECUTE sms_notifications_locked_at_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_locked_at_stmt;
--> statement-breakpoint

SET @sms_notifications_updated_at_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND column_name = 'updated_at'
);
--> statement-breakpoint
SET @sms_notifications_updated_at_sql := IF(
  @sms_notifications_updated_at_exists = 0,
  'ALTER TABLE `sms_notifications` ADD COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp() AFTER `created_at`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_updated_at_stmt FROM @sms_notifications_updated_at_sql;
--> statement-breakpoint
EXECUTE sms_notifications_updated_at_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_updated_at_stmt;
--> statement-breakpoint

SET @sms_notifications_sms_log_id_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND constraint_name = 'sms_notifications_sms_log_id_sms_logs_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);
--> statement-breakpoint
SET @sms_notifications_sms_log_id_fk_sql := IF(
  @sms_notifications_sms_log_id_fk_exists = 0,
  'ALTER TABLE `sms_notifications` ADD CONSTRAINT `sms_notifications_sms_log_id_sms_logs_id_fk` FOREIGN KEY (`sms_log_id`) REFERENCES `sms_logs` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_sms_log_id_fk_stmt FROM @sms_notifications_sms_log_id_fk_sql;
--> statement-breakpoint
EXECUTE sms_notifications_sms_log_id_fk_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_sms_log_id_fk_stmt;
--> statement-breakpoint

SET @sms_notifications_status_next_attempt_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'sms_notifications'
    AND index_name = 'sms_notifications_status_next_attempt_idx'
);
--> statement-breakpoint
SET @sms_notifications_status_next_attempt_idx_sql := IF(
  @sms_notifications_status_next_attempt_idx_exists = 0,
  'CREATE INDEX `sms_notifications_status_next_attempt_idx` ON `sms_notifications` (`status`,`next_attempt_at`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_notifications_status_next_attempt_idx_stmt FROM @sms_notifications_status_next_attempt_idx_sql;
--> statement-breakpoint
EXECUTE sms_notifications_status_next_attempt_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_notifications_status_next_attempt_idx_stmt;
