CREATE TABLE IF NOT EXISTS learner_profiles (
  learner_id text PRIMARY KEY,
  profile_json text NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id text PRIMARY KEY,
  learner_id text NOT NULL,
  lesson_id text NOT NULL,
  skill text NOT NULL,
  status text NOT NULL,
  mastery integer DEFAULT 0 NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  completed_at timestamptz,
  review_due_at timestamptz,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS lesson_progress_learner_idx ON lesson_progress (learner_id);

CREATE TABLE IF NOT EXISTS answer_attempts (
  id text PRIMARY KEY,
  learner_id text NOT NULL,
  lesson_id text NOT NULL,
  skill text NOT NULL,
  kind text NOT NULL,
  language text DEFAULT 'Spanish' NOT NULL,
  correct boolean NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS answer_attempts_learner_idx ON answer_attempts (learner_id);
