ALTER TABLE `schools` MODIFY COLUMN `sms_send_mode` varchar(32) NOT NULL DEFAULT 'ALL_MOVEMENTS';
--> statement-breakpoint
ALTER TABLE `schools` MODIFY COLUMN `allow_multiple_scans` boolean NOT NULL DEFAULT true;
--> statement-breakpoint

UPDATE `schools`
SET
  `sms_send_mode` = 'ALL_MOVEMENTS',
  `allow_multiple_scans` = true;
--> statement-breakpoint

UPDATE `sms_templates`
SET `enabled` = true
WHERE `type` IN ('break_out', 'break_in', 'early_out');
