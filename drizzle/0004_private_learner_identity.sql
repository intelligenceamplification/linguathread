CREATE TABLE IF NOT EXISTS learner_accounts (
  id text PRIMARY KEY,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS learner_accounts_provider_subject_idx ON learner_accounts (provider, provider_subject);

CREATE TABLE IF NOT EXISTS learners (
  id text PRIMARY KEY,
  account_id text REFERENCES learner_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS learners_account_idx ON learners (account_id);

INSERT INTO learners (id, created_at)
SELECT learner_id, now() FROM learner_profiles
UNION
SELECT learner_id, now() FROM lesson_progress
UNION
SELECT learner_id, now() FROM answer_attempts
UNION
SELECT learner_id, now() FROM objective_mastery
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS learner_sessions (
  token_hash text PRIMARY KEY,
  learner_id text NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS learner_sessions_owner_idx ON learner_sessions (learner_id);

CREATE TABLE IF NOT EXISTS legacy_learner_claims (
  legacy_id_hash text PRIMARY KEY,
  learner_id text NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learner_profiles_owner_fk') THEN
    ALTER TABLE learner_profiles ADD CONSTRAINT learner_profiles_owner_fk FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lesson_progress_owner_fk') THEN
    ALTER TABLE lesson_progress ADD CONSTRAINT lesson_progress_owner_fk FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answer_attempts_owner_fk') THEN
    ALTER TABLE answer_attempts ADD CONSTRAINT answer_attempts_owner_fk FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'objective_mastery_owner_fk') THEN
    ALTER TABLE objective_mastery ADD CONSTRAINT objective_mastery_owner_fk FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE;
  END IF;
END $$;
