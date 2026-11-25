export type XRayRole = "subject" | "verb" | "connector" | "modifier" | "complement" | "clause" | "unit";
export type XRayForms = Partial<Record<string, string>>;

export type XRayEditorial = {
  units?: Array<{
    label: string;
    role: XRayRole;
    forms: XRayForms;
    meaning: string;
    notes: XRayForms;
    comparison?: string;
  }>;
  clauses?: Array<{ label: string; role: XRayRole; forms: XRayForms }>;
  pattern?: { frame: string; explanation: string; languages: XRayForms };
  transfer?: { context: string; forms: XRayForms };
};

const editorial: Record<string, XRayEditorial> = {
  "b1-u26-2-adding-qualification-lesson": {
    clauses: [
      { label: "Overall agreement", role: "clause", forms: { English: "I agree in general", Spanish: "Estoy de acuerdo en general", Vietnamese: "Nhìn chung tôi đồng ý" } },
      { label: "Concession", role: "connector", forms: { English: "although", Spanish: "aunque", Vietnamese: "mặc dù" } },
      { label: "Remaining concern", role: "clause", forms: { English: "the proposal still needs some changes", Spanish: "la propuesta todavía necesita algunos cambios", Vietnamese: "đề xuất vẫn cần một vài thay đổi" } },
    ],
    units: [
      {
        label: "Overall perspective", role: "modifier",
        forms: { English: "in general", Spanish: "en general", Vietnamese: "Nhìn chung" },
        meaning: "Generally speaking. The speaker agrees with the overall proposal while leaving room for exceptions.",
        notes: {
          English: "In general follows the verb and limits the scope of the agreement.",
          Spanish: "En general is a fixed adverbial expression. Here it follows estoy de acuerdo and qualifies the speaker’s stance.",
          Vietnamese: "Nhìn chung combines nhìn (look or view) and chung (general or overall). At the start of this sentence, the fixed phrase frames the whole judgment.",
        },
        comparison: "Vietnamese puts the overall perspective first here. Spanish and English place it after the agreement.",
      },
      {
        label: "Agreement", role: "verb",
        forms: { English: "I agree", Spanish: "Estoy de acuerdo", Vietnamese: "tôi đồng ý" },
        meaning: "The speaker gives their agreement.",
        notes: {
          English: "I names the speaker and agree is the finite verb.",
          Spanish: "Estoy is the first-person singular of estar, so yo can stay implicit. De acuerdo completes the fixed expression estar de acuerdo.",
          Vietnamese: "Tôi is the explicit subject. Đồng ý carries the agreement as a verb and stays the same when the subject changes.",
        },
        comparison: "Spanish expresses the speaker in estoy. English and Vietnamese identify the speaker with separate pronouns.",
      },
      {
        label: "Concession", role: "connector",
        forms: { English: "although", Spanish: "aunque", Vietnamese: "mặc dù" },
        meaning: "Introduces a reservation that can coexist with the agreement.",
        notes: {
          English: "Although introduces the subordinate clause that qualifies I agree.",
          Spanish: "Aunque introduces a concession. The speaker presents the need for changes as a fact relevant to the discussion, so necesita is present indicative. Necesite could frame the need as hypothetical or as background already taken for granted.",
          Vietnamese: "Read mặc dù as a single connector before a clause. It signals concession without changing the verb form.",
        },
        comparison: "Mặc dù, aunque and although do the same linking work here. Spanish also uses mood to show how the speaker presents the concession.",
      },
      {
        label: "What needs work", role: "subject",
        forms: { English: "the proposal", Spanish: "la propuesta", Vietnamese: "đề xuất" },
        meaning: "The specific proposal under discussion.",
        notes: {
          English: "The tells the listener which proposal is meant. The phrase is the subject of needs.",
          Spanish: "La agrees with the feminine singular noun propuesta. That singular subject takes necesita.",
          Vietnamese: "Đề xuất can mean ‘to propose’ as a verb. Here it names the proposal and fills the subject position before vẫn cần. Context identifies the proposal.",
        },
      },
      {
        label: "Continuing need", role: "verb",
        forms: { English: "still needs", Spanish: "todavía necesita", Vietnamese: "vẫn cần" },
        meaning: "The need for changes remains at the time of speaking.",
        notes: {
          English: "Still modifies needs. The -s on needs agrees with the singular subject the proposal.",
          Spanish: "Todavía marks continuation. Necesita is the third-person singular present indicative of necesitar.",
          Vietnamese: "Vẫn precedes cần and marks the persistence of the need. Cần has the same form regardless of the subject.",
        },
        comparison: "Vẫn, todavía and still all locate the need as continuing. Vietnamese keeps cần stable while Spanish and English mark agreement on the verb.",
      },
      {
        label: "What is needed", role: "complement",
        forms: { English: "some changes", Spanish: "algunos cambios", Vietnamese: "một vài thay đổi" },
        meaning: "An unspecified number of changes. Một vài suggests a few.",
        notes: {
          English: "Some quantifies the plural noun changes. The whole phrase is the object of needs.",
          Spanish: "Algunos is masculine plural to agree with cambios. Together they name what the proposal needs.",
          Vietnamese: "Một vài works together as a quantity expression before thay đổi. Here thay đổi names changes and takes no plural ending.",
        },
      },
    ],
    pattern: {
      frame: "Overall stance + concessive connector + qualifying clause",
      explanation: "State your broad position and then acknowledge a fact that qualifies it. You can also lead with the concession and put the point you want to emphasize last.",
      languages: {
        English: "[stance] + although + [subject + still + verb]",
        Spanish: "[postura] + aunque + [hecho en indicativo]",
        Vietnamese: "(Nhìn chung) + [ý kiến] + mặc dù + [chủ ngữ + vẫn + động từ]",
      },
    },
    transfer: {
      context: "You agree in a discussion and need longer before deciding. Put the agreement first, inside the concession.",
      forms: {
        English: "Although I agree, I still need more time.",
        Spanish: "Aunque estoy de acuerdo, todavía necesito más tiempo.",
        Vietnamese: "Mặc dù tôi đồng ý, tôi vẫn cần thêm thời gian.",
      },
    },
  },
  "es-u1-l1-identity-origin": {
    units: [
      {
        label: "Speaker and verb", role: "verb",
        forms: { English: "I am", Spanish: "Soy", Vietnamese: "Mình đến" },
        meaning: "Identify the speaker and start the statement of origin.",
        notes: {
          English: "I identifies the speaker explicitly. Am is the form of be used with I.",
          Spanish: "Soy is the first-person present form of ser. Its form identifies the speaker, so yo can be left implicit.",
          Vietnamese: "Mình is a friendly way to refer to yourself here. Đến conveys coming from a place when followed by từ. The verb stays the same if the speaker changes.",
        },
        comparison: "Spanish can express the speaker and verb in one word. The other versions name the speaker separately, and Vietnamese expresses origin through coming from a place.",
      },
      {
        label: "Origin link", role: "connector",
        forms: { English: "from", Spanish: "de", Vietnamese: "từ" },
        meaning: "Link the speaker to their place of origin.",
        notes: {
          English: "From introduces the place after I am.",
          Spanish: "De introduces a place of origin after ser. The question ¿De dónde eres? uses the same de to ask about origin.",
          Vietnamese: "Từ marks the starting point or source. Read it with đến and the place that follows.",
        },
      },
      {
        label: "Place of origin", role: "complement",
        forms: { English: "Indiana", Spanish: "Indiana", Vietnamese: "Indiana" },
        meaning: "The place the speaker is from.",
        notes: {
          English: "The name completes the phrase from Indiana.",
          Spanish: "The name completes the phrase de Indiana.",
          Vietnamese: "The name completes the phrase từ Indiana.",
        },
      },
    ],
    pattern: {
      frame: "Speaker + origin construction + place",
      explanation: "Name your place of origin. Change the place to make the sentence yours. In Spanish, changing the person also changes ser.",
      languages: { English: "I + am from + [place]", Spanish: "soy de + [lugar]", Vietnamese: "mình đến từ + [địa điểm]" },
    },
    transfer: {
      context: "You’re introducing yourself and someone asks where you’re from. This time, say you’re from Chicago.",
      forms: { English: "I am from Chicago.", Spanish: "Soy de Chicago.", Vietnamese: "Mình đến từ Chicago." },
    },
  },
  "a2-u13-l1-childhood": {
    transfer: {
      context: "Tell someone where you lived as a child. This time, place your old home near the school.",
      forms: { English: "When I was young, I lived near the school.", Spanish: "Cuando era pequeño, vivía cerca de la escuela.", Vietnamese: "Khi còn nhỏ, tôi sống gần trường học." },
    },
  },
  "es-u3-l1-family": {
    transfer: {
      context: "Someone asks about a friend. Keep the idea of living nearby and change whose whereabouts you describe.",
      forms: { English: "My friend lives nearby.", Spanish: "Mi amigo vive cerca.", Vietnamese: "Bạn tôi sống gần đây." },
    },
  },
  "a2-u14-1-childhood-evenings-lesson": {
    pattern: {
      frame: "Past time frame + frequency + habitual action",
      explanation: "Set the period once, then describe something you regularly did during it.",
      languages: {
        English: "as a child + subject + always + simple past",
        Spanish: "de niño/a + siempre + imperfecto",
        Vietnamese: "hồi nhỏ + chủ ngữ + luôn + động từ",
      },
    },
    transfer: {
      context: "Think back to your childhood. Describe a regular breakfast with your family.",
      forms: { English: "As a child, I always had breakfast with my family.", Spanish: "De niño, siempre desayunaba con mi familia.", Vietnamese: "Hồi nhỏ, tôi luôn ăn sáng cùng gia đình." },
    },
  },
  "b2-u37-1-reframing-the-beginning-lesson": {
    transfer: {
      context: "Looking back on a project, describe how an apparent problem turned into an opportunity.",
      forms: { English: "What at first seemed like a problem ended up becoming an opportunity.", Spanish: "Lo que al principio parecía un problema terminó convirtiéndose en una oportunidad.", Vietnamese: "Điều ban đầu có vẻ là một vấn đề cuối cùng lại trở thành một cơ hội." },
    },
  },
  "c1-u49-1-what-was-left-unsaid-lesson": {
    pattern: {
      frame: "What went unsaid + contrast + what the reaction suggested",
      explanation: "Keep the reported position and your inference distinct. Describe the reaction as evidence of an attitude that was left unstated.",
      languages: {
        English: "did not say + [reported position] + but + [telling reaction]",
        Spanish: "no dijo que + imperfecto de subjuntivo + pero + [reacción reveladora]",
        Vietnamese: "không nói rằng + [quan điểm] + nhưng + [phản ứng đáng chú ý]",
      },
    },
    transfer: {
      context: "Someone never says she agrees. Her smile gives you a clue about her position.",
      forms: { English: "She did not say she agreed, but her smile was quite telling.", Spanish: "No dijo que estuviera de acuerdo, pero su sonrisa resultó bastante elocuente.", Vietnamese: "Cô ấy không nói rằng mình đồng ý, nhưng nụ cười của cô ấy lại nói lên rất nhiều." },
    },
  },
  "c2-u61-1-reluctance-or-refusal-lesson": {
    pattern: {
      frame: "Reject the stronger interpretation + offer the more precise one",
      explanation: "Adjust what the listener might infer by naming a less categorical explanation.",
      languages: {
        English: "it is not that + [interpretation] + rather + [more precise account]",
        Spanish: "no es que + subjuntivo + más bien + [interpretación más precisa]",
        Vietnamese: "không hẳn là + [cách hiểu] + đúng hơn là + [cách hiểu chính xác hơn]",
      },
    },
    transfer: {
      context: "In a project discussion, clarify that the person seemed reluctant to decide that day.",
      forms: { English: "It is not that he refused. Rather, he seemed reluctant to decide today.", Spanish: "No es que se negara. Más bien parecía poco dispuesto a decidir hoy.", Vietnamese: "Không hẳn là anh ấy từ chối. Đúng hơn là anh ấy có vẻ không muốn quyết định hôm nay." },
    },
  },
};

export function xrayEditorialFor(lessonId: string): XRayEditorial {
  return editorial[lessonId] ?? {};
}
