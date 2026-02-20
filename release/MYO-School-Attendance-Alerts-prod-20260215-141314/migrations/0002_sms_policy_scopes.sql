ALTER TABLE `schools` ADD `sms_daily_cap` int NOT NULL DEFAULT 2;
ALTER TABLE `schools` ADD `sms_send_mode` varchar(32) NOT NULL DEFAULT 'FIRST_IN_LAST_OUT';
ALTER TABLE `schools` ADD `max_break_cycles_per_day` int NOT NULL DEFAULT 2;
ALTER TABLE `schools` ADD `min_scan_interval_seconds` int NOT NULL DEFAULT 120;
ALTER TABLE `schools` ADD `dismissal_time` time NOT NULL DEFAULT '15:00:00';
ALTER TABLE `schools` ADD `early_out_window_minutes` int NOT NULL DEFAULT 30;

CREATE TABLE `grade_sms_policies` (
  `id` int AUTO_INCREMENT NOT NULL,
  `school_id` int NOT NULL,
  `grade_level_id` int NOT NULL,
  `enabled` boolean NOT NULL DEFAULT false,
  `daily_cap` int NOT NULL DEFAULT 2,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `grade_sms_policies_id` PRIMARY KEY(`id`),
  CONSTRAINT `grade_sms_policies_school_grade_idx` UNIQUE(`school_id`,`grade_level_id`)
);
--> statement-breakpoint
CREATE INDEX `grade_sms_policies_school_idx` ON `grade_sms_policies` (`school_id`);

CREATE TABLE `section_sms_policies` (
  `id` int AUTO_INCREMENT NOT NULL,
  `school_id` int NOT NULL,
  `section_id` int NOT NULL,
  `enabled` boolean NOT NULL DEFAULT false,
  `daily_cap` int NOT NULL DEFAULT 2,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `section_sms_policies_id` PRIMARY KEY(`id`),
  CONSTRAINT `section_sms_policies_school_section_idx` UNIQUE(`school_id`,`section_id`)
);
--> statement-breakpoint
CREATE INDEX `section_sms_policies_school_idx` ON `section_sms_policies` (`school_id`);

ALTER TABLE `grade_sms_policies` ADD CONSTRAINT `grade_sms_policies_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `grade_sms_policies` ADD CONSTRAINT `grade_sms_policies_grade_level_id_grade_levels_id_fk` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `section_sms_policies` ADD CONSTRAINT `section_sms_policies_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `section_sms_policies` ADD CONSTRAINT `section_sms_policies_section_id_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE no action ON UPDATE no action;
