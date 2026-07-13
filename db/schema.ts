import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const learnerProfiles = sqliteTable("learner_profiles", {
  email: text("email").primaryKey(),
  profileJson: text("profile_json").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const lessonProgress = sqliteTable("lesson_progress", {
  id: text("id").primaryKey(),
  learnerEmail: text("learner_email").notNull(),
  lessonId: text("lesson_id").notNull(),
  skill: text("skill").notNull(),
  status: text("status").notNull(),
  mastery: integer("mastery").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  completedAt: integer("completed_at"),
  reviewDueAt: integer("review_due_at"),
  updatedAt: integer("updated_at").notNull(),
});

export const answerAttempts = sqliteTable("answer_attempts", {
  id: text("id").primaryKey(),
  learnerEmail: text("learner_email").notNull(),
  lessonId: text("lesson_id").notNull(),
  skill: text("skill").notNull(),
  kind: text("kind").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull(),
});
