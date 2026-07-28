ALTER TABLE `sections`
  ADD COLUMN `late_time_override` time NULL AFTER `name`,
  ADD COLUMN `friday_late_time_override` time NULL AFTER `late_time_override`,
  ADD COLUMN `late_time_overrides_by_weekday` json NULL AFTER `friday_late_time_override`;
