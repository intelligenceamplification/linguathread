export type SentenceLanguage = string;

export type SentenceSegment = {
  text: string;
  after?: string;
};

export type SentenceUnit = {
  id: string;
  text: string;
  after?: string;
  /** Supports units that surface in more than one position in a sentence. */
  segments?: SentenceSegment[];
  /** A unit can be present conceptually without occupying visible sentence text. */
  visibility?: "visible" | "implied" | "omitted";
  /** Reserved authored metadata; no pronunciation UI is rendered yet. */
  pronunciation?: { transliteration?: string; notes?: string };
  /** A concise, authored structural label for Language X-Ray when available. */
  label?: string;
  meaning: string;
  literal?: string;
  structural?: string;
  natural?: string;
  why: string;
  grammar: Array<{ label: string; value: string }>;
};

export type SentenceRealization = {
  language: SentenceLanguage;
  role: "target" | "anchor" | "bridge";
  label: string;
  sentence: string;
  units: SentenceUnit[];
};

export type SentenceRelationship = {
  id: string;
  languages: SentenceLanguage[];
  unitIds: string[];
  label: string;
  explanation: string;
};

export type CrossLanguageMapping = {
  id: string;
  from: { language: SentenceLanguage; unitIds: string[] };
  to: { language: SentenceLanguage; unitIds: string[] };
  kind: "one-to-one" | "reordered" | "structural" | "expanded" | "implicit";
  label: string;
  explanation: string;
  reusablePattern?: string;
};

export type RelatedPattern = {
  sentence: string;
  explanation: string;
};

export type InteractiveSentenceModel = {
  meaning: string;
  realizations: SentenceRealization[];
  relationships: SentenceRelationship[];
  mappings: CrossLanguageMapping[];
  relatedPatterns: RelatedPattern[];
};

export type CurriculumSentenceSource = {
  id: string;
  spanish: string;
  english: string;
  vietnamese: string;
  focus: string;
  pattern: string;
  bridgePattern: string;
  words: Array<[string, string, string]>;
};

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function sentenceUnits(language: SentenceLanguage, sentence: string, vocabulary: Array<[string, string, string]>) {
  const meanings = new Map(vocabulary.map(([spanish, english, vietnamese]) => [
    normalizeToken(language === "spanish" ? spanish : language === "english" ? english : vietnamese),
    english,
  ]));

  return Array.from(sentence.matchAll(/(\S+)(\s*)/gu)).map((match, index) => {
    const token = match[1];
    const word = normalizeToken(token);
    const knownMeaning = meanings.get(word);
    return {
      id: `${language}-${index + 1}`,
      text: token,
      after: match[2],
      meaning: knownMeaning || "A meaningful part of this complete thought.",
      literal: knownMeaning,
      natural: sentence,
      why: language === "spanish"
        ? "Its role becomes clear inside the target pattern for this lesson."
        : language === "vietnamese"
          ? "Vietnamese expresses the same meaning through its own word order and stable verb forms."
          : "The anchor makes the intended meaning immediately available for comparison.",
      // Do not invent a grammatical category merely to populate X-Ray. Rich
      // labels and grammar arrive with reviewed lesson anatomy.
      grammar: [],
    } satisfies SentenceUnit;
  });
}

/**
 * The default authored curriculum structure. Individual lessons can replace this
 * with a richer model when a particular construction warrants deeper treatment.
 */
