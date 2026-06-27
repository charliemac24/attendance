SET @show_students_needing_attention_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'schools'
    AND column_name = 'show_students_needing_attention'
);
--> statement-breakpoint
SET @show_students_needing_attention_sql := IF(
  @show_students_needing_attention_exists = 0,
  'ALTER TABLE `schools` ADD COLUMN `show_students_needing_attention` boolean NOT NULL DEFAULT true AFTER `early_out_window_minutes`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE show_students_needing_attention_stmt FROM @show_students_needing_attention_sql;
--> statement-breakpoint
EXECUTE show_students_needing_attention_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE show_students_needing_attention_stmt;
