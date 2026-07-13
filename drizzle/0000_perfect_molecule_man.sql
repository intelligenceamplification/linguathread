CREATE TABLE `answer_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`learner_email` text NOT NULL,
	`lesson_id` text NOT NULL,
	`skill` text NOT NULL,
	`kind` text NOT NULL,
	`correct` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learner_profiles` (
	`email` text PRIMARY KEY NOT NULL,
	`profile_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`learner_email` text NOT NULL,
	`lesson_id` text NOT NULL,
	`skill` text NOT NULL,
	`status` text NOT NULL,
	`mastery` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`review_due_at` integer,
	`updated_at` integer NOT NULL
);
