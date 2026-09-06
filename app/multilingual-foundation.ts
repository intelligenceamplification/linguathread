/** Draft foundation content. Not editorially approved; never a fallback for the published course. */
export const foundationLanguages = [
  { id: "en", name: "English", native: "English" },
  { id: "es", name: "Spanish", native: "Español" },
  { id: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { id: "fr", name: "French", native: "Français" },
  { id: "pt", name: "Portuguese", native: "Português" },
  { id: "de", name: "German", native: "Deutsch" },
  { id: "it", name: "Italian", native: "Italiano" },
  { id: "zh", name: "Mandarin Chinese", native: "中文" },
  { id: "ja", name: "Japanese", native: "日本語" },
  { id: "ko", name: "Korean", native: "한국어" },
  { id: "ar", name: "Arabic", native: "العربية" },
  { id: "hi", name: "Hindi", native: "हिन्दी" },
  { id: "ru", name: "Russian", native: "Русский" },
] as const;
export type FoundationLanguage = typeof foundationLanguages[number]["id"];
export type FoundationStack = { anchor: FoundationLanguage; bridge: FoundationLanguage; target: FoundationLanguage };
export const foundationObjectives = ["greeting", "name", "origin", "thanks"] as const;
export type FoundationObjective = typeof foundationObjectives[number];
type Realization = { text: string; accepted?: string[] };
export const foundationContent: Record<FoundationLanguage, Record<FoundationObjective, Realization>> = {
  en: { greeting: { text: "Hello." }, name: { text: "My name is Alex.", accepted: ["I'm Alex.", "I am Alex."] }, origin: { text: "I am from Canada.", accepted: ["I'm from Canada."] }, thanks: { text: "Thank you.", accepted: ["Thanks."] } },
  es: { greeting: { text: "Hola." }, name: { text: "Me llamo Alex.", accepted: ["Mi nombre es Alex."] }, origin: { text: "Soy de Canadá.", accepted: ["Yo soy de Canadá."] }, thanks: { text: "Gracias." } },
  vi: { greeting: { text: "Xin chào." }, name: { text: "Tôi tên là Alex.", accepted: ["Mình tên là Alex.", "Tên tôi là Alex."] }, origin: { text: "Tôi đến từ Canada.", accepted: ["Mình đến từ Canada."] }, thanks: { text: "Cảm ơn.", accepted: ["Cảm ơn bạn."] } },
  fr: { greeting: { text: "Bonjour." }, name: { text: "Je m’appelle Alex.", accepted: ["Mon nom est Alex."] }, origin: { text: "Je viens du Canada." }, thanks: { text: "Merci." } },
  pt: { greeting: { text: "Olá." }, name: { text: "Meu nome é Alex.", accepted: ["O meu nome é Alex.", "Chamo-me Alex."] }, origin: { text: "Sou do Canadá.", accepted: ["Eu sou do Canadá."] }, thanks: { text: "Obrigado.", accepted: ["Obrigada."] } },
  de: { greeting: { text: "Hallo." }, name: { text: "Ich heiße Alex.", accepted: ["Mein Name ist Alex.", "Ich heisse Alex."] }, origin: { text: "Ich komme aus Kanada." }, thanks: { text: "Danke.", accepted: ["Danke schön."] } },
  it: { greeting: { text: "Ciao." }, name: { text: "Mi chiamo Alex.", accepted: ["Il mio nome è Alex."] }, origin: { text: "Vengo dal Canada.", accepted: ["Io vengo dal Canada."] }, thanks: { text: "Grazie." } },
  zh: { greeting: { text: "你好。" }, name: { text: "我叫亚历克斯。", accepted: ["我叫亞歷克斯。", "我叫Alex。"] }, origin: { text: "我来自加拿大。", accepted: ["我來自加拿大。"] }, thanks: { text: "谢谢。", accepted: ["謝謝。"] } },
  ja: { greeting: { text: "こんにちは。" }, name: { text: "アレックスです。", accepted: ["私はアレックスです。"] }, origin: { text: "カナダ出身です。", accepted: ["私はカナダ出身です。"] }, thanks: { text: "ありがとうございます。" } },
  ko: { greeting: { text: "안녕하세요." }, name: { text: "제 이름은 알렉스입니다.", accepted: ["저는 알렉스입니다."] }, origin: { text: "저는 캐나다 출신입니다." }, thanks: { text: "감사합니다.", accepted: ["고맙습니다."] } },
  ar: { greeting: { text: "مرحبًا.", accepted: ["مرحبا."] }, name: { text: "اسمي أليكس." }, origin: { text: "أنا من كندا." }, thanks: { text: "شكرًا.", accepted: ["شكرا."] } },
  hi: { greeting: { text: "नमस्ते।" }, name: { text: "मेरा नाम एलेक्स है।" }, origin: { text: "मैं कनाडा से हूँ।" }, thanks: { text: "धन्यवाद।" } },
  ru: { greeting: { text: "Здравствуйте." }, name: { text: "Меня зовут Алекс." }, origin: { text: "Я из Канады." }, thanks: { text: "Спасибо." } },
};

// Anchor-language instructions are separate from target-language realizations.
// Order: study, write, check, correct, retry, reveal, continue, reverse, complete, review.
export const foundationInstructions: Record<FoundationLanguage, readonly string[]> = {
 en: ["Read and compare", "Write the meaning in", "Check", "Correct.", "Try again, or reveal the model.", "Reveal model", "Continue", "Recall in your first language", "Foundation unit complete", "Review the unit"],
 es: ["Lee y compara", "Escribe el significado en", "Comprobar", "Correcto.", "Inténtalo de nuevo o muestra el modelo.", "Mostrar modelo", "Continuar", "Recuerda en tu lengua materna", "Unidad básica completada", "Repasar la unidad"],
 vi: ["Đọc và so sánh", "Viết ý nghĩa bằng", "Kiểm tra", "Đúng rồi.", "Thử lại hoặc xem câu mẫu.", "Xem câu mẫu", "Tiếp tục", "Nhớ lại bằng tiếng mẹ đẻ", "Đã hoàn thành bài học nền tảng", "Ôn lại bài học"],
 fr: ["Lisez et comparez", "Exprimez le sens en", "Vérifier", "Correct.", "Réessayez ou affichez le modèle.", "Afficher le modèle", "Continuer", "Rappelez le sens dans votre langue maternelle", "Unité de base terminée", "Réviser l’unité"],
 pt: ["Leia e compare", "Escreva o significado em", "Verificar", "Correto.", "Tente novamente ou veja o modelo.", "Mostrar modelo", "Continuar", "Recorde na sua língua materna", "Unidade básica concluída", "Revisar a unidade"],
 de: ["Lesen und vergleichen", "Schreibe die Bedeutung auf", "Prüfen", "Richtig.", "Versuche es erneut oder zeige die Vorlage.", "Vorlage zeigen", "Weiter", "Erinnere dich in deiner Muttersprache", "Grundeinheit abgeschlossen", "Einheit wiederholen"],
 it: ["Leggi e confronta", "Scrivi il significato in", "Verifica", "Corretto.", "Riprova o mostra il modello.", "Mostra modello", "Continua", "Ricorda nella tua lingua madre", "Unità di base completata", "Ripassa l’unità"],
 zh: ["阅读并比较", "请用以下语言表达", "检查", "正确。", "请重试，或查看示例。", "查看示例", "继续", "用母语回忆意思", "基础单元已完成", "复习本单元"],
 ja: ["読んで比べる", "次の言語で意味を書いてください", "確認", "正解です。", "もう一度試すか、例文を確認してください。", "例文を見る", "続ける", "母語で意味を思い出す", "基礎ユニット完了", "ユニットを復習する"],
 ko: ["읽고 비교하세요", "다음 언어로 뜻을 쓰세요", "확인", "정답입니다.", "다시 시도하거나 예문을 확인하세요.", "예문 보기", "계속", "모국어로 뜻을 떠올리세요", "기초 단원 완료", "단원 복습"],
 ar: ["اقرأ وقارن", "اكتب المعنى باللغة التالية", "تحقق", "صحيح.", "حاول مرة أخرى أو اعرض النموذج.", "عرض النموذج", "متابعة", "تذكّر المعنى بلغتك الأم", "اكتملت الوحدة الأساسية", "مراجعة الوحدة"],
 hi: ["पढ़ें और तुलना करें", "इस भाषा में अर्थ लिखें", "जाँचें", "सही है।", "फिर कोशिश करें या उदाहरण देखें।", "उदाहरण देखें", "आगे बढ़ें", "अपनी मातृभाषा में अर्थ याद करें", "बुनियादी इकाई पूरी हुई", "इकाई दोहराएँ"],
 ru: ["Прочитайте и сравните", "Передайте смысл на языке", "Проверить", "Верно.", "Попробуйте ещё раз или посмотрите образец.", "Показать образец", "Продолжить", "Вспомните смысл на родном языке", "Базовый раздел завершён", "Повторить раздел"],
};
export function languageInfo(id: FoundationLanguage) {
 const language = foundationLanguages.find(item => item.id === id);
 if (!language) throw new Error("Unsupported foundation language");
 return language;
}
export function validStack(stack: FoundationStack) {
 return new Set(Object.values(stack)).size === 3 && Object.values(stack).every(id => foundationLanguages.some(language => language.id === id));
}
export function foundationProgressKey(stack: FoundationStack) {
 if (!validStack(stack)) throw new Error("Choose three distinct supported languages");
 return `linguathread.foundation.draft.v1:${stack.anchor}:${stack.bridge}:${stack.target}`;
}
export function normalizeFoundationAnswer(value: string, language: FoundationLanguage) {
 // Preserve meaningful accents and vowel marks. Normalize only case, punctuation and spacing.
 const normalized = value.normalize("NFKC").toLocaleLowerCase(language).replace(/[’‘]/gu, "'").replace(/\p{P}/gu, "").trim().replace(/\s+/gu, " ");
 return ["zh", "ja"].includes(language) ? normalized.replace(/\s/gu, "") : normalized;
}
export function acceptsFoundationAnswer(objective: FoundationObjective, language: FoundationLanguage, answer: string) {
 const model = foundationContent[language][objective];
 const normalized = normalizeFoundationAnswer(answer, language);
 return !!normalized && [model.text, ...(model.accepted || [])].some(value => normalizeFoundationAnswer(value, language) === normalized);
}
