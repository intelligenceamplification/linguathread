export type TranslationLanguage = string;
export type TranslationScope = "word" | "phrase" | "sentence";

export type LessonForTools = {
  id: string;
  title: string;
  skill: string;
  vocabulary: Array<{ word: string; english: string; vietnamese: string; translations?: Record<string, string> }>;
  sentence: { target: string; anchor: string; bridge: string; note: string; translations?: Record<string, string> };
  grammar: { focus: string; target: { pattern: string; explanation: string }; anchor: { pattern: string; explanation: string }; bridge: { pattern: string; explanation: string }; additional?: Record<string, { pattern: string; explanation: string }>; insight: string };
};

export type XRayScope = {
  id: string;
  kind: TranslationScope;
  language: TranslationLanguage;
  text: string;
  /** Word offsets keep the visible selection and its analysis in step. */
  tokenStart: number;
  tokenEnd: number;
};

export type XRayAnalysis = {
  title: string;
  scope: TranslationScope;
  interpretation: "standalone" | "phrase" | "component" | "contextual";
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

type VietnameseLexicalEntry = {
  meaning: string;
  baseForm: string;
  partOfSpeech: string;
  syntacticRole: string;
  morphology: string;
  usage: string;
  contrast: string;
};

// Reviewed reusable Vietnamese terms and constructions. This is deliberately
// modest: X-Ray may explain a known item richly, but it must never manufacture
// a dictionary definition for an unreviewed phrase.
const vietnameseLexicon: Record<string, VietnameseLexicalEntry> = {
  "mình": { meaning: "I / me, in a relational or informal register", baseForm: "mình", partOfSpeech: "Personal pronoun", syntacticRole: "Can refer to the speaker when relationship and tone permit.", morphology: "Vietnamese pronouns do not conjugate. The choice of pronoun carries social context.", usage: "Warm and common in familiar contexts; choose it with attention to the relationship.", contrast: "Tôi is more neutral or formal. Spanish yo does not encode the same relational nuance." },
  "tôi": { meaning: "I / me", baseForm: "tôi", partOfSpeech: "Personal pronoun", syntacticRole: "Names the speaker when Vietnamese makes the subject explicit.", morphology: "The form stays unchanged; person is lexical, not a verb ending.", usage: "Neutral and broadly usable, especially when a clear first-person reference is helpful.", contrast: "Spanish can often omit yo because the verb carries person. Vietnamese commonly retains the pronoun." },
  "bạn": { meaning: "you / friend", baseForm: "bạn", partOfSpeech: "Personal pronoun or noun", syntacticRole: "Refers to the listener in a peer-like relationship.", morphology: "The form does not conjugate. Relationship determines whether this pronoun fits.", usage: "Common between peers, but Vietnamese offers many relationship-sensitive alternatives.", contrast: "Spanish tú is grammatically marked by verb conjugation; bạn is chosen through social context." },
  "là": { meaning: "to be; to identify", baseForm: "là", partOfSpeech: "Copular verb", syntacticRole: "Links an identity, name, or classification to its complement.", morphology: "Là remains unchanged for person, number, tense, and mood in ordinary use.", usage: "Use it for identity and naming; do not assume every English form of be needs là.", contrast: "Spanish distinguishes soy, eres, and es. Vietnamese leaves là stable and relies on order and context." },
  "đến": { meaning: "come to; arrive; in đến từ, come from", baseForm: "đến", partOfSpeech: "Verb", syntacticRole: "Carries movement or arrival; with từ it forms the origin expression đến từ.", morphology: "The form stays stable. Time and person come from surrounding words and context.", usage: "In đến từ, read the two-word verb phrase together rather than treating đến as an isolated destination verb.", contrast: "Spanish ser de expresses origin without a movement verb; Vietnamese uses the image of coming from." },
  "từ": { meaning: "from; since", baseForm: "từ", partOfSpeech: "Preposition", syntacticRole: "Introduces a source, origin, or starting point.", morphology: "Invariant; its relation is signaled by position in the phrase.", usage: "With đến, it completes đến từ, “come from.”", contrast: "Spanish de covers origin and possession more broadly; Vietnamese keeps this origin relation in a distinct phrase." },
  "đến từ": { meaning: "to come from; to be from", baseForm: "đến từ", partOfSpeech: "Verb phrase", syntacticRole: "Expresses a person’s origin before the place they name.", morphology: "A stable two-word expression. It does not conjugate for the speaker, tense, or number.", usage: "Use it as one unit in Mình đến từ Indiana or Tôi đến từ Indiana.", contrast: "Spanish uses ser de, while Vietnamese frames origin through the idea of coming from a place." },
  "ở": { meaning: "at; in; to be located", baseForm: "ở", partOfSpeech: "Preposition or location verb", syntacticRole: "Locates a person or thing, or marks a location relation.", morphology: "Invariant. Vietnamese does not conjugate it for the subject.", usage: "Read it with its place expression: ở đây, “here,” or ở đâu, “where.”", contrast: "Spanish chooses forms of estar for location; Vietnamese keeps ở unchanged." },
  "đây": { meaning: "here", baseForm: "đây", partOfSpeech: "Deictic location word", syntacticRole: "Anchors a place close to the speaker or current context.", morphology: "No inflection; the reference comes from the situation.", usage: "Pairs naturally with ở in ở đây, “here.”", contrast: "Spanish aquí is a single location adverb; Vietnamese often builds the location through a short phrase." },
  "đâu": { meaning: "where", baseForm: "đâu", partOfSpeech: "Question word", syntacticRole: "Marks the unknown location in a question.", morphology: "Invariant. Question force comes from placement and sentence intonation.", usage: "Often follows the location word in ở đâu, “where.”", contrast: "Spanish dónde typically leads the question; Vietnamese can place đâu later in the location phrase." },
  "sẽ": { meaning: "future or intended-action marker", baseForm: "sẽ", partOfSpeech: "Aspect or time marker", syntacticRole: "Precedes the verb to frame a future, intended, or expected action.", morphology: "It stays stable and unchanged; Vietnamese does not conjugate it for person or number.", usage: "Use it before the action, especially when the future meaning needs to be explicit.", contrast: "Spanish can carry person and future framing inside voy or iré; Vietnamese uses a stable marker before the verb." },
  "đang": { meaning: "ongoing-action marker", baseForm: "đang", partOfSpeech: "Aspect marker", syntacticRole: "Precedes a verb to foreground an action in progress.", morphology: "Invariant; aspect is a separate word rather than a conjugated ending.", usage: "Use it when the ongoing quality matters in the present context.", contrast: "Spanish uses estar + gerund; Vietnamese uses đang before an unchanged verb." },
  "có": { meaning: "have; there is / are", baseForm: "có", partOfSpeech: "Verb", syntacticRole: "Introduces possession, availability, or existence depending on its complement.", morphology: "Invariant. Subject and context carry person and time.", usage: "In a location scene, có can introduce something that exists there.", contrast: "Spanish hay is restricted to existence, while có has a wider range of uses." },
  "không": { meaning: "not; no", baseForm: "không", partOfSpeech: "Negation particle", syntacticRole: "Negates a verb or completes a yes/no question pattern.", morphology: "Invariant; it does not agree with the subject.", usage: "Its position changes the scope of what is negated or questioned.", contrast: "Spanish uses no before the verb. Vietnamese can use không at the end of a yes/no question pattern." },
  "một": { meaning: "one; a / an", baseForm: "một", partOfSpeech: "Number word", syntacticRole: "Counts one item and can support an indefinite reference.", morphology: "Invariant; classifiers and nouns make the phrase specific.", usage: "Often appears with a classifier before a countable noun.", contrast: "Spanish articles carry gender and number. Vietnamese uses number and classifier choices instead." },
  "cái": { meaning: "general classifier", baseForm: "cái", partOfSpeech: "Classifier", syntacticRole: "Classifies many ordinary objects before the noun.", morphology: "Invariant; it does not encode grammatical gender or plural agreement.", usage: "Use the appropriate classifier with a noun when the context calls for one.", contrast: "Spanish has articles such as un or una; Vietnamese classifiers organize noun phrases differently." },
  "cái này": { meaning: "this; this one", baseForm: "cái này", partOfSpeech: "Demonstrative noun phrase", syntacticRole: "Identifies the nearby object whose price is being asked about.", morphology: "Cái supplies a general object classifier; này follows it and marks the object as near or currently indicated.", usage: "Vietnamese places the demonstrative after the classifier or noun: cái này, literally ‘object this.’", contrast: "English this comes before or replaces the noun. Spanish esto is a compact demonstrative pronoun." },
  "này": { meaning: "this; this one here", baseForm: "này", partOfSpeech: "Demonstrative", syntacticRole: "Points to something near the speaker or active in the immediate context.", morphology: "Invariant; its position after a noun or classifier carries the demonstrative relationship.", usage: "In cái này, it specifies ‘this one.’", contrast: "English and Spanish usually place a demonstrative before a noun; Vietnamese commonly places này after it." },
  "giá": { meaning: "price; in this sentence, cost", baseForm: "giá", partOfSpeech: "Noun used predicatively", syntacticRole: "Introduces the price being requested: the object’s price is how much?", morphology: "Invariant. Vietnamese can place the price noun directly before bao nhiêu without conjugating a verb equivalent to ‘cost.’", usage: "In Cái này giá bao nhiêu?, giá connects the indicated object to the requested amount.", contrast: "English and Spanish use verbs, cost and cuesta. Vietnamese can organize the same question around the noun giá, ‘price.’" },
  "bao nhiêu": { meaning: "how much; how many", baseForm: "bao nhiêu", partOfSpeech: "Interrogative quantity phrase", syntacticRole: "Requests an unknown amount or quantity.", morphology: "A stable two-word question expression. Its meaning belongs to the phrase; bao is not ‘how much’ by itself here.", usage: "Keep bao nhiêu together. In Cái này giá bao nhiêu?, it asks for the price.", contrast: "English how much and Spanish cuánto package the same question differently. Vietnamese uses the two-word unit bao nhiêu." },
  "rất": { meaning: "very", baseForm: "rất", partOfSpeech: "Degree adverb", syntacticRole: "Intensifies an adjective or state.", morphology: "Invariant.", usage: "Place it before the quality being intensified.", contrast: "Spanish muy serves a similar intensifying role but participates in a different adjective structure." },
  "và": { meaning: "and", baseForm: "và", partOfSpeech: "Coordinating conjunction", syntacticRole: "Links parallel words, phrases, or clauses.", morphology: "Invariant.", usage: "Use it to coordinate two meaningful units without changing either form.", contrast: "Spanish y is similar in function but follows its own sound-based spelling convention before some words." },
  "bánh": { meaning: "cake, pastry, or a prepared flour- or rice-based food, depending on context", baseForm: "bánh", partOfSpeech: "Noun", syntacticRole: "Names the food item that a following modifier may specify.", morphology: "Invariant; classifiers and modifiers clarify quantity and type.", usage: "Vietnamese bánh is broad. The word after it usually tells you what kind of bánh is meant.", contrast: "English may require a more specific food word; do not assume bánh maps to cake in every context." },
  "thơ": { meaning: "poetry; poem", baseForm: "thơ", partOfSpeech: "Noun", syntacticRole: "Names poetry or a poem when used independently.", morphology: "Invariant.", usage: "It needs context to form a natural expression with another noun.", contrast: "Do not automatically treat an adjacent word as an established compound without an authored or reviewed phrase entry." },
  "cà phê": { meaning: "coffee", baseForm: "cà phê", partOfSpeech: "Noun phrase", syntacticRole: "Names the drink or its ingredient in context.", morphology: "Invariant; quantity and classifiers can refine the noun phrase.", usage: "A familiar international borrowing, pronounced and used within Vietnamese sound and sentence patterns.", contrast: "Spanish café is a close lexical cousin, but surrounding grammar still differs." },
  "làm ơn": { meaning: "please; do me a favor", baseForm: "làm ơn", partOfSpeech: "Courtesy phrase", syntacticRole: "Softens or frames a request politely.", morphology: "A fixed phrase; read it as one social action rather than as unrelated words.", usage: "Appropriate when asking for something with explicit courtesy.", contrast: "Spanish por favor is similarly courteous, though the natural placement and tone can differ." },
  "cảm ơn": { meaning: "thank you", baseForm: "cảm ơn", partOfSpeech: "Gratitude phrase", syntacticRole: "Completes an exchange by expressing thanks.", morphology: "A stable multiword expression.", usage: "Use as a whole phrase; an added pronoun can specify whom you thank when needed.", contrast: "Spanish gracias is one word, while Vietnamese expresses gratitude through a phrase." },
};

// These reviewed expressions should open as complete semantic units when any
// of their visible words is tapped. Their components remain available through
// the explicit scope selector when a learner wants the narrower analysis.
const vietnamesePreferredPhraseSelections = new Set(["cái này", "bao nhiêu"]);

const languageSentence = (lesson: LessonForTools, language: TranslationLanguage) => language === "Spanish"
  ? lesson.sentence.target
  : language === "Vietnamese"
    ? lesson.sentence.bridge
    : language === "English"
      ? lesson.sentence.anchor
      : lesson.sentence.translations?.[language] || "";

const languageValue = (word: LessonForTools["vocabulary"][number], language: TranslationLanguage) => language === "Spanish"
  ? word.word
  : language === "Vietnamese"
    ? word.vietnamese
    : language === "English"
      ? word.english
      : word.translations?.[language] || word.english;

function grammarFor(lesson: LessonForTools, language: TranslationLanguage) {
  if (language === "Spanish") return lesson.grammar.target;
  if (language === "Vietnamese") return lesson.grammar.bridge;
  if (language === "English") return lesson.grammar.anchor;
  return lesson.grammar.additional?.[language] || {
    pattern: `${language} sentence pattern`,
    explanation: `This ${language} realization is awaiting an authored structural note.`,
  };
}

export function xrayLanguages(lesson: LessonForTools, showBridge: boolean) {
  const defaults = ["Spanish", "English", ...(showBridge ? ["Vietnamese"] : [])];
  const authored = Object.keys(lesson.sentence.translations || {});
  return [...new Set([...defaults, ...authored])].filter((language) => Boolean(languageSentence(lesson, language)));
}

const strip = (value: string) => value.replace(/[¿?¡!.,;:]/g, "").trim();

function normalizeVietnamese(value: string) {
  return strip(value).toLocaleLowerCase("vi").replace(/\s+/g, " ");
}

function phraseFor(lesson: LessonForTools, language: TranslationLanguage) {
  const words = lesson.vocabulary.slice(0, 2).map((word) => languageValue(word, language));
  return words.join(" ");
}

export function xrayScopes(lesson: LessonForTools, language: TranslationLanguage): XRayScope[] {
  const sentence = languageSentence(lesson, language);
  if (!sentence) return [];
  const words = Array.from(sentence.matchAll(/[\p{L}]+(?:[’'][\p{L}]+)?/gu)).map((match) => match[0]);
  const phraseScopes: XRayScope[] = [];
  const authoredPhrase = language === "Spanish" ? lesson.grammar.focus : grammarFor(lesson, language).pattern;

  // Every contiguous group is a legitimate phrase-level lens. This keeps
  // Vietnamese, English, and Spanish equally explorable without pretending
  // that their visible tokens always map one-to-one across the stack.
  for (let start = 0; start < words.length; start += 1) {
    for (let end = start + 2; end <= words.length; end += 1) {
      if (start === 0 && end === words.length) continue;
      phraseScopes.push({
        id: `${language}-phrase-${start}-${end}`,
        kind: "phrase",
        language,
        text: words.slice(start, end).join(" "),
        tokenStart: start,
        tokenEnd: end,
      });
    }
  }

  const authoredTokens = Array.from(authoredPhrase.matchAll(/[\p{L}]+(?:[’'][\p{L}]+)?/gu)).map((match) => match[0]);
  const authoredStart = authoredTokens.length > 1
    ? words.findIndex((_, start) => authoredTokens.every((token, index) => words[start + index]?.toLocaleLowerCase(language === "Vietnamese" ? "vi" : "es") === token.toLocaleLowerCase(language === "Vietnamese" ? "vi" : "es")))
    : -1;
  if (authoredStart >= 0) {
    phraseScopes.unshift({
      id: `${language}-authored-phrase`,
      kind: "phrase",
      language,
      text: authoredPhrase,
      tokenStart: authoredStart,
      tokenEnd: authoredStart + authoredTokens.length,
    });
  }

  return [
    ...words.map((text, index) => ({ id: `${language}-word-${index}`, kind: "word" as const, language, text, tokenStart: index, tokenEnd: index + 1 })),
    ...phraseScopes,
    { id: `${language}-sentence`, kind: "sentence" as const, language, text: sentence, tokenStart: 0, tokenEnd: words.length },
  ];
}

function isAuthoredPhrase(lesson: LessonForTools, scope: XRayScope) {
  if (scope.kind !== "phrase") return false;
  const normalized = strip(scope.text).toLocaleLowerCase();
  if (scope.language === "Vietnamese" && vietnameseLexicon[normalizeVietnamese(scope.text)]) return true;
  return lesson.vocabulary.some((word) => strip(languageValue(word, scope.language)).toLocaleLowerCase() === normalized);
}

function hasStandaloneMeaning(lesson: LessonForTools, scope: XRayScope) {
  if (scope.kind !== "word") return false;
  if (scope.language === "Vietnamese" && vietnameseLexicon[normalizeVietnamese(scope.text)]) return true;
  const normalized = strip(scope.text).toLocaleLowerCase();
  return lesson.vocabulary.some((word) => {
    const value = strip(languageValue(word, scope.language));
    return !value.includes(" ") && value.toLocaleLowerCase() === normalized;
  });
}

export function resolveXRayTokenScope(lesson: LessonForTools, language: TranslationLanguage, tokenIndex: number) {
  const scopes = xrayScopes(lesson, language);
  const word = scopes.find((scope) => scope.kind === "word" && scope.tokenStart === tokenIndex);
  if (!word) return word;
  const meaningfulPhrases = scopes
    .filter((scope) => scope.kind === "phrase" && scope.tokenStart <= tokenIndex && scope.tokenEnd > tokenIndex && isAuthoredPhrase(lesson, scope))
    .sort((a, b) => (a.tokenEnd - a.tokenStart) - (b.tokenEnd - b.tokenStart));
  const preferredPhrase = language === "Vietnamese"
    ? meaningfulPhrases.find((scope) => vietnamesePreferredPhraseSelections.has(normalizeVietnamese(scope.text)))
    : undefined;
  if (preferredPhrase) return preferredPhrase;
  if (hasStandaloneMeaning(lesson, word)) return word;
  return meaningfulPhrases[0] || word;
}

export function xraySentenceBreakdown(lesson: LessonForTools, language: TranslationLanguage) {
  const scopes = xrayScopes(lesson, language);
  const words = scopes.filter((scope) => scope.kind === "word");
  const phrases = scopes.filter((scope) => isAuthoredPhrase(lesson, scope));
  const breakdown: XRayScope[] = [];
  let index = 0;

  while (index < words.length) {
    const phrase = phrases
      .filter((scope) => scope.tokenStart === index)
      .sort((a, b) => (b.tokenEnd - b.tokenStart) - (a.tokenEnd - a.tokenStart))[0];
    if (phrase) {
      breakdown.push(phrase);
      index = phrase.tokenEnd;
    } else {
      breakdown.push(words[index]);
      index += 1;
    }
  }

  return breakdown;
}

const voyAnalysis: XRayAnalysis = {
  title: "voy",
  scope: "word",
  interpretation: "standalone",
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
    const values = [word.word, word.english, word.vietnamese, ...Object.values(word.translations || {})].map((value) => strip(value).toLocaleLowerCase());
    return values.includes(strip(scope.text).toLocaleLowerCase());
  });
  const languageName = scope.language.toLocaleLowerCase();
  const languageLabel = scope.language;
  const naturalSentence = languageSentence(lesson, scope.language);
  const grammar = grammarFor(lesson, scope.language);
  const pattern = grammar.pattern;
  const grammarExplanation = grammar.explanation;
  const normalizedScope = normalizeVietnamese(scope.text);
  const lexicalEntry = scope.language === "Vietnamese" ? vietnameseLexicon[normalizedScope] : undefined;

  if (scope.kind === "sentence") {
    return {
      title: scope.text,
      scope: "sentence",
      interpretation: "contextual",
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

  if (scope.language === "Vietnamese" && lexicalEntry) {
    return {
      title: scope.text,
      scope: scope.kind,
      interpretation: scope.kind === "phrase" ? "phrase" : "standalone",
      directMeaning: lexicalEntry.meaning,
      contextualMeaning: `Here it contributes to: “${naturalSentence}”.`,
      baseForm: lexicalEntry.baseForm,
      morphology: lexicalEntry.morphology,
      partOfSpeech: lexicalEntry.partOfSpeech,
      syntacticRole: lexicalEntry.syntacticRole,
      structure: scope.kind === "phrase" ? `Read this expression as one unit within ${pattern}.` : `Read it with the words around it: ${pattern}.`,
      usage: lexicalEntry.usage,
      contrast: lexicalEntry.contrast,
      relationship: `It helps build the whole meaning: ${lesson.sentence.anchor}`,
    };
  }

  if (scope.kind === "phrase") {
    return {
      title: scope.text,
      scope: "phrase",
      interpretation: "phrase",
      directMeaning: `A working pattern inside “${naturalSentence}”.`,
      contextualMeaning: `In ${languageLabel}, this group works within the reusable pattern ${pattern}.`,
      baseForm: `Pattern: ${pattern}`,
      morphology: grammarExplanation,
      partOfSpeech: "Phrase-level construction",
      syntacticRole: "The words operate together; their meaning comes from the relationship, not only from isolated dictionary entries.",
      structure: `Keep this group intact before varying what comes around it. ${pattern}.`,
      usage: "Use it as a productive frame for personal, practical statements.",
      contrast: "The other languages may regroup, omit, or state information differently. The shared intention matters more than word-for-word symmetry.",
      relationship: `This phrase helps organize the ${languageLabel} realization of the full meaning: ${naturalSentence}`,
    };
  }

  const vietnamesePronouns: Record<string, string> = { "tôi": "I / me", "mình": "I / me, with a more relational tone", "bạn": "you" };
  const vietnameseMarkers: Record<string, string> = { "đã": "completed-action marker", "đang": "ongoing-action marker", "sẽ": "future or intended-action marker" };
  const containingVietnamesePhrase = scope.language === "Vietnamese" && scope.kind === "word"
    ? lesson.vocabulary.find((word) => normalizeVietnamese(word.vietnamese).split(/[ /]+/).includes(normalizedScope))
    : undefined;

  const direct = matchingWord
    ? languageValue(matchingWord, "English")
    : scope.language === "Vietnamese" && vietnamesePronouns[normalizedScope]
      ? vietnamesePronouns[normalizedScope]
      : scope.language === "Vietnamese" && vietnameseMarkers[normalizedScope]
        ? vietnameseMarkers[normalizedScope]
        : containingVietnamesePhrase
          ? `A component of the reviewed phrase “${containingVietnamesePhrase.vietnamese},” which carries “${containingVietnamesePhrase.english}.”`
        : `the ${languageName} element “${scope.text}”`;
  const vietnamesePartOfSpeech = vietnamesePronouns[normalizedScope]
    ? "Personal pronoun"
    : vietnameseMarkers[normalizedScope]
      ? "Aspect or time marker"
      : "Contextual Vietnamese word";
  return {
    title: scope.text,
    scope: "word",
    interpretation: containingVietnamesePhrase ? "component" : "contextual",
    directMeaning: direct,
    contextualMeaning: `Here it contributes to: “${naturalSentence}”.`,
    baseForm: matchingWord
      ? `${languageValue(matchingWord, scope.language)} is the lesson’s authored vocabulary form.`
      : containingVietnamesePhrase
        ? `This visible term belongs to the authored Vietnamese expression ${containingVietnamesePhrase.vietnamese}. Its standalone sense needs reviewed lexical content before X-Ray claims more than the phrase supports.`
      : scope.language === "Vietnamese"
        ? `${scope.text} is read in its visible form; Vietnamese lexical words do not conjugate for person or number.`
        : "The visible form is read in its sentence context.",
    morphology: scope.language === "Spanish" ? `Spanish form within ${lesson.grammar.target.pattern}. The surrounding pattern determines any person, agreement, tense, or mood information.` : scope.language === "Vietnamese" ? "This Vietnamese form stays stable. Word order, pronouns, particles, and context carry information that Spanish may place inside a changing verb." : "English form and role are determined by its position in the sentence.",
    partOfSpeech: scope.language === "Vietnamese" ? vietnamesePartOfSpeech : "Contextual sentence element",
    syntacticRole: scope.language === "Vietnamese"
      ? `Its role is understood through its position in the ${lesson.grammar.bridge.pattern} pattern, rather than through Spanish-style conjugation.`
      : `It participates in the ${lesson.skill} pattern rather than standing as an isolated flashcard.`,
    structure: `Read it with the words around it: ${pattern}.`,
    usage: matchingWord ? `The lesson introduces it through a natural, practical context instead of a decontextualized list.` : "Its precise force comes from the complete expression.",
    contrast: matchingWord
      ? `Compare it with ${languageValue(matchingWord, scope.language === "Spanish" ? "Vietnamese" : "Spanish")} in the stack, but do not assume a one-to-one grammatical match.`
      : scope.language === "Vietnamese"
        ? `Spanish uses ${lesson.grammar.target.pattern}; Vietnamese uses ${lesson.grammar.bridge.pattern}. Compare the complete pattern rather than forcing this one visible word into a direct match.`
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
