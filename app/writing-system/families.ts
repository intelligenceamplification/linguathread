import type { Course, Exercise } from "./model";

type Example = { prompt: string; answer: string; alternatives: string[]; parts?: string[]; mode?: "hangul"; audio?: string };
type Lesson = { id: string; title: string; track: string; explanation: string; examples: [Example, Example]; source?: string };

const lessons: Partial<Record<Course["language"], Lesson[]>> = {
 vi: [
  { id: "tone-contrast-level-rising", title: "Unmarked and rising tone in complete syllables", track: "architecture", explanation: "Tone belongs to the whole Vietnamese syllable. Compare the unmarked ngang pattern with sắc while retaining the same consonant and vowel sequence.", examples: [
   { prompt: "Enter ba with no tone mark.", answer: "ba", alternatives: ["bá", "bà"], audio: "ba" },
   { prompt: "Enter bá with the sắc mark.", answer: "bá", alternatives: ["ba", "bả"], audio: "bá" },
  ] },
  { id: "tone-contrast-falling-curved", title: "Falling and contour tones remain distinct", track: "architecture", explanation: "Huyền, hỏi, ngã and nặng use different written marks. Regional pronunciation varies, but the spelling distinction remains stable.", examples: [
   { prompt: "Enter bà with the huyền mark.", answer: "bà", alternatives: ["bả", "bạ"], audio: "bà" },
   { prompt: "Enter bả with the hỏi mark.", answer: "bả", alternatives: ["bà", "bã"], audio: "bả" },
  ] },
  { id: "tone-on-shaped-vowels", title: "Tone and vowel identity are separate layers", track: "architecture", explanation: "The circumflex, breve or horn identifies the vowel; the tone mark adds another layer. Both must remain visible in words such as tiếng and nước.", examples: [
   { prompt: "Build tiếng from ti, ê with sắc, and ng.", answer: "tiếng", alternatives: ["tiêng", "tiéng"], parts: ["ti", "ế", "ng"], audio: "tiếng" },
   { prompt: "Build nước from n, ơ with sắc, and c.", answer: "nước", alternatives: ["nuớc", "nươc"], parts: ["n", "ướ", "c"], audio: "nước" },
  ] },
  { id: "final-contrasts", title: "Final consonants close the syllable", track: "architecture", explanation: "Vietnamese permits a restricted set of syllable-final spellings. Final n/ng and t/c/p/m participate in contrasts and interact with tone categories.", examples: [
   { prompt: "Enter bạn, keeping final n.", answer: "bạn", alternatives: ["bạ", "bạng"], audio: "bạn" },
   { prompt: "Enter học, keeping final c.", answer: "học", alternatives: ["họ", "họt"], audio: "học" },
  ] },
 ],
 ko: [
  { id: "decode-open-blocks", title: "Decode new open syllable blocks", track: "architecture", explanation: "A block begins with an initial and a vowel. Its geometry follows the vowel, while keyboard input remains initial then vowel.", examples: [
   { prompt: "Compose ㄷ + ㅏ.", answer: "다", alternatives: ["더", "도"], parts: ["ㄷ", "ㅏ"], mode: "hangul", audio: "다" },
   { prompt: "Compose ㅂ + ㅜ.", answer: "부", alternatives: ["보", "바"], parts: ["ㅂ", "ㅜ"], mode: "hangul", audio: "부" },
  ] },
  { id: "decode-batchim", title: "Decode unfamiliar blocks with batchim", track: "architecture", explanation: "Add a final jamo after the initial and vowel. The final occupies the bottom of the square block and closes the syllable.", examples: [
   { prompt: "Compose ㅁ + ㅜ + ㄴ.", answer: "문", alternatives: ["무", "뭄"], parts: ["ㅁ", "ㅜ", "ㄴ"], mode: "hangul", audio: "문" },
   { prompt: "Compose ㅁ + ㅜ + ㄹ.", answer: "물", alternatives: ["무", "문"], parts: ["ㅁ", "ㅜ", "ㄹ"], mode: "hangul", audio: "물" },
  ] },
  { id: "decode-compound-medials", title: "Compound vowels remain one medial", track: "architecture", explanation: "Compound vowels such as ㅘ and ㅝ fill the medial position as a unit. Their internal components explain their shape but do not create extra syllables.", examples: [
   { prompt: "Compose ㄱ + ㅘ.", answer: "과", alternatives: ["고", "가"], parts: ["ㄱ", "ㅘ"], mode: "hangul", audio: "과" },
   { prompt: "Compose ㅇ + ㅝ + ㄴ.", answer: "원", alternatives: ["워", "완"], parts: ["ㅇ", "ㅝ", "ㄴ"], mode: "hangul", audio: "원" },
  ] },
 ],
 zh: [
  { id: "tone-series", title: "One syllable, five tone spellings", track: "pinyin", explanation: "Pinyin tone marks preserve lexical contrasts. Neutral tone is unmarked; the other four tones use distinct marks on the vowel nucleus.", examples: [
   { prompt: "Enter mā with first tone.", answer: "mā", alternatives: ["má", "mǎ"] },
   { prompt: "Enter mà with fourth tone.", answer: "mà", alternatives: ["má", "ma"] },
  ] },
  { id: "initial-final-decoding", title: "Decode legal initial-final combinations", track: "pinyin", explanation: "An initial and final form one syllable. Read zh, ch and sh as Mandarin initials and keep them distinct from z, c and s.", examples: [
   { prompt: "Build zhōng from initial zh and final ong.", answer: "zhōng", alternatives: ["zōng", "chōng"], parts: ["zh", "ōng"] },
   { prompt: "Build xué from initial x and final ue.", answer: "xué", alternatives: ["shué", "xúe"], parts: ["x", "ué"] },
  ] },
  { id: "hanzi-form-sound-meaning", title: "Characters connect form, sound and meaning", track: "hanzi", explanation: "Character recognition, pronunciation and meaning are separate retrieval directions. Practise each character inside useful words rather than as an arbitrary count.", examples: [
   { prompt: "Enter the character read rén and meaning person.", answer: "人", alternatives: ["口", "木"], audio: "人" },
   { prompt: "Enter the character read shuǐ and meaning water.", answer: "水", alternatives: ["木", "火"], audio: "水" },
  ] },
  { id: "hanzi-compound-transfer", title: "Known characters recombine into useful words", track: "hanzi", explanation: "A character's contribution becomes clearer across compounds. Reconstruct the whole word in conventional order and retrieve its pronunciation and meaning separately.", examples: [
   { prompt: "Build 学生, student.", answer: "学生", alternatives: ["生学", "学校"], parts: ["学", "生"], audio: "学生" },
   { prompt: "Build 学校, school.", answer: "学校", alternatives: ["校学", "学生"], parts: ["学", "校"], audio: "学校" },
  ] },
 ],
 ja: [
  { id: "voiced-kana", title: "Voiced kana form systematic rows", track: "hiragana", explanation: "Dakuten transforms whole consonant rows. Learn the relationship and then decode the resulting kana directly, without routing through roman letters.", examples: [
   { prompt: "Compose か with dakuten.", answer: "が", alternatives: ["か", "ぱ"], parts: ["か", "\u3099"], audio: "が" },
   { prompt: "Compose さ with dakuten.", answer: "ざ", alternatives: ["さ", "だ"], parts: ["さ", "\u3099"], audio: "ざ" },
  ] },
  { id: "contracted-kana", title: "Small kana contract two mora spellings", track: "hiragana", explanation: "Eligible i-row kana combine with small ゃ, ゅ or ょ. The small size distinguishes a contracted sound from two full kana.", examples: [
   { prompt: "Build きゃ, kya.", answer: "きゃ", alternatives: ["きや", "きゅ"], parts: ["き", "ゃ"], audio: "きゃ" },
   { prompt: "Build しゅ, shu.", answer: "しゅ", alternatives: ["しゆ", "しょ"], parts: ["し", "ゅ"], audio: "しゅ" },
  ] },
  { id: "katakana-contrasts", title: "Katakana carries the same sound inventory", track: "katakana", explanation: "Katakana represents Japanese morae with a second set of forms. Read it directly in words, including voiced forms and the long-vowel mark.", examples: [
   { prompt: "Build カメラ, camera.", answer: "カメラ", alternatives: ["カヌラ", "かめら"], parts: ["カ", "メ", "ラ"], audio: "カメラ" },
   { prompt: "Build ホテル, hotel.", answer: "ホテル", alternatives: ["ホテレ", "ほてる"], parts: ["ホ", "テ", "ル"], audio: "ホテル" },
  ] },
  { id: "kanji-in-words", title: "Kanji mastery is word-specific", track: "words-kanji", explanation: "Kanji readings and meanings are established in real vocabulary. The same character may be read differently elsewhere, so evidence belongs to the character-word relationship.", examples: [
   { prompt: "Build 日本, Japan.", answer: "日本", alternatives: ["本日", "日木"], parts: ["日", "本"], audio: "日本" },
   { prompt: "Build 学生, student.", answer: "学生", alternatives: ["生学", "学校"], parts: ["学", "生"], audio: "学生" },
  ] },
 ],
 ar: [
  { id: "joining-across-words", title: "Joining behavior is read inside words", track: "architecture", explanation: "Arabic letters share a baseline and change contextual shape. The underlying characters remain the same; the renderer joins eligible neighbors.", examples: [
   { prompt: "Build كتب in right-to-left reading order.", answer: "كتب", alternatives: ["كبت", "تكتب"], parts: ["ك", "ت", "ب"], audio: "كتب" },
   { prompt: "Build بيت in right-to-left reading order.", answer: "بيت", alternatives: ["بتي", "تيب"], parts: ["ب", "ي", "ت"], audio: "بيت" },
  ] },
  { id: "nonjoining-boundaries", title: "Non-joiners create visible internal boundaries", track: "architecture", explanation: "ا د ذ ر ز و connect to a preceding eligible letter but not to the following letter. The visible break does not create a space or a new word.", examples: [
   { prompt: "Build نور without spaces.", answer: "نور", alternatives: ["ن ور", "نور "], parts: ["ن", "و", "ر"], audio: "نور" },
   { prompt: "Build ورد without spaces.", answer: "ورد", alternatives: ["و رد", "ور د"], parts: ["و", "ر", "د"], audio: "ورد" },
  ] },
  { id: "vowelled-decoding", title: "Vowel marks support early decoding", track: "architecture", explanation: "Early texts can mark short vowels; mature texts often omit them. Read marked forms accurately, then learn to recover unmarked words through vocabulary and context.", examples: [
   { prompt: "Build كِتاب with kasra after ك.", answer: "كِتاب", alternatives: ["كَتاب", "كُتاب"], parts: ["ك", "ِ", "ت", "ا", "ب"], audio: "كتاب" },
   { prompt: "Build قَلَم with fatha on ق and ل.", answer: "قَلَم", alternatives: ["قِلِم", "قُلُم"], parts: ["ق", "َ", "ل", "َ", "م"], audio: "قلم" },
  ] },
 ],
 hi: [
  { id: "matra-a-i", title: "Independent vowels become dependent signs", track: "architecture", explanation: "After a consonant, vowel quality is usually represented by a dependent sign. The sign is entered after the consonant even when it renders to the left.", examples: [
   { prompt: "Compose क with the long-a sign ा.", answer: "का", alternatives: ["कआ", "कि"], parts: ["क", "ा"], audio: "का" },
   { prompt: "Compose क with the short-i sign ि.", answer: "कि", alternatives: ["िक", "की"], parts: ["क", "ि"], audio: "कि" },
  ] },
  { id: "matra-u-e", title: "Vowel signs occupy several visual positions", track: "architecture", explanation: "Dependent vowel signs may appear above, below, before or after the consonant. Logical input order remains consonant followed by sign.", examples: [
   { prompt: "Compose क with the long-u sign ू.", answer: "कू", alternatives: ["कु", "कऊ"], parts: ["क", "ू"], audio: "कू" },
   { prompt: "Compose क with the e sign े.", answer: "के", alternatives: ["कै", "कए"], parts: ["क", "े"], audio: "के" },
  ] },
  { id: "matra-ai-o-au", title: "More vowel signs complete the nucleus inventory", track: "architecture", explanation: "ऐ, ओ and औ have dependent forms used after consonants. Decode the whole akshara, then reconstruct it in logical order.", examples: [
   { prompt: "Compose क with the ai sign ै.", answer: "कै", alternatives: ["के", "कऐ"], parts: ["क", "ै"], audio: "कै" },
   { prompt: "Compose क with the au sign ौ.", answer: "कौ", alternatives: ["को", "कऔ"], parts: ["क", "ौ"], audio: "कौ" },
  ] },
  { id: "conjunct-decoding", title: "Consonants combine through virama", track: "architecture", explanation: "The virama suppresses an inherent vowel and permits a consonant cluster. Learn frequent conjuncts inside words and retain their underlying order in input.", examples: [
   { prompt: "Build क्रम in logical order.", answer: "क्रम", alternatives: ["करम", "कर्म"], parts: ["क", "्", "र", "म"], audio: "क्रम" },
   { prompt: "Build स्कूल in logical order.", answer: "स्कूल", alternatives: ["सकूल", "स्कुल"], parts: ["स", "्", "क", "ू", "ल"], audio: "स्कूल" },
  ] },
 ],
};

