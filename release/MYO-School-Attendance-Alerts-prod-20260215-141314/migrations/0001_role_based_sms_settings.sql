CREATE TABLE `global_sms_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`default_sms_mode` varchar(32) NOT NULL DEFAULT 'FIRST_IN_LAST_OUT',
	`default_sms_daily_cap_per_student` int NOT NULL DEFAULT 2,
	`allow_all_movements` boolean NOT NULL DEFAULT false,
	`allow_digest` boolean NOT NULL DEFAULT false,
	`allow_exception_only` boolean NOT NULL DEFAULT false,
	`max_sms_daily_cap_per_student` int NOT NULL DEFAULT 4,
	`allow_unlimited_cap` boolean NOT NULL DEFAULT false,
	`allow_all_guardians_recipients` boolean NOT NULL DEFAULT true,
	`updated_by_user_id` int,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `global_sms_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`sms_mode` varchar(32),
	`sms_daily_cap_per_student` int,
	`sms_recipients_mode` varchar(32),
	`sms_quiet_hours_start` time,
	`sms_quiet_hours_end` time,
	`sms_last_out_cutoff_time` time,
	`updated_by_user_id` int,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `school_notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_notification_settings_school_idx` UNIQUE(`school_id`)
);
--> statement-breakpoint
CREATE TABLE `sms_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`student_id` int,
	`daily_attendance_id` int,
	`template_type` varchar(32),
	`sms_mode` varchar(32),
	`recipients_mode` varchar(32),
	`recipient_count` int NOT NULL DEFAULT 1,
	`to_phone` varchar(32),
	`message` text NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'queued',
	`provider_message_id` varchar(191),
	`provider_response` json,
	`error_message` text,
	`sent_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sms_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `global_sms_settings` ADD CONSTRAINT `global_sms_settings_updated_by_user_id_users_id_fk` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `school_notification_settings` ADD CONSTRAINT `school_notification_settings_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `school_notification_settings` ADD CONSTRAINT `school_notification_settings_updated_by_user_id_users_id_fk` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `sms_notifications` ADD CONSTRAINT `sms_notifications_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `sms_notifications` ADD CONSTRAINT `sms_notifications_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `sms_notifications` ADD CONSTRAINT `sms_notifications_daily_attendance_id_daily_attendances_id_fk` FOREIGN KEY (`daily_attendance_id`) REFERENCES `daily_attendances`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `school_notification_settings_mode_idx` ON `school_notification_settings` (`sms_mode`);
--> statement-breakpoint
CREATE INDEX `sms_notifications_school_created_idx` ON `sms_notifications` (`school_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `sms_notifications_school_status_idx` ON `sms_notifications` (`school_id`,`status`);
--> statement-breakpoint
CREATE INDEX `sms_notifications_student_idx` ON `sms_notifications` (`student_id`);
--> statement-breakpoint
INSERT INTO `global_sms_settings` (
	`default_sms_mode`,
	`default_sms_daily_cap_per_student`,
	`allow_all_movements`,
	`allow_digest`,
	`allow_exception_only`,
	`max_sms_daily_cap_per_student`,
	`allow_unlimited_cap`,
	`allow_all_guardians_recipients`
)
SELECT
	'FIRST_IN_LAST_OUT',
	2,
	false,
	false,
	false,
	4,
	false,
	true
WHERE NOT EXISTS (
	SELECT 1 FROM `global_sms_settings`
);