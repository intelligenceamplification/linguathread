import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const learnerProfiles = pgTable("learner_profiles", {
  learnerId: text("learner_id").primaryKey(),
  profileJson: text("profile_json").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const lessonProgress = pgTable("lesson_progress", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id").notNull(),
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
  learnerId: text("learner_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  skill: text("skill").notNull(),
  kind: text("kind").notNull(),
  language: text("language").notNull().default("Spanish"),
  correct: boolean("correct").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
