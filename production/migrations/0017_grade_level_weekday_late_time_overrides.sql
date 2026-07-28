SET @weekday_late_time_overrides_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'grade_levels'
    AND column_name = 'late_time_overrides_by_weekday'
);

SET @weekday_late_time_overrides_sql := IF(
  @weekday_late_time_overrides_exists = 0,
  'ALTER TABLE `grade_levels` ADD COLUMN `late_time_overrides_by_weekday` json NULL AFTER `friday_late_time_override`',
  'SELECT 1'
);

PREPARE weekday_late_time_overrides_stmt FROM @weekday_late_time_overrides_sql;

EXECUTE weekday_late_time_overrides_stmt;

DEALLOCATE PREPARE weekday_late_time_overrides_stmt;

UPDATE `grade_levels`
SET `late_time_overrides_by_weekday` = JSON_OBJECT(
  'Friday',
  TIME_FORMAT(`friday_late_time_override`, '%H:%i:%s')
)
WHERE `friday_late_time_override` IS NOT NULL
  AND (
    `late_time_overrides_by_weekday` IS NULL
    OR JSON_EXTRACT(`late_time_overrides_by_weekday`, '$.Friday') IS NULL
  );
