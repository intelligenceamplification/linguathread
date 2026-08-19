export type TranslationLanguage = string;
export type TranslationScope = "word" | "phrase" | "sentence";

export type AuthoredXRayEntry = {
  meaning: string;
  baseForm: string;
  partOfSpeech: string;
  syntacticRole: string;
  morphology: string;
  usage: string;
  contrast: string;
};

export type LessonForTools = {
  id: string;
  title: string;
  skill: string;
  vocabulary: Array<{ word: string; english: string; vietnamese: string; note?: string; translations?: Record<string, string> }>;
  sentence: { target: string; anchor: string; bridge: string; note: string; translations?: Record<string, string> };
  grammar: { focus: string; target: { pattern: string; explanation: string }; anchor: { pattern: string; explanation: string }; bridge: { pattern: string; explanation: string }; additional?: Record<string, { pattern: string; explanation: string }>; insight: string };
  xray?: Record<string, { units: Record<string, AuthoredXRayEntry>; preferredPhrases?: string[] }>;
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

type VietnameseLexicalEntry = AuthoredXRayEntry;

type SpanishLexicalEntry = VietnameseLexicalEntry;

const spanishLexicon: Record<string, SpanishLexicalEntry> = {
  "son las": { meaning: "it is [the plural hour]", baseForm: "ser + las + hour", partOfSpeech: "Clock-time predicate frame", syntacticRole: "Establishes the time before the hour and any added minutes are named.", morphology: "Son is third-person plural present of ser; las is feminine plural because horas is understood. Together they form the standard frame for hours other than one.", usage: "Complete it with an hour: son las ocho. Add y media, y cuarto, or minutes when needed.", contrast: "English uses singular it is and no article. Vietnamese can use là with an unchanged form." },
  "son": { meaning: "they are; here, it is", baseForm: "ser, ‘to be’", partOfSpeech: "Finite verb", syntacticRole: "Opens the clock-time expression and agrees with the plural hour phrase las ocho.", morphology: "Present indicative, third-person plural of ser. Spanish traditionally treats hours other than one o’clock as plural: son las ocho.", usage: "Use son las + hour for clock times from two through twelve. Use es la una for one o’clock.", contrast: "English uses singular it is. Vietnamese can use là without changing the verb for the hour." },
  "las": { meaning: "the; here, the plural hour marker", baseForm: "la / las", partOfSpeech: "Feminine plural definite article", syntacticRole: "Introduces the understood feminine plural noun horas before ocho.", morphology: "Feminine plural article agreeing with the omitted noun horas. The plural article helps make son las ocho grammatical.", usage: "Clock time normally uses la with una and las with the other hours.", contrast: "English omits an article in eight thirty. Vietnamese also does not need an equivalent article." },
  "ocho": { meaning: "eight", baseForm: "ocho", partOfSpeech: "Cardinal number", syntacticRole: "Names the hour in the time expression las ocho.", morphology: "Invariant cardinal number; it does not change for gender here.", usage: "After son las, it identifies the hour: son las ocho, ‘it is eight o’clock.’", contrast: "The number maps directly across the languages, but Spanish surrounds it with son las." },
  "y": { meaning: "and; in clock time, plus", baseForm: "y", partOfSpeech: "Coordinating conjunction", syntacticRole: "Links the stated hour to the additional fraction media.", morphology: "Invariant conjunction. Before most words it remains y.", usage: "In time expressions, y adds minutes or a fraction after the hour: ocho y media.", contrast: "English says eight thirty without and. Vietnamese places giờ before rưỡi instead." },
  "media": { meaning: "half; here, half past", baseForm: "medio / media", partOfSpeech: "Feminine singular adjective used as a time fraction", syntacticRole: "Adds half an hour to ocho; media agrees with the understood feminine noun hora.", morphology: "Feminine singular form of medio because the omitted unit is media hora, ‘half an hour.’", usage: "Use y media for half past the hour: son las ocho y media.", contrast: "English lexicalizes the result as eight thirty. Vietnamese uses rưỡi after the hour unit." },
  "el": { meaning: "the", baseForm: "el", partOfSpeech: "Masculine singular definite article", syntacticRole: "Introduces a specific masculine singular noun.", morphology: "Agrees with its noun in masculine gender and singular number.", usage: "Use when the noun is identifiable in context.", contrast: "English the does not mark gender; Vietnamese often relies on context or classifiers." },
  "la": { meaning: "the", baseForm: "la", partOfSpeech: "Feminine singular definite article", syntacticRole: "Introduces a specific feminine singular noun.", morphology: "Agrees with its noun in feminine gender and singular number.", usage: "Use when the noun is identifiable in context.", contrast: "English the does not mark gender; Vietnamese often relies on context or classifiers." },
  "una": { meaning: "a; one", baseForm: "uno / una", partOfSpeech: "Feminine singular indefinite article or number", syntacticRole: "Introduces one nonspecific feminine singular noun.", morphology: "Feminine singular form agreeing with the noun that follows.", usage: "Context decides whether the emphasis is indefinite reference or the number one.", contrast: "Vietnamese may use một plus a classifier; English a does not mark gender." },
  "un": { meaning: "a; one", baseForm: "uno / un", partOfSpeech: "Masculine singular indefinite article or number", syntacticRole: "Introduces one nonspecific masculine singular noun.", morphology: "Apocopated masculine form used before a singular noun.", usage: "Context decides whether the emphasis is indefinite reference or the number one.", contrast: "Vietnamese may use một plus a classifier; English a does not mark gender." },
  "a": { meaning: "to; at; toward", baseForm: "a", partOfSpeech: "Preposition", syntacticRole: "Marks direction, destination, an infinitive link, or a personal object according to context.", morphology: "Invariant preposition; its function comes from the construction around it.", usage: "Read it as part of the authored sentence pattern rather than assigning one English word in every context.", contrast: "English and Vietnamese distribute these relationships differently and may omit a direct equivalent." },
  "de": { meaning: "from; of", baseForm: "de", partOfSpeech: "Preposition", syntacticRole: "Introduces origin, possession, material, or another defining relationship.", morphology: "Invariant preposition. It contracts with el to form del.", usage: "In ser de, it expresses origin; elsewhere the surrounding nouns determine the relation.", contrast: "Vietnamese uses distinct constructions such as đến từ for origin and của for possession." },
  "en": { meaning: "in; at; on", baseForm: "en", partOfSpeech: "Preposition", syntacticRole: "Locates an action or state within a place or setting.", morphology: "Invariant preposition.", usage: "Its natural English equivalent depends on the location expression.", contrast: "Vietnamese commonly uses ở for location, while English chooses among in, at, and on." },
  "por": { meaning: "for; by; through", baseForm: "por", partOfSpeech: "Preposition", syntacticRole: "Introduces cause, means, movement through, exchange, or part of a fixed expression.", morphology: "Invariant preposition.", usage: "In por favor, read the complete courtesy phrase rather than translating por alone.", contrast: "Its range does not map to one English or Vietnamese preposition." },
  "con": { meaning: "with", baseForm: "con", partOfSpeech: "Preposition", syntacticRole: "Introduces accompaniment, association, or means.", morphology: "Invariant preposition.", usage: "The following noun identifies who accompanies the action or what enables it.", contrast: "Vietnamese với and English with overlap, but idiomatic boundaries differ." },
  "al": { meaning: "to the", baseForm: "a + el", partOfSpeech: "Preposition–article contraction", syntacticRole: "Combines direction or relation a with the masculine singular article el.", morphology: "Mandatory contraction of a + el in ordinary Spanish.", usage: "Keep the contraction unless el belongs to a proper name that conventionally retains it.", contrast: "English writes two words; Vietnamese does not use an article contraction." },
  "mas": { meaning: "more", baseForm: "más", partOfSpeech: "Comparative degree adverb", syntacticRole: "Raises the degree of the adjective or adverb that follows.", morphology: "Invariant; the written accent distinguishes más, ‘more,’ from mas, a literary ‘but.’", usage: "Use más + adjective/adverb to form a comparison or intensified request.", contrast: "Vietnamese commonly places hơn after the quality being compared." },
  "muy": { meaning: "very", baseForm: "muy", partOfSpeech: "Degree adverb", syntacticRole: "Intensifies the adjective that follows.", morphology: "Invariant adverb.", usage: "Use muy before an adjective or adverb; use mucho with nouns and many verbs.", contrast: "Vietnamese rất also precedes the quality in many common patterns." },
  "cada": { meaning: "each; every", baseForm: "cada", partOfSpeech: "Distributive determiner", syntacticRole: "Distributes the statement across individual days or members of a set.", morphology: "Invariant and normally followed by a singular noun.", usage: "Cada día frames a repeated development one day at a time.", contrast: "English each/every and Vietnamese mỗi express a similar distribution with different syntax." },
  "favor": { meaning: "favor; in por favor, please", baseForm: "favor", partOfSpeech: "Noun within a courtesy phrase", syntacticRole: "Completes por favor, the conventional expression that softens a request.", morphology: "Masculine singular noun; in this fixed phrase it appears without an article.", usage: "Read por favor as one courtesy expression. Favor alone remains the noun ‘favor.’", contrast: "English please is one word; Vietnamese commonly uses a phrase such as làm ơn." },
  "amigo": { meaning: "friend; a male or unspecified friend", baseForm: "amigo", partOfSpeech: "Masculine singular noun", syntacticRole: "Names the person who receives the planned visit.", morphology: "Masculine singular form; amiga names a female friend, and plural forms add -s.", usage: "The indefinite phrase un amigo introduces one friend not otherwise specified.", contrast: "English friend does not mark gender. Vietnamese người bạn is also structured differently." },
  "indiana": { meaning: "Indiana", baseForm: "Indiana", partOfSpeech: "Proper place name", syntacticRole: "Names the place of origin introduced by de.", morphology: "Proper noun; its form is retained in this Spanish sentence.", usage: "Place names are capitalized and normally appear without an article here.", contrast: "The place name remains stable across this language stack." },
  "desmond": { meaning: "Desmond", baseForm: "Desmond", partOfSpeech: "Personal proper name", syntacticRole: "Supplies the speaker’s name after me llamo.", morphology: "Proper noun; it does not take Spanish gender or number inflection here.", usage: "Personal names retain their identity inside the Spanish introduction frame.", contrast: "The name remains stable while each language builds the introduction differently." },
  "me": { meaning: "me; to me; myself, according to the construction", baseForm: "me", partOfSpeech: "First-person singular clitic pronoun", syntacticRole: "Marks the speaker as reflexive participant, indirect object, or experiencer.", morphology: "Unstressed clitic form; its exact function comes from the verb construction.", usage: "Read me together with its verb: me llamo, me siento, or me gusta.", contrast: "English and Vietnamese often express the same relationship with a subject pronoun or different word order." },
  "siento": { meaning: "I feel", baseForm: "sentirse / sentir", partOfSpeech: "Finite reflexive verb form", syntacticRole: "Forms the predicate with me and introduces the speaker’s internal state.", morphology: "Present indicative, first-person singular; sentir changes e to ie, and sentirse adds the reflexive clitic me.", usage: "Me siento + adjective describes how the speaker feels.", contrast: "English uses I feel; Vietnamese commonly uses tôi cảm thấy with an unchanged verb phrase." },
  "descansar": { meaning: "to rest", baseForm: "descansar", partOfSpeech: "Infinitive verb", syntacticRole: "Names the needed action after necesito.", morphology: "Regular -ar infinitive; it is not conjugated because necesito already carries person and tense.", usage: "Necesito descansar means ‘I need to rest.’", contrast: "English also uses an infinitive; Vietnamese places nghỉ ngơi after cần without conjugation." },
  "verte": { meaning: "to see you", baseForm: "ver + te", partOfSpeech: "Infinitive with attached object pronoun", syntacticRole: "Names the action that causes gladness and identifies the person seen.", morphology: "Ver remains infinitive; the unstressed pronoun te attaches to its end.", usage: "Me alegra verte naturally means ‘I’m glad to see you.’", contrast: "English separates to see and you; Vietnamese uses a separate pronoun after gặp." },
  "es": { meaning: "is; they are, according to the subject", baseForm: "ser", partOfSpeech: "Finite verb", syntacticRole: "Links the subject to an identity, description, or classification.", morphology: "Present indicative, third-person singular of the irregular verb ser.", usage: "Spanish can omit an understood subject because context and the verb form identify it.", contrast: "English chooses is or are from its own subject agreement; Vietnamese là remains unchanged." },
  "junto": { meaning: "next to; beside, in junto a", baseForm: "junto a", partOfSpeech: "Relational adverb within a prepositional expression", syntacticRole: "Begins the location expression that places the table beside the window.", morphology: "In junto a, the form works as part of a fixed relational phrase.", usage: "Keep junto a together before the reference object.", contrast: "English uses beside; Vietnamese uses the multiword relation bên cạnh." },
  "sencilla": { meaning: "simple", baseForm: "sencillo", partOfSpeech: "Feminine singular adjective", syntacticRole: "Describes comida and agrees with that feminine singular noun.", morphology: "Feminine singular form, marked by -a.", usage: "Spanish commonly places this descriptive adjective after the noun.", contrast: "English places simple before food; Vietnamese places đơn giản after the noun phrase." },
  "sencillo": { meaning: "simple", baseForm: "sencillo", partOfSpeech: "Masculine singular adjective", syntacticRole: "Describes the masculine singular indefinite object algo.", morphology: "Masculine singular citation form, marked by -o.", usage: "The adjective follows algo in this natural request.", contrast: "English places simple before the noun-like something; Vietnamese places đơn giản after món." },
  "veces": { meaning: "times; in a veces, sometimes", baseForm: "vez", partOfSpeech: "Feminine plural noun within an adverbial phrase", syntacticRole: "Completes a veces, the frequency expression that frames the routine.", morphology: "Irregular-looking plural of vez: z changes to c before -es.", usage: "Read a veces as the complete adverbial expression ‘sometimes.’", contrast: "English sometimes is one word; Vietnamese đôi khi is a two-word expression." },
  "camino": { meaning: "I walk", baseForm: "caminar", partOfSpeech: "Finite verb", syntacticRole: "States the speaker’s habitual action after the frequency phrase.", morphology: "Present indicative, first-person singular of regular -ar verb caminar.", usage: "The -o ending makes an explicit yo unnecessary.", contrast: "English requires I; Vietnamese commonly states tôi and leaves đi bộ unchanged." },
  "manana": { meaning: "tomorrow; morning, according to context", baseForm: "mañana", partOfSpeech: "Time noun or adverb", syntacticRole: "Locates an action in the next day or names the morning within a time phrase.", morphology: "Invariant lexical form; syntax distinguishes mañana, ‘tomorrow,’ from la mañana, ‘the morning.’", usage: "Sentence position and the article reveal which time meaning is active.", contrast: "Vietnamese distinguishes ngày mai from buổi sáng with separate expressions." },
  "sigue": { meaning: "continue; go on", baseForm: "seguir", partOfSpeech: "Informal singular affirmative command", syntacticRole: "Directs the listener to continue in the stated direction.", morphology: "Tú affirmative imperative of stem-changing seguir; e changes to i.", usage: "Sigue derecho is a common direction: continue straight.", contrast: "English uses the base-form command; Vietnamese uses an unchanged direction verb." },
  "este": { meaning: "this", baseForm: "este", partOfSpeech: "Masculine singular demonstrative determiner", syntacticRole: "Identifies the nearby or currently relevant autobús.", morphology: "Masculine singular form agreeing with autobús.", usage: "Place it before the noun: este autobús.", contrast: "Vietnamese places này after xe buýt; English places this before bus." },
  "puede": { meaning: "can; are you able to, formally", baseForm: "poder", partOfSpeech: "Finite modal verb", syntacticRole: "Frames a polite formal request before the infinitive hablar.", morphology: "Present indicative, third-person singular; in this question it addresses formal usted. Poder changes o to ue.", usage: "¿Puede + infinitive...? is a broadly useful courteous request frame.", contrast: "English uses can before the subject; Vietnamese uses có thể with a stable verb and question frame." },
  "hablar": { meaning: "to speak", baseForm: "hablar", partOfSpeech: "Infinitive verb", syntacticRole: "Names the requested action after puede.", morphology: "Regular -ar infinitive; person and tense are carried by puede.", usage: "Keep the infinitive after a conjugated modal verb.", contrast: "English drops to after can; Vietnamese uses nói after có thể." },
  "expresarme": { meaning: "to express myself", baseForm: "expresarse", partOfSpeech: "Reflexive infinitive with attached pronoun", syntacticRole: "Names what the speaker is learning to do.", morphology: "Infinitive expresar plus the first-person reflexive clitic me attached at the end.", usage: "Aprendo a expresarme means ‘I learn to express myself.’", contrast: "English separates myself; Vietnamese expresses the idea through diễn đạt without the same reflexive form." },
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
  "nghỉ ngơi": { meaning: "to rest; to take restorative rest", baseForm: "nghỉ ngơi", partOfSpeech: "Verb phrase", syntacticRole: "Names the restorative action in the sentence.", morphology: "Stable two-syllable compound expression; it does not conjugate for person or tense.", usage: "Read nghỉ ngơi as one natural expression for resting.", contrast: "Spanish descansar and English rest use one lexical verb." },
  "được gặp": { meaning: "to get to meet; to have the welcome opportunity to see", baseForm: "được gặp", partOfSpeech: "Modal-result verb phrase", syntacticRole: "Frames meeting someone as a welcomed or enabled experience.", morphology: "Được contributes permission, benefit, or favorable possibility before the unchanged verb gặp.", usage: "Common in warm social expressions such as rất vui được gặp bạn.", contrast: "Spanish verte attaches the object pronoun; English often simply says to meet/see you." },
  "bên cạnh": { meaning: "beside; next to", baseForm: "bên cạnh", partOfSpeech: "Relational location phrase", syntacticRole: "Locates one object adjacent to another.", morphology: "Stable two-word relation; the reference object follows it.", usage: "Keep bên cạnh together before the object used as the spatial reference.", contrast: "Spanish uses junto a; English can use beside or next to." },
  "đơn giản": { meaning: "simple; uncomplicated", baseForm: "đơn giản", partOfSpeech: "Adjective", syntacticRole: "Describes the food or item as simple.", morphology: "Stable two-syllable Sino-Vietnamese adjective; it does not agree for gender or number.", usage: "Usually follows the noun phrase it describes.", contrast: "Spanish sencillo/sencilla changes for agreement; Vietnamese đơn giản remains stable." },
  "bây giờ": { meaning: "now; at the present time", baseForm: "bây giờ", partOfSpeech: "Time expression", syntacticRole: "Anchors the statement in the present moment.", morphology: "Fixed two-word temporal expression.", usage: "Can frame a present action or introduce the current clock time.", contrast: "Spanish ahora and English now use one word." },
  "đi bộ": { meaning: "to walk; to go on foot", baseForm: "đi bộ", partOfSpeech: "Verb phrase", syntacticRole: "Names movement on foot.", morphology: "Đi supplies movement; bộ specifies the pedestrian mode. The phrase remains unchanged for person and tense.", usage: "Read the two words together for the ordinary verb walk.", contrast: "Spanish caminar and English walk lexicalize the action in one verb." },
  "vào buổi sáng": { meaning: "in the morning", baseForm: "vào buổi sáng", partOfSpeech: "Time prepositional phrase", syntacticRole: "Places the habitual action within the morning period.", morphology: "Vào introduces the time frame; buổi classifies a period of the day; sáng names morning.", usage: "Use as a complete time setting for an action.", contrast: "Spanish en/por la mañana and English in the morning organize the phrase differently." },
  "có thể": { meaning: "can; be able to", baseForm: "có thể", partOfSpeech: "Modal phrase", syntacticRole: "Marks ability or possibility before the main verb.", morphology: "Stable two-word modal expression; the following verb remains unchanged.", usage: "In questions, it commonly appears inside the có thể...không frame.", contrast: "Spanish conjugates poder; English uses the modal can." },
  "diễn đạt": { meaning: "to express; to formulate meaning", baseForm: "diễn đạt", partOfSpeech: "Verb", syntacticRole: "Names the act of putting a thought or feeling into communicable form.", morphology: "Stable two-syllable verb; no person or tense conjugation.", usage: "Use for expressing an idea clearly in words or another form.", contrast: "Spanish uses expresarse reflexively in this lesson; English uses express oneself." },
  "indiana": { meaning: "Indiana", baseForm: "Indiana", partOfSpeech: "Proper place name", syntacticRole: "Names the place of origin after đến từ.", morphology: "Proper noun retained across the language stack.", usage: "Place it after the origin phrase.", contrast: "The name remains stable while the surrounding origin structure changes." },
  "desmond": { meaning: "Desmond", baseForm: "Desmond", partOfSpeech: "Personal proper name", syntacticRole: "Supplies the person’s name in the introduction.", morphology: "Proper noun retained without person or number inflection.", usage: "Place it after tên là or the naturally chosen naming frame.", contrast: "The name remains stable across languages." },
  "vui": { meaning: "glad; happy; joyful", baseForm: "vui", partOfSpeech: "Stative adjective", syntacticRole: "Names a positive emotional state.", morphology: "Invariant; it does not agree for person, gender, or number.", usage: "Can combine with rất for degree and with a following clause for the cause of gladness.", contrast: "Spanish may use alegre or a construction such as me alegra; English chooses glad or happy." },
  "cách": { meaning: "way; method; manner", baseForm: "cách", partOfSpeech: "Noun or method marker", syntacticRole: "Introduces the manner or method by which an action is performed.", morphology: "Invariant; with học, học cách + verb means ‘learn how to.’", usage: "Read it with the action that follows when it introduces a method.", contrast: "English often uses how to; Spanish commonly links aprender a directly to an infinitive." },
  "đó": { meaning: "that; that one; there, according to context", baseForm: "đó", partOfSpeech: "Demonstrative or deictic word", syntacticRole: "Points to a person, object, or situation already identifiable in context.", morphology: "Invariant demonstrative form.", usage: "Its position and surrounding noun determine whether it means that or there.", contrast: "Spanish demonstratives inflect for gender and number; English that remains less marked." },
  "về": { meaning: "return; toward; about", baseForm: "về", partOfSpeech: "Direction verb or relational marker", syntacticRole: "Marks movement toward home/a reference point or introduces a topic.", morphology: "Invariant; context determines its directional or relational use.", usage: "In về nhà, it carries movement toward or back home.", contrast: "Spanish and English choose different prepositions or motion verbs for these senses." },
  "món": { meaning: "dish; item; classifier for prepared food", baseForm: "món", partOfSpeech: "Noun and classifier", syntacticRole: "Classifies one prepared dish or item.", morphology: "Invariant; quantity normally appears before it and the described quality after the noun phrase.", usage: "Một món introduces one dish/item in a food context.", contrast: "Spanish and English often use an article plus a noun without a separate classifier." },
  "bằng": { meaning: "by; with; equal to", baseForm: "bằng", partOfSpeech: "Means marker or relational word", syntacticRole: "Introduces the method or instrument used to perform an action.", morphology: "Invariant relational form.", usage: "In trả bằng thẻ, it introduces card as the means of payment.", contrast: "Spanish uses con and English by/with depending on the expression." },
  "tám": { meaning: "eight", baseForm: "tám", partOfSpeech: "Cardinal number", syntacticRole: "Names the hour or counts eight items.", morphology: "Invariant number word.", usage: "Before giờ, it identifies eight o’clock.", contrast: "The number maps directly, but surrounding clock-time grammar differs." },
  "đi": { meaning: "go; move away; travel", baseForm: "đi", partOfSpeech: "Movement verb", syntacticRole: "Carries movement and can combine with another verb or mode to shape the action.", morphology: "Invariant; person and time come from pronouns, particles, and context.", usage: "In đi bộ it means go on foot; before thăm it can support the movement toward a visit.", contrast: "Spanish conjugates ir; English changes go/went, while Vietnamese keeps đi stable." },
  "người": { meaning: "person; human being; classifier for people", baseForm: "người", partOfSpeech: "Noun and human classifier", syntacticRole: "Names or classifies a person in the noun phrase.", morphology: "Invariant; number and definiteness come from surrounding words.", usage: "Một người bạn literally builds ‘one person friend,’ naturally ‘a friend.’", contrast: "Spanish and English articles do not use a separate human classifier." },
  "vào": { meaning: "enter; into; at/in a time frame", baseForm: "vào", partOfSpeech: "Direction verb or preposition", syntacticRole: "Introduces inward movement or places an event within a named time.", morphology: "Invariant; context distinguishes spatial entry from temporal framing.", usage: "Before a weekday or day period, it commonly means on/in.", contrast: "Spanish and English divide these uses among several prepositions." },
  "rồi": { meaning: "already; then; afterward", baseForm: "rồi", partOfSpeech: "Aspect or sequence particle", syntacticRole: "Marks completion or moves the sequence to the next action.", morphology: "Invariant particle; placement and discourse context determine its force.", usage: "Between actions it can carry the natural sequence ‘then.’", contrast: "Spanish uses sequence words or tense/aspect; English often uses then or already." },
  "nói": { meaning: "speak; say", baseForm: "nói", partOfSpeech: "Verb", syntacticRole: "Names the act of speaking requested in the sentence.", morphology: "Invariant; modal and comparison words surround it without changing the verb.", usage: "After có thể it forms ‘can speak’; an adverb can specify how.", contrast: "Spanish leaves hablar infinitive after puede; English uses speak after can." },
  "hơn": { meaning: "more; comparatively", baseForm: "hơn", partOfSpeech: "Comparative marker", syntacticRole: "Marks a higher degree after an adjective or adverb.", morphology: "Invariant and typically follows the quality being compared.", usage: "Chậm hơn means more slowly; tốt hơn means better.", contrast: "Spanish and English normally place más/more before the quality." },
};

// These reviewed expressions should open as complete semantic units when any
// of their visible words is tapped. Their components remain available through
// the explicit scope selector when a learner wants the narrower analysis.
const vietnamesePreferredPhraseSelections = new Set(["cái này", "bao nhiêu", "nghỉ ngơi", "được gặp", "bên cạnh", "đơn giản", "bây giờ", "đi bộ", "vào buổi sáng", "có thể", "diễn đạt"]);

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

function normalizeSpanish(value: string) {
  return strip(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es").replace(/\s+/g, " ");
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

  // Phrase scopes are authored linguistic units, not every mathematically
  // possible run of adjacent words. This avoids presenting accidental groups
  // as if they carried a stable grammatical meaning.
  for (const item of lesson.vocabulary) {
    const phrase = languageValue(item, language);
    const phraseTokens = Array.from(phrase.matchAll(/[\p{L}]+(?:[’'][\p{L}]+)?/gu)).map((match) => match[0]);
    if (phraseTokens.length < 2) continue;
    const start = words.findIndex((_, wordIndex) => phraseTokens.every((token, tokenIndex) => normalizeSpanish(words[wordIndex + tokenIndex] || "") === normalizeSpanish(token)));
    if (start >= 0) phraseScopes.push({ id: `${language}-vocabulary-phrase-${start}-${start + phraseTokens.length}`, kind: "phrase", language, text: words.slice(start, start + phraseTokens.length).join(" "), tokenStart: start, tokenEnd: start + phraseTokens.length });
  }
  const reviewedPhraseKeys = language === "Vietnamese" ? Object.keys(vietnameseLexicon) : language === "Spanish" ? Object.keys(spanishLexicon) : Object.keys(lesson.xray?.[language]?.units || {});
  for (const phrase of reviewedPhraseKeys.filter((item) => item.includes(" "))) {
    const phraseTokens = phrase.split(" ");
    const start = words.findIndex((_, wordIndex) => phraseTokens.every((token, tokenIndex) => normalizeSpanish(words[wordIndex + tokenIndex] || "") === normalizeSpanish(token)));
    if (start >= 0) phraseScopes.push({ id: `${language}-reviewed-phrase-${start}-${start + phraseTokens.length}`, kind: "phrase", language, text: words.slice(start, start + phraseTokens.length).join(" "), tokenStart: start, tokenEnd: start + phraseTokens.length });
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

  const uniquePhrases = [...new Map(phraseScopes.map((scope) => [`${scope.tokenStart}-${scope.tokenEnd}`, scope])).values()];
  return [
    ...words.map((text, index) => ({ id: `${language}-word-${index}`, kind: "word" as const, language, text, tokenStart: index, tokenEnd: index + 1 })),
    ...uniquePhrases,
    { id: `${language}-sentence`, kind: "sentence" as const, language, text: sentence, tokenStart: 0, tokenEnd: words.length },
  ];
}

function isAuthoredPhrase(lesson: LessonForTools, scope: XRayScope) {
  if (scope.kind !== "phrase") return false;
  const normalized = strip(scope.text).toLocaleLowerCase();
  if (scope.language === "Vietnamese" && vietnameseLexicon[normalizeVietnamese(scope.text)]) return true;
  if (scope.language === "Spanish" && normalizeSpanish(scope.text) === normalizeSpanish(lesson.grammar.focus)) return true;
  if (lesson.xray?.[scope.language]?.units[normalizeSpanish(scope.text)]) return true;
  return lesson.vocabulary.some((word) => strip(languageValue(word, scope.language)).toLocaleLowerCase() === normalized);
}

function hasStandaloneMeaning(lesson: LessonForTools, scope: XRayScope) {
  if (scope.kind !== "word") return false;
  if (scope.language === "Vietnamese" && vietnameseLexicon[normalizeVietnamese(scope.text)]) return true;
  if (lesson.xray?.[scope.language]?.units[normalizeSpanish(scope.text)]) return true;
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
    : meaningfulPhrases.find((scope) => lesson.xray?.[language]?.preferredPhrases?.some((phrase) => normalizeSpanish(phrase) === normalizeSpanish(scope.text)));
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

const spanishVerbLemmas: Record<string, string> = {
  "soy": "ser", "eres": "ser", "es": "ser", "son": "ser", "estoy": "estar", "esta": "estar", "estas": "estar",
  "llamo": "llamarse", "quiero": "querer", "trabajo": "trabajar", "descanso": "descansar", "escuchando": "escuchar",
  "siento": "sentirse", "necesito": "necesitar", "alegra": "alegrar", "vive": "vivir", "hay": "haber", "pasa": "pasar",
  "sientate": "sentarse", "gusta": "gustar", "quisiera": "querer", "pedir": "pedir", "cuesta": "costar", "voy": "ir",
  "pagar": "pagar", "camino": "caminar", "visitar": "visitar", "puedes": "poder", "venir": "venir", "sigue": "seguir",
  "gira": "girar", "lleva": "llevar", "puede": "poder", "hablar": "hablar", "aprendo": "aprender", "expresarme": "expresarse",
  "verte": "ver", "descansar": "descansar",
};
const spanishAdverbs = new Set(["aqui", "donde", "hoy", "despues", "ahora", "porque", "como", "cerca", "muy", "siempre", "nunca", "temprano", "derecho", "mas", "despacio", "mejor"]);
const spanishAdjectives = new Set(["tranquilo", "cansado", "amable", "paciente", "bienvenido", "sencilla", "sencillo", "libre", "izquierda"]);

function spanishVocabularyAnalysis(lesson: LessonForTools, scope: XRayScope, word: LessonForTools["vocabulary"][number]): XRayAnalysis {
  const normalized = normalizeSpanish(scope.text);
  const grammar = lesson.grammar.target;
  const lemma = spanishVerbLemmas[normalized];
  const partOfSpeech = lemma ? (/[aei]r$/.test(normalized) ? "Infinitive verb" : normalized.endsWith("ando") || normalized.endsWith("iendo") ? "Gerund" : "Finite or inflected verb")
    : spanishAdverbs.has(normalized) ? "Adverb or adverbial expression"
      : spanishAdjectives.has(normalized) ? "Adjective"
        : "Noun or nominal expression";
  const form = lemma ? `${lemma}, the source verb for ${scope.text}` : scope.text;
  const morphology = lemma
    ? `${scope.text} is the reviewed verb form used in ${grammar.pattern}. ${grammar.explanation}`
    : partOfSpeech === "Adjective"
      ? `This form participates in the agreement and word-order pattern ${grammar.pattern}; the sentence context determines its gender and number here.`
      : `The visible form remains ${scope.text} inside the authored pattern ${grammar.pattern}.`;
  return {
    title: scope.text,
    scope: "word",
    interpretation: "standalone",
    directMeaning: word.english,
    contextualMeaning: word.note || `Here it contributes its reviewed meaning to “${lesson.sentence.target}”`,
    baseForm: form,
    morphology,
    partOfSpeech,
    syntacticRole: `It performs its ${partOfSpeech.toLocaleLowerCase()} role inside ${grammar.pattern}.`,
    structure: `${scope.text} belongs to the lesson’s target structure: ${grammar.pattern}.`,
    usage: `The curriculum introduces it through the natural sentence “${lesson.sentence.target}”, not as an isolated substitution exercise.`,
    contrast: `Its natural English value here is “${word.english}”; Vietnamese expresses the corresponding contribution as “${word.vietnamese}” without requiring the same grammar.`,
    relationship: `It helps construct the complete meaning: ${lesson.sentence.anchor}`,
  };
}

function authoredVocabularyAnalysis(lesson: LessonForTools, scope: XRayScope, word: LessonForTools["vocabulary"][number]): XRayAnalysis {
  const language = scope.language;
  const grammar = grammarFor(lesson, language);
  return {
    title: scope.text,
    scope: "word",
    interpretation: "standalone",
    directMeaning: languageValue(word, "English"),
    contextualMeaning: word.note || `This is reviewed vocabulary in “${languageSentence(lesson, language)}”.`,
    baseForm: languageValue(word, language),
    morphology: `${scope.text} is the reviewed ${language} form used inside ${grammar.pattern}. ${grammar.explanation}`,
    partOfSpeech: "Reviewed lexical unit",
    syntacticRole: `Carries its authored lexical contribution inside ${grammar.pattern}.`,
    structure: `Read it in the complete ${language} realization before comparing its position across languages.`,
    usage: `Use it through the natural model “${languageSentence(lesson, language)}”.`,
    contrast: `The same lesson contribution appears as “${word.word}” in Spanish and “${word.vietnamese}” in Vietnamese; the grammar need not map one to one.`,
    relationship: `It helps construct the complete meaning: ${lesson.sentence.anchor}`,
  };
}

const englishRoles: Record<string, { meaning: string; base: string; part: string; role: string }> = {
  "i": { meaning: "the speaker", base: "I", part: "First-person singular subject pronoun", role: "Names the speaker as the subject." },
  "you": { meaning: "the person or people addressed", base: "you", part: "Second-person pronoun", role: "Refers to the listener as subject or object according to position." },
  "they": { meaning: "the person or people referred to", base: "they", part: "Third-person pronoun", role: "Supplies the subject while leaving gender unspecified here." },
  "my": { meaning: "belonging or related to the speaker", base: "my", part: "Possessive determiner", role: "Marks the following noun as connected to the speaker." },
  "myself": { meaning: "the speaker as the reflexive object", base: "myself", part: "Reflexive pronoun", role: "Returns the action or expression to the speaker." },
  "a": { meaning: "one nonspecific member", base: "a", part: "Indefinite article", role: "Introduces a singular countable noun not yet identified." },
  "the": { meaning: "the contextually identifiable one", base: "the", part: "Definite article", role: "Marks the following noun as identifiable in context." },
  "from": { meaning: "originating at or in", base: "from", part: "Preposition", role: "Introduces the source or place of origin." },
  "to": { meaning: "to; toward; infinitive marker", base: "to", part: "Preposition or infinitive marker", role: "Links direction or introduces the infinitive that follows." },
  "at": { meaning: "at a point or setting", base: "at", part: "Preposition", role: "Introduces a location or point in time." },
  "in": { meaning: "within a place or time frame", base: "in", part: "Preposition", role: "Places the action inside a location or period." },
  "on": { meaning: "on; within a named day", base: "on", part: "Preposition", role: "Introduces a day or surface relation." },
  "by": { meaning: "by means of", base: "by", part: "Preposition", role: "Introduces the method or means used." },
  "and": { meaning: "and", base: "and", part: "Coordinating conjunction", role: "Links parallel words, phrases, or actions." },
  "is": { meaning: "is", base: "be", part: "Finite copular or auxiliary verb", role: "Links a third-person singular subject or supports another verb form." },
  "am": { meaning: "am", base: "be", part: "First-person singular finite verb", role: "Agrees with I and links or supports the predicate." },
  "are": { meaning: "are", base: "be", part: "Finite copular or auxiliary verb", role: "Agrees with you, we, they, or a plural subject." },
  "would": { meaning: "would; here, polite or conditional framing", base: "will", part: "Modal auxiliary", role: "Softens or conditionally frames the following verb." },
  "does": { meaning: "does; question support", base: "do", part: "Third-person singular auxiliary", role: "Carries tense and question formation so the main verb stays in its base form." },
  "can": { meaning: "can; be able to", base: "can", part: "Modal auxiliary", role: "Marks ability or possibility before a base-form verb." },
  "more": { meaning: "to a greater degree", base: "more", part: "Comparative degree word", role: "Raises the degree of the adjective or adverb that follows." },
};
const englishVerbs = new Set(["meet", "like", "work", "rest", "see", "cost", "going", "walk", "come", "continue", "go", "speak", "express"]);
const englishAdjectives = new Set(["nice", "glad", "simple"]);
const englishAdverbs = new Set(["attentively", "beside", "morning", "thirty"]);

function englishWordAnalysis(lesson: LessonForTools, scope: XRayScope): XRayAnalysis {
  const normalized = normalizeSpanish(scope.text.replace(/[’']/g, ""));
  const authored = englishRoles[normalized];
  const part = authored?.part || (englishVerbs.has(normalized) ? "Verb or verb form" : englishAdjectives.has(normalized) ? "Adjective" : englishAdverbs.has(normalized) ? "Adverb or adverbial word" : /^\d+$/.test(normalized) || normalized === "eight" ? "Cardinal number" : /^[A-Z]/.test(scope.text) ? "Proper noun or sentence-initial content word" : "Content noun or lexical word");
  const meaning = authored?.meaning || `the English lexical meaning “${scope.text}” in this sentence`;
  const role = authored?.role || `Contributes its ${part.toLocaleLowerCase()} meaning inside the anchor sentence.`;
  return {
    title: scope.text,
    scope: "word",
    interpretation: "standalone",
    directMeaning: meaning,
    contextualMeaning: `Here it contributes to: “${lesson.sentence.anchor}”`,
    baseForm: authored?.base || scope.text,
    morphology: authored ? `${scope.text} appears in its ${part.toLocaleLowerCase()} form; English position and auxiliaries establish its sentence function.` : `This visible English form operates inside ${lesson.grammar.anchor.pattern}.`,
    partOfSpeech: part,
    syntacticRole: role,
    structure: `Read it within the anchor pattern: ${lesson.grammar.anchor.pattern}.`,
    usage: `The anchor sentence supplies the natural context before the learner compares other language structures.`,
    contrast: `Spanish uses ${lesson.grammar.target.pattern}; Vietnamese uses ${lesson.grammar.bridge.pattern}. The same meaning need not occupy one matching word.`,
    relationship: `It helps construct the complete meaning: ${lesson.sentence.anchor}`,
  };
}

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
  const spanishEntry = scope.language === "Spanish" ? spanishLexicon[normalizeSpanish(scope.text)] : undefined;
  const additionalEntry = lesson.xray?.[scope.language]?.units[normalizeSpanish(scope.text)];

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

  if (scope.language === "Spanish" && spanishEntry) {
    return {
      title: scope.text,
      scope: scope.kind,
      interpretation: scope.kind === "phrase" ? "phrase" : "standalone",
      directMeaning: spanishEntry.meaning,
      contextualMeaning: `Here it contributes to: “${naturalSentence}”`,
      baseForm: spanishEntry.baseForm,
      morphology: spanishEntry.morphology,
      partOfSpeech: spanishEntry.partOfSpeech,
      syntacticRole: spanishEntry.syntacticRole,
      structure: `Read it inside the authored Spanish structure: ${pattern}.`,
      usage: spanishEntry.usage,
      contrast: spanishEntry.contrast,
      relationship: `It helps build the whole meaning: ${lesson.sentence.anchor}`,
    };
  }

  if (scope.language === "Spanish" && scope.kind === "word" && matchingWord) return spanishVocabularyAnalysis(lesson, scope, matchingWord);

  if (additionalEntry) {
    return {
      title: scope.text,
      scope: scope.kind,
      interpretation: scope.kind === "phrase" ? "phrase" : "standalone",
      directMeaning: additionalEntry.meaning,
      contextualMeaning: `Here it contributes to: “${naturalSentence}”`,
      baseForm: additionalEntry.baseForm,
      morphology: additionalEntry.morphology,
      partOfSpeech: additionalEntry.partOfSpeech,
      syntacticRole: additionalEntry.syntacticRole,
      structure: `Read it inside the authored ${languageLabel} structure: ${pattern}.`,
      usage: additionalEntry.usage,
      contrast: additionalEntry.contrast,
      relationship: `It helps build the whole meaning: ${lesson.sentence.anchor}`,
    };
  }

  if (scope.language === "Vietnamese" && lexicalEntry) {
    return {
      title: scope.text,
      scope: scope.kind,
      interpretation: scope.kind === "phrase" ? "phrase" : "standalone",
      directMeaning: lexicalEntry.meaning,
      contextualMeaning: `Here it contributes to: “${naturalSentence}”`,
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

  if (scope.kind === "word" && matchingWord) return authoredVocabularyAnalysis(lesson, scope, matchingWord);

  if (scope.language === "English" && scope.kind === "word") return englishWordAnalysis(lesson, scope);

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
      : containingVietnamesePhrase
        ? "Component within reviewed Vietnamese expression"
        : "Contextual Vietnamese word";
  return {
    title: scope.text,
    scope: "word",
    interpretation: containingVietnamesePhrase ? "component" : "contextual",
    directMeaning: direct,
    contextualMeaning: `Here it contributes to: “${naturalSentence}”`,
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
