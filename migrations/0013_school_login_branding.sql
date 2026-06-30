SET @login_slug_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schools'
    AND column_name = 'login_slug'
);
--> statement-breakpoint
SET @login_slug_sql := IF(
  @login_slug_exists = 0,
  'ALTER TABLE `schools` ADD COLUMN `login_slug` varchar(100) NULL AFTER `name`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE login_slug_stmt FROM @login_slug_sql;
--> statement-breakpoint
EXECUTE login_slug_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE login_slug_stmt;
--> statement-breakpoint

SET @logo_url_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schools'
    AND column_name = 'logo_url'
);
--> statement-breakpoint
SET @logo_url_sql := IF(
  @logo_url_exists = 0,
  'ALTER TABLE `schools` ADD COLUMN `logo_url` varchar(255) NULL AFTER `login_slug`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE logo_url_stmt FROM @logo_url_sql;
--> statement-breakpoint
EXECUTE logo_url_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE logo_url_stmt;
--> statement-breakpoint

SET @login_slug_index_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'schools'
    AND index_name = 'schools_login_slug_unique'
);
--> statement-breakpoint
SET @login_slug_index_sql := IF(
  @login_slug_index_exists = 0,
  'ALTER TABLE `schools` ADD CONSTRAINT `schools_login_slug_unique` UNIQUE (`login_slug`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE login_slug_index_stmt FROM @login_slug_index_sql;
--> statement-breakpoint
EXECUTE login_slug_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE login_slug_index_stmt;
