ALTER TABLE `schools` ADD `monthly_sms_credits` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `schools` ADD `sms_overage_rate_cents` int NOT NULL DEFAULT 150;
