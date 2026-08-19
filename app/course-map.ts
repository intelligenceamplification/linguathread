import type { CEFRLevel } from "./cefr";

export type CourseUnit = {
  id: string;
  level: CEFRLevel;
  sequence: number;
  title: string;
  communicativeOutcome: string;
  languageFunctions: string[];
  spanishStructures: string[];
  vietnameseStructures: string[];
  domains: string[];
  plannedLessons: number;
  outsidePractice: {
    purpose: string;
    prompt: string;
  };
  prerequisiteUnitId?: string;
};

export type CourseLevel = {
  level: CEFRLevel;
  outcome: string;
  units: CourseUnit[];
};

type UnitSeed = Omit<CourseUnit, "id" | "level" | "sequence" | "plannedLessons" | "outsidePractice" | "prerequisiteUnitId">;

const levelOutcomes: Record<CEFRLevel, string> = {
  A1: "Use familiar expressions and simple exchanges about identity, immediate needs, people, place, and time.",
  A2: "Handle routine exchanges and describe daily life, recent events, plans, familiar work, travel, and community contexts.",
  B1: "Sustain connected conversation about experiences, intentions, opinions, problems, and personally meaningful topics.",
  B2: "Interact spontaneously and develop clear, nuanced accounts and arguments in social and professional settings.",
  C1: "Use language flexibly across complex social, academic, and professional purposes, including implicit meaning and register.",
  C2: "Understand and reformulate demanding language while expressing fine distinctions with precision, ease, and stylistic control.",
};