function exercises(language: Course["language"], id: string, explanation: string, examples: [Example, Example]): Exercise[] {
 return examples.flatMap((example, index) => {
  const stem = `${language}:family:${id}:${index}`;
  return [
   { id: `${stem}:recognize`, skill: `${language}:family:${id}`, direction: "recognize", kind: "choice", prompt: example.prompt.replace(/^(Enter|Compose|Build)/, "Choose"), answer: example.answer, choices: [example.answer, ...example.alternatives], explanation },
   ...(example.parts ? [{ id: `${stem}:compose`, skill: `${language}:family:${id}`, direction: "compose" as const, kind: "compose" as const, prompt: example.prompt, answer: example.answer, components: example.parts, composition: example.mode || "sequence" as const, explanation }] : []),
   { id: `${stem}:input`, skill: `${language}:family:${id}`, direction: "input", kind: "input", prompt: example.prompt.replace(/^(Choose|Compose|Build)/, "Enter"), answer: example.answer, explanation },
   ...(example.audio ? [{ id: `${stem}:audio`, skill: `${language}:family:${id}`, direction: "sound-form" as const, kind: "choice" as const, prompt: "Listen, then choose the matching written form.", audio: example.audio, answer: example.answer, choices: [example.answer, ...example.alternatives], explanation }] : []),
  ];
 });
}

export function addFamilyCurriculum(course: Course) {
 const previous = new Map(course.tracks.map(track => [track.id, course.units.filter(unit => unit.track === track.id).at(-1)?.id]));
 for (const lesson of lessons[course.language] || []) {
  const id = `${course.language}-family-${lesson.id}`;
  const prior = previous.get(lesson.track);
  const stage = lesson.track.includes("hanzi") || lesson.track.includes("kanji") ? "words" : "decoding";
  course.units.push({ id, title: lesson.title, track: lesson.track, stage, level: "A1", prerequisites: prior ? [prior] : [], objective: lesson.title, explanation: lesson.explanation, forms: lesson.examples.map(example => example.answer), example: lesson.examples[0].answer, meaning: "", exercises: exercises(course.language, lesson.id, lesson.explanation, lesson.examples), sourceIds: [lesson.source || course.sources.at(-1)!.id], courseTerms: lesson.examples.map(example => example.answer) });
  previous.set(lesson.track, id);
 }
}
