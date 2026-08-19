const u = (spanish, meaning, vietnamese, part, role, spanishForm, vietnameseForm, bases = {}) => ({
  spanish, meaning, vietnamese, part, role, spanishForm, vietnameseForm,
  spanishBase: bases.spanish, vietnameseBase: bases.vietnamese,
});

const units = [
  {
    unit: 14, title: "Past routines", lessons: [
      ["Childhood evenings", "imperfect habitual action", "De niño, siempre cenaba con mi familia.", "As a child, I always ate dinner with my family.", "Hồi nhỏ, tôi luôn ăn tối cùng gia đình.", "Siempre cenaba", "time frame + imperfect habit", "past frame + frequency + stable verb", [
        u("De niño", "as a child", "Hồi nhỏ", "Time-setting phrase", "Places the routine in childhood.", "De + masculine singular noun forms an idiomatic life-stage frame; the speaker's gender may change niño to niña.", "Hồi nhỏ is a stable retrospective frame and does not inflect."),
        u("siempre", "always", "tôi luôn", "Frequency adverb", "Marks the routine as regular while Vietnamese also states the speaker.", "Invariant adverb placed before the imperfect verb here.", "Tôi states the speaker and luôn is the invariant frequency adverb before the predicate."),
        u("cenaba", "used to eat dinner", "ăn tối", "Imperfect finite verb", "States a repeated background habit.", "First-person singular imperfect indicative of cenar; -aba presents an ongoing or habitual past.", "Stable verb phrase; past reference comes from hồi nhỏ rather than conjugation.", { spanish: "cenar" }),
        u("con mi familia", "with my family", "cùng gia đình", "Accompaniment phrase", "Names the people sharing the routine.", "Con introduces accompaniment; mi is a singular possessive before familia.", "Cùng introduces shared participation; possession is understood from context."),
      ]],
      ["What was normal", "soler + infinitive in the past", "Solía caminar después del trabajo.", "I used to walk after work.", "Trước đây tôi thường đi bộ sau giờ làm.", "Solía caminar", "soler in imperfect + infinitive", "past frame + thường + verb", [
        u("Solía", "used to", "Trước đây", "Imperfect aspectual verb", "Frames the following action as customary in the past.", "First-person singular imperfect of soler; it normally governs an infinitive.", "Trước đây is an invariant past-time frame, not a conjugated verb.", { spanish: "soler" }),
        u("caminar", "to walk", "tôi thường đi bộ", "Infinitive action", "Names the repeated activity governed by solía.", "Uninflected -ar infinitive because solía carries tense and person.", "Tôi states the subject; thường marks frequency; đi bộ is the stable walking expression."),
        u("después de", "after", "sau", "Temporal relation", "Orders the walk after another activity.", "Después de is a fixed prepositional time relation.", "Sau is an invariant temporal relation placed before the reference event."),
        u("del trabajo", "work", "giờ làm", "Time-reference noun phrase", "Names the event used as the temporal reference.", "Del contracts de + el before the masculine singular noun trabajo.", "Giờ làm literally frames the relevant work time; no article is required."),
      ]],
      ["A routine interrupted", "imperfect background + preterite event", "Leía cuando sonó el teléfono.", "I was reading when the phone rang.", "Tôi đang đọc thì điện thoại reo.", "Leía cuando sonó", "imperfect background + cuando + preterite", "đang + background + thì + event", [
        u("Leía", "I was reading", "Tôi đang đọc", "Imperfect finite verb", "Establishes the activity already in progress.", "First-person singular imperfect of leer; the imperfect supplies background duration.", "Tôi states the subject and đang marks an ongoing action before the stable verb đọc.", { spanish: "leer" }),
        u("cuando", "when", "thì", "Clause linker", "Connects the background to the interrupting event.", "Invariant conjunction introducing the event clause.", "Thì marks the transition from background to the event in this narrative frame."),
        u("sonó", "rang", "reo", "Preterite finite verb", "Presents the interrupting event as complete.", "Third-person singular preterite of sonar; the written accent marks final stress.", "Stable event verb whose completed reading comes from the narrative sequence.", { spanish: "sonar" }),
        u("el teléfono", "the phone", "điện thoại", "Subject noun phrase", "Names what rang.", "Masculine singular definite noun phrase following the verb.", "Bare noun phrase; Vietnamese does not require an article here."),
      ]],
      ["Past routine reflection", "imperfect contrast", "Antes trabajaba de noche, pero ahora prefiero el día.", "I used to work at night, but now I prefer daytime.", "Trước đây tôi làm việc ban đêm, nhưng bây giờ tôi thích ban ngày hơn.", "Antes trabajaba", "imperfect past habit + present contrast", "trước đây... nhưng bây giờ", [
        u("Antes", "before; formerly", "Trước đây", "Past-time adverb", "Frames the first clause as an earlier situation.", "Invariant adverb placed at the clause opening.", "Stable two-word past frame."),
        u("trabajaba de noche", "I used to work at night", "tôi làm việc ban đêm", "Imperfect predicate", "States the former routine.", "Trabajaba is first-person imperfect of trabajar; de noche is an idiomatic time expression.", "The stable verb làm việc combines with ban đêm; tense comes from trước đây."),
        u("pero ahora", "but now", "nhưng bây giờ", "Contrastive transition", "Turns from the former routine to the present preference.", "Pero coordinates a contrast and ahora supplies present time.", "Nhưng marks contrast and bây giờ supplies the current frame."),
        u("prefiero el día", "I prefer daytime", "tôi thích ban ngày hơn", "Present preference predicate", "States the speaker's current choice.", "Prefiero is first-person present of stem-changing preferir; el día is the preferred option.", "Thích...hơn expresses comparative preference with hơn after the preferred phrase.", { spanish: "preferir" }),
      ]],
    ],
  },
  {
    unit: 15, title: "Travel experiences", lessons: [
      ["A completed journey", "present perfect experience", "He viajado solo varias veces.", "I have traveled alone several times.", "Tôi đã đi du lịch một mình vài lần.", "He viajado", "haber + past participle", "đã + stable verb", [
        u("He viajado", "I have traveled", "Tôi đã đi du lịch", "Present-perfect verb phrase", "Presents travel as accumulated experience relevant now.", "He is first-person present of haber; viajado is the invariant past participle of viajar.", "Tôi states the subject; đã marks completed experience; đi du lịch remains stable."),
        u("solo", "alone", "một mình", "Manner modifier", "Describes traveling without companions.", "Masculine singular adjective used adverbially; a female speaker normally says sola.", "Stable manner phrase literally evoking one self."),
        u("varias", "several", "vài", "Indefinite quantity determiner", "Gives a non-exact repeated quantity.", "Feminine plural form agreeing with veces.", "Invariant approximate quantifier placed before the counting noun."),
        u("veces", "times", "lần", "Frequency-count noun", "Counts separate experiences.", "Feminine plural of vez, with z changing to c before -es.", "Lần is the stable occurrence counter; plurality is carried by vài."),
      ]],
      ["A missed connection", "preterite travel problem", "Perdí el tren porque llegué tarde.", "I missed the train because I arrived late.", "Tôi lỡ chuyến tàu vì đến muộn.", "Perdí el tren", "preterite event + porque + cause", "event + vì + cause", [
        u("Perdí", "I missed; I lost", "Tôi lỡ", "Preterite finite verb", "States the completed travel problem.", "First-person singular preterite of perder; no stem change occurs in this form.", "Tôi supplies the subject; lỡ expresses missing an opportunity or departure."),
        u("el tren", "the train", "chuyến tàu", "Direct-object noun phrase", "Names the departure that was missed.", "Masculine singular definite noun phrase functioning as direct object.", "Chuyến classifies a trip or service and tàu names the train."),
        u("porque", "because", "vì", "Causal conjunction", "Introduces the reason for the missed train.", "Invariant conjunction joining cause to result.", "Invariant causal linker placed before the reason."),
        u("llegué tarde", "I arrived late", "đến muộn", "Preterite cause clause", "Explains the completed cause.", "Llegué is first-person preterite of llegar; g changes to gu before é to preserve sound. Tarde modifies arrival.", "Stable verb plus lateness modifier; the completed sequence supplies time."),
      ]],
      ["Changing a reservation", "polite travel request", "Quisiera cambiar mi reserva para mañana.", "I would like to change my reservation to tomorrow.", "Tôi muốn đổi đặt chỗ sang ngày mai.", "Quisiera cambiar", "courteous conditional + infinitive", "muốn + stable verb", [
        u("Quisiera cambiar", "I would like to change", "Tôi muốn đổi", "Courteous modal predicate", "Frames the requested action politely.", "Quisiera is the imperfect subjunctive of querer used conventionally for courtesy; cambiar remains infinitive.", "Tôi states the speaker; muốn expresses desire and đổi names the change without conjugation."),
        u("mi", "my", "đặt chỗ", "Possessive determiner", "Identifies the reservation as the speaker's.", "Singular possessive determiner; it does not mark the speaker's gender.", "Vietnamese can omit an explicit possessor when the reservation is clear from the service context."),
        u("reserva", "reservation", "đặt chỗ", "Direct-object noun", "Names what will be changed.", "Feminine singular noun following the possessive.", "Đặt chỗ is a stable verb-noun expression for reserving a place."),
        u("para mañana", "to tomorrow", "sang ngày mai", "Rescheduling phrase", "Names the new intended date.", "Para introduces the destination date of the change.", "Sang marks transition to a new time and ngày mai names tomorrow."),
      ]],
      ["Travel lesson learned", "experience + reflection", "Después del viaje, entendí que necesitaba más tiempo.", "After the trip, I understood that I needed more time.", "Sau chuyến đi, tôi hiểu rằng mình cần thêm thời gian.", "Entendí que", "preterite reflection + noun clause", "hiểu rằng + clause", [
        u("Después del viaje", "after the trip", "Sau chuyến đi", "Temporal frame", "Places the realization after the journey.", "Después de combines with el as del before the masculine noun viaje.", "Sau introduces the time relation and chuyến classifies the trip."),
        u("entendí", "I understood", "tôi hiểu", "Preterite cognition verb", "States the completed realization.", "First-person singular preterite of entender.", "Stable cognition verb with explicit subject tôi; sequence supplies time.", { spanish: "entender" }),
        u("que necesitaba", "that I needed", "rằng mình cần", "Content clause", "Introduces what the speaker realized.", "Que introduces the clause; necesitaba is first-person imperfect because the need was ongoing.", "Rằng introduces reported content; mình refers back to the speaker and cần remains stable."),
        u("más tiempo", "more time", "thêm thời gian", "Quantity noun phrase", "Names the need discovered through travel.", "Más increases the uncountable masculine noun tiempo.", "Thêm adds quantity before thời gian without number agreement."),
      ]],
    ],
  },
  {
    unit: 16, title: "Workplace exchanges", lessons: [
      ["Current responsibility", "tener que + work task", "Tengo que terminar este informe hoy.", "I have to finish this report today.", "Hôm nay tôi phải hoàn thành báo cáo này.", "Tengo que terminar", "tener que + infinitive", "time + phải + verb", [
        u("Tengo que terminar", "I have to finish", "tôi phải hoàn thành", "Obligation predicate", "States a present responsibility and its action.", "Tengo is first-person present of tener; que links it to the infinitive terminar.", "Tôi states the subject; phải marks obligation; hoàn thành is the stable completion verb."),
        u("este", "this", "này", "Demonstrative determiner", "Identifies the currently relevant report.", "Masculine singular form agreeing with informe and placed before it.", "Post-nominal demonstrative placed after báo cáo in Vietnamese."),
        u("informe", "report", "báo cáo", "Direct-object noun", "Names the document to finish.", "Masculine singular noun functioning as direct object.", "Stable two-syllable noun; no article is required."),
        u("hoy", "today", "Hôm nay", "Time adverbial", "Sets the deadline within the current day.", "Invariant time adverb, placed last here.", "Stable time phrase, naturally placed first in this Vietnamese sentence."),
      ]],
      ["Asking a colleague", "polite workplace request", "¿Podrías revisar el documento esta tarde?", "Could you review the document this afternoon?", "Chiều nay bạn có thể xem lại tài liệu được không?", "Podrías revisar", "conditional poder + infinitive", "có thể + verb + được không", [
        u("Podrías revisar", "could you review", "bạn có thể xem lại", "Conditional request predicate", "Softens the requested action.", "Podrías is second-person singular conditional of poder; revisar stays infinitive.", "Bạn addresses the colleague; có thể marks ability and xem lại means review or look again."),
        u("el documento", "the document", "tài liệu", "Direct-object noun phrase", "Names the material to review.", "Masculine singular definite noun phrase.", "Bare compound noun; reference is understood from context."),
        u("esta tarde", "this afternoon", "Chiều nay", "Time phrase", "Specifies when the review is requested.", "Feminine singular demonstrative agrees with tarde.", "Chiều nay is an invariant time phrase, placed first naturally."),
        u("question courtesy", "polite question framing", "được không", "Pragmatic question frame", "Turns ability into a courteous request.", "Spanish conditional mood and question intonation carry courtesy without a separate final phrase.", "Được không closes the request by asking whether the action is acceptable."),
      ]],
      ["Reporting progress", "present perfect progress", "Ya hemos completado la primera parte.", "We have already completed the first part.", "Chúng tôi đã hoàn thành phần đầu rồi.", "Hemos completado", "present perfect + completion", "đã + verb + rồi", [
        u("Ya", "already", "rồi", "Completion adverb", "Marks the expected milestone as achieved.", "Invariant adverb normally placed before the perfect verb phrase.", "Rồi appears at the clause end and reinforces completed change of state."),
        u("hemos completado", "we have completed", "Chúng tôi đã hoàn thành", "Present-perfect predicate", "Reports a completed result relevant to current work.", "Hemos is first-person plural present of haber; completado is the past participle.", "Chúng tôi states an exclusive we; đã marks completion; hoàn thành stays stable."),
        u("la primera", "the first", "đầu", "Ordinal modifier", "Orders this part before later sections.", "Feminine singular article and ordinal agree with parte.", "Đầu follows phần to identify the initial section."),
        u("parte", "part", "phần", "Direct-object noun", "Names the completed section.", "Feminine singular noun functioning as direct object.", "Stable section noun preceding its modifier đầu."),
      ]],
      ["Explaining a delay", "workplace cause and repair", "No pude responder antes porque estaba en una reunión.", "I could not reply earlier because I was in a meeting.", "Tôi không thể trả lời sớm hơn vì đang họp.", "No pude responder", "preterite inability + infinitive", "không thể + verb", [
        u("No pude responder", "I could not reply", "Tôi không thể trả lời", "Negated past ability predicate", "States the unavailable action.", "No negates pude, first-person preterite of poder; responder remains infinitive.", "Tôi states the subject; không thể marks inability; trả lời remains stable."),
        u("antes", "earlier", "sớm hơn", "Comparative time adverb", "Locates the missed response before now.", "Invariant temporal adverb.", "Sớm hơn combines early with the comparative marker hơn."),
        u("porque", "because", "vì", "Causal conjunction", "Introduces the explanation rather than an excuse fragment.", "Invariant clause linker.", "Invariant causal linker."),
        u("estaba en una reunión", "I was in a meeting", "đang họp", "Imperfect background clause", "Supplies the ongoing circumstance behind the delay.", "Estaba is first-person imperfect of estar; en introduces the meeting setting.", "Đang marks the ongoing meeting activity; the subject remains understood from the first clause."),
      ]],
    ],
  },
  {
    unit: 17, title: "Learning and growth", lessons: [
      ["A growing ability", "llevar + time + gerund", "Llevo seis meses estudiando español.", "I have been studying Spanish for six months.", "Tôi đã học tiếng Tây Ban Nha được sáu tháng.", "Llevo estudiando", "llevar + duration + gerund", "đã + verb + được + duration", [
        u("Llevo", "I have spent", "Tôi đã", "Duration-aspect verb", "Connects a past starting point to an activity continuing now.", "First-person present of llevar used in a duration construction.", "Tôi states the subject and đã places the start before now."),
        u("seis meses", "for six months", "được sáu tháng", "Duration phrase", "Measures how long the activity has continued.", "Plural masculine noun phrase after the cardinal number seis.", "Được introduces the attained duration; the cardinal number precedes tháng."),
        u("estudiando", "studying", "học", "Gerund activity", "Names the continuing learning activity.", "Gerund of estudiar, formed with -ando; it does not carry person here.", "Stable verb; duration and aspect are carried elsewhere.", { spanish: "estudiar" }),
        u("español", "Spanish", "tiếng Tây Ban Nha", "Language noun", "Names the language being studied.", "Masculine language noun used without an article after estudiar.", "Tiếng marks a language and Tây Ban Nha names Spanish."),
      ]],
      ["Knowing how", "saber + infinitive", "Ya sé explicar la idea con claridad.", "I can now explain the idea clearly.", "Bây giờ tôi đã biết giải thích ý tưởng rõ ràng.", "Sé explicar", "saber + infinitive ability", "đã biết + verb", [
        u("Ya sé", "I now know how", "Bây giờ tôi đã biết", "Acquired-ability predicate", "Marks a skill that has become available.", "Sé is irregular first-person present of saber; ya presents the change as achieved.", "Bây giờ sets current time; đã biết presents knowledge as acquired."),
        u("explicar", "to explain", "giải thích", "Infinitive skill", "Names the acquired communicative ability.", "Uninflected infinitive governed by saber.", "Stable two-syllable explanatory verb."),
        u("la idea", "the idea", "ý tưởng", "Direct-object noun phrase", "Names what can now be explained.", "Feminine singular definite noun phrase.", "Bare compound noun with contextual definiteness."),
        u("con claridad", "clearly", "rõ ràng", "Manner phrase", "Describes the quality of the explanation.", "Con + noun forms an adverbial manner expression.", "Reduplicated-style adjective/adverb phrase modifying the explanation."),
      ]],
      ["Learning through error", "al + infinitive + reflection", "Aprendí mucho al corregir mis errores.", "I learned a lot by correcting my mistakes.", "Tôi học được nhiều khi sửa lỗi của mình.", "Aprendí al corregir", "preterite result + al + infinitive", "result + khi + verb", [
        u("Aprendí mucho", "I learned a lot", "Tôi học được nhiều", "Preterite result predicate", "States the learning gained from the process.", "Aprendí is first-person preterite of aprender; mucho measures the result.", "Tôi states the subject; học được emphasizes achieved learning; nhiều measures it."),
        u("al", "by; upon", "khi", "Temporal-means linker", "Connects learning to the activity that enabled it.", "Contraction of a + el before an infinitive, forming an adverbial clause.", "Khi introduces the circumstance in which learning occurred."),
        u("corregir", "correcting", "sửa", "Infinitive activity", "Names the reflective action that produced learning.", "Infinitive used after al; no person is marked.", "Stable repair verb."),
        u("mis errores", "my mistakes", "lỗi của mình", "Direct-object noun phrase", "Names what was corrected.", "Plural possessive mis modifies masculine plural errores.", "Lỗi is followed by the possessor phrase của mình."),
      ]],
      ["A learning intention", "para que + subjunctive", "Practico cada día para que las palabras salgan con naturalidad.", "I practice every day so the words come naturally.", "Tôi luyện tập mỗi ngày để lời nói trở nên tự nhiên.", "Para que salgan", "purpose clause + present subjunctive", "để + result clause", [
        u("Practico cada día", "I practice every day", "Tôi luyện tập mỗi ngày", "Present habitual clause", "States the repeated intentional practice.", "Practico is first-person present; cada día distributes the habit across days.", "Tôi states the subject; luyện tập is stable; mỗi ngày marks frequency."),
        u("para que", "so that", "để", "Purpose-clause linker", "Introduces the desired result with a distinct subject.", "Multiword conjunction that triggers subjunctive in the goal clause.", "Invariant purpose linker before the desired result."),
        u("las palabras", "the words", "lời nói", "Purpose-clause subject", "Names what should become readily available.", "Feminine plural definite noun phrase.", "Lời nói means one's spoken expression in this natural Vietnamese rendering."),
        u("salgan con naturalidad", "come out naturally", "trở nên tự nhiên", "Subjunctive result predicate", "Expresses the intended, not yet guaranteed outcome.", "Salgan is third-person plural present subjunctive of salir; con naturalidad describes manner.", "Trở nên marks becoming and tự nhiên names the desired quality."),
      ]],
    ],
  },
];

