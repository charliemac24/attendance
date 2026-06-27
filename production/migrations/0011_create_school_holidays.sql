CREATE TABLE IF NOT EXISTS `school_holidays` (
  `id` int AUTO_INCREMENT NOT NULL,
  `school_id` int NOT NULL,
  `date` date NOT NULL,
  `name` varchar(191) NOT NULL,
  `type` varchar(32) NOT NULL DEFAULT 'holiday',
  `is_recurring` boolean NOT NULL DEFAULT false,
  CONSTRAINT `school_holidays_id` PRIMARY KEY(`id`),
  CONSTRAINT `school_holidays_school_date_name_idx` UNIQUE(`school_id`,`date`,`name`)
);
--> statement-breakpoint

SET @school_holidays_school_date_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'school_holidays'
    AND index_name = 'school_holidays_school_date_idx'
);
--> statement-breakpoint
SET @school_holidays_school_date_idx_sql := IF(
  @school_holidays_school_date_idx_exists = 0,
  'CREATE INDEX `school_holidays_school_date_idx` ON `school_holidays` (`school_id`,`date`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE school_holidays_school_date_idx_stmt FROM @school_holidays_school_date_idx_sql;
--> statement-breakpoint
EXECUTE school_holidays_school_date_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE school_holidays_school_date_idx_stmt;
--> statement-breakpoint

SET @school_holidays_school_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'school_holidays'
    AND constraint_name = 'school_holidays_school_id_schools_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);
--> statement-breakpoint
SET @school_holidays_school_fk_sql := IF(
  @school_holidays_school_fk_exists = 0,
  'ALTER TABLE `school_holidays` ADD CONSTRAINT `school_holidays_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE school_holidays_school_fk_stmt FROM @school_holidays_school_fk_sql;
--> statement-breakpoint
EXECUTE school_holidays_school_fk_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE school_holidays_school_fk_stmt;
