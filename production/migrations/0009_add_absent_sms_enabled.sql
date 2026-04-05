ALTER TABLE `schools`
  ADD COLUMN `absent_sms_enabled` boolean NOT NULL DEFAULT false AFTER `early_out_window_minutes`;