const additionalUnits = [
  [18, "Relationships and repair", [
    ["Acknowledging harm", "apology + cause", "Siento haberte hablado de esa manera.", "I am sorry I spoke to you that way.", "Tôi xin lỗi vì đã nói với bạn như vậy.", "Siento haberte hablado", "sentir + perfect infinitive", "xin lỗi vì đã + verb", [["Siento", "I am sorry", "Tôi xin lỗi vì"], ["haberte hablado", "having spoken to you", "đã nói với bạn"], ["de esa manera", "in that way", "như vậy"], ["repair intention", "relational repair", "lời xin lỗi"]]],
    ["Clarifying intention", "no quería + infinitive", "No quería hacerte sentir ignorado.", "I did not mean to make you feel ignored.", "Tôi không muốn khiến bạn cảm thấy bị phớt lờ.", "No quería", "imperfect intention + causative", "không muốn + khiến", [["No quería", "I did not mean", "Tôi không muốn"], ["hacerte sentir", "make you feel", "khiến bạn cảm thấy"], ["ignorado", "ignored", "bị phớt lờ"], ["intention contrast", "unintended effect", "ý định khác với tác động"]]],
    ["Making space", "necesitar que + subjunctive", "Necesito que me escuches antes de responder.", "I need you to listen before responding.", "Tôi cần bạn lắng nghe trước khi trả lời.", "Necesito que escuches", "need + que + subjunctive", "cần + person + verb", [["Necesito", "I need", "Tôi cần"], ["que me escuches", "you to listen to me", "bạn lắng nghe"], ["antes de", "before", "trước khi"], ["responder", "responding", "trả lời"]]],
    ["Restoring connection", "podemos + infinitive", "Podemos intentarlo de nuevo con más calma.", "We can try again more calmly.", "Chúng ta có thể thử lại một cách bình tĩnh hơn.", "Podemos intentarlo", "modal + clitic infinitive", "có thể + verb + lại", [["Podemos", "we can", "Chúng ta có thể"], ["intentarlo", "try it", "thử"], ["de nuevo", "again", "lại"], ["con más calma", "more calmly", "một cách bình tĩnh hơn"]]],
  ]],
  [19, "Health decisions", [
    ["Seeking advice", "debería + infinitive", "¿Debería pedir otra opinión?", "Should I seek another opinion?", "Tôi có nên xin thêm ý kiến không?", "Debería pedir", "conditional advice question", "có nên + verb + không", [["Debería", "should I", "Tôi có nên"], ["pedir", "seek", "xin"], ["otra opinión", "another opinion", "thêm ý kiến"], ["question frame", "advice question", "không"]]],
    ["Describing improvement", "sentirse + comparative", "Me siento mejor desde que cambié mi rutina.", "I feel better since I changed my routine.", "Tôi cảm thấy khỏe hơn từ khi thay đổi thói quen.", "Me siento mejor", "reflexive state + desde que", "cảm thấy + hơn + từ khi", [["Me siento", "I feel", "Tôi cảm thấy"], ["mejor", "better", "khỏe hơn"], ["desde que", "since", "từ khi"], ["cambié mi rutina", "I changed my routine", "thay đổi thói quen"]]],
    ["A conditional choice", "si + present + future", "Si no mejoro, pediré una cita.", "If I do not improve, I will make an appointment.", "Nếu không khỏe hơn, tôi sẽ đặt lịch hẹn.", "Si no mejoro", "real condition + future", "nếu + condition + sẽ", [["Si", "if", "Nếu"], ["no mejoro", "I do not improve", "không khỏe hơn"], ["pediré", "I will request", "tôi sẽ đặt"], ["una cita", "an appointment", "lịch hẹn"]]],
    ["Balanced advice", "conviene + infinitive", "Conviene descansar, pero también moverse un poco.", "It is wise to rest, but also to move a little.", "Nên nghỉ ngơi, nhưng cũng cần vận động một chút.", "Conviene", "impersonal recommendation", "nên... nhưng cũng cần", [["Conviene", "it is advisable", "Nên"], ["descansar", "to rest", "nghỉ ngơi"], ["pero también", "but also", "nhưng cũng"], ["moverse un poco", "move a little", "cần vận động một chút"]]],
  ]],
  [20, "Home and community", [
    ["Comparing neighborhoods", "comparative + relative clause", "Este barrio es más tranquilo que el lugar donde vivía antes.", "This neighborhood is quieter than where I lived before.", "Khu này yên tĩnh hơn nơi tôi từng sống trước đây.", "Más tranquilo que", "comparative + relative location", "hơn + nơi + clause", [["Este barrio", "this neighborhood", "Khu này"], ["es más tranquilo", "is quieter", "yên tĩnh hơn"], ["que el lugar", "than the place", "nơi"], ["donde vivía antes", "where I lived before", "tôi từng sống trước đây"]]],
    ["Reporting a problem", "llevar + time + sin", "Llevamos dos días sin agua caliente.", "We have been without hot water for two days.", "Chúng tôi đã hai ngày không có nước nóng.", "Llevamos sin", "duration + sin + noun", "đã + duration + không có", [["Llevamos", "we have spent", "Chúng tôi đã"], ["dos días", "two days", "hai ngày"], ["sin", "without", "không có"], ["agua caliente", "hot water", "nước nóng"]]],
    ["Requesting service", "necesitar que + subjunctive", "Necesitamos que alguien revise la calefacción.", "We need someone to inspect the heating.", "Chúng tôi cần người kiểm tra hệ thống sưởi.", "Necesitamos que revise", "need + indefinite subject + subjunctive", "cần + person + verb", [["Necesitamos", "we need", "Chúng tôi cần"], ["que alguien", "someone to", "người"], ["revise", "inspect", "kiểm tra"], ["la calefacción", "the heating system", "hệ thống sưởi"]]],
    ["Community participation", "llevar + gerund", "Llevo un año colaborando con la asociación vecinal.", "I have been helping the neighborhood association for a year.", "Tôi đã tham gia hội dân cư được một năm.", "Llevo colaborando", "duration + gerund", "đã + verb + được + duration", [["Llevo", "I have spent", "Tôi đã"], ["un año", "one year", "được một năm"], ["colaborando", "collaborating", "tham gia"], ["con la asociación vecinal", "with the neighborhood association", "hội dân cư"]]],
  ]],
  [21, "Media and leisure", [
    ["A recommendation", "recomendar que + subjunctive", "Te recomiendo que veas esta película.", "I recommend that you watch this film.", "Tôi khuyên bạn nên xem bộ phim này.", "Recomiendo que veas", "recommendation + subjunctive", "khuyên + person + nên", [["Te recomiendo", "I recommend to you", "Tôi khuyên bạn"], ["que veas", "that you watch", "nên xem"], ["esta", "this", "này"], ["película", "film", "bộ phim"]]],
    ["A recent reaction", "acabar de + infinitive", "Acabo de terminar el libro y todavía estoy pensando en él.", "I just finished the book and I am still thinking about it.", "Tôi vừa đọc xong cuốn sách và vẫn còn nghĩ về nó.", "Acabo de terminar", "recent past + continuing reaction", "vừa + verb + xong + vẫn", [["Acabo de terminar", "I just finished", "Tôi vừa đọc xong"], ["el libro", "the book", "cuốn sách"], ["y todavía estoy pensando", "and I am still thinking", "và vẫn còn nghĩ"], ["en él", "about it", "về nó"]]],
    ["Explaining taste", "lo que + gustar", "Lo que más me gusta es la forma de contar la historia.", "What I like most is the way the story is told.", "Điều tôi thích nhất là cách kể câu chuyện.", "Lo que más me gusta", "free relative + focus", "điều + clause + nhất", [["Lo que", "what", "Điều"], ["más me gusta", "I like most", "tôi thích nhất"], ["es la forma", "is the way", "là cách"], ["de contar la historia", "of telling the story", "kể câu chuyện"]]],
    ["Choosing leisure", "preferir + infinitive contrast", "Prefiero leer en casa en vez de salir esta noche.", "I prefer to read at home instead of going out tonight.", "Tối nay tôi thích đọc sách ở nhà hơn là ra ngoài.", "Prefiero", "prefer + infinitive + en vez de", "thích + hơn là", [["Prefiero leer", "I prefer to read", "tôi thích đọc sách"], ["en casa", "at home", "ở nhà"], ["en vez de salir", "instead of going out", "hơn là ra ngoài"], ["esta noche", "tonight", "Tối nay"]]],
  ]],
  [22, "Comparison and choice", [
    ["Comparing value", "tan...como", "Esta opción es tan práctica como la otra, pero cuesta menos.", "This option is as practical as the other, but costs less.", "Lựa chọn này tiện như lựa chọn kia nhưng rẻ hơn.", "Tan práctica como", "equality comparison + contrast", "như + nhưng + hơn", [["Esta opción", "this option", "Lựa chọn này"], ["es tan práctica como", "is as practical as", "tiện như"], ["la otra", "the other", "lựa chọn kia"], ["pero cuesta menos", "but costs less", "nhưng rẻ hơn"]]],
    ["Explaining priority", "lo más importante", "Para mí, lo más importante es que sea fácil de usar.", "For me, the most important thing is that it be easy to use.", "Đối với tôi, quan trọng nhất là nó dễ sử dụng.", "Lo más importante", "superlative nominal + subjunctive", "quan trọng nhất + là", [["Para mí", "for me", "Đối với tôi"], ["lo más importante", "the most important thing", "quan trọng nhất"], ["es que sea", "is that it be", "là nó"], ["fácil de usar", "easy to use", "dễ sử dụng"]]],
    ["A qualified choice", "aunque + indicative", "Aunque es más caro, dura mucho más.", "Although it is more expensive, it lasts much longer.", "Mặc dù đắt hơn, nó bền hơn nhiều.", "Aunque", "concession + factual indicative", "mặc dù + result", [["Aunque", "although", "Mặc dù"], ["es más caro", "it is more expensive", "đắt hơn"], ["dura", "it lasts", "nó bền"], ["mucho más", "much more", "hơn nhiều"]]],
    ["Reconsidering", "conditional preference", "Elegiría la segunda opción si incluyera el servicio.", "I would choose the second option if it included the service.", "Tôi sẽ chọn phương án thứ hai nếu có kèm dịch vụ.", "Elegiría si incluyera", "conditional + imperfect subjunctive", "sẽ + verb + nếu", [["Elegiría", "I would choose", "Tôi sẽ chọn"], ["la segunda opción", "the second option", "phương án thứ hai"], ["si incluyera", "if it included", "nếu có kèm"], ["el servicio", "the service", "dịch vụ"]]],
  ]],
  [23, "Future arrangements", [
    ["Confirming a plan", "future + time clause", "Te llamaré cuando llegue a casa.", "I will call you when I get home.", "Tôi sẽ gọi cho bạn khi về đến nhà.", "Llamaré cuando llegue", "future + cuando + subjunctive", "sẽ + verb + khi", [["Te llamaré", "I will call you", "Tôi sẽ gọi cho bạn"], ["cuando", "when", "khi"], ["llegue", "I get", "về đến"], ["a casa", "home", "nhà"]]],
    ["A firm intention", "pensar + infinitive", "Pienso terminar el proyecto antes del viernes.", "I intend to finish the project before Friday.", "Tôi định hoàn thành dự án trước thứ Sáu.", "Pienso terminar", "intention verb + infinitive", "định + verb", [["Pienso terminar", "I intend to finish", "Tôi định hoàn thành"], ["el proyecto", "the project", "dự án"], ["antes del viernes", "before Friday", "trước thứ Sáu"], ["intención firme", "firm intention", "ý định rõ ràng"]]],
    ["Contingency", "si + present + future", "Si cambia el horario, te avisaré enseguida.", "If the schedule changes, I will let you know immediately.", "Nếu lịch thay đổi, tôi sẽ báo cho bạn ngay.", "Si cambia", "real condition + future response", "nếu + condition + sẽ", [["Si", "if", "Nếu"], ["cambia el horario", "the schedule changes", "lịch thay đổi"], ["te avisaré", "I will let you know", "tôi sẽ báo cho bạn"], ["enseguida", "immediately", "ngay"]]],
    ["Shared responsibility", "quedar en + infinitive", "Quedamos en revisar los detalles mañana.", "We agreed to review the details tomorrow.", "Chúng tôi đã thống nhất xem lại chi tiết vào ngày mai.", "Quedamos en", "agreement frame + infinitive", "đã thống nhất + verb", [["Quedamos en", "we agreed to", "Chúng tôi đã thống nhất"], ["revisar", "review", "xem lại"], ["los detalles", "the details", "chi tiết"], ["mañana", "tomorrow", "vào ngày mai"]]],
  ]],
  [24, "Integrated A2 expression", [
    ["A connected account", "past narrative integration", "Cuando llegué, ya habían empezado, así que esperé afuera.", "When I arrived, they had already started, so I waited outside.", "Khi tôi đến, họ đã bắt đầu rồi nên tôi đợi bên ngoài.", "Habían empezado", "preterite + pluperfect + result", "đã...rồi + nên", [["Cuando llegué", "when I arrived", "Khi tôi đến"], ["ya habían empezado", "they had already started", "họ đã bắt đầu rồi"], ["así que", "so", "nên"], ["esperé afuera", "I waited outside", "tôi đợi bên ngoài"]]],
    ["Opinion and reason", "qualified opinion", "Creo que la idea puede funcionar si hacemos algunos cambios.", "I think the idea can work if we make some changes.", "Tôi nghĩ ý tưởng có thể hiệu quả nếu chúng ta thay đổi một vài điểm.", "Creo que puede", "opinion + modal + condition", "nghĩ + có thể + nếu", [["Creo que", "I think that", "Tôi nghĩ"], ["la idea puede funcionar", "the idea can work", "ý tưởng có thể hiệu quả"], ["si hacemos", "if we make", "nếu chúng ta thay đổi"], ["algunos cambios", "some changes", "một vài điểm"]]],
    ["Relational clarity", "emotion + boundary", "Me alegra ayudarte, pero hoy necesito descansar.", "I am glad to help you, but today I need to rest.", "Tôi vui vì có thể giúp bạn, nhưng hôm nay tôi cần nghỉ ngơi.", "Me alegra", "emotion + infinitive + boundary", "vui vì + nhưng + cần", [["Me alegra ayudarte", "I am glad to help you", "Tôi vui vì có thể giúp bạn"], ["pero", "but", "nhưng"], ["hoy necesito", "today I need", "hôm nay tôi cần"], ["descansar", "to rest", "nghỉ ngơi"]]],
    ["A2 reflection", "present perfect + purpose", "He aprendido a expresarme mejor porque practico con intención.", "I have learned to express myself better because I practice intentionally.", "Tôi đã học cách diễn đạt tốt hơn vì luyện tập có chủ đích.", "He aprendido a", "present perfect + learning + cause", "đã học cách + vì", [["He aprendido", "I have learned", "Tôi đã học"], ["a expresarme mejor", "to express myself better", "cách diễn đạt tốt hơn"], ["porque", "because", "vì"], ["practico con intención", "I practice intentionally", "luyện tập có chủ đích"]]],
  ]],
];

