import type { InteractiveSentenceModel, SentenceUnit } from "./interactive-sentence";
import { analyzeXRayScope, grammarFor, languageSentence, languageValue, xrayScopes, xrayWordMatches, type LessonForTools, type XRayScope } from "./lesson-tools";
import { xrayEditorialFor, type XRayForms, type XRayRole } from "./xray-content";

export type XRayUnit = {
  id: string;
  text: string;
  role: XRayRole;
  label: string;
  meaning?: string;
  notes: string[];
  forms: XRayForms;
  comparison?: string;
  languageNotes?: XRayForms;
  authoredRole?: string;
  start: number;
  end: number;
};

export const xrayRoleLabels: Record<XRayRole, string> = {
  subject: "Subject", verb: "Verb", connector: "Connector", modifier: "Modifier",
  complement: "Complement", clause: "Clause", unit: "Expression",
};

function wordKey(text: string) {
  return text.normalize("NFC").toLowerCase().replaceAll("’", "'");
}

function locate(sentence: string, expression: string) {
  const sentenceWords = xrayWordMatches(sentence);
  const sought = xrayWordMatches(expression).map((word) => wordKey(word[0]));
  if (!sought.length) return;
  const matches = sentenceWords.flatMap((_, index) =>
    sought.every((word, offset) => word === wordKey(sentenceWords[index + offset]?.[0] ?? "")) ? [index] : []);
  if (matches.length !== 1) return;
  const start = matches[0];
  const end = start + sought.length;
  const first = sentenceWords[start];
  const last = sentenceWords[end - 1];
  return { start, end, text: sentence.slice(first.index, last.index + last[0].length) };
}

function visibleForms(lesson: LessonForTools, languages: string[], forms: XRayForms): XRayForms {
  return Object.fromEntries(languages.flatMap((language) => {
    const form = forms[language];
    const span = form && locate(languageSentence(lesson, language), form);
    return span ? [[language, span.text]] : [];
  }));
}

function grammaticalRole(label: string): XRayRole {
  if (/conjunction|connector|subordinator/i.test(label)) return "connector";
  if (/subject/i.test(label)) return "subject";
  if (/modifier|adverb|determiner|article|degree|aspect/i.test(label)) return "modifier";
  if (/\bverb\b|predicate|gerund|infinitive/i.test(label)) return "verb";
  if (/complement|\bobject\b/i.test(label)) return "complement";
  if (/clause/i.test(label)) return "clause";
  return "unit";
}

function anatomyForms(model: InteractiveSentenceModel, unit: SentenceUnit, language: string, languages: string[]) {
  return Object.fromEntries(languages.flatMap((other) => {
    if (other === language) return [[other, unit.text]];
    for (const mapping of model.mappings) {
      const [from, to] = mapping.from.language === language.toLowerCase()
        ? [mapping.from, mapping.to] : [mapping.to, mapping.from];
      if (from.language !== language.toLowerCase() || to.language !== other.toLowerCase() ||
          from.unitIds.length !== 1 || from.unitIds[0] !== unit.id) continue;
      const units = model.realizations.find((item) => item.language === to.language)?.units ?? [];
      const forms = units.filter((item) => to.unitIds.includes(item.id)).map((item) => item.text);
      if (forms.length) return [[other, forms.join(" ")]];
    }
    return [];
  }));
}

function bestGloss(gloss: string, scope: XRayScope) {
  if (gloss.includes("reviewed") && gloss.startsWith("A component")) return;
  if (gloss.startsWith("the ") && gloss.includes(`“${scope.text}”`)) return;
  if (gloss.startsWith("The core ") || gloss.startsWith("the English lexical meaning")) return;
  return gloss;
}

