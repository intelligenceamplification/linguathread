"use client";
import type { LessonDefinition } from "./curriculum";
import { courseMap } from "./course-map";
import type { LanguageProfile } from "./language-profile";
import { languageMastery, type LearnerModel } from "./learning-engine";
import type { FoundationLanguage } from "./multilingual-foundation";

export default function LanguagePath({ course, profile, model, completedIds, skippedIds, currentId, writingLanguages, onEdit, onWriting, onLesson, onPlacement }: {
  course: LessonDefinition[]; profile: LanguageProfile; model: LearnerModel; completedIds: string[]; skippedIds: string[]; currentId: string;
  writingLanguages: { name: string; id: FoundationLanguage }[];
  onEdit: () => void; onWriting: (language: FoundationLanguage) => void; onLesson: (lesson: LessonDefinition) => void;
  onPlacement: (level: string, unit: number) => void;
}) {
  const current = course.find(lesson => lesson.id === currentId);
  const selected = [...profile.selections].sort((a, b) => a.priority - b.priority);
  return <div className="focus-content review-content language-path-content">
    <p className="eyebrow">Language Path</p><h1>Your languages. One path.</h1>
    <p className="review-introduction">One A1–C2 communication course, anchored to Spanish. Your native anchor and supporting languages connect meaning along that course; available writing paths develop separately.</p>
    <section className="path-stack-section" aria-label="Language-stack customization">
      <div className="section-heading"><h2>Your language stack</h2><button className="text-action" onClick={onEdit}>Customize stack →</button></div>
      <p className="review-note">Use the existing language settings to change your native anchor, priorities, or active and paused languages. Saved progress is retained.</p>
      <div className="stack-overview" aria-label="Your selected language stack"><div><span>Native anchor</span><strong>{profile.native}</strong></div>
        {selected.map(selection => {
          const writing = writingLanguages.find(item => item.name === selection.language);
          const role = selection.language === "Spanish" ? "Primary communication course · A1–C2" : selection.language === "Vietnamese" ? "Supporting bridge · authored Spanish–Vietnamese connections" : "Supporting language · no separate CEFR communication course";
          return <div key={selection.language}><span>{role}</span><strong>{selection.language}</strong><small>{selection.status === "paused" ? "Paused · progress retained" : `Active · priority ${selection.priority + 1}`}</small>{writing && selection.status === "active" ? <button className="text-action" onClick={() => onWriting(writing.id)}>Open writing path →</button> : <small>{selection.status === "paused" ? "Reactivate in stack settings" : "No independent writing path selected"}</small>}</div>;
        })}
      </div>
      {!selected.some(selection => selection.language === "Spanish" && selection.status === "active") && <p className="review-note">Spanish is not currently active in your stack. You can explore the published course below or activate Spanish in stack settings.</p>}
      {selected.some(selection => !["Spanish", "Vietnamese"].includes(selection.language)) && <p className="review-note">Supporting languages do not imply a complete translated curriculum. Only authored connections and independently available writing material are offered.</p>}
    </section>
    <section aria-label="Primary communication course"><h2 className="review-heading">Spanish · A1 to C2</h2><p className="review-note">Published describes content availability. Practised describes completed lessons; retention is checked separately. In development marks planned content that is not yet published.</p>
      <div className="unit-path" aria-label="Course units">{courseMap.map(level => {
        const published = course.filter(lesson => lesson.level === level.level);
        const practised = published.filter(lesson => completedIds.includes(lesson.id)).length;
        const planned = level.units.reduce((sum, unit) => sum + unit.plannedLessons, 0);
        return <details key={level.level} open={current?.level === level.level} className="level-group"><summary><strong>{level.level}</strong><span>{practised} practised · {published.length} published · {Math.max(0, planned - published.length)} in development</span></summary><p className="review-note">{level.outcome}</p>
          {level.units.map(unit => {
            const lessons = published.filter(lesson => lesson.unit === unit.sequence);
            const completed = lessons.filter(lesson => completedIds.includes(lesson.id)).length;
            const developing = Math.max(0, unit.plannedLessons - lessons.length);
            return <details key={unit.id} open={lessons.some(lesson => lesson.id === currentId)} className="unit-card"><summary><span>Unit {unit.sequence}</span><strong>{lessons[0]?.unitTitle || unit.title}</strong><em>{completed}/{lessons.length} practised</em></summary>
              <p className="review-note">{lessons.length} published{developing ? ` · ${developing} in development` : ""}</p>
              {lessons.length > 0 && <div className="unit-card-actions"><button className="quiet-action" onClick={() => onPlacement(level.level, unit.sequence)}>{completed === lessons.length ? "Recheck this unit" : "Check this unit’s foundations"}</button></div>}
              {lessons.map(lesson => {
                const mastery = languageMastery(model, lesson.objectiveId || lesson.id, "Spanish");
                const status = completedIds.includes(lesson.id) ? "Practised" : skippedIds.includes(lesson.id) ? "Deferred" : lesson.id === currentId ? "Current" : "Not started";
                return <button key={lesson.id} className="unit-lesson-row" onClick={() => onLesson(lesson)}><span>{String(lesson.lesson).padStart(2, "0")}</span><strong>{lesson.title}<small>Published{mastery !== "waiting" ? ` · retention ${mastery}` : ""}</small></strong><em>{status}</em></button>;
              })}
              {developing > 0 && <p className="path-development">{developing} planned {developing === 1 ? "lesson" : "lessons"} · in development</p>}
            </details>;
          })}
        </details>;
      })}</div>
    </section>
  </div>;
}
