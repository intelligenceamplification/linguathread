import { scriptCourses } from "../script-courses";
import type { FoundationLanguage } from "../multilingual-foundation";
import type { Course, Exercise, InventorySection, Stage, Unit } from "./model";
import { addArchitecture } from "./architecture";
import { addReading } from "./reading";
import { addFamilyCurriculum } from "./families";
import { writingInventories } from "./inventories";

const sources = {
 cefr: { id: "cefr", title: "Council of Europe: CEFR Companion Volume", url: "https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2020/16809ea0d4" },
 vi: { id: "vi", title: "Michigan State University: Basic Vietnamese", url: "https://openbooks.lib.msu.edu/vietnamese/part/alphabets-and-pronunciation/" },
 ko: { id: "ko", title: "Sungkyunkwan University: Beginning Korean", url: "https://skb.skku.edu/_res/summer/etc/KL_Begin.pdf" },
 zh: { id: "zh", title: "Southern Utah University: Beginning Mandarin", url: "https://my.suu.edu/syllabus/202530/CHIN-1010-01/" },
 ja: { id: "ja", title: "Japan Foundation: JF Standard", url: "https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do" },
 ar: { id: "ar", title: "Michigan State University: Elementary Arabic", url: "https://openbooks.lib.msu.edu/arb101/chapter/chapter-1/" },
 hi: { id: "hi", title: "University of Texas: Hindi teaching materials", url: "https://hindi.la.utexas.edu/resources/textbooks/" },
 ru: { id: "ru", title: "Cornell University: Beginning Russian", url: "https://russian.cornell.edu/russian.web/courses/131-132/131-132_syl_S18.htm" },
};
type Word = [form: string, meaning: string, reading: string];
const words: Record<FoundationLanguage, Word[]> = {
 en: [["cat", "a small domestic feline", "cat"], ["ship", "a large boat", "ship"], ["tree", "a tall plant with a trunk", "tree"], ["book", "bound pages for reading", "book"], ["rain", "water falling from clouds", "rain"], ["light", "illumination", "light"]],
 es: [["casa", "house", "casa"], ["año", "year", "año"], ["perro", "dog", "perro"], ["gente", "people", "gente"], ["queso", "cheese", "queso"], ["agua", "water", "agua"]],
 vi: [["ba", "three", "ba"], ["bà", "grandmother; older woman", "bà"], ["bá", "a count or earl in the title bá tước", "bá"], ["bả", "bait or poison bait", "bả"], ["bã", "residue; grounds", "bã"], ["bạ", "indiscriminately, as in nói bạ", "bạ"], ["cá", "fish", "cá"], ["cà", "eggplant (in names such as cà tím)", "cà"], ["cô", "aunt; female teacher", "cô"], ["cơ", "opportunity, in cơ hội", "cơ"], ["thu", "autumn", "thu"], ["thư", "letter; correspondence", "thư"], ["ăn", "eat", "ăn"], ["ân", "favour or grace, in ân huệ", "ân"], ["đi", "go", "đi"], ["nhà", "house", "nhà"], ["nghe", "hear; listen", "nghe"], ["nghỉ", "rest", "nghỉ"], ["ghế", "chair", "ghế"], ["trường", "school", "trường"], ["nước", "water; country", "nước"], ["người", "person", "người"], ["tiếng", "sound; language in context", "tiếng"], ["Việt", "Vietnamese", "Việt"], ["bạn", "friend; you in suitable contexts", "bạn"]],
 fr: [["chat", "cat", "chat"], ["eau", "water", "eau"], ["rue", "street", "rue"], ["pain", "bread", "pain"], ["livre", "book", "livre"], ["maison", "house", "maison"]],
 pt: [["casa", "house", "casa"], ["pão", "bread", "pão"], ["filho", "son", "filho"], ["vinho", "wine", "vinho"], ["água", "water", "água"], ["rua", "street", "rua"]],
 de: [["Haus", "house", "Haus"], ["Buch", "book", "Buch"], ["Wasser", "water", "Wasser"], ["Schule", "school", "Schule"], ["Zug", "train", "Zug"], ["Tür", "door", "Tür"]],
 it: [["casa", "house", "casa"], ["chiave", "key", "chiave"], ["gelato", "ice cream", "gelato"], ["figlio", "son", "figlio"], ["acqua", "water", "acqua"], ["scuola", "school", "scuola"]],
 zh: [["人", "person", "rén"], ["口", "mouth", "kǒu"], ["水", "water", "shuǐ"], ["木", "wood; tree", "mù"], ["日", "sun; day", "rì"], ["月", "moon; month", "yuè"], ["你", "you", "nǐ"], ["我", "I; me", "wǒ"], ["好", "good", "hǎo"], ["中国", "China", "Zhōngguó"], ["学生", "student", "xuésheng"], ["学校", "school", "xuéxiào"], ["朋友", "friend", "péngyou"], ["今天", "today", "jīntiān"], ["明天", "tomorrow", "míngtiān"], ["喝水", "drink water", "hē shuǐ"]],
 ja: [["あめ", "rain", "ame"], ["いぬ", "dog", "inu"], ["ねこ", "cat", "neko"], ["みず", "water", "mizu"], ["えき", "station", "eki"], ["きって", "postage stamp", "kitte"], ["おちゃ", "tea", "ocha"], ["コーヒー", "coffee", "kōhī"], ["カメラ", "camera", "kamera"], ["ホテル", "hotel", "hoteru"], ["山", "mountain", "yama"], ["川", "river", "kawa"], ["水", "water", "mizu"], ["日本", "Japan", "Nihon"], ["学生", "student", "gakusei"]],
 ko: [["가", "the syllable ga", "ga"], ["고", "the syllable go", "go"], ["나", "I (informal)", "na"], ["우유", "milk", "uyu"], ["한", "the syllable han", "han"], ["산", "mountain", "san"], ["문", "door", "mun"], ["물", "water", "mul"], ["학교", "school", "hakgyo"], ["한국", "Korea", "Hanguk"], ["사람", "person", "saram"], ["책", "book", "chaek"]],
 ar: [["باب", "door", "bāb"], ["بيت", "house", "bayt"], ["نور", "light", "nūr"], ["كِتاب", "book", "kitāb"], ["كُتُب", "books", "kutub"], ["قَلَم", "pen", "qalam"], ["ماء", "water", "māʾ"], ["مدرسة", "school", "madrasa"], ["شمس", "sun", "shams"], ["قمر", "moon", "qamar"]],
 hi: [["घर", "house", "ghar"], ["पानी", "water", "pānī"], ["किताब", "book", "kitāb"], ["नाम", "name", "nām"], ["माँ", "mother", "mā̃"], ["दिन", "day", "din"], ["रात", "night", "rāt"], ["स्कूल", "school", "skūl"], ["नमस्ते", "greeting", "namaste"], ["क्रम", "order; sequence", "kram"]],
 ru: [["дом", "house", "dom"], ["мама", "mother", "máma"], ["вода", "water", "vodá"], ["книга", "book", "kníga"], ["школа", "school", "shkóla"], ["день", "day", "denʹ"], ["чай", "tea", "chay"], ["метро", "metro", "metró"]],
};

