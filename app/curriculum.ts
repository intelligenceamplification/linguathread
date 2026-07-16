export type VocabularyItem = {
  word: string;
  english: string;
  vietnamese: string;
  note: string;
};

export type GrammarLayer = {
  pattern: string;
  explanation: string;
};

export type LessonDefinition = {
  id: string;
  unit: number;
  lesson: number;
  unitTitle: string;
  title: string;
  skill: string;
  vocabulary: VocabularyItem[];
  recall: { prompt: string; instruction: string; accepted: string[]; correct: string; hint: string };
  sentence: { target: string; anchor: string; bridge: string; note: string };
  grammar: {
    focus: string;
    target: GrammarLayer;
    anchor: GrammarLayer;
    bridge: GrammarLayer;
    insight: string;
    deep: Array<{ title: string; principle: string; explanation: string }>;
    summary: string;
  };
  transform: { prompt: string; bridgeReminder: string; words: string[]; bank: string[]; hint: string };
  mastery: { prompt: string; instruction: string; accepted: string[]; answer: string; hint: string };
  bridgeMastery: { prompt: string; instruction: string; accepted: string[]; answer: string; hint: string };
  completion: string;
};

export const curriculum: LessonDefinition[] = [
  {
    id: "es-u1-l1-identity-origin", unit: 1, lesson: 1, unitTitle: "Foundations", title: "Identity and origin", skill: "subject + ser + de",
    vocabulary: [
      { word: "yo", english: "I", vietnamese: "mình / tôi", note: "Spanish has one neutral first-person singular. Vietnamese chooses a pronoun through relationship and context." },
      { word: "tú", english: "you", vietnamese: "bạn", note: "Tú is informal singular. Like Vietnamese pronouns, it already says something about the relationship." },
      { word: "soy", english: "I am", vietnamese: "mình là / tôi là", note: "Soy is ser shaped for yo. Spanish can omit yo because the verb already carries it." },
      { word: "eres", english: "you are", vietnamese: "bạn là", note: "Eres is ser shaped for tú. Vietnamese là does not change with the person." },
      { word: "de", english: "from / of", vietnamese: "từ / của", note: "A small word that connects origin, belonging, material, and relationship." },
    ],
    recall: { prompt: "What does soy carry?", instruction: "Answer in English. Include the person as well as the verb.", accepted: ["i am", "i'm", "am"], correct: "Yes. Soy carries “I am.”", hint: "soy = I am" },
    sentence: { target: "Soy de Indiana.", anchor: "I am from Indiana.", bridge: "Mình đến từ Indiana.", note: "The meaning stays stable. Each language reveals a different way of organizing identity and origin." },
    grammar: {
      focus: "Soy", target: { pattern: "soy + de", explanation: "Ser changes into soy for “I.” The pronoun yo is optional because the verb already identifies the speaker." },
      anchor: { pattern: "I + am + from", explanation: "English requires the subject and changes be to am. This familiar pattern makes Spanish conjugation intelligible." },
      bridge: { pattern: "mình + đến từ", explanation: "The verb phrase does not conjugate. Đến từ carries “come from,” while the pronoun reflects relationship and context." },
      insight: "Spanish and English change the verb. Vietnamese keeps the verb stable. Spanish alone can let the conjugated verb stand without the pronoun.",
      deep: [
        { title: "Conjugation", principle: "ser changes with the person", explanation: "Yo soy, tú eres, and él / ella / usted es are forms of one verb. The change is grammatical information, not new vocabulary." },
        { title: "Subject omission", principle: "soy already contains “I”", explanation: "Spanish pronouns are often omitted when the verb ending makes the subject clear. Use yo when contrast or emphasis matters." },
        { title: "Ser, not estar", principle: "origin is treated as identity", explanation: "Spanish uses ser de for where someone is from. Estar describes location or state, but estoy de Indiana does not express origin." },
        { title: "The range of de", principle: "origin, possession, material", explanation: "De can mean “from” or “of.” The relationship is resolved through context." },
      ],
      summary: "English helps you recognize the changing form of “be.” Vietnamese makes the contrast clearer: là stays stable, while Spanish places person directly inside ser.",
    },
    transform: { prompt: "I am from Indiana.", bridgeReminder: "English: I + am + from · Vietnamese: mình + đến từ", words: ["Soy", "de", "Indiana."], bank: ["Indiana.", "de", "Soy"], hint: "Let the conjugated verb lead." },
    mastery: { prompt: "Translate: I am from Indiana.", instruction: "Write the natural Spanish. The subject pronoun may be omitted.", accepted: ["soy de indiana", "yo soy de indiana"], answer: "Soy de Indiana.", hint: "Let soy carry “I am.”" },
    bridgeMastery: { prompt: "Now say it in Vietnamese.", instruction: "Translate “I am from Indiana” naturally.", accepted: ["mình đến từ indiana", "tôi đến từ indiana"], answer: "Mình đến từ Indiana.", hint: "Use mình or tôi, followed by đến từ." },
    completion: "You mapped person, identity, and origin across Spanish, English, and Vietnamese.",
  },
  {
    id: "es-u1-l2-names", unit: 1, lesson: 2, unitTitle: "Foundations", title: "Names and introductions", skill: "llamarse + introductions",
    vocabulary: [
      { word: "me", english: "myself / to me", vietnamese: "mình / tôi", note: "Me is a small reflexive word. Spanish uses it because the name is understood as something you call yourself." },
      { word: "llamo", english: "I call", vietnamese: "gọi", note: "Llamo carries the first person, just as soy does." },
      { word: "nombre", english: "name", vietnamese: "tên", note: "Nombre is useful when asking or clarifying, but Spanish introductions often prefer me llamo." },
      { word: "mucho", english: "much / very", vietnamese: "rất / nhiều", note: "In mucho gusto, the phrase expresses abundant pleasure rather than a literal English structure." },
      { word: "gusto", english: "pleasure", vietnamese: "hân hạnh", note: "A greeting can carry warmth without becoming elaborate." },
    ],
    recall: { prompt: "What does me llamo express?", instruction: "Answer naturally in English.", accepted: ["my name is", "i am called", "i call myself"], correct: "Yes. Me llamo introduces your name.", hint: "It means “my name is” or, literally, “I call myself.”" },
    sentence: { target: "Me llamo Desmond. Mucho gusto.", anchor: "My name is Desmond. Nice to meet you.", bridge: "Mình tên là Desmond. Rất vui được gặp bạn.", note: "An introduction is practical, but it is also an offering of presence: this is who I am, and I am glad to meet you." },
    grammar: {
      focus: "Me llamo", target: { pattern: "me + llamo", explanation: "The reflexive pronoun me points the action back to the speaker; llamo already marks the first person." },
      anchor: { pattern: "my name + is", explanation: "English describes the name as something possessed. Spanish describes the act of calling oneself." },
      bridge: { pattern: "mình + tên + là", explanation: "Vietnamese places tên, “name,” before là. The structure stays stable across speakers." },
      insight: "The same social act is framed three ways: self-calling in Spanish, possession in English, and name-as-identity in Vietnamese.",
      deep: [
        { title: "Reflexive form", principle: "the action returns to the subject", explanation: "Llamarse is the infinitive. Me llamo uses me because the speaker is both the source and recipient of the naming." },
        { title: "Verb information", principle: "llamo already identifies yo", explanation: "The -o ending marks first-person singular, so yo is usually unnecessary." },
        { title: "Social register", principle: "mucho gusto is broadly useful", explanation: "It is polite without being stiff and works in professional, travel, and everyday encounters." },
        { title: "Natural equivalence", principle: "translate the intention", explanation: "A literal rendering is less useful than recognizing that each language has its own conventional introduction." },
      ],
      summary: "English remains the anchor for meaning. Vietnamese helps show that natural introductions do not need to share the same literal machinery.",
    },
    transform: { prompt: "My name is Desmond.", bridgeReminder: "English: my name is · Vietnamese: mình tên là", words: ["Me", "llamo", "Desmond."], bank: ["Desmond.", "llamo", "Me"], hint: "Begin with the reflexive word me." },
    mastery: { prompt: "Introduce yourself as Desmond.", instruction: "Write the natural Spanish introduction.", accepted: ["me llamo desmond", "yo me llamo desmond"], answer: "Me llamo Desmond.", hint: "Use me llamo, not a word-for-word copy of English." },
    bridgeMastery: { prompt: "Now introduce yourself in Vietnamese.", instruction: "Translate “My name is Desmond” naturally.", accepted: ["mình tên là desmond", "tôi tên là desmond", "mình tên desmond", "tôi tên desmond"], answer: "Mình tên là Desmond.", hint: "Use mình or tôi + tên là + Desmond." },
    completion: "You can now offer your name naturally and recognize how each language frames identity.",
  },
  {
    id: "es-u1-l3-needs", unit: 1, lesson: 3, unitTitle: "Foundations", title: "Needs and courtesy", skill: "querer + polite requests",
    vocabulary: [
      { word: "quiero", english: "I want", vietnamese: "tôi muốn", note: "Quiero is direct. Tone and por favor can make the same grammar feel gracious." },
      { word: "agua", english: "water", vietnamese: "nước", note: "Essential words become memorable when attached to an immediate human need." },
      { word: "café", english: "coffee", vietnamese: "cà phê", note: "The resemblance across languages is a useful point of ease." },
      { word: "por favor", english: "please", vietnamese: "làm ơn", note: "Courtesy is not ornamental; it changes how a request lands." },
      { word: "gracias", english: "thank you", vietnamese: "cảm ơn", note: "Gratitude completes the exchange rather than merely decorating it." },
    ],
    recall: { prompt: "What does quiero carry?", instruction: "Answer in English, including the speaker.", accepted: ["i want", "i would like"], correct: "Yes. Quiero carries “I want.”", hint: "The -o ending marks the speaker: I want." },
    sentence: { target: "Quiero agua, por favor.", anchor: "I would like water, please.", bridge: "Tôi muốn nước, làm ơn.", note: "A clear need can be expressed without aggression. Precision and courtesy can coexist." },
    grammar: {
      focus: "Quiero", target: { pattern: "quiero + noun", explanation: "Quiero is the yo form of querer. Spanish often omits yo because the verb ending identifies the speaker." },
      anchor: { pattern: "I would like + noun", explanation: "English often softens requests with “would like,” even though the core desire is the same." },
      bridge: { pattern: "tôi + muốn + noun", explanation: "Vietnamese keeps muốn unchanged and states the pronoun explicitly." },
      insight: "Natural equivalence includes social tone. Spanish quiero can correspond to either “I want” or the more courteous English “I would like.”",
      deep: [
        { title: "Querer", principle: "e changes to ie", explanation: "Querer becomes quiero in the present first person. This stem change appears across much of the present tense." },
        { title: "Direct objects", principle: "no article is needed here", explanation: "Quiero agua refers to water generally. Specific water may take an article or demonstrative." },
        { title: "Courtesy", principle: "grammar and tone cooperate", explanation: "Por favor, vocal warmth, and context shape politeness more than a single verb form." },
        { title: "Practical transfer", principle: "swap the needed noun", explanation: "Once quiero + noun is stable, it opens food, travel, shopping, and daily requests." },
      ],
      summary: "English clarifies the courteous intention. Vietnamese highlights the stable verb pattern that Spanish contrasts through conjugation.",
    },
    transform: { prompt: "I would like water, please.", bridgeReminder: "English: I would like · Vietnamese: tôi muốn", words: ["Quiero", "agua,", "por", "favor."], bank: ["favor.", "agua,", "Quiero", "por"], hint: "State the desire first, then add courtesy." },
    mastery: { prompt: "Ask naturally for water, politely.", instruction: "Write the Spanish request.", accepted: ["quiero agua por favor", "yo quiero agua por favor"], answer: "Quiero agua, por favor.", hint: "Quiero + agua + por favor." },
    bridgeMastery: { prompt: "Now ask in Vietnamese.", instruction: "Translate “I would like water, please” naturally.", accepted: ["tôi muốn nước làm ơn", "mình muốn nước làm ơn", "cho tôi nước với", "cho mình nước với"], answer: "Tôi muốn nước, làm ơn.", hint: "Use tôi muốn nước, then add courtesy." },
    completion: "You can now express a basic need clearly, naturally, and courteously.",
  },
  {
    id: "es-u1-l4-location", unit: 1, lesson: 4, unitTitle: "Foundations", title: "Location and orientation", skill: "estar + location",
    vocabulary: [
      { word: "estoy", english: "I am", vietnamese: "tôi đang / tôi ở", note: "Estoy describes state or location, while soy describes identity and origin." },
      { word: "aquí", english: "here", vietnamese: "ở đây", note: "A small location word can become an anchor in unfamiliar places." },
      { word: "dónde", english: "where", vietnamese: "ở đâu", note: "The written accent distinguishes the question word dónde." },
      { word: "está", english: "is / you are", vietnamese: "ở / đang", note: "Está serves él, ella, and formal usted in the present tense." },
      { word: "baño", english: "bathroom", vietnamese: "nhà vệ sinh", note: "Practical language deserves an early place in the curriculum." },
    ],
    recall: { prompt: "What kind of “I am” is estoy?", instruction: "Name the kind of meaning it usually carries.", accepted: ["location", "state", "location or state", "state or location"], correct: "Yes. Estoy usually carries location or state.", hint: "Think location or temporary condition, not identity." },
    sentence: { target: "Estoy aquí. ¿Dónde está el baño?", anchor: "I am here. Where is the bathroom?", bridge: "Tôi ở đây. Nhà vệ sinh ở đâu?", note: "Orientation begins by locating yourself calmly, then asking one clear question." },
    grammar: {
      focus: "Estoy", target: { pattern: "estar + location", explanation: "Spanish uses estar for physical location. Estoy marks the first person; está marks a third person or formal you." },
      anchor: { pattern: "be + location", explanation: "English uses the same verb be for identity and location, so context does the separating." },
      bridge: { pattern: "pronoun + ở + place", explanation: "Vietnamese uses ở for location and does not conjugate it." },
      insight: "English says “am” in both identity and location. Spanish requires a choice between soy and estoy; Vietnamese makes location explicit with ở.",
      deep: [
        { title: "Ser and estar", principle: "meaning chooses the verb", explanation: "Ser identifies and classifies. Estar locates and describes current states. The distinction is conceptual, not simply permanent versus temporary." },
        { title: "Question order", principle: "¿dónde está...?”,", explanation: "Spanish can form this location question without an auxiliary verb such as English “does.”" },
        { title: "Written questions", principle: "Spanish marks both boundaries", explanation: "The inverted opening mark tells the reader from the start that the sentence is a question." },
        { title: "Formal address", principle: "usted uses está", explanation: "The same form used for él and ella also serves formal singular you." },
      ],
      summary: "English anchors the meaning; Vietnamese offers a stable location marker; Spanish trains the deeper choice between identity and state.",
    },
    transform: { prompt: "I am here.", bridgeReminder: "English: I am here · Vietnamese: tôi ở đây", words: ["Estoy", "aquí."], bank: ["aquí.", "Estoy"], hint: "Use estar because this is location." },
    mastery: { prompt: "Translate: Where is the bathroom?", instruction: "Include Spanish question punctuation if convenient.", accepted: ["dónde está el baño", "¿dónde está el baño?"], answer: "¿Dónde está el baño?", hint: "Dónde + está + el baño." },
    bridgeMastery: { prompt: "Now ask in Vietnamese.", instruction: "Translate “Where is the bathroom?” naturally.", accepted: ["nhà vệ sinh ở đâu", "phòng vệ sinh ở đâu"], answer: "Nhà vệ sinh ở đâu?", hint: "Place nhà vệ sinh before ở đâu." },
    completion: "You can locate yourself and ask for essential orientation without confusing identity with place.",
  },
  {
    id: "es-u2-l1-routines", unit: 2, lesson: 1, unitTitle: "Daily life", title: "Daily rhythms", skill: "present tense routines",
    vocabulary: [
      { word: "hoy", english: "today", vietnamese: "hôm nay", note: "Time words give ordinary statements a living context." },
      { word: "trabajo", english: "I work / work", vietnamese: "tôi làm việc", note: "Trabajo can be a verb or a noun. Position and context reveal its role." },
      { word: "descanso", english: "I rest", vietnamese: "tôi nghỉ ngơi", note: "Rest belongs in practical vocabulary because it belongs in a sustainable life." },
      { word: "después", english: "afterward", vietnamese: "sau đó", note: "Sequence words turn isolated vocabulary into a coherent day." },
      { word: "casa", english: "home / house", vietnamese: "nhà", note: "Casa names a place; en casa often carries the warmer sense of being at home." },
    ],
    recall: { prompt: "What can trabajo mean?", instruction: "Give either of its common roles.", accepted: ["i work", "work", "job", "i work or work"], correct: "Yes. Trabajo can mean “I work” or “work/job.”", hint: "It can be a conjugated verb or a noun." },
    sentence: { target: "Hoy trabajo. Después descanso en casa.", anchor: "Today I work. Afterward I rest at home.", bridge: "Hôm nay tôi làm việc. Sau đó tôi nghỉ ngơi ở nhà.", note: "A day can hold effort and restoration without treating either as an interruption." },
    grammar: {
      focus: "Trabajo", target: { pattern: "time + verb", explanation: "Spanish does not require yo when the -o ending identifies the speaker. Hoy can move for emphasis." },
      anchor: { pattern: "time + I + verb", explanation: "English requires the subject pronoun even when context makes the speaker obvious." },
      bridge: { pattern: "time + pronoun + verb", explanation: "Vietnamese keeps the verb unchanged and relies on explicit pronouns and time words." },
      insight: "Spanish compresses the subject into the verb. English and Vietnamese state it separately, though Vietnamese leaves the verb unchanged.",
      deep: [
        { title: "Regular -ar verbs", principle: "the -o ending marks yo", explanation: "Trabajar becomes trabajo; descansar becomes descanso. The same ending supports many everyday verbs." },
        { title: "Word order", principle: "time can frame the sentence", explanation: "Hoy trabajo and Trabajo hoy are both possible, but the first places the day in focus." },
        { title: "En casa", principle: "Spanish uses en for at home", explanation: "The article is omitted in this familiar expression." },
        { title: "Discourse sequence", principle: "después links lived events", explanation: "Connectors reduce the feeling of memorizing fragments and begin narrative competence." },
      ],
      summary: "The stack makes Spanish conjugation visible while preserving the practical rhythm of the statement across all three languages.",
    },
    transform: { prompt: "Afterward I rest at home.", bridgeReminder: "English: afterward I rest · Vietnamese: sau đó tôi nghỉ ngơi", words: ["Después", "descanso", "en", "casa."], bank: ["casa.", "Después", "en", "descanso"], hint: "Let después establish the sequence." },
    mastery: { prompt: "Translate: Today I work.", instruction: "Write the concise natural Spanish.", accepted: ["hoy trabajo", "yo trabajo hoy", "trabajo hoy"], answer: "Hoy trabajo.", hint: "Hoy can lead; trabajo already contains “I.”" },
    bridgeMastery: { prompt: "Now say it in Vietnamese.", instruction: "Translate “Today I work” naturally.", accepted: ["hôm nay tôi làm việc", "hôm nay mình làm việc", "tôi làm việc hôm nay", "mình làm việc hôm nay"], answer: "Hôm nay tôi làm việc.", hint: "Use hôm nay + tôi or mình + làm việc." },
    completion: "You can now describe a simple daily rhythm with sequence, work, and restoration.",
  },
  {
    id: "es-u2-l2-attention", unit: 2, lesson: 2, unitTitle: "Daily life", title: "Attention and presence", skill: "present progressive",
    vocabulary: [
      { word: "ahora", english: "now", vietnamese: "bây giờ", note: "Ahora brings attention back to the present moment." },
      { word: "estoy", english: "I am", vietnamese: "tôi đang", note: "With a gerund, estoy helps describe an action in progress." },
      { word: "escuchando", english: "listening", vietnamese: "lắng nghe", note: "Escuchar can mean hear or listen; context and intention deepen it." },
      { word: "con", english: "with", vietnamese: "với", note: "Con connects people, tools, and accompaniment." },
      { word: "atención", english: "attention", vietnamese: "sự chú ý", note: "Cognates can lower the burden while a new structure takes focus." },
    ],
    recall: { prompt: "What does estoy escuchando express?", instruction: "Answer naturally in English.", accepted: ["i am listening", "i'm listening", "listening now"], correct: "Yes. It expresses listening in progress.", hint: "Estoy + -ando corresponds to “I am listening.”" },
    sentence: { target: "Ahora estoy escuchando con atención.", anchor: "Now I am listening attentively.", bridge: "Bây giờ tôi đang lắng nghe một cách chú ý.", note: "Listening is not merely waiting for one’s turn to speak. It is a deliberate form of presence." },
    grammar: {
      focus: "estoy escuchando", target: { pattern: "estar + gerund", explanation: "Estoy marks the speaker and escuchando presents the action as unfolding now." },
      anchor: { pattern: "be + -ing", explanation: "English builds the progressive similarly, using a form of be plus the -ing form." },
      bridge: { pattern: "đang + verb", explanation: "Vietnamese places đang before an unchanged verb to mark an ongoing action." },
      insight: "All three languages can foreground an unfolding action, but Spanish and English change auxiliary forms while Vietnamese uses a stable aspect marker.",
      deep: [
        { title: "Gerund formation", principle: "-ar becomes -ando", explanation: "Escuchar becomes escuchando. -er and -ir verbs usually form the gerund with -iendo." },
        { title: "Progressive scope", principle: "use it for an action underway", explanation: "Spanish uses the simple present more broadly than English, so the progressive is chosen when the ongoing quality matters." },
        { title: "Con atención", principle: "a noun can express manner", explanation: "Spanish says “with attention,” where English naturally prefers the adverb “attentively.”" },
        { title: "Contemplative precision", principle: "grammar can train perception", explanation: "The progressive invites the learner to notice what is happening now rather than speaking only in abstractions." },
      ],
      summary: "English offers a close structural anchor; Vietnamese contributes a clean aspect contrast through đang.",
    },
    transform: { prompt: "Now I am listening attentively.", bridgeReminder: "English: am listening · Vietnamese: đang lắng nghe", words: ["Ahora", "estoy", "escuchando", "con", "atención."], bank: ["atención.", "escuchando", "Ahora", "con", "estoy"], hint: "Frame the moment, then build estar + gerund." },
    mastery: { prompt: "Say: I am listening now.", instruction: "Write the natural Spanish sentence.", accepted: ["estoy escuchando ahora", "ahora estoy escuchando", "yo estoy escuchando ahora"], answer: "Ahora estoy escuchando.", hint: "Use estoy + escuchando." },
    bridgeMastery: { prompt: "Now say it in Vietnamese.", instruction: "Translate “I am listening now” naturally.", accepted: ["bây giờ tôi đang lắng nghe", "bây giờ mình đang lắng nghe", "tôi đang lắng nghe bây giờ", "mình đang lắng nghe bây giờ"], answer: "Bây giờ tôi đang lắng nghe.", hint: "Use bây giờ and place đang before lắng nghe." },
    completion: "You can describe an action unfolding now while connecting grammar to deliberate attention.",
  },
  {
    id: "es-u2-l3-feelings", unit: 2, lesson: 3, unitTitle: "Daily life", title: "Emotional nuance", skill: "feeling + cause",
    vocabulary: [
      { word: "me siento", english: "I feel", vietnamese: "tôi cảm thấy", note: "Spanish uses the reflexive sentirse for internal states." },
      { word: "tranquilo", english: "calm", vietnamese: "bình tĩnh", note: "Adjectives agree with the speaker’s grammatical gender when relevant." },
      { word: "cansado", english: "tired", vietnamese: "mệt", note: "Naming a condition precisely is often the first step toward responding wisely." },
      { word: "porque", english: "because", vietnamese: "bởi vì", note: "Porque gives a feeling context rather than leaving it isolated." },
      { word: "necesito", english: "I need", vietnamese: "tôi cần", note: "Necesito transforms awareness into a clear practical statement." },
    ],
    recall: { prompt: "What does me siento express?", instruction: "Answer with its natural English meaning.", accepted: ["i feel", "i am feeling", "i feel myself"], correct: "Yes. Me siento means “I feel.”", hint: "It introduces an internal state: I feel..." },
    sentence: { target: "Me siento cansado porque necesito descansar.", anchor: "I feel tired because I need to rest.", bridge: "Tôi cảm thấy mệt vì tôi cần nghỉ ngơi.", note: "Emotional precision is not indulgence. It helps us respond to reality rather than merely react." },
    grammar: {
      focus: "Me siento", target: { pattern: "sentirse + adjective", explanation: "Me marks the reflexive first person; siento is the changed stem form of sentir." },
      anchor: { pattern: "I feel + adjective", explanation: "English uses a non-reflexive verb and requires the subject pronoun." },
      bridge: { pattern: "pronoun + cảm thấy + adjective", explanation: "Vietnamese keeps cảm thấy stable and states the pronoun explicitly." },
      insight: "Spanish frames feeling reflexively, while English and Vietnamese use straightforward feeling verbs. All can connect state to cause with because/porque/vì.",
      deep: [
        { title: "Sentir and sentirse", principle: "reflexive form emphasizes state", explanation: "Sentir can mean to feel or sense something; sentirse commonly introduces how a person feels." },
        { title: "Stem change", principle: "e changes to ie", explanation: "Sentir becomes siento in the first person, while the infinitive remains sentir." },
        { title: "Agreement", principle: "adjectives reflect the person described", explanation: "A masculine speaker may say cansado; a feminine speaker cansada. Some adjectives do not change." },
        { title: "Porque", principle: "one word gives the reason", explanation: "Porque answers why. The accented por qué is used in direct or indirect questions." },
      ],
      summary: "The native anchor secures the emotional meaning; Vietnamese makes the stable analytic structure visible; Spanish adds reflexivity and agreement.",
    },
    transform: { prompt: "I feel tired.", bridgeReminder: "English: I feel · Vietnamese: tôi cảm thấy", words: ["Me", "siento", "cansado."], bank: ["cansado.", "Me", "siento"], hint: "Use the reflexive opening me siento." },
    mastery: { prompt: "Translate: I need to rest.", instruction: "Write the concise Spanish statement.", accepted: ["necesito descansar", "yo necesito descansar"], answer: "Necesito descansar.", hint: "Necesito is followed directly by the infinitive descansar." },
    bridgeMastery: { prompt: "Now say it in Vietnamese.", instruction: "Translate “I need to rest” naturally.", accepted: ["tôi cần nghỉ ngơi", "mình cần nghỉ ngơi", "tôi cần nghỉ", "mình cần nghỉ"], answer: "Tôi cần nghỉ ngơi.", hint: "Use tôi or mình + cần + nghỉ ngơi." },
    completion: "You can name an internal state, give its cause, and express the need that follows.",
  },
  {
    id: "es-u2-l4-connection", unit: 2, lesson: 4, unitTitle: "Daily life", title: "Human connection", skill: "questions + reciprocal care",
    vocabulary: [
      { word: "cómo", english: "how", vietnamese: "thế nào", note: "The accent marks cómo when it carries an interrogative or exclamatory force." },
      { word: "estás", english: "you are", vietnamese: "bạn đang / bạn thế nào", note: "Estás is the familiar singular form of estar." },
      { word: "bien", english: "well", vietnamese: "khỏe / ổn", note: "Bien is an adverb, but it naturally answers questions about how someone is." },
      { word: "también", english: "also", vietnamese: "cũng", note: "También creates reciprocity: the experience belongs to more than one person." },
      { word: "alegra", english: "makes glad", vietnamese: "làm vui", note: "Me alegra expresses that something brings gladness to the speaker." },
    ],
    recall: { prompt: "Who does estás address?", instruction: "Answer in English.", accepted: ["you", "informal you", "one familiar person", "you informal"], correct: "Yes. Estás addresses one familiar person.", hint: "It is the tú form: you are." },
    sentence: { target: "¿Cómo estás? Me alegra verte.", anchor: "How are you? I’m glad to see you.", bridge: "Bạn thế nào? Mình rất vui được gặp bạn.", note: "A familiar question becomes meaningful when we are willing to receive the real answer." },
    grammar: {
      focus: "Cómo estás", target: { pattern: "question word + estar", explanation: "Cómo asks about manner or condition; estás identifies familiar singular you." },
      anchor: { pattern: "how + are + you", explanation: "English inverts the verb and subject in the direct question." },
      bridge: { pattern: "pronoun + thế nào", explanation: "Vietnamese can ask the condition with a stable phrase and no verb conjugation." },
      insight: "The question is socially familiar across languages, but Spanish places relationship inside the verb choice: estás, está, or están.",
      deep: [
        { title: "Interrogative accent", principle: "cómo carries a written accent", explanation: "The accent distinguishes interrogative cómo from unstressed como in other uses." },
        { title: "Tú form", principle: "estar becomes estás", explanation: "The -ás ending marks familiar singular you in this irregular present-tense verb." },
        { title: "Me alegra", principle: "the experience causes gladness", explanation: "The structure is closer to “seeing you makes me glad” than to English “I am glad.”" },
        { title: "Verte", principle: "infinitive plus object pronoun", explanation: "Ver + te becomes verte: to see you. Spanish can attach object pronouns to infinitives." },
      ],
      summary: "The stack keeps the social intention stable while revealing conjugation, question structure, and an elegant Spanish expression of gladness.",
    },
    transform: { prompt: "How are you?", bridgeReminder: "English: how are you · Vietnamese: bạn thế nào", words: ["¿Cómo", "estás?"], bank: ["estás?", "¿Cómo"], hint: "Use the familiar tú form estás." },
    mastery: { prompt: "Say: I’m glad to see you.", instruction: "Write the natural Spanish expression.", accepted: ["me alegra verte", "me da gusto verte"], answer: "Me alegra verte.", hint: "Me alegra + verte." },
    bridgeMastery: { prompt: "Now say it in Vietnamese.", instruction: "Translate “I’m glad to see you” naturally.", accepted: ["mình rất vui được gặp bạn", "tôi rất vui được gặp bạn", "mình vui khi gặp bạn", "tôi vui khi gặp bạn"], answer: "Mình rất vui được gặp bạn.", hint: "Use mình or tôi + rất vui + được gặp bạn." },
    completion: "You can ask after someone and express genuine gladness at seeing them.",
  },
];

export function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase("es").replace(/[¿?¡!.,]/g, "").replace(/\s+/g, " ");
}
