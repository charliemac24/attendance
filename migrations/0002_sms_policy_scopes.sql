SET @sms_daily_cap_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schools'
    AND column_name = 'sms_daily_cap'
);
--> statement-breakpoint
SET @sms_daily_cap_sql := IF(
  @sms_daily_cap_exists = 0,
  'ALTER TABLE `schools` ADD COLUMN `sms_daily_cap` int NOT NULL DEFAULT 2',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_daily_cap_stmt FROM @sms_daily_cap_sql;
--> statement-breakpoint
EXECUTE sms_daily_cap_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_daily_cap_stmt;
--> statement-breakpoint

SET @sms_send_mode_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schools'
    AND column_name = 'sms_send_mode'
);
--> statement-breakpoint
SET @sms_send_mode_sql := IF(
  @sms_send_mode_exists = 0,
  'ALTER TABLE `schools` ADD COLUMN `sms_send_mode` varchar(32) NOT NULL DEFAULT ''FIRST_IN_LAST_OUT''',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sms_send_mode_stmt FROM @sms_send_mode_sql;
--> statement-breakpoint
EXECUTE sms_send_mode_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sms_send_mode_stmt;
--> statement-breakpoint

SET @max_break_cycles_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schools'
    AND column_name = 'max_break_cycles_per_day'
);
--> statement-breakpoint
SET @max_break_cycles_sql := IF(
  @max_break_cycles_exists = 0,
  'ALTER TABLE `schools` ADD COLUMN `max_break_cycles_per_day` int NOT NULL DEFAULT 2',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE max_break_cycles_stmt FROM @max_break_cycles_sql;
--> statement-breakpoint
EXECUTE max_break_cycles_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE max_break_cycles_stmt;
--> statement-breakpoint

SET @min_scan_interval_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schools'
    AND column_name = 'min_scan_interval_seconds'
);
--> statement-breakpoint
SET @min_scan_interval_sql := IF(
  @min_scan_interval_exists = 0,
  'ALTER TABLE `schools` ADD COLUMN `min_scan_interval_seconds` int NOT NULL DEFAULT 120',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE min_scan_interval_stmt FROM @min_scan_interval_sql;
--> statement-breakpoint
EXECUTE min_scan_interval_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE min_scan_interval_stmt;
--> statement-breakpoint

SET @dismissal_time_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schools'
    AND column_name = 'dismissal_time'
);
--> statement-breakpoint
SET @dismissal_time_sql := IF(
  @dismissal_time_exists = 0,
  'ALTER TABLE `schools` ADD COLUMN `dismissal_time` time NOT NULL DEFAULT ''15:00:00''',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE dismissal_time_stmt FROM @dismissal_time_sql;
--> statement-breakpoint
EXECUTE dismissal_time_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE dismissal_time_stmt;
--> statement-breakpoint

SET @early_out_window_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schools'
    AND column_name = 'early_out_window_minutes'
);
--> statement-breakpoint
SET @early_out_window_sql := IF(
  @early_out_window_exists = 0,
  'ALTER TABLE `schools` ADD COLUMN `early_out_window_minutes` int NOT NULL DEFAULT 30',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE early_out_window_stmt FROM @early_out_window_sql;
--> statement-breakpoint
EXECUTE early_out_window_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE early_out_window_stmt;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `grade_sms_policies` (
  `id` int AUTO_INCREMENT NOT NULL,
  `school_id` int NOT NULL,
  `grade_level_id` int NOT NULL,
  `enabled` boolean NOT NULL DEFAULT false,
  `daily_cap` int NOT NULL DEFAULT 2,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `grade_sms_policies_id` PRIMARY KEY(`id`),
  CONSTRAINT `grade_sms_policies_school_grade_idx` UNIQUE(`school_id`,`grade_level_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `section_sms_policies` (
  `id` int AUTO_INCREMENT NOT NULL,
  `school_id` int NOT NULL,
  `section_id` int NOT NULL,
  `enabled` boolean NOT NULL DEFAULT false,
  `daily_cap` int NOT NULL DEFAULT 2,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `section_sms_policies_id` PRIMARY KEY(`id`),
  CONSTRAINT `section_sms_policies_school_section_idx` UNIQUE(`school_id`,`section_id`)
);
--> statement-breakpoint

SET @grade_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'grade_sms_policies'
    AND index_name = 'grade_sms_policies_school_idx'
);
--> statement-breakpoint
SET @grade_idx_sql := IF(
  @grade_idx_exists = 0,
  'CREATE INDEX `grade_sms_policies_school_idx` ON `grade_sms_policies` (`school_id`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE grade_idx_stmt FROM @grade_idx_sql;
--> statement-breakpoint
EXECUTE grade_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE grade_idx_stmt;
--> statement-breakpoint

SET @section_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'section_sms_policies'
    AND index_name = 'section_sms_policies_school_idx'
);
--> statement-breakpoint
SET @section_idx_sql := IF(
  @section_idx_exists = 0,
  'CREATE INDEX `section_sms_policies_school_idx` ON `section_sms_policies` (`school_id`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE section_idx_stmt FROM @section_idx_sql;
--> statement-breakpoint
EXECUTE section_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE section_idx_stmt;
--> statement-breakpoint

SET @grade_school_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'grade_sms_policies'
    AND constraint_name = 'grade_sms_policies_school_id_schools_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);
--> statement-breakpoint
SET @grade_school_fk_sql := IF(
  @grade_school_fk_exists = 0,
  'ALTER TABLE `grade_sms_policies` ADD CONSTRAINT `grade_sms_policies_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE grade_school_fk_stmt FROM @grade_school_fk_sql;
--> statement-breakpoint
EXECUTE grade_school_fk_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE grade_school_fk_stmt;
--> statement-breakpoint

SET @grade_level_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'grade_sms_policies'
    AND constraint_name = 'grade_sms_policies_grade_level_id_grade_levels_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);
--> statement-breakpoint
SET @grade_level_fk_sql := IF(
  @grade_level_fk_exists = 0,
  'ALTER TABLE `grade_sms_policies` ADD CONSTRAINT `grade_sms_policies_grade_level_id_grade_levels_id_fk` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`) ON DELETE no action ON UPDATE no action',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE grade_level_fk_stmt FROM @grade_level_fk_sql;
--> statement-breakpoint
EXECUTE grade_level_fk_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE grade_level_fk_stmt;
--> statement-breakpoint

SET @section_school_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'section_sms_policies'
    AND constraint_name = 'section_sms_policies_school_id_schools_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);
--> statement-breakpoint
SET @section_school_fk_sql := IF(
  @section_school_fk_exists = 0,
  'ALTER TABLE `section_sms_policies` ADD CONSTRAINT `section_sms_policies_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE section_school_fk_stmt FROM @section_school_fk_sql;
--> statement-breakpoint
EXECUTE section_school_fk_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE section_school_fk_stmt;
--> statement-breakpoint

SET @section_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'section_sms_policies'
    AND constraint_name = 'section_sms_policies_section_id_sections_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);
--> statement-breakpoint
SET @section_fk_sql := IF(
  @section_fk_exists = 0,
  'ALTER TABLE `section_sms_policies` ADD CONSTRAINT `section_sms_policies_section_id_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE no action ON UPDATE no action',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE section_fk_stmt FROM @section_fk_sql;
--> statement-breakpoint
EXECUTE section_fk_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE section_fk_stmt;
