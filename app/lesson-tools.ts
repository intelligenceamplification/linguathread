export type TranslationLanguage = "English" | "Spanish" | "Vietnamese";
export type TranslationScope = "word" | "phrase" | "sentence";

export type LessonForTools = {
  id: string;
  title: string;
  skill: string;
  vocabulary: Array<{ word: string; english: string; vietnamese: string }>;
  sentence: { target: string; anchor: string; bridge: string; note: string };
  grammar: { focus: string; target: { pattern: string; explanation: string }; anchor: { pattern: string; explanation: string }; bridge: { pattern: string; explanation: string }; insight: string };
};

export type XRayScope = {
  id: string;
  kind: TranslationScope;
  language: TranslationLanguage;
  text: string;
};

export type XRayAnalysis = {
  title: string;
  scope: TranslationScope;
  directMeaning: string;
  contextualMeaning: string;
  baseForm: string;
  morphology: string;
  partOfSpeech: string;
  syntacticRole: string;
  structure: string;
  usage: string;
  contrast: string;
  relationship: string;
};

export type TranslationExercise = {
  id: string;
  lessonId: string;
  phase: "review" | "new-word" | "active-recall" | "variation";
  scope: TranslationScope;
  from: TranslationLanguage;
  to: TranslationLanguage;
  prompt: string;
  answer: string;
  accepted: string[];
  note: string;
};

export type DailyLessonPlan = {
  review: LessonForTools;
  current: LessonForTools;
  newVocabulary: LessonForTools["vocabulary"];
  application: LessonForTools["sentence"];
  exercises: TranslationExercise[];
};

const languageSentence = (lesson: LessonForTools, language: TranslationLanguage) => language === "Spanish"
  ? lesson.sentence.target
  : language === "Vietnamese"
    ? lesson.sentence.bridge
    : lesson.sentence.anchor;

const languageValue = (word: LessonForTools["vocabulary"][number], language: TranslationLanguage) => language === "Spanish"
  ? word.word
  : language === "Vietnamese"
    ? word.vietnamese
    : word.english;

const strip = (value: string) => value.replace(/[¿?¡!.,;:]/g, "").trim();

function phraseFor(lesson: LessonForTools, language: TranslationLanguage) {
  const words = lesson.vocabulary.slice(0, 2).map((word) => languageValue(word, language));
  return words.join(" ");
}