const seeds: Record<CEFRLevel, UnitSeed[]> = {
  A1: [
    ["Identity and presence", "Introduce oneself, locate oneself, and exchange essential personal information.", ["identifying", "greeting", "locating"], ["ser and estar", "subject omission", "question words"], ["là and ở", "stable predicates", "pronoun choice"], ["personal", "daily life"]],
    ["Daily rhythms", "Describe a simple day, immediate needs, and basic preferences.", ["describing routines", "requesting", "expressing preference"], ["present indicative", "querer", "gustar"], ["time-first order", "muốn", "thích"], ["daily life", "food"]],
    ["People and home", "Describe close relationships, people, and the immediate home environment.", ["describing", "possessing", "welcoming"], ["possessives", "adjective agreement", "hay"], ["post-nominal possession", "classifiers", "có"], ["relationships", "home"]],
    ["Food and exchange", "Order, shop, ask prices, and complete a courteous transaction.", ["ordering", "asking quantity", "paying"], ["quisiera", "cuánto", "demonstratives"], ["muốn", "bao nhiêu", "demonstrative order"], ["food", "services"]],
    ["Time and intention", "Tell time, express frequency, and make simple arrangements.", ["telling time", "scheduling", "planning"], ["clock time", "frequency adverbs", "ir a"], ["giờ and rưỡi", "frequency frames", "sẽ"], ["time", "relationships"]],
    ["Travel and community", "Follow directions, use transport, and ask for practical help.", ["directing", "asking assistance", "clarifying"], ["imperatives", "poder", "comparatives"], ["direction verbs", "có thể...không", "hơn"], ["travel", "community"]],
    ["Personal expression", "State simple opinions, values, boundaries, and agreement.", ["agreeing", "disagreeing", "setting boundaries"], ["creer que", "para mí", "necesitar"], ["tôi nghĩ", "đối với tôi", "cần"], ["values", "relationships"]],
    ["A1 integration", "Combine foundational patterns in short, natural exchanges without relying on fixed scripts.", ["integrating", "repairing", "reformulating"], ["present-tense integration", "question sequences", "basic connectors"], ["topic chains", "question particles", "basic connectors"], ["daily life", "travel", "relationships"]],
  ].map(seed),
  A2: [
    ["Life in sequence", "Connect routines and events across a day or week.", ["sequencing", "describing change", "contrasting"], ["preterite introduction", "imperfect introduction", "connectors"], ["đã", "đang", "time framing"], ["daily life", "time"]],
    ["Past experience", "Describe completed events and background circumstances.", ["narrating", "setting scenes", "clarifying order"], ["preterite versus imperfect", "hace", "time clauses"], ["đã and từng", "time expressions", "clause order"], ["personal", "travel"]],
    ["Plans and obligations", "Discuss intentions, responsibilities, and predictable future events.", ["planning", "obligating", "negotiating"], ["tener que", "pensar + infinitive", "future time"], ["phải", "định", "sẽ"], ["daily life", "work"]],
    ["Health and wellbeing", "Describe symptoms, needs, habits, and straightforward advice.", ["describing symptoms", "advising", "requesting care"], ["doler", "deber", "reflexive routines"], ["bị and đau", "nên", "health classifiers"], ["health", "services"]],
    ["Home and neighborhood", "Compare places, explain housing needs, and handle local services.", ["comparing", "describing location", "requesting service"], ["comparatives", "relative location", "direct objects"], ["hơn", "location chains", "classifiers"], ["home", "community"]],
    ["Work and study", "Describe familiar responsibilities, learning, schedules, and abilities.", ["explaining duties", "describing ability", "reporting progress"], ["saber versus poder", "present perfect introduction", "purpose clauses"], ["biết versus có thể", "đã...rồi", "để"], ["work", "education"]],
    ["Travel with agency", "Manage reservations, changes, delays, and common travel problems.", ["booking", "changing plans", "problem solving"], ["object pronouns", "polite requests", "past reference"], ["đặt", "xin", "serial verbs"], ["travel", "services"]],
    ["A2 integration", "Sustain a routine exchange and tell a short connected personal story.", ["integrating", "narrating", "repairing"], ["past-present-future contrast", "pronoun integration", "connectors"], ["aspect integration", "topic continuity", "connectors"], ["personal", "community", "travel"]],
  ].map(seed),
  B1: [
    ["Connected stories", "Tell coherent stories with sequence, background, and consequence.", ["narrating", "framing", "concluding"], ["preterite-imperfect control", "pluperfect introduction", "narrative connectors"], ["đã, đang, từng", "thì", "narrative sequencing"], ["personal", "travel"]],
    ["Opinions with reasons", "Develop and support opinions on familiar public and personal questions.", ["arguing", "supporting", "qualifying"], ["porque and ya que", "indicative opinion frames", "discourse markers"], ["vì and bởi vì", "theo tôi", "discourse particles"], ["society", "values"]],
    ["Possibility and advice", "Discuss possible outcomes and give context-sensitive advice.", ["hypothesizing", "advising", "weighing options"], ["conditional introduction", "present subjunctive triggers", "si clauses"], ["nếu...thì", "có lẽ", "nên"], ["relationships", "work"]],
    ["Relationships and emotion", "Describe emotional experience, misunderstanding, and reconciliation.", ["expressing emotion", "explaining conflict", "repairing"], ["subjunctive emotion", "reciprocal constructions", "por versus para"], ["cảm thấy", "lẫn nhau", "mà and nhưng"], ["relationships", "emotions"]],
    ["Professional exchange", "Participate in meetings, explain work, and write clear routine messages.", ["reporting", "proposing", "summarizing"], ["formal register", "reported speech introduction", "se constructions"], ["formal pronouns", "rằng", "được and bị"], ["work", "professional"]],
    ["Culture and perspective", "Compare practices and explain how context shapes interpretation.", ["comparing cultures", "mediating", "contextualizing"], ["relative clauses", "lo que", "impersonal expressions"], ["mà clauses", "điều", "topic-comment"], ["culture", "community"]],
    ["Problems and decisions", "Explain a problem, evaluate alternatives, and negotiate a decision.", ["problem solving", "negotiating", "deciding"], ["conditional", "subjunctive requests", "pronoun sequences"], ["nếu...thì", "đề nghị", "serial predicates"], ["services", "work"]],
    ["B1 integration", "Sustain connected independent interaction across personal, travel, and professional situations.", ["integrating", "mediating", "self-correcting"], ["tense integration", "subjunctive foundations", "connected discourse"], ["aspect integration", "stance particles", "connected discourse"], ["personal", "professional", "culture"]],
  ].map(seed),
  B2: [
    ["Nuanced accounts", "Give detailed accounts while controlling emphasis, chronology, and viewpoint.", ["narrating", "emphasizing", "reframing"], ["tense-aspect control", "cleft structures", "discourse deixis"], ["aspect and viewpoint", "thì and chính", "topic framing"], ["personal", "culture"]],
    ["Argument and evidence", "Develop a sustained argument and respond to counterpositions.", ["arguing", "conceding", "countering"], ["subjunctive in evaluation", "concessive clauses", "nominalization"], ["mặc dù", "tuy...nhưng", "nominal compounds"], ["society", "professional"]],
    ["Professional precision", "Communicate proposals, constraints, and decisions with appropriate formality.", ["proposing", "qualifying", "documenting"], ["formal conditionals", "passive and impersonal se", "register"], ["nếu", "được and bị", "formal Sino-Vietnamese vocabulary"], ["professional", "work"]],
    ["Humor and implication", "Recognize and use understatement, playful contrast, and contextual humor.", ["implying", "understating", "responding playfully"], ["irony cues", "idiomatic contrast", "pragmatic word order"], ["final particles", "nói giảm", "contextual ellipsis"], ["relationships", "culture"]],
    ["Emotion with precision", "Express mixed feelings, boundaries, and relational nuance without flattening meaning.", ["qualifying emotion", "setting boundaries", "reconciling"], ["subjunctive nuance", "clitic choices", "modal past"], ["stance particles", "address terms", "đành and cứ"], ["emotions", "relationships"]],
    ["Ideas and interpretation", "Explain complex ideas and interpret texts or viewpoints for another person.", ["explaining", "interpreting", "mediating"], ["relative and noun clauses", "reported discourse", "cohesion"], ["rằng and là", "mà clauses", "cohesion chains"], ["education", "society"]],
    ["Spontaneous interaction", "Maintain fluid exchange, repair subtly, and adapt language while speaking or writing.", ["turn management", "repairing", "adapting"], ["discourse markers", "ellipsis", "register shifts"], ["discourse particles", "ellipsis", "address shifts"], ["social", "professional"]],
    ["B2 integration", "Combine nuance, argument, narration, and mediation in sustained independent communication.", ["integrating", "synthesizing", "adapting"], ["advanced clause integration", "register control", "cohesion"], ["clause chaining", "register control", "cohesion"], ["society", "professional", "culture"]],
  ].map(seed),
  C1: [
    ["Implicit meaning", "Infer and convey unstated attitudes, assumptions, and interpersonal positioning.", ["inferring", "implying", "calibrating"], ["pragmatic subjunctive", "information structure", "implicature"], ["particles and omission", "topic-comment", "implicature"], ["social", "culture"]],
    ["Register and voice", "Shift naturally among intimate, neutral, formal, and institutional voices.", ["adapting register", "positioning", "styling"], ["lexical register", "address systems", "syntactic density"], ["address terms", "Sino-Vietnamese register", "syntactic compression"], ["professional", "relationships"]],
    ["Extended argument", "Build a sophisticated line of reasoning with qualification and rhetorical control.", ["arguing", "qualifying", "synthesizing"], ["concessive-subjunctive networks", "nominalization", "rhetorical connectors"], ["concessive networks", "nominalization", "rhetorical connectors"], ["academic", "society"]],
    ["Professional leadership", "Lead complex discussions, negotiate delicately, and frame strategic decisions.", ["facilitating", "negotiating", "reframing"], ["institutional register", "mitigation", "reported positions"], ["institutional vocabulary", "mitigation particles", "reported positions"], ["professional", "leadership"]],
    ["Literary and cultural language", "Interpret stylistic choices, cultural references, and figurative language.", ["interpreting", "alluding", "evaluating style"], ["figurative idiom", "marked word order", "literary tense"], ["thành ngữ", "parallel structures", "literary vocabulary"], ["literature", "culture"]],
    ["Mediation across languages", "Reconstruct complex meaning for people with different linguistic and cultural frames.", ["mediating", "reformulating", "contextualizing"], ["reformulation frames", "metalinguistic language", "stance"], ["reformulation frames", "metalinguistic language", "stance"], ["plurilingual", "professional"]],
    ["Precision under pressure", "Respond flexibly in demanding situations while preserving tone and conceptual accuracy.", ["responding", "repairing", "calibrating"], ["modal nuance", "ellipsis", "rapid register shifts"], ["modal particles", "ellipsis", "address shifts"], ["professional", "social"]],
    ["C1 integration", "Sustain flexible, cohesive, and precise communication across complex domains.", ["integrating", "synthesizing", "self-editing"], ["high-level cohesion", "register integration", "rhetorical control"], ["high-level cohesion", "register integration", "rhetorical control"], ["academic", "professional", "culture"]],
  ].map(seed),
  C2: [
    ["Fine shades of meaning", "Choose among near-equivalents to express exact stance, intensity, and implication.", ["distinguishing", "calibrating", "refining"], ["lexical nuance", "aspectual nuance", "marked syntax"], ["lexical compounds", "particle nuance", "marked topic structure"], ["social", "literary"]],
    ["Effortless reformulation", "Restate difficult material immediately without losing precision, tone, or structure.", ["reformulating", "compressing", "expanding"], ["paraphrase networks", "nominal-verbal shifts", "cohesion"], ["paraphrase networks", "analytic compression", "cohesion"], ["academic", "professional"]],
    ["Idiomatic command", "Use and interpret idiom, collocation, and culturally situated expression judiciously.", ["interpreting idiom", "using collocation", "contextualizing"], ["idiomatic frames", "regional variation", "collocation"], ["thành ngữ", "regional variation", "collocation"], ["culture", "relationships"]],
    ["Rhetoric and style", "Shape rhythm, emphasis, and voice for persuasive or memorable expression.", ["persuading", "styling", "foregrounding"], ["rhetorical syntax", "prosodic punctuation", "parallelism"], ["parallelism", "four-part expressions", "rhetorical particles"], ["public", "literary"]],
    ["Complex mediation", "Synthesize conflicting sources and make subtle conceptual relationships accessible.", ["synthesizing", "evaluating", "mediating"], ["evidential stance", "source integration", "conceptual metaphor"], ["evidential framing", "source integration", "conceptual metaphor"], ["academic", "professional"]],
    ["Cultural and interpersonal mastery", "Navigate humor, face, hierarchy, intimacy, and disagreement with mature judgment.", ["negotiating face", "using humor", "disagreeing delicately"], ["pragmatic register", "irony", "mitigation"], ["address hierarchy", "particles", "mitigation"], ["culture", "relationships"]],
    ["Specialized expression", "Adapt rapidly to unfamiliar expert domains by learning and deploying their discourse patterns.", ["specializing", "defining", "translating concepts"], ["technical nominalization", "definition frames", "genre control"], ["technical compounds", "definition frames", "genre control"], ["professional", "academic"]],
    ["C2 integration and maintenance", "Maintain precise, natural, and personally authentic expression through lifelong review and new domains.", ["integrating", "maintaining", "extending"], ["stylistic integration", "self-editing", "adaptive repertoire"], ["stylistic integration", "self-editing", "adaptive repertoire"], ["personal", "professional", "culture"]],
  ].map(seed),
};

