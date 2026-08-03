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
  label: string;
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
