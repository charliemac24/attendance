SET @late_time_override_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'grade_levels'
    AND column_name = 'late_time_override'
);
--> statement-breakpoint
SET @late_time_override_sql := IF(
  @late_time_override_exists = 0,
  'ALTER TABLE `grade_levels` ADD COLUMN `late_time_override` time NULL AFTER `name`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE late_time_override_stmt FROM @late_time_override_sql;
--> statement-breakpoint
EXECUTE late_time_override_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE late_time_override_stmt;
