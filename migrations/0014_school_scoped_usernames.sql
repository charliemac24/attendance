SET @drop_users_username_unique = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = 'users_username_unique'
    ),
    'ALTER TABLE `users` DROP INDEX `users_username_unique`',
    'SELECT 1'
  )
);
PREPARE drop_users_username_unique_stmt FROM @drop_users_username_unique;
EXECUTE drop_users_username_unique_stmt;
DEALLOCATE PREPARE drop_users_username_unique_stmt;

SET @create_users_school_username_idx = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = 'users_school_username_idx'
    ),
    'SELECT 1',
    'ALTER TABLE `users` ADD CONSTRAINT `users_school_username_idx` UNIQUE (`school_id`, `username`)'
  )
);
PREPARE create_users_school_username_idx_stmt FROM @create_users_school_username_idx;
EXECUTE create_users_school_username_idx_stmt;
DEALLOCATE PREPARE create_users_school_username_idx_stmt;

SET @create_users_username_idx = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = 'users_username_idx'
    ),
    'SELECT 1',
    'CREATE INDEX `users_username_idx` ON `users` (`username`)'
  )
);
PREPARE create_users_username_idx_stmt FROM @create_users_username_idx;
EXECUTE create_users_username_idx_stmt;
DEALLOCATE PREPARE create_users_username_idx_stmt;