export function createInteractiveSentenceModel(source: CurriculumSentenceSource): InteractiveSentenceModel {
  const spanish = sentenceUnits("spanish", source.spanish, source.words);
  const english = sentenceUnits("english", source.english, source.words);
  const vietnamese = sentenceUnits("vietnamese", source.vietnamese, source.words);
  const all = (units: SentenceUnit[]) => units.map((unit) => unit.id);

  return {
    meaning: source.english,
    realizations: [
      { language: "spanish", role: "target", label: "Spanish target", sentence: source.spanish, units: spanish },
      { language: "english", role: "anchor", label: "English native anchor", sentence: source.english, units: english },
      { language: "vietnamese", role: "bridge", label: "Vietnamese supporting bridge", sentence: source.vietnamese, units: vietnamese },
    ],
    relationships: [
      { id: `${source.id}-target-pattern`, languages: ["spanish"], unitIds: all(spanish), label: "Target pattern", explanation: `This Spanish thought is organized through ${source.pattern}. The elements work together as one expression rather than a word-for-word copy.` },
      { id: `${source.id}-anchor-pattern`, languages: ["english"], unitIds: all(english), label: "Anchor structure", explanation: "The English sentence keeps the intended meaning available while the target language takes its own shape." },
      { id: `${source.id}-bridge-pattern`, languages: ["vietnamese"], unitIds: all(vietnamese), label: "Bridge structure", explanation: `Vietnamese organizes this thought through ${source.bridgePattern}, showing which information is carried by order rather than Spanish-style inflection.` },
    ],
    mappings: [
      { id: `${source.id}-anchor-map`, from: { language: "spanish", unitIds: all(spanish) }, to: { language: "english", unitIds: all(english) }, kind: "structural", label: "Meaning is retained, structure changes", explanation: `Spanish uses ${source.pattern}; English uses its own sentence order to express the same thought. This is a sentence-level correspondence, not a forced word-by-word equation.`, reusablePattern: source.pattern },
      { id: `${source.id}-bridge-map`, from: { language: "spanish", unitIds: all(spanish) }, to: { language: "vietnamese", unitIds: all(vietnamese) }, kind: "structural", label: "The bridge carries it differently", explanation: `Vietnamese uses ${source.bridgePattern}. The shared meaning stays intact even where the languages group, omit, or order information differently.`, reusablePattern: source.bridgePattern },
    ],
    relatedPatterns: [
      { sentence: source.focus, explanation: `This is the reusable center of the lesson: ${source.pattern}.` },
      { sentence: source.spanish, explanation: "Return to the full sentence and vary its people, objects, places, or time as the pattern becomes available." },
    ],
  };
}

