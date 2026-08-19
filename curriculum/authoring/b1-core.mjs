const unit = (spanish, meaning, vietnamese, role) => ({ spanish, meaning, vietnamese, role });

const groups = [
  [25, "Connected stories", [
    ["An unexpected turn", "past narration with consequence", "Cuando llegué a la estación, el tren ya había salido, así que tuve que cambiar de plan.", "When I arrived at the station, the train had already left, so I had to change my plan.", "Khi tôi đến ga, tàu đã rời đi rồi, vì vậy tôi phải đổi kế hoạch.", "había salido", "preterite frame + pluperfect + consequence", "khi + event + đã...rồi + vì vậy", [
      unit("Cuando llegué a la estación", "when I arrived at the station", "Khi tôi đến ga", "opens the story with the later completed event"),
      unit("el tren ya había salido", "the train had already left", "tàu đã rời đi rồi", "places an earlier completed event before that arrival"),
      unit("así que", "so; as a result", "vì vậy", "links the situation to its consequence"),
      unit("tuve que cambiar de plan", "I had to change my plan", "tôi phải đổi kế hoạch", "states the necessary response"),
    ]],
    ["Background and interruption", "imperfect background with completed event", "Mientras caminábamos por el centro, empezó a llover de repente.", "While we were walking downtown, it suddenly began to rain.", "Trong khi chúng tôi đang đi bộ ở trung tâm, trời đột nhiên bắt đầu mưa.", "caminábamos... empezó", "mientras + imperfect + preterite", "trong khi + đang + event", [
      unit("Mientras caminábamos", "while we were walking", "Trong khi chúng tôi đang đi bộ", "establishes the ongoing shared background"),
      unit("por el centro", "around downtown", "ở trung tâm", "locates the background activity"),
      unit("empezó a llover", "it began to rain", "trời bắt đầu mưa", "introduces the completed change"),
      unit("de repente", "suddenly", "đột nhiên", "marks the event as unexpected"),
    ]],
    ["What happened before", "pluperfect explanation", "No reconocí el lugar porque habían construido varios edificios nuevos.", "I did not recognize the place because they had built several new buildings.", "Tôi không nhận ra nơi đó vì người ta đã xây thêm vài tòa nhà mới.", "habían construido", "preterite result + porque + pluperfect cause", "result + vì + đã + earlier cause", [
      unit("No reconocí el lugar", "I did not recognize the place", "Tôi không nhận ra nơi đó", "states the completed reaction"),
      unit("porque", "because", "vì", "introduces the explanation"),
      unit("habían construido", "they had built", "người ta đã xây thêm", "places the construction before the recognition"),
      unit("varios edificios nuevos", "several new buildings", "vài tòa nhà mới", "names the changes that caused the reaction"),
    ]],
    ["Closing a story", "narrative conclusion", "Al final entendimos que el retraso nos había evitado un problema mayor.", "In the end, we understood that the delay had saved us from a bigger problem.", "Cuối cùng chúng tôi hiểu rằng sự chậm trễ đã giúp mình tránh được một vấn đề lớn hơn.", "entendimos que", "conclusion + reported realization + pluperfect", "cuối cùng + hiểu rằng + đã", [
      unit("Al final", "in the end", "Cuối cùng", "signals the conclusion"),
      unit("entendimos que", "we understood that", "chúng tôi hiểu rằng", "introduces the final realization"),
      unit("el retraso nos había evitado", "the delay had saved us from", "sự chậm trễ đã giúp mình tránh được", "states the earlier protective effect"),
      unit("un problema mayor", "a bigger problem", "một vấn đề lớn hơn", "names the avoided outcome"),
    ]],
  ]],
  [26, "Opinions with reasons", [
    ["A supported view", "opinion with evidence", "Creo que el transporte público debería mejorar porque muchas personas dependen de él.", "I think public transport should improve because many people depend on it.", "Tôi nghĩ giao thông công cộng nên được cải thiện vì nhiều người phụ thuộc vào nó.", "Creo que... porque", "opinion + conditional recommendation + reason", "nghĩ + nên được + vì", [
      unit("Creo que", "I think that", "Tôi nghĩ", "frames the claim as the speaker's considered view"),
      unit("el transporte público debería mejorar", "public transport should improve", "giao thông công cộng nên được cải thiện", "states the recommended change"),
      unit("porque", "because", "vì", "introduces supporting evidence"),
      unit("muchas personas dependen de él", "many people depend on it", "nhiều người phụ thuộc vào nó", "gives the practical reason"),
    ]],
    ["Adding qualification", "qualified agreement", "Estoy de acuerdo en general, aunque la propuesta todavía necesita algunos cambios.", "I agree in general, although the proposal still needs some changes.", "Nhìn chung tôi đồng ý, mặc dù đề xuất vẫn cần một vài thay đổi.", "aunque", "agreement + concessive indicative", "nhìn chung + mặc dù + vẫn", [
      unit("Estoy de acuerdo", "I agree", "tôi đồng ý", "states agreement"),
      unit("en general", "in general", "Nhìn chung", "limits the breadth of that agreement"),
      unit("aunque", "although", "mặc dù", "introduces a factual reservation"),
      unit("la propuesta todavía necesita algunos cambios", "the proposal still needs some changes", "đề xuất vẫn cần một vài thay đổi", "states the remaining concern"),
    ]],
    ["Another perspective", "contrastive reasoning", "Por un lado, la medida reduce costos; por otro, puede crear nuevas dificultades.", "On the one hand, the measure reduces costs; on the other, it may create new difficulties.", "Một mặt, biện pháp này giảm chi phí; mặt khác, nó có thể tạo ra những khó khăn mới.", "por un lado... por otro", "paired contrast + modal possibility", "một mặt... mặt khác + có thể", [
      unit("Por un lado", "on the one hand", "Một mặt", "opens the first side of the evaluation"),
      unit("la medida reduce costos", "the measure reduces costs", "biện pháp này giảm chi phí", "states the benefit"),
      unit("por otro", "on the other hand", "mặt khác", "opens the counterposition"),
      unit("puede crear nuevas dificultades", "may create new difficulties", "nó có thể tạo ra những khó khăn mới", "states a possible drawback"),
    ]],
    ["A reasoned conclusion", "conclusion from reasons", "Por eso, me parece más sensato probar la idea antes de adoptarla por completo.", "For that reason, it seems more sensible to me to test the idea before adopting it fully.", "Vì vậy, theo tôi hợp lý hơn là thử ý tưởng trước khi áp dụng hoàn toàn.", "me parece más sensato", "conclusion + evaluative frame + infinitives", "vì vậy + theo tôi + hợp lý hơn", [
      unit("Por eso", "for that reason", "Vì vậy", "connects the conclusion to prior reasons"),
      unit("me parece más sensato", "it seems more sensible to me", "theo tôi hợp lý hơn là", "presents a comparative judgment and opens the preferred action"),
      unit("probar la idea", "to test the idea", "thử ý tưởng", "names the preferred action"),
      unit("antes de adoptarla por completo", "before adopting it fully", "trước khi áp dụng hoàn toàn", "sets the cautious sequence"),
    ]],
  ]],
  [27, "Possibility and advice", [
    ["A likely outcome", "probability and condition", "Si seguimos así, es probable que terminemos antes de lo previsto.", "If we continue like this, we will probably finish earlier than expected.", "Nếu tiếp tục như vậy, có lẽ chúng ta sẽ hoàn thành sớm hơn dự kiến.", "es probable que", "real condition + probability + subjunctive", "nếu + có lẽ + sẽ", [
      unit("Si seguimos así", "if we continue like this", "Nếu tiếp tục như vậy", "states the real condition"),
      unit("es probable que", "it is likely that", "có lẽ", "marks the result as probable rather than certain"),
      unit("terminemos", "we finish", "chúng ta sẽ hoàn thành", "states the projected result"),
      unit("antes de lo previsto", "earlier than expected", "sớm hơn dự kiến", "compares the result with the plan"),
    ]],
    ["Advice for a friend", "context-sensitive recommendation", "Yo que tú, hablaría con ella antes de tomar una decisión.", "If I were you, I would speak with her before making a decision.", "Nếu là bạn, tôi sẽ nói chuyện với cô ấy trước khi quyết định.", "Yo que tú", "advice frame + conditional", "nếu là bạn + sẽ", [
      unit("Yo que tú", "if I were you", "Nếu là bạn", "frames advice from the listener's position"),
      unit("hablaría con ella", "I would speak with her", "tôi sẽ nói chuyện với cô ấy", "offers the recommended action"),
      unit("antes de", "before", "trước khi", "orders the action before the decision"),
      unit("tomar una decisión", "making a decision", "quyết định", "names the later commitment"),
    ]],
    ["Considering alternatives", "hypothetical options", "Podríamos aplazar la reunión o buscar una solución temporal.", "We could postpone the meeting or look for a temporary solution.", "Chúng ta có thể hoãn cuộc họp hoặc tìm một giải pháp tạm thời.", "Podríamos", "conditional possibility + alternatives", "có thể + hoặc", [
      unit("Podríamos aplazar", "we could postpone", "Chúng ta có thể hoãn", "presents one available option"),
      unit("la reunión", "the meeting", "cuộc họp", "names what could be postponed"),
      unit("o", "or", "hoặc", "coordinates alternatives"),
      unit("buscar una solución temporal", "look for a temporary solution", "tìm một giải pháp tạm thời", "presents the second option"),
    ]],
    ["A careful warning", "advice with consequence", "Conviene guardar una copia por si el archivo se pierde.", "It is advisable to keep a copy in case the file is lost.", "Nên lưu một bản sao phòng khi tệp bị mất.", "por si", "impersonal advice + precaution", "nên + phòng khi + bị", [
      unit("Conviene guardar", "it is advisable to keep", "Nên lưu", "gives impersonal practical advice"),
      unit("una copia", "a copy", "một bản sao", "names the precaution"),
      unit("por si", "in case", "phòng khi", "introduces a possible adverse event"),
      unit("el archivo se pierde", "the file gets lost", "tệp bị mất", "states the risk being guarded against"),
    ]],
  ]],
  [28, "Relationships and emotion", [
    ["Naming a feeling", "emotion with cause", "Me preocupa que últimamente apenas tengamos tiempo para hablar.", "It worries me that lately we hardly have time to talk.", "Tôi lo rằng gần đây chúng ta hầu như không có thời gian nói chuyện.", "Me preocupa que", "emotion + que + subjunctive", "lo rằng + gần đây", [
      unit("Me preocupa que", "it worries me that", "Tôi lo rằng", "introduces the cause of concern"),
      unit("últimamente", "lately", "gần đây", "sets the recent time frame"),
      unit("apenas tengamos tiempo", "we hardly have time", "chúng ta hầu như không có thời gian", "states the limited shared resource"),
      unit("para hablar", "to talk", "nói chuyện", "names the purpose the time would serve"),
    ]],
    ["Explaining impact", "unintended effect", "Sé que no fue tu intención, pero me sentí excluido de la conversación.", "I know it was not your intention, but I felt excluded from the conversation.", "Tôi biết đó không phải ý của bạn, nhưng tôi cảm thấy mình bị gạt ra khỏi cuộc trò chuyện.", "me sentí excluido", "acknowledgment + contrast + reflexive feeling", "biết... nhưng + cảm thấy bị", [
      unit("Sé que no fue tu intención", "I know it was not your intention", "Tôi biết đó không phải ý của bạn", "acknowledges the other person's intention"),
      unit("pero", "but", "nhưng", "contrasts intention with impact"),
      unit("me sentí excluido", "I felt excluded", "tôi cảm thấy mình bị gạt ra", "names the speaker's emotional experience"),
      unit("de la conversación", "from the conversation", "khỏi cuộc trò chuyện", "identifies the social setting"),
    ]],
    ["Making a request", "relational request", "Te agradecería que me avisaras cuando necesites estar a solas.", "I would appreciate it if you told me when you need to be alone.", "Tôi sẽ rất cảm kích nếu bạn báo cho tôi khi cần ở một mình.", "Te agradecería que", "conditional courtesy + imperfect subjunctive", "sẽ cảm kích nếu + khi", [
      unit("Te agradecería que", "I would appreciate it if", "Tôi sẽ rất cảm kích nếu", "softens a relational request"),
      unit("me avisaras", "you let me know", "bạn báo cho tôi", "states the requested communication"),
      unit("cuando necesites", "when you need", "khi cần", "introduces the relevant circumstance"),
      unit("estar a solas", "to be alone", "ở một mình", "names the need to be communicated"),
    ]],
    ["Repairing together", "reciprocal repair", "Aunque pensamos distinto, podemos escucharnos y buscar un punto en común.", "Although we think differently, we can listen to each other and look for common ground.", "Dù suy nghĩ khác nhau, chúng ta vẫn có thể lắng nghe nhau và tìm điểm chung.", "escucharnos", "concession + reciprocal infinitive", "dù... vẫn + nhau", [
      unit("Aunque pensamos distinto", "although we think differently", "Dù suy nghĩ khác nhau", "acknowledges the disagreement"),
      unit("podemos escucharnos", "we can listen to each other", "chúng ta vẫn có thể lắng nghe nhau", "states a reciprocal repair action"),
      unit("y buscar", "and look for", "và tìm", "adds a shared effort"),
      unit("un punto en común", "common ground", "điểm chung", "names the shared basis being sought"),
    ]],
  ]],
  [29, "Professional exchange", [
    ["Reporting progress", "formal progress summary", "Hasta ahora hemos cumplido los objetivos principales, aunque quedan dos tareas pendientes.", "So far we have met the main objectives, although two tasks remain pending.", "Cho đến nay chúng tôi đã hoàn thành các mục tiêu chính, mặc dù vẫn còn hai nhiệm vụ chưa xong.", "hemos cumplido", "present perfect report + concession", "cho đến nay + đã + mặc dù vẫn còn", [
      unit("Hasta ahora", "so far", "Cho đến nay", "sets the reporting period"),
      unit("hemos cumplido los objetivos principales", "we have met the main objectives", "chúng tôi đã hoàn thành các mục tiêu chính", "summarizes achieved progress"),
      unit("aunque", "although", "mặc dù", "introduces the remaining limitation"),
      unit("quedan dos tareas pendientes", "two tasks remain pending", "vẫn còn hai nhiệm vụ chưa xong", "identifies unfinished work"),
    ]],
    ["Making a proposal", "meeting proposal", "Propongo que revisemos los datos antes de decidir el próximo paso.", "I propose that we review the data before deciding the next step.", "Tôi đề nghị chúng ta xem lại dữ liệu trước khi quyết định bước tiếp theo.", "Propongo que revisemos", "proposal + present subjunctive", "đề nghị + chúng ta + verb", [
      unit("Propongo que", "I propose that", "Tôi đề nghị", "introduces a formal proposal"),
      unit("revisemos los datos", "we review the data", "chúng ta xem lại dữ liệu", "states the proposed shared action"),
      unit("antes de decidir", "before deciding", "trước khi quyết định", "orders review before commitment"),
      unit("el próximo paso", "the next step", "bước tiếp theo", "names the decision to follow"),
    ]],
    ["Attributing a message", "reported workplace speech", "La directora explicó que el plazo se había ampliado una semana.", "The director explained that the deadline had been extended by one week.", "Giám đốc giải thích rằng thời hạn đã được gia hạn thêm một tuần.", "explicó que", "reported speech + pluperfect passive", "giải thích rằng + đã được", [
      unit("La directora explicó que", "the director explained that", "Giám đốc giải thích rằng", "attributes the information to its source"),
      unit("el plazo", "the deadline", "thời hạn", "names what changed"),
      unit("se había ampliado", "had been extended", "đã được gia hạn", "reports the earlier completed extension"),
      unit("una semana", "by one week", "thêm một tuần", "measures the extension"),
    ]],
    ["Clarifying responsibility", "impersonal process language", "Se espera que cada equipo documente las decisiones importantes.", "Each team is expected to document important decisions.", "Mỗi nhóm được yêu cầu ghi lại những quyết định quan trọng.", "Se espera que", "impersonal expectation + subjunctive", "mỗi + được yêu cầu + verb", [
      unit("Se espera que", "it is expected that", "được yêu cầu", "states an institutional expectation impersonally"),
      unit("cada equipo", "each team", "Mỗi nhóm", "identifies every responsible group"),
      unit("documente", "document", "ghi lại", "states the expected action"),
      unit("las decisiones importantes", "important decisions", "những quyết định quan trọng", "names what must be recorded"),
    ]],
  ]],
  [30, "Culture and perspective", [
    ["Context shapes meaning", "cultural contextualization", "Una costumbre que parece extraña al principio puede tener una razón histórica.", "A custom that seems strange at first may have a historical reason.", "Một phong tục ban đầu có vẻ lạ có thể bắt nguồn từ lịch sử.", "que parece", "relative clause + modal possibility", "relative description + có thể", [
      unit("Una costumbre", "a custom", "Một phong tục", "introduces the cultural practice"),
      unit("que parece extraña al principio", "that seems strange at first", "ban đầu có vẻ lạ", "describes an initial outsider reaction"),
      unit("puede tener", "may have", "có thể bắt nguồn từ", "opens a possible explanation"),
      unit("una razón histórica", "a historical reason", "lịch sử", "locates the explanation in history"),
    ]],
    ["Comparing practices", "qualified cultural comparison", "A diferencia de mi país, aquí es habitual cenar bastante tarde.", "Unlike in my country, here it is common to eat dinner quite late.", "Khác với nước tôi, ở đây người ta thường ăn tối khá muộn.", "A diferencia de", "comparison frame + impersonal habit", "khác với + ở đây + thường", [
      unit("A diferencia de mi país", "unlike in my country", "Khác với nước tôi", "sets the comparison point"),
      unit("aquí", "here", "ở đây", "locates the current practice"),
      unit("es habitual", "it is common", "người ta thường", "marks the practice as customary"),
      unit("cenar bastante tarde", "to eat dinner quite late", "ăn tối khá muộn", "names the practice"),
    ]],
    ["Avoiding assumptions", "cultural qualification", "Lo que se considera cortés depende muchas veces de la relación entre las personas.", "What is considered polite often depends on the relationship between the people.", "Điều được coi là lịch sự thường phụ thuộc vào mối quan hệ giữa mọi người.", "Lo que se considera", "free relative + impersonal passive", "điều được coi là + phụ thuộc", [
      unit("Lo que se considera cortés", "what is considered polite", "Điều được coi là lịch sự", "names the socially evaluated behavior"),
      unit("depende muchas veces de", "often depends on", "thường phụ thuộc vào", "qualifies the judgment as contextual"),
      unit("la relación", "the relationship", "mối quan hệ", "names the determining factor"),
      unit("entre las personas", "between the people", "giữa mọi người", "identifies whose relationship matters"),
    ]],
    ["Mediating a difference", "cross-cultural explanation", "No significa falta de interés; es otra manera de mostrar respeto.", "It does not mean a lack of interest; it is another way of showing respect.", "Điều đó không có nghĩa là thiếu quan tâm; đó là một cách khác để thể hiện sự tôn trọng.", "No significa", "negated interpretation + reformulation", "không có nghĩa là + đó là", [
      unit("No significa", "it does not mean", "Điều đó không có nghĩa là", "rejects an inaccurate interpretation"),
      unit("falta de interés", "a lack of interest", "thiếu quan tâm", "names the rejected interpretation"),
      unit("es otra manera", "it is another way", "đó là một cách khác", "offers a reframing"),
      unit("de mostrar respeto", "of showing respect", "để thể hiện sự tôn trọng", "explains the intended social meaning"),
    ]],
  ]],
  [31, "Problems and decisions", [
    ["Defining the problem", "problem framing", "El problema no es el costo, sino que no tenemos suficiente tiempo.", "The problem is not the cost, but that we do not have enough time.", "Vấn đề không phải là chi phí mà là chúng ta không có đủ thời gian.", "no es... sino que", "corrective contrast + noun clause", "không phải là... mà là", [
      unit("El problema no es", "the problem is not", "Vấn đề không phải là", "rejects the first diagnosis"),
      unit("el costo", "the cost", "chi phí", "names the rejected factor"),
      unit("sino que", "but rather that", "mà là", "introduces the corrected diagnosis"),
      unit("no tenemos suficiente tiempo", "we do not have enough time", "chúng ta không có đủ thời gian", "states the actual constraint"),
    ]],
    ["Evaluating options", "trade-off comparison", "La primera opción es más rápida, pero la segunda ofrece mejores resultados a largo plazo.", "The first option is faster, but the second offers better long-term results.", "Phương án đầu nhanh hơn, nhưng phương án thứ hai cho kết quả tốt hơn về lâu dài.", "más... pero", "comparative trade-off", "hơn... nhưng + tốt hơn", [
      unit("La primera opción", "the first option", "Phương án đầu", "identifies the first alternative"),
      unit("es más rápida", "is faster", "nhanh hơn", "states its advantage"),
      unit("pero la segunda", "but the second", "nhưng phương án thứ hai", "turns to the competing alternative"),
      unit("ofrece mejores resultados a largo plazo", "offers better long-term results", "cho kết quả tốt hơn về lâu dài", "states the second option's advantage"),
    ]],
    ["Negotiating a condition", "conditional agreement", "Aceptaría la propuesta siempre que pudiéramos revisar el calendario.", "I would accept the proposal provided that we could review the schedule.", "Tôi sẽ chấp nhận đề xuất với điều kiện chúng ta có thể xem lại lịch trình.", "siempre que", "conditional + condition + imperfect subjunctive", "với điều kiện + có thể", [
      unit("Aceptaría la propuesta", "I would accept the proposal", "Tôi sẽ chấp nhận đề xuất", "states conditional willingness"),
      unit("siempre que", "provided that", "với điều kiện", "introduces a necessary condition"),
      unit("pudiéramos revisar", "we could review", "chúng ta có thể xem lại", "states the requested ability"),
      unit("el calendario", "the schedule", "lịch trình", "names what must be reconsidered"),
    ]],
    ["Reaching a decision", "reasoned collective decision", "Después de considerar las alternativas, decidimos avanzar con la solución más flexible.", "After considering the alternatives, we decided to proceed with the most flexible solution.", "Sau khi cân nhắc các phương án, chúng tôi quyết định tiếp tục với giải pháp linh hoạt nhất.", "Después de considerar", "prior infinitive frame + preterite decision", "sau khi + quyết định", [
      unit("Después de considerar", "after considering", "Sau khi cân nhắc", "marks the evaluation completed first"),
      unit("las alternativas", "the alternatives", "các phương án", "names what was evaluated"),
      unit("decidimos avanzar", "we decided to proceed", "chúng tôi quyết định tiếp tục", "states the collective decision"),
      unit("con la solución más flexible", "with the most flexible solution", "với giải pháp linh hoạt nhất", "identifies the selected option"),
    ]],
  ]],
  [32, "News and society", [
    ["Reporting an event", "attributed news summary", "Según el informe, la ciudad ha reducido el consumo de agua durante el último año.", "According to the report, the city has reduced water consumption during the past year.", "Theo báo cáo, thành phố đã giảm lượng nước tiêu thụ trong năm qua.", "Según", "source attribution + present perfect", "theo + đã", [
      unit("Según el informe", "according to the report", "Theo báo cáo", "attributes the claim to a source"),
      unit("la ciudad ha reducido", "the city has reduced", "thành phố đã giảm", "reports the achieved change"),
      unit("el consumo de agua", "water consumption", "lượng nước tiêu thụ", "names the measured behavior"),
      unit("durante el último año", "during the past year", "trong năm qua", "sets the reporting period"),
    ]],
    ["Separating fact and reaction", "fact versus public response", "La ley fue aprobada ayer, pero su impacto todavía genera debate.", "The law was approved yesterday, but its impact still generates debate.", "Luật đã được thông qua hôm qua, nhưng tác động của nó vẫn gây tranh luận.", "fue aprobada", "passive event + contrastive present", "đã được + nhưng vẫn", [
      unit("La ley fue aprobada ayer", "the law was approved yesterday", "Luật đã được thông qua hôm qua", "states the reported fact"),
      unit("pero", "but", "nhưng", "contrasts the event with the continuing response"),
      unit("su impacto", "its impact", "tác động của nó", "names what is being evaluated"),
      unit("todavía genera debate", "still generates debate", "vẫn gây tranh luận", "reports the continuing public reaction"),
    ]],
    ["Reporting a claim", "indirect public statement", "Los expertos señalan que la medida podría beneficiar a las familias con menos recursos.", "Experts point out that the measure could benefit families with fewer resources.", "Các chuyên gia cho rằng biện pháp này có thể giúp những gia đình có ít nguồn lực hơn.", "señalan que", "attribution + conditional possibility", "cho rằng + có thể", [
      unit("Los expertos señalan que", "experts point out that", "Các chuyên gia cho rằng", "attributes an interpretation"),
      unit("la medida podría beneficiar", "the measure could benefit", "biện pháp này có thể giúp", "presents a possible effect"),
      unit("a las familias", "families", "những gia đình", "identifies the potential beneficiaries"),
      unit("con menos recursos", "with fewer resources", "có ít nguồn lực hơn", "qualifies which families"),
    ]],
    ["Evaluating uncertainty", "evidential caution", "Aún no está claro si los cambios producirán el resultado esperado.", "It is not yet clear whether the changes will produce the expected result.", "Vẫn chưa rõ liệu những thay đổi có tạo ra kết quả như mong đợi hay không.", "no está claro si", "uncertainty frame + embedded future", "vẫn chưa rõ liệu... hay không", [
      unit("Aún no está claro", "it is not yet clear", "Vẫn chưa rõ", "marks the evidence as unsettled"),
      unit("si", "whether", "liệu", "introduces the open question"),
      unit("los cambios producirán", "the changes will produce", "những thay đổi có tạo ra", "states the uncertain projected effect"),
      unit("el resultado esperado", "the expected result", "kết quả như mong đợi hay không", "names the outcome under evaluation"),
    ]],
  ]],
  [33, "Creativity and humor", [
    ["A creative choice", "explaining artistic intention", "Elegí un final abierto para que cada lector pudiera interpretarlo a su manera.", "I chose an open ending so that each reader could interpret it in their own way.", "Tôi chọn một kết thúc mở để mỗi độc giả có thể hiểu theo cách riêng.", "para que", "preterite choice + purpose + imperfect subjunctive", "để + mỗi + có thể", [
      unit("Elegí un final abierto", "I chose an open ending", "Tôi chọn một kết thúc mở", "states the creative decision"),
      unit("para que", "so that", "để", "introduces its purpose"),
      unit("cada lector pudiera interpretarlo", "each reader could interpret it", "mỗi độc giả có thể hiểu", "states the intended audience freedom"),
      unit("a su manera", "in their own way", "theo cách riêng", "qualifies the interpretation as personal"),
    ]],
    ["Explaining a joke", "double meaning", "El chiste funciona porque la palabra tiene dos sentidos distintos.", "The joke works because the word has two different meanings.", "Câu đùa có tác dụng vì từ đó có hai nghĩa khác nhau.", "dos sentidos", "causal explanation + lexical ambiguity", "vì + hai nghĩa", [
      unit("El chiste funciona", "the joke works", "Câu đùa có tác dụng", "states the humorous effect"),
      unit("porque", "because", "vì", "introduces the mechanism"),
      unit("la palabra tiene", "the word has", "từ đó có", "identifies the linguistic source"),
      unit("dos sentidos distintos", "two different meanings", "hai nghĩa khác nhau", "names the ambiguity"),
    ]],
    ["A playful response", "light ironic contrast", "Claro, porque llegar una hora tarde siempre ayuda muchísimo.", "Of course, because arriving an hour late always helps enormously.", "Tất nhiên rồi, vì đến muộn một tiếng lúc nào cũng giúp ích rất nhiều.", "Claro, porque", "literal agreement used ironically", "tất nhiên rồi + vì", [
      unit("Claro", "of course", "Tất nhiên rồi", "signals apparent agreement whose context can make it ironic"),
      unit("porque", "because", "vì", "introduces the exaggerated justification"),
      unit("llegar una hora tarde", "arriving an hour late", "đến muộn một tiếng", "names the plainly unhelpful behavior"),
      unit("siempre ayuda muchísimo", "always helps enormously", "lúc nào cũng giúp ích rất nhiều", "creates irony through overstatement"),
    ]],
    ["Interpreting tone", "contextual humor", "Sin el tono de voz, el comentario podría parecer más serio de lo que era.", "Without the tone of voice, the comment might seem more serious than it was.", "Nếu không có giọng điệu, lời nhận xét có thể nghe nghiêm túc hơn thực tế.", "podría parecer", "condition-like frame + conditional appearance", "nếu không có + có thể + hơn", [
      unit("Sin el tono de voz", "without the tone of voice", "Nếu không có giọng điệu", "removes a contextual cue"),
      unit("el comentario podría parecer", "the comment might seem", "lời nhận xét có thể nghe", "marks an alternative interpretation"),
      unit("más serio", "more serious", "nghiêm túc hơn", "states the shifted tone"),
      unit("de lo que era", "than it was", "thực tế", "compares appearance with intended reality"),
    ]],
  ]],
  [34, "Purpose and change", [
    ["A sustained goal", "purpose with changed subject", "He reorganizado mi horario para que el trabajo no ocupe todo el día.", "I have reorganized my schedule so that work does not take up the whole day.", "Tôi đã sắp xếp lại lịch để công việc không chiếm cả ngày.", "para que", "present perfect change + purpose subjunctive", "đã + để + không", [
      unit("He reorganizado mi horario", "I have reorganized my schedule", "Tôi đã sắp xếp lại lịch", "states the completed change"),
      unit("para que", "so that", "để", "introduces the intended result with a different subject"),
      unit("el trabajo no ocupe", "work does not take up", "công việc không chiếm", "states the prevented outcome"),
      unit("todo el día", "the whole day", "cả ngày", "measures the time protected"),
    ]],
    ["Changing a habit", "duration and progress", "Llevo tres meses levantándome antes y ya noto la diferencia.", "I have been getting up earlier for three months, and I already notice the difference.", "Tôi đã dậy sớm hơn được ba tháng và đã nhận thấy sự khác biệt.", "Llevo... levantándome", "llevar + duration + gerund + result", "đã + verb + được + duration", [
      unit("Llevo tres meses", "for three months", "được ba tháng", "measures an activity continuing to now"),
      unit("levantándome antes", "getting up earlier", "Tôi đã dậy sớm hơn", "names the changed recurring habit"),
      unit("y ya noto", "and I already notice", "và đã nhận thấy", "states a present result"),
      unit("la diferencia", "the difference", "sự khác biệt", "names the perceived effect"),
    ]],
    ["Explaining motivation", "reason and value", "Decidí estudiar de nuevo porque quería abrirme nuevas posibilidades.", "I decided to study again because I wanted to open up new possibilities for myself.", "Tôi quyết định học lại vì muốn mở ra những khả năng mới cho mình.", "quería", "preterite decision + imperfect motivation", "quyết định + vì muốn", [
      unit("Decidí estudiar de nuevo", "I decided to study again", "Tôi quyết định học lại", "states the completed decision"),
      unit("porque", "because", "vì", "introduces the motivation"),
      unit("quería abrirme", "I wanted to open up for myself", "muốn mở ra cho mình", "states the ongoing desire behind the choice"),
      unit("nuevas posibilidades", "new possibilities", "những khả năng mới", "names the desired opportunities"),
    ]],
    ["Adjusting the plan", "goal with concession", "Aunque el proceso sea lento, seguiré practicando hasta expresarme con soltura.", "Even if the process is slow, I will keep practicing until I can express myself fluently.", "Dù quá trình có chậm, tôi vẫn sẽ tiếp tục luyện tập cho đến khi diễn đạt trôi chảy.", "Aunque... sea", "concessive subjunctive + future persistence", "dù... vẫn sẽ + cho đến khi", [
      unit("Aunque el proceso sea lento", "even if the process is slow", "Dù quá trình có chậm", "concedes a possible difficulty"),
      unit("seguiré practicando", "I will keep practicing", "tôi vẫn sẽ tiếp tục luyện tập", "states continued commitment"),
      unit("hasta", "until", "cho đến khi", "introduces the desired endpoint"),
      unit("expresarme con soltura", "expressing myself fluently", "diễn đạt trôi chảy", "names the functional goal"),
    ]],
  ]],
  [35, "Independent mediation", [
    ["Restating simply", "plain-language reformulation", "Dicho de otro modo, la empresa necesita gastar menos sin reducir la calidad.", "Put another way, the company needs to spend less without reducing quality.", "Nói cách khác, công ty cần chi ít hơn mà không làm giảm chất lượng.", "Dicho de otro modo", "reformulation marker + infinitive contrast", "nói cách khác + mà không", [
      unit("Dicho de otro modo", "put another way", "Nói cách khác", "signals a clearer reformulation"),
      unit("la empresa necesita gastar menos", "the company needs to spend less", "công ty cần chi ít hơn", "states the central constraint"),
      unit("sin reducir", "without reducing", "mà không làm giảm", "excludes an unwanted consequence"),
      unit("la calidad", "quality", "chất lượng", "names what must be preserved"),
    ]],
    ["Relaying instructions", "indirect practical speech", "Me pidió que te dijera que llevaras un documento de identidad.", "She asked me to tell you to bring an identity document.", "Cô ấy nhờ tôi nói với bạn mang theo giấy tờ tùy thân.", "me pidió que te dijera", "request + nested imperfect subjunctive", "nhờ + nói với + mang theo", [
      unit("Me pidió", "she asked me", "Cô ấy nhờ tôi", "reports the original request"),
      unit("que te dijera", "to tell you", "nói với bạn", "relays the requested communication"),
      unit("que llevaras", "that you bring", "mang theo", "states the embedded instruction"),
      unit("un documento de identidad", "an identity document", "giấy tờ tùy thân", "names the required item"),
    ]],
    ["Explaining a term", "accessible definition", "La mediación consiste en ayudar a dos partes a entenderse mejor.", "Mediation consists of helping two sides understand each other better.", "Hòa giải là giúp hai bên hiểu nhau rõ hơn.", "consiste en", "definition frame + infinitive", "là + verb + nhau", [
      unit("La mediación", "mediation", "Hòa giải", "names the concept being defined"),
      unit("consiste en", "consists of", "là", "introduces its defining function"),
      unit("ayudar a dos partes", "helping two sides", "giúp hai bên", "names the participants and support"),
      unit("a entenderse mejor", "understand each other better", "hiểu nhau rõ hơn", "states the reciprocal outcome"),
    ]],
    ["Checking understanding", "mediation repair", "¿Quieres decir que el cambio afecta al horario, pero no a nuestras responsabilidades?", "Do you mean that the change affects the schedule, but not our responsibilities?", "Ý bạn là thay đổi này ảnh hưởng đến lịch trình nhưng không ảnh hưởng đến trách nhiệm của chúng ta, đúng không?", "¿Quieres decir que...?", "understanding check + corrective contrast", "ý bạn là... nhưng không... đúng không", [
      unit("¿Quieres decir que", "do you mean that", "Ý bạn là", "checks the intended meaning"),
      unit("el cambio afecta al horario", "the change affects the schedule", "thay đổi này ảnh hưởng đến lịch trình", "restates the first proposition"),
      unit("pero no", "but not", "nhưng không", "excludes the second proposition"),
      unit("a nuestras responsabilidades?", "our responsibilities", "ảnh hưởng đến trách nhiệm của chúng ta, đúng không?", "names what is being checked as unaffected"),
    ]],
  ]],
  [36, "B1 integration", [
    ["Integrated account", "narration with evaluation", "Al principio dudaba, pero después de probarlo varias veces me di cuenta de que funcionaba.", "At first I doubted, but after trying it several times I realized that it worked.", "Ban đầu tôi nghi ngờ, nhưng sau khi thử vài lần, tôi nhận ra rằng nó có hiệu quả.", "me di cuenta de que", "imperfect stance + sequence + realization", "ban đầu + nhưng sau khi + nhận ra rằng", [
      unit("Al principio dudaba", "at first I doubted", "Ban đầu tôi nghi ngờ", "states the initial ongoing attitude"),
      unit("pero después de probarlo varias veces", "but after trying it several times", "nhưng sau khi thử vài lần", "marks the experience that changed the view"),
      unit("me di cuenta de que", "I realized that", "tôi nhận ra rằng", "introduces the new understanding"),
      unit("funcionaba", "it worked", "nó có hiệu quả", "states the discovered result"),
    ]],
    ["Integrated position", "opinion with concession", "Aunque entiendo las ventajas, preferiría esperar hasta que tengamos más información.", "Although I understand the advantages, I would prefer to wait until we have more information.", "Mặc dù hiểu những lợi ích, tôi muốn chờ đến khi chúng ta có thêm thông tin.", "hasta que tengamos", "concession + conditional preference + subjunctive endpoint", "mặc dù + muốn + đến khi", [
      unit("Aunque entiendo las ventajas", "although I understand the advantages", "Mặc dù hiểu những lợi ích", "acknowledges the positive case"),
      unit("preferiría esperar", "I would prefer to wait", "tôi muốn chờ", "states a cautious preference"),
      unit("hasta que", "until", "đến khi", "introduces the condition for proceeding"),
      unit("tengamos más información", "we have more information", "chúng ta có thêm thông tin", "states the missing basis"),
    ]],
    ["Integrated repair", "clarification and solution", "Si te he entendido bien, necesitas más apoyo; veamos cómo podemos organizarlo.", "If I have understood you correctly, you need more support; let us see how we can organize it.", "Nếu tôi hiểu đúng, bạn cần thêm hỗ trợ; chúng ta hãy xem có thể sắp xếp thế nào.", "Si te he entendido bien", "understanding check + collaborative imperative", "nếu hiểu đúng + hãy xem + có thể", [
      unit("Si te he entendido bien", "if I have understood you correctly", "Nếu tôi hiểu đúng", "checks the interpretation"),
      unit("necesitas más apoyo", "you need more support", "bạn cần thêm hỗ trợ", "restates the need"),
      unit("veamos", "let us see", "chúng ta hãy xem", "invites collaborative problem solving"),
      unit("cómo podemos organizarlo", "how we can organize it", "có thể sắp xếp thế nào", "opens the practical solution"),
    ]],
    ["B1 reflection", "independent learning reflection", "Ahora puedo explicar experiencias y opiniones, aunque todavía necesito ampliar mi vocabulario.", "I can now explain experiences and opinions, although I still need to expand my vocabulary.", "Bây giờ tôi có thể trình bày kinh nghiệm và ý kiến, mặc dù vẫn cần mở rộng vốn từ.", "aunque todavía", "present ability + factual concession", "bây giờ + có thể + mặc dù vẫn", [
      unit("Ahora puedo explicar", "I can now explain", "Bây giờ tôi có thể trình bày", "states current independent ability"),
      unit("experiencias y opiniones", "experiences and opinions", "kinh nghiệm và ý kiến", "names the communicative range"),
      unit("aunque todavía necesito", "although I still need", "mặc dù vẫn cần", "acknowledges continuing development"),
      unit("ampliar mi vocabulario", "to expand my vocabulary", "mở rộng vốn từ", "names the next learning need"),
    ]],
  ]],
];

let previous = "a2-u24-4-a2-reflection";
const lessons = [];
for (const [unitNumber, unitTitle, items] of groups) {
  for (const [index, item] of items.entries()) {
    const [title, skill, spanish, english, vietnamese, focus, pattern, bridgePattern, units] = item;
    const slug = title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const objectiveId = `b1-u${unitNumber}-${index + 1}-${slug}`;
    lessons.push({
      id: `${objectiveId}-lesson`, objectiveId, prerequisites: [previous], unit: unitNumber, lesson: index + 1,
      unitTitle, title, skill, spanish, english, vietnamese, focus, pattern, bridgePattern,
      units: units.map((entry) => ({
        ...entry,
        part: "Contextual phrase",
        spanishForm: `The Spanish scope “${entry.spanish}” is read as a complete grammatical unit in the ${pattern} construction; its tense, agreement, or linking form is preserved exactly as authored.`,
        vietnameseForm: `The Vietnamese scope “${entry.vietnamese}” is an analytic unit in the ${bridgePattern} construction; word order and any aspect, stance, or linking markers carry its grammatical work.`,
      })),
    });
    previous = objectiveId;
  }
}

export default { id: "b1-core-1", version: 1, level: "B1", lessons };
