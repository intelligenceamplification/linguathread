import type { FoundationLanguage } from "./multilingual-foundation";

export type ScriptTaskMode =
  | "visual-recognition"
  | "sound-to-form"
  | "form-to-sound"
  | "component-assembly"
  | "keyboard-reconstruction"
  | "device-dictation"
  | "meaning-retrieval"
  | "unseen-transfer";

export type ScriptStrand = "sound-system" | "forms" | "composition" | "orthography" | "input" | "words" | "sentences" | "transfer";

export type ScriptRequirement = {
  title: string;
  scope: string;
  inventory: readonly string[];
};

const latin = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

/** Release contract: complete finite inventories, plus curriculum-linked open inventories. */
export const scriptRequirements: Record<FoundationLanguage, readonly ScriptRequirement[]> = {
  en: [
    { title: "Letters and sound patterns", scope: "case, common sound-spelling relationships, word boundaries and punctuation", inventory: latin },
    { title: "Reconstruction", scope: "spelling, apostrophes, sentence conventions and unfamiliar-word transfer", inventory: ["capitalization", "apostrophe", "spacing", "punctuation"] },
  ],
  es: [
    { title: "Alphabet and sound", scope: "letter-sound relationships and contrasts including r/rr, g/j and c/z/s", inventory: [...latin, "Ñ"] },
    { title: "Orthography", scope: "stress, acute accents, diaeresis and paired punctuation", inventory: ["á", "é", "í", "ó", "ú", "ü", "¿?", "¡!"] },
  ],
  vi: [
    { title: "Vietnamese letters", scope: "complete vowel and consonant architecture, including vowel-shape contrasts", inventory: ["A", "Ă", "Â", "B", "C", "D", "Đ", "E", "Ê", "G", "H", "I", "K", "L", "M", "N", "O", "Ô", "Ơ", "P", "Q", "R", "S", "T", "U", "Ư", "V", "X", "Y"] },
    { title: "Tone and input", scope: "six tone patterns, mark placement, spelling contrasts, progressive Telex and VNI input", inventory: ["a", "à", "á", "ả", "ã", "ạ", "Telex", "VNI"] },
  ],
  fr: [
    { title: "Letters and sound patterns", scope: "sound-spelling correspondences, silent letters and liaison cues", inventory: latin },
    { title: "Orthography", scope: "accents, cedilla, diaeresis, ligatures, apostrophes and unfamiliar-word transfer", inventory: ["à", "â", "ç", "é", "è", "ê", "ë", "î", "ï", "ô", "ù", "û", "ü", "œ"] },
  ],
  pt: [
    { title: "Letters and sound patterns", scope: "Brazilian Portuguese sound-spelling relationships and nasal vowels", inventory: latin },
    { title: "Orthography", scope: "accent, tilde, cedilla, crasis and unfamiliar-word transfer", inventory: ["á", "â", "ã", "à", "é", "ê", "í", "ó", "ô", "õ", "ú", "ç"] },
  ],
  de: [
    { title: "Letters and sound patterns", scope: "sound-spelling contrasts, vowel length and consonant clusters", inventory: latin },
    { title: "Orthography", scope: "umlauts, ß, noun capitalization, compounds and unfamiliar-word transfer", inventory: ["ä", "ö", "ü", "ß"] },
  ],
  it: [
    { title: "Letters and sound patterns", scope: "sound-spelling contrasts, c/g patterns and consonant length", inventory: latin },
    { title: "Orthography", scope: "accents, apostrophes, doubled consonants and unfamiliar-word transfer", inventory: ["à", "è", "é", "ì", "ò", "ù"] },
  ],
  zh: [
    { title: "Pinyin sound system", scope: "initials, finals, spelling rules, four lexical tones and neutral tone", inventory: ["b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w", "ā", "á", "ǎ", "à", "a"] },
    { title: "Hanzi architecture", scope: "course-linked characters, components, sound, meaning, compounds and input-candidate selection", inventory: ["一", "丨", "丿", "丶", "人", "亻", "口", "日", "月", "木", "水", "氵"] },
  ],
  ja: [
    { title: "Hiragana", scope: "complete basic syllabary, voiced forms, combinations, small っ and sound changes", inventory: [..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん"] },
    { title: "Katakana", scope: "complete basic syllabary, voiced forms, combinations, long vowels and loanword spelling", inventory: [..."アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン"] },
    { title: "Kanji architecture", scope: "curriculum-linked kanji, components, context-sensitive readings, words and sentence transfer", inventory: ["人", "日", "月", "木", "水", "火", "山", "川", "口"] },
  ],
  ko: [
    { title: "Jamo", scope: "complete modern initial consonants and vowels", inventory: [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", ..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"] },
    { title: "Syllable architecture", scope: "block assembly, 받침, final clusters, sound changes and unfamiliar-word construction", inventory: ["initial", "vowel", "final", "받침", "cluster"] },
  ],
  ar: [
    { title: "Arabic letters", scope: "complete 28-letter inventory, names and sound distinctions", inventory: [..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي"] },
    { title: "Joining and vowels", scope: "isolated, initial, medial and final forms; joining classes; short vowels and word reconstruction", inventory: ["isolated", "initial", "medial", "final", "َ", "ِ", "ُ", "ْ", "ّ"] },
  ],
  hi: [
    { title: "Devanagari inventory", scope: "independent vowels, consonants and sound distinctions", inventory: [..."अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह"] },
    { title: "Akshara construction", scope: "inherent vowel, matras, anusvara, chandrabindu, visarga, halant and common conjuncts", inventory: ["ा", "ि", "ी", "ु", "ू", "ृ", "े", "ै", "ो", "ौ", "ं", "ँ", "ः", "्", "क्ष", "त्र", "ज्ञ"] },
  ],
  ru: [
    { title: "Cyrillic alphabet", scope: "complete letters, letter-sound relationships, print recognition and keyboard location", inventory: [..."АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"] },
    { title: "Orthography", scope: "soft and hard signs, vowel reduction cues, spelling and unfamiliar-word transfer", inventory: ["Ь", "Ъ", "Е", "Ё", "И", "Й"] },
  ],
};

export const requiredScriptModes: readonly ScriptTaskMode[] = [
  "visual-recognition", "sound-to-form", "form-to-sound", "component-assembly",
  "keyboard-reconstruction", "device-dictation", "meaning-retrieval", "unseen-transfer",
];