export const familySentenceAnatomy: InteractiveSentenceModel = {
  meaning: "A speaker says that their family lives nearby.",
  realizations: [
    {
      language: "spanish", role: "target", label: "Spanish target", sentence: "Mi familia vive cerca.",
      units: [
        { id: "es-mi", text: "Mi", after: " ", label: "Possessive determiner", meaning: "my", literal: "my", structural: "possessive + noun", natural: "my family", why: "Spanish places the possessive directly before the noun. It agrees with familia, a singular noun.", grammar: [{ label: "Function", value: "possession" }, { label: "Form", value: "singular possessive" }] },
        { id: "es-familia", text: "familia", after: " ", label: "Subject noun", meaning: "family", literal: "family", structural: "subject", natural: "my family", why: "Familia is grammatically singular in Spanish, even though it refers to several people.", grammar: [{ label: "Function", value: "subject" }, { label: "Number", value: "singular" }, { label: "Gender", value: "feminine" }] },
        { id: "es-vive", text: "vive", after: " ", label: "Conjugated verb", meaning: "lives", literal: "lives", structural: "third-person singular verb", natural: "lives", why: "Vive agrees with the singular subject familia and presents a current or habitual living situation.", grammar: [{ label: "Function", value: "predicate" }, { label: "Person", value: "third person" }, { label: "Number", value: "singular" }, { label: "Tense", value: "present" }] },
        { id: "es-cerca", text: "cerca", after: ".", label: "Location modifier", meaning: "nearby", literal: "near", structural: "verb modifier", natural: "nearby", why: "Cerca locates the living situation without naming a specific place.", grammar: [{ label: "Function", value: "location modifier" }] },
      ],
    },
    {
      language: "english", role: "anchor", label: "English native anchor", sentence: "My family lives nearby.",
      units: [
        { id: "en-my", text: "My", after: " ", label: "Possessive determiner", meaning: "belonging to me", literal: "my", structural: "possessive + noun", natural: "my family", why: "English also places the possessive before the noun, so this part maps closely to Spanish mi.", grammar: [{ label: "Function", value: "possession" }] },
        { id: "en-family", text: "family", after: " ", label: "Subject noun", meaning: "family", literal: "family", structural: "subject", natural: "my family", why: "English treats family as singular in this sentence, so the verb is lives.", grammar: [{ label: "Function", value: "subject" }, { label: "Number", value: "singular" }] },
        { id: "en-lives", text: "lives", after: " ", label: "Present verb", meaning: "lives", literal: "lives", structural: "third-person singular verb", natural: "lives", why: "English marks singular third person with -s here, much less visibly than Spanish vive.", grammar: [{ label: "Function", value: "predicate" }, { label: "Tense", value: "present" }] },
        { id: "en-nearby", text: "nearby", after: ".", label: "Location modifier", meaning: "not far away", literal: "nearby", structural: "verb modifier", natural: "nearby", why: "Nearby is the natural English adverb for this meaning.", grammar: [{ label: "Function", value: "location modifier" }] },
      ],
    },
    {
      language: "vietnamese", role: "bridge", label: "Vietnamese supporting bridge", sentence: "Gia đình tôi sống gần đây.",
      units: [
        { id: "vi-gia-dinh", text: "Gia đình", after: " ", label: "Family noun phrase", meaning: "family", literal: "family", structural: "subject", natural: "my family", why: "Vietnamese puts the family noun first, then adds the possessor after it.", grammar: [{ label: "Function", value: "subject" }] },
        { id: "vi-toi", text: "tôi", after: " ", label: "Possessor pronoun", meaning: "I / me", literal: "I", structural: "noun + possessor", natural: "my family", why: "Tôi follows gia đình, showing possession through order rather than a separate word like my or mi.", grammar: [{ label: "Function", value: "possession" }, { label: "Information", value: "post-nominal possessor" }] },
        { id: "vi-song", text: "sống", after: " ", label: "Verb", meaning: "live", literal: "live", structural: "predicate", natural: "lives", why: "Sống does not change for person or number; the subject and context carry that information.", grammar: [{ label: "Function", value: "predicate" }, { label: "Agreement", value: "not conjugated" }] },
        { id: "vi-gan-day", text: "gần đây", after: ".", label: "Location expression", meaning: "nearby", literal: "near here", structural: "location modifier", natural: "nearby", why: "Gần đây literally suggests “near here.” It expresses the same practical closeness with a different internal image.", grammar: [{ label: "Function", value: "location modifier" }] },
      ],
    },
  ],
  relationships: [
    { id: "es-possession", languages: ["spanish"], unitIds: ["es-mi", "es-familia"], label: "Possession", explanation: "Mi modifies familia: Spanish makes the relationship visible before the noun." },
    { id: "es-agreement", languages: ["spanish"], unitIds: ["es-familia", "es-vive"], label: "Subject and agreement", explanation: "Familia is singular, so vive takes the singular third-person form." },
    { id: "es-location", languages: ["spanish"], unitIds: ["es-vive", "es-cerca"], label: "Living, located", explanation: "Cerca modifies vive, specifying where the family lives rather than describing the family itself." },
  ],
  mappings: [
    { id: "family-anchor", from: { language: "spanish", unitIds: ["es-mi", "es-familia"] }, to: { language: "english", unitIds: ["en-my", "en-family"] }, kind: "one-to-one", label: "Possession stays before the noun", explanation: "Spanish mi familia and English my family build possession in the same order. Their individual forms differ, but the phrase structure closely aligns.", reusablePattern: "Spanish and English: possessive + noun." },
    { id: "family-possession", from: { language: "spanish", unitIds: ["es-mi", "es-familia"] }, to: { language: "vietnamese", unitIds: ["vi-gia-dinh", "vi-toi"] }, kind: "reordered", label: "Possession moves", explanation: "Spanish places mi before familia. Vietnamese places tôi after gia đình. The shared idea is possession, but the order reverses.", reusablePattern: "Spanish: possessive + noun. Vietnamese: noun + possessor." },
    { id: "family-verb", from: { language: "spanish", unitIds: ["es-vive"] }, to: { language: "vietnamese", unitIds: ["vi-song"] }, kind: "structural", label: "Agreement is carried differently", explanation: "Vive marks singular third person. Sống stays unchanged, so Vietnamese does not repeat the same agreement information in the verb." },
    { id: "family-nearby", from: { language: "spanish", unitIds: ["es-cerca"] }, to: { language: "vietnamese", unitIds: ["vi-gan-day"] }, kind: "expanded", label: "One adverb, one phrase", explanation: "Spanish cerca and English nearby are compact. Vietnamese gần đây uses a two-word expression with the image of being near here." },
  ],
  relatedPatterns: [
    { sentence: "Mi hermano vive aquí.", explanation: "Keep vive; change the subject and location." },
    { sentence: "Mi madre vive lejos.", explanation: "The same possession and agreement pattern works with lejos, “far away.”" },
    { sentence: "Vivimos cerca del parque.", explanation: "With nosotros, vive becomes vivimos. The location expression can grow into cerca de + place." },
  ],
};