function seed(value: unknown[]): UnitSeed {
  const [title, communicativeOutcome, languageFunctions, spanishStructures, vietnameseStructures, domains] = value as [string, string, string[], string[], string[], string[]];
  return { title, communicativeOutcome, languageFunctions, spanishStructures, vietnameseStructures, domains };
}

const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const courseMap: CourseLevel[] = levels.map((level, levelIndex) => ({
  level,
  outcome: levelOutcomes[level],
  units: seeds[level].map((unit, unitIndex) => {
    const sequence = levelIndex * 8 + unitIndex + 1;
    return {
      ...unit,
      id: `${level.toLocaleLowerCase()}-u${unitIndex + 1}`,
      level,
      sequence,
      plannedLessons: 12,
      outsidePractice: {
        purpose: "Move authored language into spontaneous human use without turning LinguaThread into an audio simulator.",
        prompt: `In a conversation with a person or GPT Live, try to ${unit.communicativeOutcome.charAt(0).toLocaleLowerCase()}${unit.communicativeOutcome.slice(1)} Notice what comes naturally and what you want to revisit here.`,
      },
      prerequisiteUnitId: sequence === 1 ? undefined : `${levels[Math.floor((sequence - 2) / 8)].toLocaleLowerCase()}-u${((sequence - 2) % 8) + 1}`,
    };
  }),
}));

export const courseUnits = courseMap.flatMap((level) => level.units);
export const plannedCourseLessonCount = courseUnits.reduce((total, unit) => total + unit.plannedLessons, 0);

export function outsidePracticeFor(level: CEFRLevel, unitNumber: number) {
  return courseMap.find((stage) => stage.level === level)?.units[unitNumber - 1]?.outsidePractice;
}
