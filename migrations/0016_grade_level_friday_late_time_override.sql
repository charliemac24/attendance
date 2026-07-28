SET @friday_late_time_override_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'grade_levels'
    AND column_name = 'friday_late_time_override'
);

SET @friday_late_time_override_sql := IF(
  @friday_late_time_override_exists = 0,
  'ALTER TABLE `grade_levels` ADD COLUMN `friday_late_time_override` time NULL AFTER `late_time_override`',
  'SELECT 1'
);

PREPARE friday_late_time_override_stmt FROM @friday_late_time_override_sql;

EXECUTE friday_late_time_override_stmt;

DEALLOCATE PREPARE friday_late_time_override_stmt;