function makeCourse(language: FoundationLanguage): Course {
 const legacy = scriptCourses[language];
 const source = sources[language as keyof typeof sources] || sources.cefr;
 const c: Course = { language, version: 5, title: legacy.convention, tracks: [], sources: [sources.cefr, ...(source.id === "cefr" ? [] : [source])], units: [], inventory: [], editorialStatus: "awaiting-language-review" };
 const add = (id: string, title: string, track: string, stage: Stage, explanation: string, items: Exercise[], example = "", meaning = "", prerequisites?: string[], inventorySection?: string) => {
  const previous = c.units.filter(u => u.track === track).at(-1);
  const level: Unit["level"] = stage === "forms" || stage === "contrasts" || stage === "composition" ? "Foundation" : stage === "decoding" || stage === "words" ? "A1" : stage === "sentences" ? "A2" : "B1";
  const unit: Unit = { id: `${language}-literacy-${id}`, title, track, stage, level, prerequisites: prerequisites || (previous ? [previous.id] : []), objective: title, explanation, forms: [...new Set(items.filter(e => e.kind !== "audio-choice").map(e => e.answer))], example, meaning, exercises: items, sourceIds: [source.id], courseTerms: example ? [example] : [], inventorySection };
  c.units.push(unit); return unit;
 };
 const trackNames: Record<string, string> = { letters: "Letters", alphabet: "Alphabet", conventions: "Conventions", "tone-orthography": "Tones and marks", syllables: "Syllable architecture", pinyin: "Pinyin", hanzi: "Hanzi", hiragana: "Hiragana", katakana: "Katakana", "kana-composition": "Kana combinations", kanji: "Kanji", jamo: "Jamo", blocks: "Syllable blocks", vocalization: "Vowel signs", devanagari: "Devanagari", composition: "Composition" };
 for (const group of writingInventories[language]) {
  if (!c.tracks.some(track => track.id === group.track)) c.tracks.push({ id: group.track, title: trackNames[group.track] || group.title, description: group.description });
  const published: InventorySection = { id: group.id, track: group.track, title: group.title, description: group.description, items: [] };
  for (let at = 0; at < group.items.length; at += 4) {
   const slice = group.items.slice(at, at + 4);
   const unitId = `${language}-literacy-inventory-${group.id}-${at}`;
   const exercises: Exercise[] = slice.flatMap((item, offset) => {
    const pool = group.items.filter(candidate => candidate.form !== item.form);
    const choices = [item.form, pool[(at + offset) % pool.length]?.form, pool[(at + offset + 1) % pool.length]?.form].filter(Boolean);
    const skill = `${language}:inventory:${group.id}:${item.form}`;
    const explanation = `${item.form} is ${item.label}. Learn the written form, its reading or sound, and its role inside ${group.title.toLocaleLowerCase()}. Recognition, listening, and independent input remain separate evidence.`;
    published.items.push({ id: item.id || `${group.id}-${at + offset}`, form: item.form, label: item.label, reading: item.reading || item.label, skill, unitId });
    return [
     { id: `${skill}:identify`, skill, direction: "recognize", kind: "choice", prompt: `Choose ${item.label}.`, answer: item.form, choices, explanation, reading: item.reading || item.label },
     { id: `${skill}:identify-context`, skill, direction: "recognize", kind: "choice", prompt: `Find the form whose reading or role is ${item.reading || item.label}.`, answer: item.form, choices: [...choices].reverse(), explanation, reading: item.reading || item.label },
     { id: `${skill}:sound-form`, skill, direction: "sound-form", kind: "choice", prompt: "Listen, then choose the written form.", audio: item.audio || item.form.replace(/^-/, ""), answer: item.form, choices, explanation, reading: item.reading || item.label },
     { id: `${skill}:sound-form-retrieval`, skill, direction: "sound-form", kind: "input", prompt: "Listen again in a separate task, then enter the form.", audio: item.audio || item.form.replace(/^-/, ""), answer: item.form.replace(/^-/, ""), accepted: item.form.startsWith("-") ? [item.form] : undefined, explanation, reading: item.reading || item.label },
     { id: `${skill}:form-sound`, skill, direction: "form-sound", kind: "audio-choice", prompt: "Read the form, then choose its matching audio.", cue: item.form, answer: item.form, choices, choiceAudio: Object.fromEntries(group.items.map(candidate => [candidate.form, candidate.audio || candidate.form])), explanation, reading: item.reading || item.label },
     { id: `${skill}:form-sound-retrieval`, skill, direction: "form-sound", kind: "audio-choice", prompt: "Retrieve the sound from the form, then confirm it among the audio choices.", cue: item.form, answer: item.form, choices: [...choices].reverse(), choiceAudio: Object.fromEntries(group.items.map(candidate => [candidate.form, candidate.audio || candidate.form])), explanation, reading: item.reading || item.label },
     { id: `${skill}:input`, skill, direction: "input", kind: "input", prompt: `Enter ${item.label} exactly.`, answer: item.form.replace(/^-/, ""), accepted: item.form.startsWith("-") ? [item.form] : undefined, explanation, reading: item.reading || item.label },
     { id: `${skill}:input-retrieval`, skill, direction: "input", kind: "input", prompt: `Reconstruct the form read ${item.reading || item.label}.`, answer: item.form.replace(/^-/, ""), accepted: item.form.startsWith("-") ? [item.form] : undefined, explanation, reading: item.reading || item.label },
    ];
   });
   add(`inventory-${group.id}-${at}`, `${group.title} · ${slice.map(item => item.form).join("  ")}`, group.track, "forms", group.description, exercises, "", "", undefined, group.id);
  }
  c.inventory.push(published);
 }
 c.tracks.push({ id: "architecture", title: "How the script is built", description: "Contrasts, composition and spelling conventions." });
 for (const lesson of legacy.lessons) {
  const skill = `${language}:architecture:${lesson.id}`;
  const exercises: Exercise[] = [
   { id: `${skill}:choose`, skill, direction: "recognize", kind: "choice", prompt: lesson.prompt.replace(/^(Write|Enter|Type|Compose)/, "Choose"), answer: lesson.answer, choices: [lesson.answer, ...lesson.alternatives], explanation: lesson.explanation },
   { id: `${skill}:choose-transfer`, skill, direction: "recognize", kind: "choice", prompt: "Recognize the same principle in a new ordering.", answer: lesson.answer, choices: [...lesson.alternatives, lesson.answer], explanation: lesson.explanation, transfer: true },
   { id: `${skill}:input`, skill, direction: "input", kind: "input", prompt: lesson.prompt, answer: lesson.answer, explanation: lesson.explanation },
   { id: `${skill}:input-retrieval`, skill, direction: "input", kind: "input", prompt: `${lesson.prompt} Reconstruct it again without the model.`, answer: lesson.answer, explanation: lesson.explanation },
  ];
  add(lesson.id, lesson.title, "architecture", "contrasts", lesson.explanation, exercises, lesson.example, lesson.meaning);
 }
 c.tracks.push({ id: language === "zh" ? "hanzi" : language === "ja" ? "words-kanji" : "words", title: language === "zh" ? "Hanzi and words" : language === "ja" ? "Words and kanji" : "Read and reconstruct words", description: "Connect written words with sound, meaning and independent input." });
 const wordTrack = c.tracks.at(-1)!.id;
 const vocabulary = words[language];
 vocabulary.forEach(([form, meaning, reading], i) => {
  const skill = `${language}:word:${form}`;
  const alternatives = [vocabulary[(i + 1) % vocabulary.length][0], vocabulary[(i + 2) % vocabulary.length][0]];
  const explanation = `Read ${form} as ${reading}. Here it means ${meaning}. Recognizing the form, understanding it, and entering it independently are separate skills.`;
  const exercises: Exercise[] = [
   { id: `${skill}:meaning`, skill, direction: "meaning", kind: "choice", prompt: "Read the word and choose its meaning.", cue: form, answer: meaning, choices: [meaning, vocabulary[(i + 1) % vocabulary.length][1], vocabulary[(i + 2) % vocabulary.length][1]], explanation, reading },
   { id: `${skill}:meaning-2`, skill, direction: "meaning", kind: "choice", prompt: "Recover the meaning of this written form without transliteration.", cue: form, answer: meaning, choices: [vocabulary[(i + 2) % vocabulary.length][1], meaning, vocabulary[(i + 1) % vocabulary.length][1]], explanation },
   { id: `${skill}:listen`, skill, direction: "sound-form", kind: "choice", prompt: "Listen, then choose the written word.", audio: form, answer: form, choices: [form, ...alternatives], explanation },
   { id: `${skill}:sound`, skill, direction: "form-sound", kind: "audio-choice", prompt: "Read the word. Listen to the options and choose the matching pronunciation.", cue: form, answer: form, choices: [form, ...alternatives], explanation },
   { id: `${skill}:sound-2`, skill, direction: "form-sound", kind: "audio-choice", prompt: "Retrieve the word’s pronunciation, then confirm it in a different ordering.", cue: form, answer: form, choices: [...alternatives, form], explanation },
   { id: `${skill}:write`, skill, direction: "input", kind: "input", prompt: `Enter the word meaning “${meaning}”.`, answer: form, explanation },
   { id: `${skill}:write-2`, skill, direction: "input", kind: "input", prompt: `Enter the written form read “${reading}”.`, answer: form, explanation },
   { id: `${skill}:heard-input`, skill, direction: "sound-form", kind: "input", prompt: "Listen and enter the written word.", audio: form, answer: form, explanation },
  ];
  add(`word-${i}`, form, wordTrack, "words", explanation, exercises, form, meaning);
 });
 addArchitecture(c);
 addFamilyCurriculum(c);
 if (language === "zh") {
  const hanzi = c.units.filter(unit => unit.track === "hanzi").sort((a, b) => {
   const rank = (unit: Unit) => unit.id.includes("hanzi-component") || unit.id.includes("hanzi-water") ? 0 : unit.stage === "words" && [...unit.title].length === 1 ? 1 : unit.id.includes("literacy-word") ? 2 : 3;
   return rank(a) - rank(b);
  });
  const other = c.units.filter(unit => unit.track !== "hanzi");
  hanzi.forEach((unit, index) => { unit.prerequisites = index ? [hanzi[index - 1].id] : []; });
  c.units = [...other, ...hanzi];
 }
 addReading(c);
 if (language === "vi") {
  const toneUnits: Record<string, string> = { "\u0300": "huyền", "\u0301": "sắc", "\u0309": "hỏi", "\u0303": "ngã", "\u0323": "nặng" };
  for (const unit of c.units.filter(u => u.stage !== "forms")) {
   const written = unit.forms.join("").toLocaleLowerCase("vi");
   const letters = [...written.normalize("NFD").replace(/[\u0300\u0301\u0309\u0303\u0323]/g, "").normalize("NFC")];
   const foundationIds = c.units.filter(u => u.stage === "forms" && u.forms.some(form => letters.includes(form))).map(u => u.id);
   const toneIds = unit.stage === "words" ? Object.entries(toneUnits).filter(([mark]) => written.normalize("NFD").includes(mark)).map(([, name]) => `vi-architecture-tone-${name}`) : [];
   unit.prerequisites = [...new Set([...unit.prerequisites, ...foundationIds, ...toneIds])];
  }
 }
 return c;
}

export const writingCourses = Object.fromEntries((Object.keys(scriptCourses) as FoundationLanguage[]).map(language => [language, makeCourse(language)])) as Record<FoundationLanguage, Course>;
