UPDATE `sms_templates`
SET `enabled` = false
WHERE `type` IN ('break_out', 'break_in', 'early_out', 'out_final');
