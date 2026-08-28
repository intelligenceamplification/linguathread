import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const learnerAccounts = pgTable("learner_accounts", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  providerSubject: text("provider_subject").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [uniqueIndex("learner_accounts_provider_subject_idx").on(table.provider, table.providerSubject)]);

export const learners = pgTable("learners", {
  id: text("id").primaryKey(),
  accountId: text("account_id").references(() => learnerAccounts.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [index("learners_account_idx").on(table.accountId)]);

export const learnerSessions = pgTable("learner_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  learnerId: text("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [index("learner_sessions_owner_idx").on(table.learnerId)]);

export const legacyLearnerClaims = pgTable("legacy_learner_claims", {
  legacyIdHash: text("legacy_id_hash").primaryKey(),
  learnerId: text("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull(),
});

export const learnerProfiles = pgTable("learner_profiles", {
  learnerId: text("learner_id").primaryKey().references(() => learners.id, { onDelete: "cascade" }),
  profileJson: text("profile_json").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const lessonProgress = pgTable("lesson_progress", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull(),
  skill: text("skill").notNull(),
  status: text("status").notNull(),
  mastery: integer("mastery").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const answerAttempts = pgTable("answer_attempts", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull(),
  skill: text("skill").notNull(),
  kind: text("kind").notNull(),
  language: text("language").notNull().default("Spanish"),
  correct: boolean("correct").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const objectiveMastery = pgTable("objective_mastery", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  objectiveId: text("objective_id").notNull(),
  language: text("language").notNull(),
  status: text("status").notNull().default("introduced"),
  score: integer("score").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  independentSuccesses: integer("independent_successes").notNull().default(0),
  supportedSuccesses: integer("supported_successes").notNull().default(0),
  lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }).notNull(),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