export function xrayScopes(lesson: LessonForTools, language: TranslationLanguage): XRayScope[] {
  const sentence = languageSentence(lesson, language);
  const words = Array.from(sentence.matchAll(/[\p{L}]+(?:[’'][\p{L}]+)?/gu)).map((match) => match[0]);
  const authoredPhrase = language === "Spanish" ? lesson.grammar.focus : language === "English" ? lesson.grammar.anchor.pattern : lesson.grammar.bridge.pattern;
  const authoredWordCount = Array.from(authoredPhrase.matchAll(/[\p{L}]+/gu)).length;
  const phrase = authoredWordCount > 1 && sentence.toLocaleLowerCase().includes(authoredPhrase.toLocaleLowerCase())
    ? authoredPhrase
    : words.slice(0, Math.min(2, words.length)).join(" ");
  return [
    ...words.map((text, index) => ({ id: `${language}-word-${index}`, kind: "word" as const, language, text })),
    ...(phrase.trim().split(/\s+/).length > 1 ? [{ id: `${language}-phrase`, kind: "phrase" as const, language, text: phrase }] : []),
    { id: `${language}-sentence`, kind: "sentence" as const, language, text: sentence },
  ];
}

const voyAnalysis: XRayAnalysis = {
  title: "voy",
  scope: "word",
  directMeaning: "I go; in this pattern, I am going to.",
  contextualMeaning: "Voy supplies the first-person movement/near-future frame in “Mañana voy a visitar…”. It makes the plan belong to the speaker.",
  baseForm: "ir, “to go”",
  morphology: "Present indicative, first-person singular: yo voy. It is an irregular form, so it is learned as a whole rather than built from the infinitive’s visible stem.",
  partOfSpeech: "Finite verb",
  syntacticRole: "The conjugated center of the verb phrase; with a + infinitive, it forms the near future.",
  structure: "mañana + voy + a + visitar. Voy agrees with an implied yo; visitar remains an infinitive.",
  usage: "Very common and natural for an intended or imminent action. In this sentence it is a plan, not literal travel on foot.",
  contrast: "Iré is a simple-future form and often sounds more definite or formal. Estoy visitando describes an action already underway. Voy a visitar keeps the plan close to the present.",
  relationship: "Voy links the time word mañana to the action visitar, carrying person, tense, and the plan’s forward movement for the whole sentence.",
};

export function analyzeXRayScope(lesson: LessonForTools, scope: XRayScope): XRayAnalysis {
  if (scope.language === "Spanish" && scope.kind === "word" && strip(scope.text).toLocaleLowerCase("es") === "voy") return voyAnalysis;

  const matchingWord = lesson.vocabulary.find((word) => {
    const values = [word.word, word.english, word.vietnamese].map((value) => strip(value).toLocaleLowerCase());
    return values.includes(strip(scope.text).toLocaleLowerCase());
  });
  const languageName = scope.language.toLocaleLowerCase();
  const naturalSentence = languageSentence(lesson, scope.language);
  const pattern = scope.language === "Spanish" ? lesson.grammar.target.pattern : scope.language === "Vietnamese" ? lesson.grammar.bridge.pattern : lesson.grammar.anchor.pattern;

  if (scope.kind === "sentence") {
    return {
      title: scope.text,
      scope: "sentence",
      directMeaning: languageSentence(lesson, "English"),
      contextualMeaning: lesson.sentence.note,
      baseForm: "A complete, reusable expression",
      morphology: `The sentence is organized through ${pattern}.`,
      partOfSpeech: "Sentence-level meaning",
      syntacticRole: "A complete thought: it establishes who, what happens, and the relevant context.",
      structure: `The ${languageName} realization is read as one whole before its parts are examined.`,
      usage: "Use the natural sentence as a model, then vary people, objects, place, or time without copying English word order.",
      contrast: `English, Spanish, and Vietnamese preserve the intention while distributing grammatical information differently. ${lesson.grammar.insight}`,
      relationship: `Every selected part contributes to this whole: ${naturalSentence}`,
    };
  }

  if (scope.kind === "phrase") {
    return {
      title: scope.text,
      scope: "phrase",
      directMeaning: `A working pattern inside “${naturalSentence}”.`,
      contextualMeaning: `This phrase is the lesson’s reusable center: ${lesson.grammar.focus}.`,
      baseForm: `Pattern: ${pattern}`,
      morphology: scope.language === "Spanish" ? lesson.grammar.target.explanation : scope.language === "Vietnamese" ? lesson.grammar.bridge.explanation : lesson.grammar.anchor.explanation,
      partOfSpeech: "Phrase-level construction",
      syntacticRole: "The words operate together; their meaning comes from the relationship, not only from isolated dictionary entries.",
      structure: `Keep this group intact before varying what comes around it. ${pattern}.`,
      usage: "Use it as a productive frame for personal, practical statements.",
      contrast: "The other languages may regroup, omit, or state information differently. The shared intention matters more than word-for-word symmetry.",
      relationship: `This phrase gives the sentence its ${lesson.skill} structure.`,
    };
  }

  const direct = matchingWord ? languageValue(matchingWord, "English") : `the ${languageName} element “${scope.text}”`;
  return {
    title: scope.text,
    scope: "word",
    directMeaning: direct,
    contextualMeaning: `Here it contributes to: “${naturalSentence}”.`,
    baseForm: matchingWord ? `${matchingWord.word} is the lesson’s authored vocabulary form.` : "The visible form is read in its sentence context.",
    morphology: scope.language === "Spanish" ? `Spanish form within ${lesson.grammar.target.pattern}. The surrounding pattern determines any person, agreement, tense, or mood information.` : scope.language === "Vietnamese" ? "Vietnamese keeps many verbs stable; order, particles, pronouns, and context carry grammatical work." : "English form and role are determined by its position in the sentence.",
    partOfSpeech: "Contextual sentence element",
    syntacticRole: `It participates in the ${lesson.skill} pattern rather than standing as an isolated flashcard.`,
    structure: `Read it with the words around it: ${pattern}.`,
    usage: matchingWord ? `The lesson introduces it through a natural, practical context instead of a decontextualized list.` : "Its precise force comes from the complete expression.",
    contrast: matchingWord || lesson.vocabulary[0]
      ? `Compare it with ${languageValue(matchingWord || lesson.vocabulary[0], scope.language === "Spanish" ? "Vietnamese" : "Spanish")} in the stack, but do not assume a one-to-one grammatical match.`
      : "Compare it with the corresponding expression in the stack, but do not assume a one-to-one grammatical match.",
    relationship: `It helps build the whole meaning: ${lesson.sentence.anchor}`,
  };
}

const dailyDirections: Array<[TranslationLanguage, TranslationLanguage]> = [
  ["English", "Spanish"], ["Spanish", "English"], ["English", "Vietnamese"],
  ["Vietnamese", "English"], ["Spanish", "Vietnamese"], ["Vietnamese", "Spanish"],
];

function exercise(lesson: LessonForTools, id: string, phase: TranslationExercise["phase"], scope: TranslationScope, from: TranslationLanguage, to: TranslationLanguage, note: string): TranslationExercise {
  const source = scope === "word" ? languageValue(lesson.vocabulary[0], from) : scope === "phrase" ? phraseFor(lesson, from) : languageSentence(lesson, from);
  const answer = scope === "word" ? languageValue(lesson.vocabulary[0], to) : scope === "phrase" ? phraseFor(lesson, to) : languageSentence(lesson, to);
  return { id, lessonId: lesson.id, phase, scope, from, to, prompt: source, answer, accepted: [answer], note };
}

export function createDailyLessonPlan(course: LessonForTools[], current: LessonForTools, dueIds: string[], completedIds: string[], day = new Date().getDate()): DailyLessonPlan {
  const review = course.find((item) => dueIds.includes(item.id))
    || [...course].reverse().find((item) => completedIds.includes(item.id))
    || course.find((item) => item.id !== current.id)
    || current;
  const [from, to] = dailyDirections[day % dailyDirections.length];
  const [variationFrom, variationTo] = dailyDirections[(day + 3) % dailyDirections.length];
  return {
    review,
    current,
    newVocabulary: current.vocabulary.slice(0, 2),
    application: current.sentence,
    exercises: [
      exercise(review, "review-sentence", "review", "sentence", "Spanish", "English", "Return one earlier meaning to active understanding."),
      exercise(current, "new-word", "new-word", "word", from, to, "Let one new word move through the stack."),
      exercise(current, "active-recall", "active-recall", "sentence", "English", "Spanish", "Build the current meaning naturally in Spanish."),
      exercise(current, "variation-phrase", "variation", "phrase", variationFrom, variationTo, "Translate a small structural group in a different direction."),
    ],
  };
}