export function buildXRayAnalysis(
  lesson: LessonForTools,
  language: string,
  languages: string[],
  model?: InteractiveSentenceModel,
) {
  const sentence = languageSentence(lesson, language);
  const editorial = xrayEditorialFor(lesson.id);
  const sentenceWords = xrayWordMatches(sentence);
  const scopes = xrayScopes(lesson, language).flatMap((scope) => {
    if (scope.kind === "sentence") return [];
    const first = sentenceWords[scope.tokenStart];
    const last = sentenceWords[scope.tokenEnd - 1];
    return [{ ...scope, text: sentence.slice(first.index, last.index + last[0].length) }];
  });
  const realization = model?.realizations.find((item) =>
    item.language === language.toLowerCase() && item.sentence === sentence);
  const candidates: XRayUnit[] = [];

  // An authored alignment is used only where its form occurs unambiguously in the current text.
  for (const unit of editorial.units ?? []) {
    const form = unit.forms[language];
    const span = form && locate(sentence, form);
    if (!span) continue;
    candidates.push({
      ...span, id: `editorial-${span.start}`, role: unit.role, label: unit.label,
      meaning: unit.meaning, notes: [unit.notes[language] ?? ""].filter(Boolean),
      forms: visibleForms(lesson, languages, unit.forms),
      comparison: Object.keys(unit.forms).every((name) => languages.includes(name)) ? unit.comparison : undefined,
      languageNotes: unit.notes,
    });
  }

  if (model && realization) {
    for (const unit of realization.units.filter((item) => item.grammar.length > 0)) {
      const span = locate(sentence, unit.text);
      if (!span) continue;
      const label = unit.label ?? "Expression";
      candidates.push({
        ...span, id: unit.id, role: grammaticalRole(label), label, meaning: unit.meaning,
        notes: [unit.why, ...unit.grammar.map((item) => item.value)],
        forms: visibleForms(lesson, languages, anatomyForms(model, unit, language, languages)),
      });
    }
  }

  const vocabulary = lesson.vocabulary.flatMap((item) => {
    const forms = visibleForms(lesson, languages, Object.fromEntries(languages.map((name) => [
      name, languageValue(item, name).split("/").map((alternative) => alternative.trim())
        .find((alternative) => locate(languageSentence(lesson, name), alternative)) ?? "",
    ])));
    const form = forms[language];
    const span = form && locate(sentence, form);
    return span ? [{ span, forms, meaning: item.english, note: item.note }] : [];
  });
  // Longest available phrase starts the group. The original scopes still allow inspection inside it.
  const spans = new Map(scopes.map((scope) => [`${scope.tokenStart}-${scope.tokenEnd}`, scope]));
  for (const { span } of vocabulary) {
    const key = `${span.start}-${span.end}`;
    if (!spans.has(key)) spans.set(key, {
      id: `aligned-${key}`, kind: span.end - span.start > 1 ? "phrase" : "word",
      language, text: span.text, tokenStart: span.start, tokenEnd: span.end,
    });
  }

  for (const scope of spans.values()) {
    const analysis = analyzeXRayScope(lesson, scope);
    const aligned = vocabulary.find(({ span }) => span.start === scope.tokenStart && span.end === scope.tokenEnd);
    if (scope.kind === "phrase" && !aligned && analysis.interpretation !== "phrase") continue;
    const authoredRole = analysis.partOfSpeech === "Contextual phrase" ? analysis.syntacticRole : undefined;
    const role = authoredRole && /^(introduces|links|connects|joins)\b/i.test(authoredRole) && scope.tokenEnd - scope.tokenStart < 4
      ? "connector" : grammaticalRole(analysis.partOfSpeech);
    const meaning = aligned?.meaning ?? bestGloss(analysis.directMeaning, scope);
    const vocabularyNote = aligned?.note?.includes("belongs to this practical pattern") ? undefined : aligned?.note;
    const notes = [
      authoredRole,
      role !== "unit" ? analysis.syntacticRole : undefined,
      role !== "unit" && analysis.baseForm !== scope.text && !analysis.morphology.startsWith("Read") ? analysis.morphology : undefined,
      vocabularyNote,
    ].filter((note): note is string => Boolean(note));
    candidates.push({
      id: scope.id, text: scope.text, start: scope.tokenStart, end: scope.tokenEnd, role,
      label: xrayRoleLabels[role], meaning, authoredRole, notes: [...new Set(notes)],
      forms: aligned?.forms ?? { [language]: scope.text },
      comparison: aligned && Object.keys(aligned.forms).length === 3 ? vocabularyNote : undefined,
    });
  }

  const byStart = new Map<number, XRayUnit>();
  const editorialUnits = candidates.filter((item) => item.id.startsWith("editorial-"));
  // Editorial units take priority over an overlapping legacy scope.
  for (const unit of candidates) {
    const current = byStart.get(unit.start);
    if (current?.id.startsWith("editorial-") || (current && current.end >= unit.end)) continue;
    if (!unit.id.startsWith("editorial-") && editorialUnits.some((item) => item.start > unit.start && item.start < unit.end)) continue;
    byStart.set(unit.start, unit);
  }

  const units: XRayUnit[] = [];
  for (let start = 0; start < sentenceWords.length;) {
    const unit = byStart.get(start);
    if (unit) {
      units.push(unit);
      start = unit.end;
    } else {
      const text = sentenceWords[start][0];
      units.push({
        id: `unannotated-${start}`, text, role: "unit", label: "Expression", notes: [],
        forms: { [language]: text }, start, end: start + 1,
      });
      start++;
    }
  }

  const clauses = (editorial.clauses ?? []).flatMap((clause) => {
    const form = clause.forms[language];
    const span = form && locate(sentence, form);
    return span ? [{ ...span, label: clause.label, role: clause.role }] : [];
  }).sort((a, b) => a.start - b.start);

  return { units, clauses, scopes: [...spans.values()], editorial };
}

export function xrayLanguagePattern(lesson: LessonForTools, language: string, units: XRayUnit[] = []) {
  const { pattern, explanation } = grammarFor(lesson, language);
  const wholeSentence = languageSentence(lesson, language) && wordKey(pattern) === wordKey(languageSentence(lesson, language));
  const steps = units.flatMap((unit) => unit.authoredRole ? [unit.authoredRole] : []);
  return { pattern: wholeSentence ? undefined : pattern, explanation, steps: [...new Set(steps)] };
}

export function xrayRecall(lesson: LessonForTools, languages: string[], forms: XRayForms) {
  const useVariation = languages.every((language) => forms[language]);
  const expression = (language: string) => useVariation ? forms[language] : languageSentence(lesson, language);
  return languages.flatMap((from) => languages.flatMap((to) => {
    const prompt = expression(from);
    const answer = expression(to);
    return from !== to && prompt && answer ? [{ from, to, prompt, answer }] : [];
  }));
}