for (const [unit, title, lessons] of additionalUnits) {
  units.push({
    unit, title,
    lessons: lessons.map(([lessonTitle, skill, spanish, english, vietnamese, focus, pattern, bridgePattern, rawUnits]) => [
      lessonTitle, skill, spanish, english, vietnamese, focus, pattern, bridgePattern,
      rawUnits.map(([es, meaning, vi]) => u(es, meaning, vi, "Authored conceptual unit", `Performs a specific role in the ${skill} construction.`, `This reviewed Spanish unit is interpreted inside ${pattern}; its inflection and agreement are read from the complete phrase.`, `This reviewed Vietnamese unit remains morphologically stable inside ${bridgePattern}; order and particles carry its grammatical contribution.`)),
    ]),
  });
}

let prior = "a2-story-continuity";
const lessons = [];
for (const group of units) {
  for (const [index, lesson] of group.lessons.entries()) {
    const [title, skill, spanish, english, vietnamese, focus, pattern, bridgePattern, lessonUnits] = lesson;
    const slug = title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const objectiveId = `a2-u${group.unit}-${index + 1}-${slug}`;
    lessons.push({
      id: `${objectiveId}-lesson`, objectiveId, prerequisites: [prior], unit: group.unit, lesson: index + 1,
      unitTitle: group.title, title, skill, spanish, english, vietnamese, focus, pattern, bridgePattern, units: lessonUnits,
    });
    prior = objectiveId;
  }
}

export default { id: "a2-core-completion-1", version: 1, level: "A2", lessons };
