CREATE TABLE `attendance_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`student_id` int NOT NULL,
	`daily_attendance_id` int,
	`event_type` varchar(64) NOT NULL,
	`occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`performed_by_user_id` int,
	`kiosk_location_id` int,
	`meta` json,
	CONSTRAINT `attendance_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_attendances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`student_id` int NOT NULL,
	`date` date NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending_checkout',
	`check_in_time` datetime,
	`check_out_time` datetime,
	`is_late` boolean NOT NULL DEFAULT false,
	`marked_absent_at` datetime,
	CONSTRAINT `daily_attendances_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_attendances_student_date_idx` UNIQUE(`student_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `grade_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`name` varchar(64) NOT NULL,
	CONSTRAINT `grade_levels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kiosk_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	CONSTRAINT `kiosk_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `kiosk_locations_school_slug_idx` UNIQUE(`school_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Manila',
	`late_time` time NOT NULL DEFAULT '08:00:00',
	`cutoff_time` time NOT NULL DEFAULT '09:00:00',
	`sms_enabled` boolean NOT NULL DEFAULT false,
	`allow_multiple_scans` boolean NOT NULL DEFAULT false,
	`sms_provider` varchar(32) NOT NULL DEFAULT 'semaphore',
	`semaphore_api_key` varchar(255),
	`semaphore_sender_name` varchar(64),
	CONSTRAINT `schools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`grade_level_id` int NOT NULL,
	`name` varchar(64) NOT NULL,
	CONSTRAINT `sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`student_id` int,
	`template_type` varchar(32),
	`to_phone` varchar(32) NOT NULL,
	`message` text NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'queued',
	`provider_message_id` varchar(191),
	`provider_response` json,
	`sent_at` datetime,
	`error_message` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sms_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`type` varchar(32) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`template_text` text NOT NULL,
	CONSTRAINT `sms_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`student_no` varchar(64) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`grade_level_id` int,
	`section_id` int,
	`guardian_name` varchar(191),
	`guardian_phone` varchar(32),
	`qr_token` varchar(64) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_qr_token_unique` UNIQUE(`qr_token`),
	CONSTRAINT `students_school_student_no_idx` UNIQUE(`school_id`,`student_no`)
);
--> statement-breakpoint
CREATE TABLE `teacher_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`section_id` int NOT NULL,
	CONSTRAINT `teacher_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`password` varchar(255) NOT NULL,
	`email` varchar(191),
	`full_name` varchar(191) NOT NULL,
	`role` varchar(32) NOT NULL DEFAULT 'teacher',
	`school_id` int,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `attendance_events` ADD CONSTRAINT `attendance_events_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_events` ADD CONSTRAINT `attendance_events_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_events` ADD CONSTRAINT `attendance_events_daily_attendance_id_daily_attendances_id_fk` FOREIGN KEY (`daily_attendance_id`) REFERENCES `daily_attendances`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_events` ADD CONSTRAINT `attendance_events_performed_by_user_id_users_id_fk` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_events` ADD CONSTRAINT `attendance_events_kiosk_location_id_kiosk_locations_id_fk` FOREIGN KEY (`kiosk_location_id`) REFERENCES `kiosk_locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_attendances` ADD CONSTRAINT `daily_attendances_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_attendances` ADD CONSTRAINT `daily_attendances_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grade_levels` ADD CONSTRAINT `grade_levels_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kiosk_locations` ADD CONSTRAINT `kiosk_locations_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sections` ADD CONSTRAINT `sections_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sections` ADD CONSTRAINT `sections_grade_level_id_grade_levels_id_fk` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sms_logs` ADD CONSTRAINT `sms_logs_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sms_logs` ADD CONSTRAINT `sms_logs_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sms_templates` ADD CONSTRAINT `sms_templates_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_grade_level_id_grade_levels_id_fk` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_section_id_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_sections` ADD CONSTRAINT `teacher_sections_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_sections` ADD CONSTRAINT `teacher_sections_section_id_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_events_school_idx` ON `attendance_events` (`school_id`);--> statement-breakpoint
CREATE INDEX `daily_attendances_school_date_idx` ON `daily_attendances` (`school_id`,`date`);--> statement-breakpoint
CREATE INDEX `grade_levels_school_idx` ON `grade_levels` (`school_id`);--> statement-breakpoint
CREATE INDEX `kiosk_locations_school_idx` ON `kiosk_locations` (`school_id`);--> statement-breakpoint
CREATE INDEX `sections_school_idx` ON `sections` (`school_id`);--> statement-breakpoint
CREATE INDEX `sms_logs_school_idx` ON `sms_logs` (`school_id`);--> statement-breakpoint
CREATE INDEX `sms_templates_school_idx` ON `sms_templates` (`school_id`);--> statement-breakpoint
CREATE INDEX `students_school_idx` ON `students` (`school_id`);--> statement-breakpoint
CREATE INDEX `students_qr_token_idx` ON `students` (`qr_token`);--> statement-breakpoint
CREATE INDEX `teacher_sections_user_idx` ON `teacher_sections` (`user_id`);