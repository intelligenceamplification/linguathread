CREATE TABLE "objective_mastery" (
  "id" text PRIMARY KEY NOT NULL,
  "learner_id" text NOT NULL,
  "objective_id" text NOT NULL,
  "language" text NOT NULL,
  "status" text DEFAULT 'introduced' NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "independent_successes" integer DEFAULT 0 NOT NULL,
  "supported_successes" integer DEFAULT 0 NOT NULL,
  "last_practiced_at" timestamp with time zone NOT NULL,
  "next_review_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
