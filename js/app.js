/* ═══════════════════════════════════════════════════════════
   PRIMER — robotics assistant: chat + translator + docs
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ───────────────────────── MODELS ───────────────────────── */
const MODELS = {
  spark: { name: 'Spark', full: 'Spark · LFM3-VL-2B',             desc: 'LFM3-VL-2B · fast replies, vision, 16K context — the everyday pick', speed: 11, badge: 'Fast' },
  pro:   { name: 'Pro',   full: 'Pro · MiMo V2.6 Distill 9B',     desc: 'MiMo-V2.6-Distill-Qwen-9B · strong reasoning + tools, vision, 16K context', speed: 21, badge: 'Recommended' },
};

// per-tier engine state (match backend ENGINE_CTX)
const TIER_STATE = {
  spark: { ctx: 16384, kvKB: 0,  vramHint: 'GDN attention — KV cache is small' },
  pro:   { ctx: 16384,  kvKB: 17, vramHint: 'KV q8_0: 4K ~68 MB · 8K ~136 MB · 16K ~272 MB · 32K ~544 MB · 64K ~1.1 GB' },
};

/* ───────────────────────── I18N (UI language) ───────────────────────── */
const UI_LANGS = {
  en: 'English',
  es: 'Español',
  zh: '简体中文',
  'zh-hant': '繁體中文',
  hi: 'हिन्दी',
  vi: 'Tiếng Việt',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
};
const UI_SHORT_CODE = {
  en: 'EN', es: 'ES', zh: '简中', 'zh-hans': '简中', 'zh-hant': '繁中', hi: 'HI', vi: 'VI',
  fr: 'FR', de: 'DE', pt: 'PT', ja: 'JA', ko: 'KO', ar: 'AR',
};
const UI_TO_TRANSLATE_CODE = { zh: 'zh-hans' };
const UI_TITLES = {
  en: 'Primer — Where should we start?',
  es: 'Primer — ¿Por dónde empezamos?',
  zh: 'Primer — 我们从哪里开始？',
  'zh-hant': 'Primer — 我們從哪裡開始？',
  hi: 'Primer — हम कहाँ से शुरू करें?',
  vi: 'Primer — Chúng ta bắt đầu từ đâu?',
  fr: 'Primer — Par quoi commencer ?',
  de: 'Primer — Wo fangen wir an?',
  pt: 'Primer — Por onde começamos?',
  ja: 'Primer — 何から始めましょうか？',
  ko: 'Primer — 무엇부터 시작할까요?',
  ar: 'Primer — من أين نبدأ؟',
};
const I18N = {
  en: {
    newChat: 'New chat', knowledgeNav: 'Knowledge base', allChats: 'All chats', recent: 'Recent', clearBtn: 'Clear',
    askNova: 'Ask Primer',
    whereStart: 'Where should we <em>start?</em>',
    homeSub: 'Ask technical questions, translate across 54 languages in chat, or browse robotics docs and code.',
    disclaimer: 'Primer can make mistakes. Double-check important info.',
    knowledgeLink: 'Tools, reference docs & multilingual glossary',
    allChatsTitle: 'All chats', allChatsSub: 'conversations with Primer', searchChats: 'Search chats', clearAllBtn: 'Clear all',
    knowledgeTitle: 'Knowledge base', knowledgeSub: 'Tools, reference docs & technical glossary — indexed into Primer chat',
    kbAddSource: 'Add source', kbTabAll: 'All', kbTabTools: 'Tools & Stack', kbTabDocs: 'Reference Docs', kbTabGlossary: 'Glossary',
    kbSearchPh: 'Search sources, tools, SOPs, terms…', kbEmpty: 'No matching sources found. Try a different search or add a new source.',
    epTitle: 'Engine settings', epTierLabel: 'Model tier', epReasoningLabel: 'Reasoning',
    epReasoningHint: 'hidden "thinking" step · better answers, slower', epCtxLabel: 'Context window',
    epFreeMem: 'Free memory', epReset: 'Reset',
    clpSiteTitle: 'Site & chat language', clpTranslatorToggle: 'In-chat translator',
    clpSiteHint: "Translates the entire site & sets Primer's response language",
    inlineTrPh: 'Type in the box below to translate live with context…',
    copyBtn: 'Copy', useBtn: 'Use', sendBtn: 'Send',
    uploadFiles: 'Upload files', uploadImage: 'Upload image',
    repoLangLabel: 'Repository language',
    settingsTitle: 'Settings', settingsSub: 'Make Primer yours.',
    langName: 'App language', langDesc: 'Switch the whole interface & chat language',
    simpleName: 'Simple English mode', simpleDesc: 'Primer answers in short, simple sentences — easier while you are learning',
    glowName: 'Ambient glow', glowDesc: 'Soft ember backdrop behind the interface',
    streamName: 'Streaming responses', streamDesc: 'Watch Primer think in real time, word by word',
    soundName: 'Sound effects', soundDesc: 'Gentle chimes when messages are sent and received',
    phrasebookMatch: 'Phrasebook match', wordMatch: 'Word-by-word (approximate)',
  },
  es: {
    newChat: 'Nueva conversación', knowledgeNav: 'Base de conocimientos', allChats: 'Todas las conversaciones', recent: 'Recientes', clearBtn: 'Borrar',
    askNova: 'Pregúntale a Primer',
    whereStart: '¿Por dónde <em>empezamos?</em>',
    disclaimer: 'Primer puede cometer errores. Verifica la información importante.',
    knowledgeLink: 'Herramientas, documentos de referencia y glosario',
    allChatsTitle: 'Todas las conversaciones', allChatsSub: 'conversaciones con Primer', searchChats: 'Buscar conversaciones', clearAllBtn: 'Borrar todo',
    knowledgeTitle: 'Base de conocimientos', knowledgeSub: 'Herramientas, documentos de referencia y glosario técnico en varios idiomas',
    kbAddSource: 'Añadir fuente', kbTabAll: 'Todo', kbTabTools: 'Herramientas', kbTabDocs: 'Documentos', kbTabGlossary: 'Glosario',
    kbSearchPh: 'Buscar fuentes, herramientas, SOPs, términos…', kbEmpty: 'No hay fuentes que coincidan.',
    epTitle: 'Configuración del motor', epTierLabel: 'Nivel de modelo', epReasoningLabel: 'Razonamiento',
    epReasoningHint: 'paso de pensamiento oculto · mejores respuestas', epCtxLabel: 'Ventana de contexto',
    epFreeMem: 'Liberar memoria', epReset: 'Restablecer',
    clpSiteTitle: 'Idioma del sitio y chat', clpTranslatorToggle: 'Traductor en el chat',
    clpSiteHint: 'Traduce todo el sitio y define el idioma de respuesta de Primer',
    inlineTrPh: 'Escribe abajo para traducir en vivo dentro del chat…',
    copyBtn: 'Copiar', useBtn: 'Usar', sendBtn: 'Enviar',
    uploadFiles: 'Subir archivos', uploadImage: 'Subir imagen',
    repoLangLabel: 'Idioma del repositorio',
    settingsTitle: 'Ajustes', settingsSub: 'Haz que Primer sea tuyo.',
    langName: 'Idioma de la aplicación', langDesc: 'Cambia el idioma de todo el sitio y del chat',
    simpleName: 'Modo lenguaje simple', simpleDesc: 'Primer responde con frases cortas y sencillas',
    glowName: 'Resplandor ambiental', glowDesc: 'Fondo cálido detrás de la interfaz',
    streamName: 'Respuestas en tiempo real', streamDesc: 'Mira a Primer escribir palabra por palabra',
    soundName: 'Efectos de sonido', soundDesc: 'Tonos suaves al enviar y recibir mensajes',
    phrasebookMatch: 'Coincidencia de frase', wordMatch: 'Palabra por palabra (aproximado)',
  },
  zh: {
    newChat: '新对话', knowledgeNav: '知识库', allChats: '所有对话', recent: '最近对话', clearBtn: '清空',
    askNova: '向 Primer 提问',
    whereStart: '我们从哪里<em>开始？</em>',
    disclaimer: 'Primer 可能会出错，请核对重要信息。',
    knowledgeLink: '工具、参考文档与多语言术语表',
    allChatsTitle: '所有对话', allChatsSub: '与 Primer 的对话', searchChats: '搜索对话', clearAllBtn: '清空全部',
    knowledgeTitle: '知识库', knowledgeSub: '常用工具、参考技术文档与多语言术语表 — 自动接入对话',
    kbAddSource: '添加来源', kbTabAll: '全部', kbTabTools: '工具与栈', kbTabDocs: '参考文档', kbTabGlossary: '术语表',
    kbSearchPh: '搜索工具、文档、SOP、术语…', kbEmpty: '未找到匹配的来源。请尝试其他关键词或添加来源。',
    epTitle: '引擎设置', epTierLabel: '模型档位', epReasoningLabel: '深度思考',
    epReasoningHint: '隐藏推理步骤 · 回答更准确', epCtxLabel: '上下文窗口',
    epFreeMem: '释放内存', epReset: '重置',
    clpSiteTitle: '界面与对话语言', clpTranslatorToggle: '聊天内翻译器',
    clpSiteHint: '翻译整个网页界面并设置 Primer 的回复语言',
    inlineTrPh: '在下方输入框打字即可实时翻译并发送…',
    copyBtn: '复制', useBtn: '填入', sendBtn: '发送',
    uploadFiles: '上传文件', uploadImage: '上传图片',
    repoLangLabel: '仓库语言筛选',
    settingsTitle: '设置', settingsSub: '定制属于你的 Primer。',
    langName: '应用语言', langDesc: '切换整个界面与助手回复语言',
    simpleName: '简化语言模式', simpleDesc: '用更简短易懂的句子回复',
    glowName: '环境光晕', glowDesc: '界面背部的柔和暖色背景光',
    streamName: '流式输出', streamDesc: '实时逐字查看回复',
    soundName: '提示音效', soundDesc: '收发消息时播放轻柔提示音',
    phrasebookMatch: '常用短语匹配', wordMatch: '逐词翻译（近似）',
  },
  'zh-hant': {
    newChat: '新對話', knowledgeNav: '知識庫', allChats: '所有對話', recent: '最近對話', clearBtn: '清除',
    askNova: '詢問 Primer',
    whereStart: '我們從哪裡<em>開始？</em>',
    disclaimer: 'Primer 可能會犯錯，請覆核重要資訊。',
    knowledgeLink: '工具、參考文件與多語言術語表',
    allChatsTitle: '所有對話', allChatsSub: '與 Primer 的對話', searchChats: '搜尋對話', clearAllBtn: '全部清除',
    knowledgeTitle: '知識庫', knowledgeSub: '使用的工具、參考文件與術語表 — 自動支援對話',
    kbAddSource: '新增來源', kbTabAll: '全部', kbTabTools: '工具與技術', kbTabDocs: '參考文件', kbTabGlossary: '術語表',
    kbSearchPh: '搜尋來源、工具、SOP、術語…', kbEmpty: '找不到相符的來源。',
    epTitle: '引擎設定', epTierLabel: '模型等級', epReasoningLabel: '深度推理',
    epReasoningHint: '隱藏思考步驟 · 回答更精準', epCtxLabel: '上下文視窗',
    epFreeMem: '釋放記憶體', epReset: '重設',
    clpSiteTitle: '網站與對話語言', clpTranslatorToggle: '聊天內翻譯器',
    clpSiteHint: '翻譯整個網站介面並設定 Primer 的回覆語言',
    inlineTrPh: '在下方輸入內容即可即時翻譯…',
    copyBtn: '複製', useBtn: '使用', sendBtn: '傳送',
    uploadFiles: '上傳檔案', uploadImage: '上傳圖片',
    repoLangLabel: '程式碼語言',
    settingsTitle: '設定', settingsSub: '打造你的專屬 Primer。',
    langName: '應用程式語言', langDesc: '切換整個介面與對話語言',
    simpleName: '簡易語言模式', simpleDesc: '使用簡短清晰的句子回覆',
    glowName: '環境光暈', glowDesc: '介面背景柔和暖光',
    streamName: '串流回應', streamDesc: '即時逐字顯示回覆',
    soundName: '音效', soundDesc: '收發訊息時的柔和提示音',
    phrasebookMatch: '片語庫比對', wordMatch: '逐詞近似翻譯',
  },
  hi: {
    newChat: 'नई चैट', knowledgeNav: 'ज्ञान डेटाबेस', allChats: 'सभी चैट', recent: 'हालिया', clearBtn: 'साफ़ करें',
    askNova: 'Primer से पूछें',
    whereStart: 'हम कहाँ से <em>शुरू करें?</em>',
    disclaimer: 'Primer से ग़लतियाँ हो सकती हैं। महत्वपूर्ण जानकारी की जाँच करें।',
    knowledgeLink: 'टूल्स, संदर्भ दस्तावेज़ और शब्दावली',
    allChatsTitle: 'सभी चैट', allChatsSub: 'Primer के साथ बातचीत', searchChats: 'चैट खोजें', clearAllBtn: 'सब साफ़ करें',
    knowledgeTitle: 'ज्ञान डेटाबेस', knowledgeSub: 'हमारे टूल्स, संदर्भ दस्तावेज़ और शब्दावली — चैट में सीधे उपलब्ध',
    kbAddSource: 'स्रोत जोड़ें', kbTabAll: 'सभी', kbTabTools: 'टूल्स और स्टैक', kbTabDocs: 'संदर्भ दस्तावेज़', kbTabGlossary: 'शब्दावली',
    kbSearchPh: 'स्रोत, टूल्स, SOP, शब्द खोजें…', kbEmpty: 'कोई मेल खाने वाला स्रोत नहीं मिला।',
    epTitle: 'इंजन सेटिंग्स', epTierLabel: 'मॉडल टियर', epReasoningLabel: 'रीज़निंग',
    epReasoningHint: 'छिपा हुआ विचार चरण · बेहतर उत्तर', epCtxLabel: 'कॉन्टेक्स्ट विंडो',
    epFreeMem: 'मेमोरी खाली करें', epReset: 'रीसेट',
    clpSiteTitle: 'साइट और चैट भाषा', clpTranslatorToggle: 'चैट में अनुवादक',
    clpSiteHint: 'पूरी साइट का अनुवाद करें और Primer की उत्तर भाषा सेट करें',
    inlineTrPh: 'लाइव अनुवाद के लिए नीचे टाइप करें…',
    copyBtn: 'कॉपी', useBtn: 'उपयोग करें', sendBtn: 'भेजें',
    uploadFiles: 'फ़ाइलें अपलोड करें', uploadImage: 'छवि अपलोड करें',
    repoLangLabel: 'रिपॉजिटरी भाषा',
    settingsTitle: 'सेटिंग्स', settingsSub: 'Primer को अपने अनुसार बनाएँ।',
    langName: 'ऐप भाषा', langDesc: 'पूरे इंटरफ़ेस और चैट की भाषा बदलें',
    simpleName: 'सरल भाषा मोड', simpleDesc: 'Primer छोटे और सरल वाक्यों में उत्तर देता है',
    glowName: 'एम्बिएंट ग्लो', glowDesc: 'इंटरफ़ेस के पीछे हल्की रोशनी',
    streamName: 'स्ट्रीमिंग उत्तर', streamDesc: 'शब्द-दर-शब्द उत्तर बनते देखें',
    soundName: 'ध्वनि प्रभाव', soundDesc: 'संदेश भेजने और प्राप्त करने पर हल्की ध्वनि',
    phrasebookMatch: 'वाक्यांश मिलान', wordMatch: 'शब्द-दर-शब्द (अनुमानित)',
  },
  vi: {
    newChat: 'Đoạn chat mới', knowledgeNav: 'Cơ sở tri thức', allChats: 'Tất cả đoạn chat', recent: 'Gần đây', clearBtn: 'Xóa',
    askNova: 'Hỏi Primer',
    whereStart: 'Chúng ta <em>bắt đầu</em> từ đâu?',
    disclaimer: 'Primer có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.',
    knowledgeLink: 'Công cụ, tài liệu tham khảo & thuật ngữ',
    allChatsTitle: 'Tất cả đoạn chat', allChatsSub: 'cuộc trò chuyện với Primer', searchChats: 'Tìm kiếm chat', clearAllBtn: 'Xóa tất cả',
    knowledgeTitle: 'Cơ sở tri thức', knowledgeSub: 'Công cụ, tài liệu tham khảo & từ điển đa ngôn ngữ',
    kbAddSource: 'Thêm nguồn', kbTabAll: 'Tất cả', kbTabTools: 'Công cụ & Stack', kbTabDocs: 'Tài liệu', kbTabGlossary: 'Thuật ngữ',
    kbSearchPh: 'Tìm nguồn, công cụ, quy trình, thuật ngữ…', kbEmpty: 'Không tìm thấy nguồn phù hợp.',
    epTitle: 'Cài đặt mô hình', epTierLabel: 'Cấp độ mô hình', epReasoningLabel: 'Suy luận',
    epReasoningHint: 'bước suy nghĩ ẩn · trả lời sâu hơn', epCtxLabel: 'Cửa sổ ngữ cảnh',
    epFreeMem: 'Giải phóng RAM', epReset: 'Đặt lại',
    clpSiteTitle: 'Ngôn ngữ trang & chat', clpTranslatorToggle: 'Dịch ngay trong chat',
    clpSiteHint: 'Dịch toàn bộ giao diện và đặt ngôn ngữ trả lời của Primer',
    inlineTrPh: 'Nhập bên dưới để dịch trực tiếp ngay trong khung chat…',
    copyBtn: 'Sao chép', useBtn: 'Dùng', sendBtn: 'Gửi',
    uploadFiles: 'Tải tệp lên', uploadImage: 'Tải ảnh lên',
    repoLangLabel: 'Ngôn ngữ kho mã',
    settingsTitle: 'Cài đặt', settingsSub: 'Tùy chỉnh Primer theo ý bạn.',
    langName: 'Ngôn ngữ ứng dụng', langDesc: 'Chuyển đổi toàn bộ ngôn ngữ trang web',
    simpleName: 'Chế độ tiếng Anh đơn giản', simpleDesc: 'Primer trả lời bằng câu ngắn gọn, dễ hiểu',
    glowName: 'Ánh sáng nền', glowDesc: 'Nền ánh sáng ấm dịu phía sau giao diện',
    streamName: 'Phản hồi trực tiếp', streamDesc: 'Xem Primer trả lời từng chữ theo thời gian thực',
    soundName: 'Hiệu ứng âm thanh', soundDesc: 'Âm báo nhẹ khi gửi và nhận tin nhắn',
    phrasebookMatch: 'Khớp cụm từ', wordMatch: 'Dịch từng từ (ước lượng)',
  },
  fr: {
    newChat: 'Nouvelle discussion', knowledgeNav: 'Base de connaissances', allChats: 'Toutes les discussions', recent: 'Récentes', clearBtn: 'Effacer',
    askNova: 'Demande à Primer',
    whereStart: 'Par quoi <em>commencer&nbsp;?</em>',
    disclaimer: 'Primer peut faire des erreurs. Vérifiez les informations importantes.',
    knowledgeLink: 'Outils, documents de référence & glossaire multilingue',
    allChatsTitle: 'Toutes les discussions', allChatsSub: 'discussions avec Primer', searchChats: 'Rechercher des discussions', clearAllBtn: 'Tout effacer',
    knowledgeTitle: 'Base de connaissances', knowledgeSub: 'Outils utilisés, documentation de référence et glossaire technique — indexés pour Primer',
    kbAddSource: 'Ajouter une source', kbTabAll: 'Tout', kbTabTools: 'Outils & Stack', kbTabDocs: 'Documents', kbTabGlossary: 'Glossaire',
    kbSearchPh: 'Rechercher outils, SOP, termes…', kbEmpty: 'Aucune source correspondante trouvée.',
    epTitle: 'Paramètres moteur', epTierLabel: 'Niveau du modèle', epReasoningLabel: 'Raisonnement',
    epReasoningHint: 'étape de réflexion cachée · meilleures réponses', epCtxLabel: 'Fenêtre de contexte',
    epFreeMem: 'Libérer la mémoire', epReset: 'Réinitialiser',
    clpSiteTitle: 'Langue du site et du chat', clpTranslatorToggle: 'Traducteur intégré',
    clpSiteHint: 'Traduit tout le site et définit la langue de réponse de Primer',
    inlineTrPh: 'Tapez ci-dessous pour traduire en direct avec le contexte…',
    copyBtn: 'Copier', useBtn: 'Utiliser', sendBtn: 'Envoyer',
    uploadFiles: 'Importer des fichiers', uploadImage: 'Importer une image',
    repoLangLabel: 'Langage du dépôt',
    settingsTitle: 'Paramètres', settingsSub: 'Personnalisez Primer.',
    langName: "Langue de l'application", langDesc: "Changez toute la langue de l'interface et du chat",
    simpleName: 'Mode langage simple', simpleDesc: 'Primer répond avec des phrases courtes et simples',
    glowName: 'Halo ambiant', glowDesc: "Arrière-plan chaleureux derrière l'interface",
    streamName: 'Réponses en streaming', streamDesc: 'Regardez Primer répondre mot par mot',
    soundName: 'Effets sonores', soundDesc: 'Doux sons lors de l’envoi et la réception',
    phrasebookMatch: 'Correspondance phrase', wordMatch: 'Mot à mot (approximatif)',
  },
  de: {
    newChat: 'Neuer Chat', knowledgeNav: 'Wissensdatenbank', allChats: 'Alle Chats', recent: 'Verlauf', clearBtn: 'Löschen',
    askNova: 'Frag Primer',
    whereStart: 'Wo sollen wir <em>anfangen?</em>',
    disclaimer: 'Primer kann Fehler machen. Überprüfe wichtige Informationen.',
    knowledgeLink: 'Tools, Referenzdokumente & mehrsprachiges Glossar',
    allChatsTitle: 'Alle Chats', allChatsSub: 'Gespräche mit Primer', searchChats: 'Chats durchsuchen', clearAllBtn: 'Alles löschen',
    knowledgeTitle: 'Wissensdatenbank', knowledgeSub: 'Tools, Referenzdokumente & Technik-Glossar — direkt im Chat nutzbar',
    kbAddSource: 'Quelle hinzufügen', kbTabAll: 'Alle', kbTabTools: 'Tools & Stack', kbTabDocs: 'Dokumente', kbTabGlossary: 'Glossar',
    kbSearchPh: 'Tools, Anleitungen, Begriffe suchen…', kbEmpty: 'Keine passenden Quellen gefunden.',
    epTitle: 'Engine-Einstellungen', epTierLabel: 'Modell-Stufe', epReasoningLabel: 'Reasoning',
    epReasoningHint: 'versteckter Denkschritt · klügere Antworten', epCtxLabel: 'Kontextfenster',
    epFreeMem: 'Speicher freigeben', epReset: 'Zurücksetzen',
    clpSiteTitle: 'Website- & Chat-Sprache', clpTranslatorToggle: 'Chat-Übersetzer',
    clpSiteHint: 'Übersetzt die gesamte Website & Primers Antwortsprache',
    inlineTrPh: 'Unten tippen, um live im Chat zu übersetzen…',
    copyBtn: 'Kopieren', useBtn: 'Übernehmen', sendBtn: 'Senden',
    uploadFiles: 'Dateien hochladen', uploadImage: 'Bild hochladen',
    repoLangLabel: 'Repository-Sprache',
    settingsTitle: 'Einstellungen', settingsSub: 'Passe Primer an dich an.',
    langName: 'App-Sprache', langDesc: 'Sprache der gesamten Oberfläche umschalten',
    simpleName: 'Einfacher Modus', simpleDesc: 'Kurze, leicht verständliche Sätze',
    glowName: 'Umgebungslicht', glowDesc: 'Sanfter Hintergrundschimmer',
    streamName: 'Live-Antworten', streamDesc: 'Antworten Wort für Wort anzeigen',
    soundName: 'Soundeffekte', soundDesc: 'Dezente Töne beim Senden und Empfangen',
    phrasebookMatch: 'Phrasen-Treffer', wordMatch: 'Wort für Wort (näherungsweise)',
  },
  pt: {
    newChat: 'Nova conversa', knowledgeNav: 'Base de conhecimento', allChats: 'Todas as conversas', recent: 'Recentes', clearBtn: 'Apagar',
    askNova: 'Pergunte ao Primer',
    whereStart: 'Por onde <em>começamos?</em>',
    disclaimer: 'O Primer pode cometer erros. Verifique as informações importantes.',
    knowledgeLink: 'Ferramentas, documentos de referência e glossário',
    allChatsTitle: 'Todas as conversas', allChatsSub: 'conversas com o Primer', searchChats: 'Buscar conversas', clearAllBtn: 'Apagar tudo',
    knowledgeTitle: 'Base de conhecimento', knowledgeSub: 'Ferramentas, documentos de referência e glossário multilíngue',
    kbAddSource: 'Adicionar fonte', kbTabAll: 'Tudo', kbTabTools: 'Ferramentas', kbTabDocs: 'Documentos', kbTabGlossary: 'Glossário',
    kbSearchPh: 'Buscar ferramentas, SOPs, termos…', kbEmpty: 'Nenhuma fonte encontrada.',
    epTitle: 'Configurações do motor', epTierLabel: 'Nível do modelo', epReasoningLabel: 'Raciocínio',
    epReasoningHint: 'etapa oculta · respostas melhores', epCtxLabel: 'Janela de contexto',
    epFreeMem: 'Liberar memória', epReset: 'Redefinir',
    clpSiteTitle: 'Idioma do site e chat', clpTranslatorToggle: 'Tradutor no chat',
    clpSiteHint: 'Traduz todo o site e define o idioma de resposta do Primer',
    inlineTrPh: 'Digite abaixo para traduzir ao vivo no chat…',
    copyBtn: 'Copiar', useBtn: 'Usar', sendBtn: 'Enviar',
    uploadFiles: 'Enviar arquivos', uploadImage: 'Enviar imagem',
    repoLangLabel: 'Idioma do repositório',
    settingsTitle: 'Configurações', settingsSub: 'Deixe o Primer do seu jeito.',
    langName: 'Idioma do aplicativo', langDesc: 'Mude o idioma da interface e do chat',
    simpleName: 'Modo simples', simpleDesc: 'Respostas com frases curtas e fáceis',
    glowName: 'Brilho ambiental', glowDesc: 'Fundo quente por trás da interface',
    streamName: 'Respostas em tempo real', streamDesc: 'Veja o Primer responder palavra por palavra',
    soundName: 'Efeitos sonoros', soundDesc: 'Sinos suaves ao enviar e receber mensagens',
    phrasebookMatch: 'Correspondência de frase', wordMatch: 'Palavra por palavra (aproximado)',
  },
  ja: {
    newChat: '新しいチャット', knowledgeNav: 'ナレッジベース', allChats: 'すべてのチャット', recent: '最近', clearBtn: 'クリア',
    askNova: 'Primer に聞く',
    whereStart: 'どこから<em>始めますか？</em>',
    disclaimer: 'Primer は誤答する場合があります。重要な情報はご確認ください。',
    knowledgeLink: '使用ツール、参考資料、多言語用語集',
    allChatsTitle: 'すべてのチャット', allChatsSub: 'Primer との会話', searchChats: 'チャットを検索', clearAllBtn: 'すべて削除',
    knowledgeTitle: 'ナレッジベース', knowledgeSub: '使用ツール、参考資料、多言語用語集（チャットに自動連携）',
    kbAddSource: 'ソースを追加', kbTabAll: 'すべて', kbTabTools: 'ツール・構成', kbTabDocs: '参考資料', kbTabGlossary: '用語集',
    kbSearchPh: 'ツール・手順書・用語を検索…', kbEmpty: '一致するソースがありません。',
    epTitle: 'エンジン設定', epTierLabel: 'モデルティア', epReasoningLabel: '推論モード',
    epReasoningHint: '内部思考ステップ・より高精度', epCtxLabel: 'コンテキスト長',
    epFreeMem: 'メモリ解放', epReset: 'リセット',
    clpSiteTitle: 'サイト＆チャット言語', clpTranslatorToggle: 'チャット内翻訳',
    clpSiteHint: 'サイト全体を翻訳し、Primer の返答言語を設定します',
    inlineTrPh: '下に入力するとチャット内でリアルタイム翻訳します…',
    copyBtn: 'コピー', useBtn: '入力に使う', sendBtn: '送信',
    uploadFiles: 'ファイルを追加', uploadImage: '画像を追加',
    repoLangLabel: '言語フィルター',
    settingsTitle: '設定', settingsSub: 'Primer を自分好みに。',
    langName: '表示言語', langDesc: 'UI全体とチャットの言語を切り替えます',
    simpleName: 'やさしい表現モード', simpleDesc: '短くわかりやすい文で回答します',
    glowName: 'アンビエントグロー', glowDesc: '背景の温かな光エフェクト',
    streamName: 'ストリーミング表示', streamDesc: 'リアルタイムで文字を表示します',
    soundName: '効果音', soundDesc: '送受信時に控えめな通知音を鳴らします',
    phrasebookMatch: 'フレーズ一致', wordMatch: '単語ごとの翻訳',
  },
  ko: {
    newChat: '새 채팅', knowledgeNav: '지식 데이터베이스', allChats: '모든 채팅', recent: '최근 대화', clearBtn: '지우기',
    askNova: 'Primer에게 물어보기',
    whereStart: '무엇부터 <em>시작할까요?</em>',
    disclaimer: 'Primer는 실수할 수 있습니다. 중요한 정보는 다시 확인하세요.',
    knowledgeLink: '사용 도구, 참고 문서 및 다국어 용어집',
    allChatsTitle: '모든 채팅', allChatsSub: 'Primer와의 대화', searchChats: '채팅 검색', clearAllBtn: '모두 삭제',
    knowledgeTitle: '지식 데이터베이스', knowledgeSub: '사용 도구 및 AI 스택, 참고 문서, 다국어 용어집',
    kbAddSource: '소스 추가', kbTabAll: '전체', kbTabTools: '도구 & 스택', kbTabDocs: '참고 문서', kbTabGlossary: '용어집',
    kbSearchPh: '도구, SOP, 용어 검색…', kbEmpty: '일치하는 소스가 없습니다.',
    epTitle: '엔진 설정', epTierLabel: '모델 등급', epReasoningLabel: '추론',
    epReasoningHint: '숨겨진 사고 단계 · 더 정확한 답변', epCtxLabel: '컨텍스트 창',
    epFreeMem: '메모리 해제', epReset: '초기화',
    clpSiteTitle: '사이트 및 채팅 언어', clpTranslatorToggle: '채팅 내 번역기',
    clpSiteHint: '전체 UI를 번역하고 Primer의 응답 언어를 설정합니다',
    inlineTrPh: '아래에 입력하면 채팅에서 실시간으로 번역됩니다…',
    copyBtn: '복사', useBtn: '적용', sendBtn: '전송',
    uploadFiles: '파일 업로드', uploadImage: '이미지 업로드',
    repoLangLabel: '저장소 언어',
    settingsTitle: '설정', settingsSub: '나에게 맞게 설정하세요.',
    langName: '앱 언어', langDesc: '전체 인터페이스와 채팅 언어 전환',
    simpleName: '쉬운 표현 모드', simpleDesc: '짧고 이해하기 쉬운 문장으로 답변합니다',
    glowName: '배경 글로우', glowDesc: '인터페이스 뒤의 은은한 조명 효과',
    streamName: '실시간 스트리밍', streamDesc: '답변을 한 글자씩 실시간으로 표시합니다',
    soundName: '효과음', soundDesc: '메시지 송수신 시 부드러운 알림음 재생',
    phrasebookMatch: '문구 일치', wordMatch: '단어별 근사 번역',
  },
  ar: {
    newChat: 'محادثة جديدة', knowledgeNav: 'قاعدة المعرفة', allChats: 'كل المحادثات', recent: 'الأخيرة', clearBtn: 'مسح',
    askNova: 'اسأل Primer',
    whereStart: 'من أين <em>نبدأ؟</em>',
    disclaimer: 'قد يرتكب Primer أخطاءً. تحقق من المعلومات المهمة.',
    knowledgeLink: 'الأدوات، مستندات المرجع والمعجم',
    allChatsTitle: 'كل المحادثات', allChatsSub: 'محادثات مع Primer', searchChats: 'بحث في المحادثات', clearAllBtn: 'مسح الكل',
    knowledgeTitle: 'قاعدة المعرفة', knowledgeSub: 'الأدوات والمكتبات، الوثائق المرجعية والمعجم التقني متعدد اللغات',
    kbAddSource: 'إضافة مصدر', kbTabAll: 'الكل', kbTabTools: 'الأدوات', kbTabDocs: 'المستندات', kbTabGlossary: 'المعجم',
    kbSearchPh: 'ابحث في الأدوات والمستندات والمصطلحات…', kbEmpty: 'لم يتم العثور على مصادر مطابقة.',
    epTitle: 'إعدادات المحرك', epTierLabel: 'مستوى النموذج', epReasoningLabel: 'التفكير المنطقي',
    epReasoningHint: 'خطوة تفكير مخفية · إجابات أدق', epCtxLabel: 'نافذة السياق',
    epFreeMem: 'تحرير الذاكرة', epReset: 'إعادة ضبط',
    clpSiteTitle: 'لغة الموقع والمحادثة', clpTranslatorToggle: 'المترجم داخل الدردشة',
    clpSiteHint: 'يترجم واجهة الموقع بالكامل ويحدد لغة ردود Primer',
    inlineTrPh: 'اكتب بالأسفل للترجمة الفورية داخل الدردشة…',
    copyBtn: 'نسخ', useBtn: 'استخدام', sendBtn: 'إرسال',
    uploadFiles: 'رفع ملفات', uploadImage: 'رفع صورة',
    repoLangLabel: 'لغة المستودع',
    settingsTitle: 'الإعدادات', settingsSub: 'خصّص تجربة Primer.',
    langName: 'لغة التطبيق', langDesc: 'تغيير لغة الواجهة والمحادثة بالكامل',
    simpleName: 'الوضع البسيط', simpleDesc: 'إجابات بجمل قصيرة وسهلة الفهم',
    glowName: 'الإضاءة المحيطية', glowDesc: 'توهج خفيف خلف الواجهة',
    streamName: 'البث المباشر للردود', streamDesc: 'شاهد Primer يكتب كلمة بكلمة',
    soundName: 'المؤثرات الصوتية', soundDesc: 'نغمات هادئة عند إرسال واستلام الرسائل',
    phrasebookMatch: 'مطابقة العبارة', wordMatch: 'كلمة بكلمة (تقريبي)',
  },
};

const EXTRA_I18N = {
  en: ['Code explorer', 'Use chat context'],
  es: ['Explorador de código', 'Usar el contexto del chat'],
  zh: ['代码浏览器', '使用聊天上下文'],
  'zh-hant': ['程式碼瀏覽器', '使用聊天脈絡'],
  hi: ['कोड एक्सप्लोरर', 'चैट संदर्भ का उपयोग करें'],
  vi: ['Trình duyệt mã', 'Dùng ngữ cảnh trò chuyện'],
  fr: ['Explorateur de code', 'Utiliser le contexte du chat'],
  de: ['Code-Explorer', 'Chatkontext verwenden'],
  pt: ['Explorador de código', 'Usar o contexto da conversa'],
  ja: ['コードエクスプローラー', '会話の文脈を使う'],
  ko: ['코드 탐색기', '대화 맥락 사용'],
  ar: ['مستعرض الشيفرة', 'استخدام سياق المحادثة'],
};
Object.entries(EXTRA_I18N).forEach(([lang, values]) => {
  I18N[lang].teamCode = values[0];
  I18N[lang].useChatContext = values[1];
});
const SOURCE_I18N = {
  en: ['Add a reference, note, text file, or glossary term. Your additions are saved in this browser and can be used in chat.', 'Upload a text file', 'Choose file', 'Category', 'Title or filename', 'Source link (optional)', 'Content, summary, or tip', 'Tags (comma-separated)', 'Cancel', 'Save to Knowledge Base'],
  es: ['Añade una referencia, nota, archivo de texto o término. Se guardará en este navegador para usarlo en el chat.', 'Subir archivo de texto', 'Elegir archivo', 'Categoría', 'Título o nombre del archivo', 'Enlace de origen (opcional)', 'Contenido, resumen o consejo', 'Etiquetas (separadas por comas)', 'Cancelar', 'Guardar en la base'],
  zh: ['添加参考资料、笔记、文本文件或术语。内容保存在此浏览器中，可用于聊天。', '上传文本文件', '选择文件', '类别', '标题或文件名', '来源链接（可选）', '内容、摘要或提示', '标签（用逗号分隔）', '取消', '保存到知识库'],
  'zh-hant': ['新增參考資料、筆記、文字檔或術語。內容儲存在此瀏覽器中，可用於聊天。', '上傳文字檔', '選擇檔案', '類別', '標題或檔名', '來源連結（選填）', '內容、摘要或提示', '標籤（以逗號分隔）', '取消', '儲存至知識庫'],
  hi: ['संदर्भ, नोट, टेक्स्ट फ़ाइल या शब्द जोड़ें। यह ब्राउज़र में सेव होगा और चैट में उपयोग होगा।', 'टेक्स्ट फ़ाइल अपलोड करें', 'फ़ाइल चुनें', 'श्रेणी', 'शीर्षक या फ़ाइल नाम', 'स्रोत लिंक (वैकल्पिक)', 'सामग्री, सारांश या सुझाव', 'टैग (कॉमा से अलग)', 'रद्द करें', 'ज्ञान आधार में सेव करें'],
  vi: ['Thêm tài liệu, ghi chú, tệp văn bản hoặc thuật ngữ. Dữ liệu được lưu trong trình duyệt này để dùng trong chat.', 'Tải tệp văn bản', 'Chọn tệp', 'Danh mục', 'Tiêu đề hoặc tên tệp', 'Liên kết nguồn (tùy chọn)', 'Nội dung, tóm tắt hoặc mẹo', 'Thẻ (phân cách bằng dấu phẩy)', 'Hủy', 'Lưu vào cơ sở kiến thức'],
  fr: ['Ajoutez une référence, une note, un fichier texte ou un terme. Les ajouts sont enregistrés dans ce navigateur pour le chat.', 'Importer un fichier texte', 'Choisir un fichier', 'Catégorie', 'Titre ou nom du fichier', 'Lien source (facultatif)', 'Contenu, résumé ou conseil', 'Étiquettes (séparées par des virgules)', 'Annuler', 'Enregistrer dans la base'],
  de: ['Füge eine Quelle, Notiz, Textdatei oder einen Begriff hinzu. Die Daten werden in diesem Browser für den Chat gespeichert.', 'Textdatei hochladen', 'Datei auswählen', 'Kategorie', 'Titel oder Dateiname', 'Quellenlink (optional)', 'Inhalt, Zusammenfassung oder Tipp', 'Tags (durch Kommas getrennt)', 'Abbrechen', 'In Wissensdatenbank speichern'],
  pt: ['Adicione uma referência, nota, arquivo de texto ou termo. Os dados ficam neste navegador e podem ser usados no chat.', 'Enviar arquivo de texto', 'Escolher arquivo', 'Categoria', 'Título ou nome do arquivo', 'Link da fonte (opcional)', 'Conteúdo, resumo ou dica', 'Etiquetas (separadas por vírgula)', 'Cancelar', 'Salvar na base'],
  ja: ['資料、メモ、テキストファイル、用語を追加します。このブラウザーに保存され、チャットで使用できます。', 'テキストファイルを追加', 'ファイルを選択', 'カテゴリ', 'タイトルまたはファイル名', '参照リンク（任意）', '内容、要約、ヒント', 'タグ（カンマ区切り）', 'キャンセル', '知識ベースに保存'],
  ko: ['참고 자료, 메모, 텍스트 파일 또는 용어를 추가하세요. 이 브라우저에 저장되어 채팅에서 사용할 수 있습니다.', '텍스트 파일 업로드', '파일 선택', '분류', '제목 또는 파일 이름', '출처 링크 (선택)', '내용, 요약 또는 팁', '태그 (쉼표로 구분)', '취소', '지식 베이스에 저장'],
  ar: ['أضف مرجعًا أو ملاحظة أو ملفًا نصيًا أو مصطلحًا. تُحفظ الإضافات في هذا المتصفح لاستخدامها في المحادثة.', 'رفع ملف نصي', 'اختيار ملف', 'الفئة', 'العنوان أو اسم الملف', 'رابط المصدر (اختياري)', 'المحتوى أو الملخص أو النصيحة', 'الوسوم (مفصولة بفواصل)', 'إلغاء', 'حفظ في قاعدة المعرفة'],
};
const SOURCE_KEYS = ['sourceHelp', 'uploadText', 'chooseFile', 'category', 'sourceTitle', 'sourceLink', 'sourceContent', 'sourceTags', 'cancel', 'saveSource'];
Object.entries(SOURCE_I18N).forEach(([lang, values]) => SOURCE_KEYS.forEach((key, i) => { I18N[lang][key] = values[i]; }));
const PROGRESS_I18N = {
  en: ['Connecting', 'Downloading model files', 'Loading model', 'Starting model', 'Preparing an answer', 'Thinking', 'Responding', 'Prepared in'],
  es: ['Conectando', 'Descargando archivos del modelo', 'Cargando modelo', 'Iniciando modelo', 'Preparando una respuesta', 'Pensando', 'Respondiendo', 'Preparado en'],
  zh: ['正在连接', '正在下载模型文件', '正在加载模型', '正在启动模型', '正在准备回答', '正在思考', '正在回答', '准备耗时'],
  'zh-hant': ['正在連線', '正在下載模型檔案', '正在載入模型', '正在啟動模型', '正在準備回答', '正在思考', '正在回答', '準備耗時'],
  hi: ['कनेक्ट हो रहा है', 'मॉडल फ़ाइलें डाउनलोड हो रही हैं', 'मॉडल लोड हो रहा है', 'मॉडल शुरू हो रहा है', 'जवाब तैयार हो रहा है', 'सोच रहा है', 'जवाब दे रहा है', 'तैयार होने में'],
  vi: ['Đang kết nối', 'Đang tải tệp mô hình', 'Đang nạp mô hình', 'Đang khởi động mô hình', 'Đang chuẩn bị câu trả lời', 'Đang suy nghĩ', 'Đang trả lời', 'Chuẩn bị trong'],
  fr: ['Connexion', 'Téléchargement du modèle', 'Chargement du modèle', 'Démarrage du modèle', 'Préparation de la réponse', 'Réflexion', 'Réponse en cours', 'Préparé en'],
  de: ['Verbindung wird hergestellt', 'Modelldateien werden geladen', 'Modell wird geladen', 'Modell wird gestartet', 'Antwort wird vorbereitet', 'Denkt nach', 'Antwortet', 'Vorbereitet in'],
  pt: ['Conectando', 'Baixando arquivos do modelo', 'Carregando modelo', 'Iniciando modelo', 'Preparando resposta', 'Pensando', 'Respondendo', 'Preparado em'],
  ja: ['接続中', 'モデルをダウンロード中', 'モデルを読み込み中', 'モデルを起動中', '回答を準備中', '考えています', '回答中', '準備時間'],
  ko: ['연결 중', '모델 파일 다운로드 중', '모델 로딩 중', '모델 시작 중', '답변 준비 중', '생각 중', '답변 중', '준비 시간'],
  ar: ['جارٍ الاتصال', 'جارٍ تنزيل ملفات النموذج', 'جارٍ تحميل النموذج', 'جارٍ بدء النموذج', 'جارٍ إعداد الإجابة', 'يفكر', 'يجيب', 'استغرق التحضير'],
};
const PROGRESS_KEYS = ['connecting', 'downloading', 'loading', 'starting', 'preparing', 'thinking', 'responding', 'preparedIn'];
Object.entries(PROGRESS_I18N).forEach(([lang, values]) => PROGRESS_KEYS.forEach((key, i) => { I18N[lang][key] = values[i]; }));
const LABEL_I18N = {
  en: ['On', 'Off', 'Refresh', 'Expand', 'Repositories', 'All languages', 'Open on GitHub ↗', 'No chats yet. Start one with New chat.', 'Context', 'Stop'],
  es: ['Activado', 'Desactivado', 'Actualizar', 'Ampliar', 'Repositorios', 'Todos los idiomas', 'Abrir en GitHub ↗', 'Aún no hay conversaciones. Inicia una nueva.', 'Contexto', 'Detener'],
  zh: ['开启', '关闭', '刷新', '展开', '代码仓库', '所有语言', '在 GitHub 上打开 ↗', '还没有聊天。开始新的聊天吧。', '上下文', '停止'],
  'zh-hant': ['開啟', '關閉', '重新整理', '展開', '程式庫', '所有語言', '在 GitHub 開啟 ↗', '尚無對話。開始新對話吧。', '脈絡', '停止'],
  hi: ['चालू', 'बंद', 'रीफ़्रेश', 'विस्तार', 'रिपॉज़िटरी', 'सभी भाषाएँ', 'GitHub पर खोलें ↗', 'अभी कोई चैट नहीं है। नई चैट शुरू करें।', 'संदर्भ', 'रोकें'],
  vi: ['Bật', 'Tắt', 'Làm mới', 'Mở rộng', 'Kho mã', 'Tất cả ngôn ngữ', 'Mở trên GitHub ↗', 'Chưa có cuộc trò chuyện. Hãy tạo cuộc trò chuyện mới.', 'Ngữ cảnh', 'Dừng'],
  fr: ['Activé', 'Désactivé', 'Actualiser', 'Agrandir', 'Dépôts', 'Toutes les langues', 'Ouvrir sur GitHub ↗', 'Aucune discussion. Commencez une nouvelle discussion.', 'Contexte', 'Arrêter'],
  de: ['Ein', 'Aus', 'Aktualisieren', 'Erweitern', 'Repositories', 'Alle Sprachen', 'Auf GitHub öffnen ↗', 'Noch keine Chats. Starte einen neuen Chat.', 'Kontext', 'Stoppen'],
  pt: ['Ativado', 'Desativado', 'Atualizar', 'Expandir', 'Repositórios', 'Todos os idiomas', 'Abrir no GitHub ↗', 'Ainda não há conversas. Inicie uma nova.', 'Contexto', 'Parar'],
  ja: ['オン', 'オフ', '更新', '拡大', 'リポジトリ', 'すべての言語', 'GitHubで開く ↗', 'チャットはまだありません。新しいチャットを始めましょう。', 'コンテキスト', '停止'],
  ko: ['켜기', '끄기', '새로고침', '확장', '저장소', '모든 언어', 'GitHub에서 열기 ↗', '아직 대화가 없습니다. 새 대화를 시작하세요.', '맥락', '중지'],
  ar: ['تشغيل', 'إيقاف', 'تحديث', 'توسيع', 'المستودعات', 'كل اللغات', 'فتح على GitHub ↗', 'لا توجد محادثات بعد. ابدأ محادثة جديدة.', 'السياق', 'إيقاف'],
};
const LABEL_KEYS = ['on', 'off', 'refresh', 'expand', 'repositories', 'allLanguages', 'openGithub', 'noChats', 'context', 'stop'];
Object.entries(LABEL_I18N).forEach(([lang, values]) => LABEL_KEYS.forEach((key, i) => { I18N[lang][key] = values[i]; }));

I18N['zh-hans'] = I18N.zh;
UI_TITLES['zh-hans'] = UI_TITLES.zh;
const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);
const savedLangRaw = localStorage.getItem('nova.lang');
const hasSavedLang = Boolean(savedLangRaw);
let uiLang = 'en';
const t = (key) => (I18N[uiLang] && I18N[uiLang][key]) || I18N.en[key] || key;
window.NovaI18n = t;

function applyI18n(lang, syncTranslator = true, persist = true) {
  uiLang = typeof normalizeLangCode === 'function'
    ? normalizeLangCode(lang)
    : (I18N[lang] ? lang : 'en');
  if (persist !== false) {
    localStorage.setItem('nova.lang', uiLang);
  }
  document.documentElement.lang = uiLang;
  document.documentElement.dir = RTL_LANGS.has(uiLang) ? 'rtl' : 'ltr';
  document.title = UI_TITLES[uiLang] || UI_TITLES.en;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $$('[data-i18n-ph]').forEach(el => { el.setAttribute('placeholder', t(el.dataset.i18nPh)); });

  const codeEl = document.getElementById('chatLangCode');
  if (codeEl) codeEl.textContent = UI_SHORT_CODE[uiLang] || uiLang.split('-')[0].toUpperCase();

  ['clpUiLangSelect', 'setLang', 'startupLangSelect'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (sel && sel.querySelector(`option[value="${uiLang}"]`)) {
      if (sel.value !== uiLang) sel.value = uiLang;
      if (window.NovaUI) window.NovaUI.syncCustomSelect(sel);
    }
  });

  const inlineTo = document.getElementById('inlineToLang');
  const mapped = UI_TO_TRANSLATE_CODE[uiLang] || uiLang;
  if (syncTranslator && inlineTo && TRANSLATE_LANGS[mapped] && uiLang !== 'en') {
    inlineTo.value = mapped;
    if (window.NovaUI) window.NovaUI.syncCustomSelect(inlineTo);
    if (typeof scheduleInlineTranslate === 'function') scheduleInlineTranslate(true);
  }
  if (typeof renderKnowledgeBase === 'function') renderKnowledgeBase();
  if (typeof renderModelMenu === 'function') renderModelMenu();
  if (typeof renderSidebarList === 'function') renderSidebarList();
  if (currentView === 'chat' && typeof renderMessages === 'function' && !isStreaming) {
    const chat = getCurrentChat();
    if (chat) renderMessages(chat);
  }
}

/* ───────────────── TRANSLATOR DATA ─────────────────
   Pivot language: English. Phrasebook (exact matches)
   + a compact word dictionary for rough word-by-word.   */
const PHRASES = [
  { en: 'Hello', es: 'Hola', fr: 'Bonjour', pt: 'Olá', de: 'Hallo' },
  { en: 'Good morning', es: 'Buenos días', fr: 'Bonjour', pt: 'Bom dia', de: 'Guten Morgen' },
  { en: 'Goodbye', es: 'Adiós', fr: 'Au revoir', pt: 'Tchau', de: 'Auf Wiedersehen' },
  { en: 'Please', es: 'Por favor', fr: 'S’il vous plaît', pt: 'Por favor', de: 'Bitte' },
  { en: 'Thank you', es: 'Gracias', fr: 'Merci', pt: 'Obrigado', de: 'Danke' },
  { en: 'Excuse me', es: 'Disculpe', fr: 'Excusez-moi', pt: 'Com licença', de: 'Entschuldigung' },
  { en: 'I don’t understand', es: 'No entiendo', fr: 'Je ne comprends pas', pt: 'Não entendo', de: 'Ich verstehe nicht' },
  { en: 'I do not understand', es: 'No entiendo', fr: 'Je ne comprends pas', pt: 'Não entendo', de: 'Ich verstehe nicht' },
  { en: 'Can you repeat that?', es: '¿Puede repetirlo?', fr: 'Pouvez-vous répéter ?', pt: 'Pode repetir?', de: 'Können Sie das wiederholen?' },
  { en: 'Speak slowly please', es: 'Hable despacio por favor', fr: 'Parlez lentement s’il vous plaît', pt: 'Fale devagar por favor', de: 'Sprechen Sie bitte langsam' },
  { en: 'I don’t speak English', es: 'No hablo inglés', fr: 'Je ne parle pas anglais', pt: 'Não falo inglês', de: 'Ich spreche kein Englisch' },
  { en: 'I do not speak English', es: 'No hablo inglés', fr: 'Je ne parle pas anglais', pt: 'Não falo inglês', de: 'Ich spreche kein Englisch' },
  { en: 'I am a student', es: 'Soy estudiante', fr: 'Je suis étudiant', pt: 'Sou estudante', de: 'Ich bin Student' },
  { en: 'I need help', es: 'Necesito ayuda', fr: 'J’ai besoin d’aide', pt: 'Preciso de ajuda', de: 'Ich brauche Hilfe' },
  { en: 'Can you help me?', es: '¿Puedes ayudarme?', fr: 'Pouvez-vous m’aider ?', pt: 'Você pode me ajudar?', de: 'Können Sie mir helfen?' },
  { en: 'I’m lost', es: 'Estoy perdido', fr: 'Je suis perdu', pt: 'Estou perdido', de: 'Ich habe mich verlaufen' },
  { en: 'I am lost', es: 'Estoy perdido', fr: 'Je suis perdu', pt: 'Estou perdido', de: 'Ich habe mich verlaufen' },
  { en: 'Where is the library?', es: '¿Dónde está la biblioteca?', fr: 'Où est la bibliothèque ?', pt: 'Onde fica a biblioteca?', de: 'Wo ist die Bibliothek?' },
  { en: 'Where is the dining hall?', es: '¿Dónde está el comedor?', fr: 'Où est le restaurant universitaire ?', pt: 'Onde fica o refeitório?', de: 'Wo ist die Mensa?' },
  { en: 'Where is the bathroom?', es: '¿Dónde está el baño?', fr: 'Où sont les toilettes ?', pt: 'Onde fica o banheiro?', de: 'Wo ist die Toilette?' },
  { en: 'Where is the gym?', es: '¿Dónde está el gimnasio?', fr: 'Où est la salle de sport ?', pt: 'Onde fica a academia?', de: 'Wo ist das Fitnessstudio?' },
  { en: 'Where is the bus stop?', es: '¿Dónde está la parada de autobús?', fr: 'Où est l’arrêt de bus ?', pt: 'Onde fica o ponto de ônibus?', de: 'Wo ist die Bushaltestelle?' },
  { en: 'Where is the health center?', es: '¿Dónde está el centro de salud?', fr: 'Où est le centre de santé ?', pt: 'Onde fica o posto de saúde?', de: 'Wo ist das Gesundheitszentrum?' },
  { en: 'Where do I sign up?', es: '¿Dónde me inscribo?', fr: 'Où est-ce que je m’inscris ?', pt: 'Onde eu me inscrevo?', de: 'Wo melde ich mich an?' },
  { en: 'What time is the exam?', es: '¿A qué hora es el examen?', fr: 'À quelle heure est l’examen ?', pt: 'Que horas é a prova?', de: 'Wann ist die Prüfung?' },
  { en: 'What time is the class?', es: '¿A qué hora es la clase?', fr: 'À quelle heure est le cours ?', pt: 'Que horas é a aula?', de: 'Wann ist der Unterricht?' },
  { en: 'Can I see the syllabus?', es: '¿Puedo ver el programa?', fr: 'Puis-je voir le syllabus ?', pt: 'Posso ver o programa?', de: 'Kann ich den Kursplan sehen?' },
  { en: 'I didn’t do my homework', es: 'No hice la tarea', fr: 'Je n’ai pas fait mes devoirs', pt: 'Não fiz meu dever', de: 'Ich habe meine Hausaufgaben nicht gemacht' },
  { en: 'I did not do my homework', es: 'No hice la tarea', fr: 'Je n’ai pas fait mes devoirs', pt: 'Não fiz meu dever', de: 'Ich habe meine Hausaufgaben nicht gemacht' },
  { en: 'I need a doctor', es: 'Necesito un médico', fr: 'J’ai besoin d’un médecin', pt: 'Preciso de um médico', de: 'Ich brauche einen Arzt' },
  { en: 'I feel sick', es: 'Me siento enfermo', fr: 'Je me sens mal', pt: 'Estou me sentindo doente', de: 'Ich fühle mich krank' },
  { en: 'How much does it cost?', es: '¿Cuánto cuesta?', fr: 'Combien ça coûte ?', pt: 'Quanto custa?', de: 'Wie viel kostet das?' },
  { en: 'Can I pay with a card?', es: '¿Puedo pagar con tarjeta?', fr: 'Puis-je payer par carte ?', pt: 'Posso pagar com cartão?', de: 'Kann ich mit Karte bezahlen?' },
  { en: 'I lost my student ID', es: 'Perdí mi identificación de estudiante', fr: 'J’ai perdu ma carte étudiante', pt: 'Perdi minha carteirinha de estudante', de: 'Ich habe meinen Studentenausweis verloren' },
  { en: 'I need a visa appointment', es: 'Necesito una cita para la visa', fr: 'J’ai besoin d’un rendez-vous pour le visa', pt: 'Preciso de um agendamento para o visto', de: 'Ich brauche einen Visumstermin' },
  { en: 'See you tomorrow', es: 'Hasta mañana', fr: 'À demain', pt: 'Até amanhã', de: 'Bis morgen' },
  { en: 'How are you?', es: '¿Cómo estás?', fr: 'Comment allez-vous ?', pt: 'Como vai você?', de: 'Wie geht es Ihnen?' },
  { en: 'I live in the dormitory', es: 'Vivo en el dormitorio', fr: 'J’habite dans la résidence', pt: 'Moro no dormitório', de: 'Ich wohne im Wohnheim' },
  { en: 'I live in the dorm', es: 'Vivo en el dormitorio', fr: 'J’habite dans la résidence', pt: 'Moro no dormitório', de: 'Ich wohne im Wohnheim' },
  { en: 'What does this word mean?', es: '¿Qué significa esta palabra?', fr: 'Que signifie ce mot ?', pt: 'O que significa esta palavra?', de: 'Was bedeutet dieses Wort?' },
  { en: 'Can you speak English?', es: '¿Habla inglés?', fr: 'Parlez-vous anglais ?', pt: 'Você fala inglês?', de: 'Sprechen Sie Englisch?' },
  { en: 'Is the office open?', es: '¿Está abierta la oficina?', fr: 'Le bureau est ouvert ?', pt: 'O escritório está aberto?', de: 'Ist das Büro geöffnet?' },
  { en: 'I need a notebook', es: 'Necesito un cuaderno', fr: 'J’ai besoin d’un cahier', pt: 'Preciso de um caderno', de: 'Ich brauche ein Heft' },
  { en: 'Help!', es: '¡Ayuda!', fr: 'À l’aide !', pt: 'Socorro!', de: 'Hilfe!' },
  { en: 'Call emergency services', es: 'Llame a emergencias', fr: 'Appelez les secours', pt: 'Ligue para emergência', de: 'Rufen Sie den Rettungsdienst' },
];

const WORDS = {
  es: { the:'el', a:'un', i:'yo', you:'tú', we:'nosotros', they:'ellos', he:'él', she:'ella', my:'mi', your:'tu', his:'su', this:'este', that:'ese', is:'es', are:'son', am:'soy', have:'tengo', has:'tiene', want:'quiero', need:'necesito', like:'me gusta', go:'voy', come:'vengo', eat:'como', drink:'bebo', book:'libro', library:'biblioteca', class:'clase', exam:'examen', test:'examen', teacher:'maestro', professor:'profesor', student:'estudiante', school:'escuela', university:'universidad', friend:'amigo', family:'familia', mother:'madre', father:'padre', brother:'hermano', sister:'hermana', house:'casa', room:'habitación', door:'puerta', window:'ventana', table:'mesa', chair:'silla', bed:'cama', water:'agua', food:'comida', bread:'pan', milk:'leche', coffee:'café', tea:'té', meat:'carne', rice:'arroz', chicken:'pollo', fish:'pescado', apple:'manzana', banana:'plátano', money:'dinero', card:'tarjeta', bank:'banco', hospital:'hospital', doctor:'médico', medicine:'medicina', problem:'problema', help:'ayuda', question:'pregunta', answer:'respuesta', today:'hoy', tomorrow:'mañana', yesterday:'ayer', week:'semana', month:'mes', year:'año', time:'tiempo', morning:'mañana', afternoon:'tarde', evening:'noche', now:'ahora', here:'aquí', there:'allí', where:'dónde', what:'qué', when:'cuándo', how:'cómo', why:'por qué', yes:'sí', no:'no', not:'no', and:'y', but:'pero', or:'o', with:'con', without:'sin', of:'de', to:'a', in:'en', on:'en', for:'para', because:'porque', please:'por favor', thanks:'gracias', big:'grande', small:'pequeño', good:'bueno', bad:'malo', new:'nuevo', old:'viejo', happy:'feliz', sad:'triste', right:'derecha', left:'izquierda', straight:'recto', stop:'alto', wait:'espera', open:'abierto', close:'cerrado', work:'trabajo', study:'estudiar', learn:'aprender', read:'leer', write:'escribir', speak:'hablar', understand:'entender', know:'saber', english:'inglés', spanish:'español', name:'nombre', sorry:'perdón', health:'salud' },
  fr: { the:'le', a:'un', i:'je', you:'tu', we:'nous', they:'ils', he:'il', she:'elle', my:'mon', your:'ton', his:'son', this:'ce', that:'cela', is:'est', are:'sont', am:'suis', have:'ai', has:'a', want:'veux', need:'ai besoin de', like:'aime', go:'vais', come:'viens', eat:'mange', drink:'bois', book:'livre', library:'bibliothèque', class:'cours', exam:'examen', test:'examen', teacher:'professeur', professor:'professeur', student:'étudiant', school:'école', university:'université', friend:'ami', family:'famille', mother:'mère', father:'père', brother:'frère', sister:'sœur', house:'maison', room:'chambre', door:'porte', window:'fenêtre', table:'table', chair:'chaise', bed:'lit', water:'eau', food:'nourriture', bread:'pain', milk:'lait', coffee:'café', tea:'thé', meat:'viande', rice:'riz', chicken:'poulet', fish:'poisson', apple:'pomme', banana:'banane', money:'argent', card:'carte', bank:'banque', hospital:'hôpital', doctor:'médecin', medicine:'médicament', problem:'problème', help:'aide', question:'question', answer:'réponse', today:'aujourd’hui', tomorrow:'demain', yesterday:'hier', week:'semaine', month:'mois', year:'an', time:'temps', morning:'matin', afternoon:'après-midi', evening:'soir', now:'maintenant', here:'ici', there:'là', where:'où', what:'quoi', when:'quand', how:'comment', why:'pourquoi', yes:'oui', no:'non', not:'pas', and:'et', but:'mais', or:'ou', with:'avec', without:'sans', of:'de', to:'à', in:'dans', on:'sur', for:'pour', because:'parce que', please:'s’il vous plaît', thanks:'merci', big:'grand', small:'petit', good:'bon', bad:'mauvais', new:'nouveau', old:'vieux', happy:'heureux', sad:'triste', right:'droite', left:'gauche', straight:'tout droit', stop:'stop', wait:'attente', open:'ouvert', close:'fermé', work:'travail', study:'étude', learn:'apprendre', read:'lire', write:'écrire', speak:'parler', understand:'comprendre', know:'savoir', english:'anglais', french:'français', name:'nom', sorry:'désolé', health:'santé' },
  pt: { the:'o', a:'um', i:'eu', you:'você', we:'nós', they:'eles', he:'ele', she:'ela', my:'meu', your:'seu', this:'isto', that:'isso', is:'é', are:'são', am:'sou', have:'tenho', has:'tem', want:'quero', need:'preciso', like:'gosto', go:'vou', come:'venho', eat:'como', drink:'bebo', book:'livro', library:'biblioteca', class:'aula', exam:'prova', test:'prova', teacher:'professor', professor:'professor', student:'estudante', school:'escola', university:'universidade', friend:'amigo', family:'família', mother:'mãe', father:'pai', brother:'irmão', sister:'irmã', house:'casa', room:'quarto', door:'porta', window:'janela', table:'mesa', chair:'cadeira', bed:'cama', water:'água', food:'comida', bread:'pão', milk:'leite', coffee:'café', tea:'chá', meat:'carne', rice:'arroz', chicken:'frango', fish:'peixe', apple:'maçã', banana:'banana', money:'dinheiro', card:'cartão', bank:'banco', hospital:'hospital', doctor:'médico', medicine:'remédio', problem:'problema', help:'ajuda', question:'pergunta', answer:'resposta', today:'hoje', tomorrow:'amanhã', yesterday:'ontem', week:'semana', month:'mês', year:'ano', time:'tempo', morning:'manhã', afternoon:'tarde', evening:'noite', now:'agora', here:'aqui', there:'ali', where:'onde', what:'o que', when:'quando', how:'como', why:'por que', yes:'sim', no:'não', not:'não', and:'e', but:'mas', or:'ou', with:'com', without:'sem', of:'de', to:'para', in:'em', on:'em', for:'para', because:'porque', please:'por favor', thanks:'obrigado', big:'grande', small:'pequeno', good:'bom', bad:'ruim', new:'novo', old:'velho', happy:'feliz', sad:'triste', right:'direita', left:'esquerda', straight:'em frente', stop:'pare', wait:'espere', open:'aberto', close:'fechado', work:'trabalho', study:'estudar', learn:'aprender', read:'ler', write:'escrever', speak:'falar', understand:'entender', know:'saber', english:'inglês', portuguese:'português', name:'nome', sorry:'desculpe', health:'saúde' },
  de: { the:'der', a:'ein', i:'ich', you:'du', we:'wir', they:'sie', he:'er', she:'sie', my:'mein', your:'dein', his:'sein', this:'dieser', that:'jener', is:'ist', are:'sind', am:'bin', have:'habe', has:'hat', want:'will', need:'brauche', like:'mag', go:'gehe', come:'komme', eat:'esse', drink:'trinke', book:'Buch', library:'Bibliothek', class:'Kurs', exam:'Prüfung', test:'Prüfung', teacher:'Lehrer', professor:'Professor', student:'Student', school:'Schule', university:'Universität', friend:'Freund', family:'Familie', mother:'Mutter', father:'Vater', brother:'Bruder', sister:'Schwester', house:'Haus', room:'Zimmer', door:'Tür', window:'Fenster', table:'Tisch', chair:'Stuhl', bed:'Bett', water:'Wasser', food:'Essen', bread:'Brot', milk:'Milch', coffee:'Kaffee', tea:'Tee', meat:'Fleisch', rice:'Reis', chicken:'Hähnchen', fish:'Fisch', apple:'Apfel', banana:'Banane', money:'Geld', card:'Karte', bank:'Bank', hospital:'Krankenhaus', doctor:'Arzt', medicine:'Medizin', problem:'Problem', help:'Hilfe', question:'Frage', answer:'Antwort', today:'heute', tomorrow:'morgen', yesterday:'gestern', week:'Woche', month:'Monat', year:'Jahr', time:'Zeit', morning:'Morgen', afternoon:'Nachmittag', evening:'Abend', now:'jetzt', here:'hier', there:'dort', where:'wo', what:'was', when:'wann', how:'wie', why:'warum', yes:'ja', no:'nein', not:'nicht', and:'und', but:'aber', or:'oder', with:'mit', without:'ohne', of:'von', to:'zu', in:'in', on:'auf', for:'für', because:'weil', please:'bitte', thanks:'danke', big:'groß', small:'klein', good:'gut', bad:'schlecht', new:'neu', old:'alt', happy:'glücklich', sad:'traurig', right:'rechts', left:'links', straight:'geradeaus', stop:'halt', wait:'warte', open:'geöffnet', close:'geschlossen', work:'Arbeit', study:'studieren', learn:'lernen', read:'lesen', write:'schreiben', speak:'sprechen', understand:'verstehen', know:'wissen', english:'Englisch', german:'Deutsch', name:'Name', sorry:'Entschuldigung', health:'Gesundheit' },
};

/* All 54 languages supported by PLaMo-3-translate (incl. the experimental
   Afrikaans LoRA fine-tune) — grouped by region.
   English ↔ X and Japanese ↔ X are the strongest pairs (PFN's main
   training/eval focus); X ↔ Y still works, best for major languages.
   Afrikaans is usable for general/draft translation but is an early
   experimental checkpoint (occasional Dutch bleed). */
const TRANSLATE_LANG_GROUPS = [
  { label: 'East & Southeast Asia', langs: [
    ['ja', 'Japanese (日本語)'],
    ['zh-hans', 'Chinese, Simplified (中文 简体)'],
    ['zh-hant', 'Chinese, Traditional (中文 繁體)'],
    ['ko', 'Korean (한국어)'],
    ['vi', 'Vietnamese (Tiếng Việt)'],
    ['th', 'Thai (ไทย)'],
    ['id', 'Indonesian (Bahasa Indonesia)'],
    ['ms', 'Malay (Bahasa Melayu)'],
    ['jv', 'Javanese (Basa Jawa)'],
    ['tl', 'Tagalog (Tagalog)'],
    ['ceb', 'Cebuano (Cebuano)'],
    ['my', 'Burmese (မြန်မာဘာသာ)'],
    ['km', 'Khmer (ខ្មែរ)'],
  ]},
  { label: 'Western, Central & Southern Europe', langs: [
    ['en', 'English'],
    ['de', 'German (Deutsch)'],
    ['fr', 'French (Français)'],
    ['es', 'Spanish (Español)'],
    ['it', 'Italian (Italiano)'],
    ['nl', 'Dutch (Nederlands)'],
    ['ca', 'Catalan (Català)'],
    ['eu', 'Basque (Euskara)'],
    ['pl', 'Polish (Polski)'],
    ['hu', 'Hungarian (Magyar)'],
    ['sk', 'Slovak (Slovenčina)'],
    ['sl', 'Slovenian (Slovenščina)'],
    ['hr', 'Croatian (Hrvatski)'],
    ['sr', 'Serbian (Srpski)'],
    ['bg', 'Bulgarian (Български)'],
  ]},
  { label: 'Eastern Europe, Baltics & Caucasus', langs: [
    ['ru', 'Russian (Русский)'],
    ['be', 'Belarusian (Беларуская)'],
    ['et', 'Estonian (Eesti)'],
    ['lv', 'Latvian (Latviešu)'],
    ['lt', 'Lithuanian (Lietuvių)'],
    ['hy', 'Armenian (Հայերեն)'],
    ['ka', 'Georgian (ქართული)'],
    ['az', 'Azerbaijani (Azərbaycanca)'],
  ]},
  { label: 'Middle East, Central Asia & Africa', langs: [
    ['af', 'Afrikaans (Afrikaans)'],
    ['ar', 'Arabic (العربية)'],
    ['he', 'Hebrew (עברית)'],
    ['fa', 'Persian (فارسی)'],
    ['kk', 'Kazakh (Қазақша)'],
    ['uz', 'Uzbek (Oʻzbekcha)'],
    ['sw', 'Swahili (Kiswahili)'],
  ]},
  { label: 'South Asia', langs: [
    ['hi', 'Hindi (हिन्दी)'],
    ['ur', 'Urdu (اردو)'],
    ['bn', 'Bengali (বাংলা)'],
    ['pa', 'Punjabi (ਪੰਜਾਬੀ)'],
    ['mr', 'Marathi (मराठी)'],
    ['gu', 'Gujarati (ગુજરાતી)'],
    ['ta', 'Tamil (தமிழ்)'],
    ['te', 'Telugu (తెలుగు)'],
    ['ml', 'Malayalam (മലയാളം)'],
    ['ne', 'Nepali (नेपाली)'],
    ['si', 'Sinhala (සිංහල)'],
  ]},
];
const TRANSLATE_LANGS = {};
for (const group of TRANSLATE_LANG_GROUPS) {
  for (const [code, name] of group.langs) TRANSLATE_LANGS[code] = name;
}

function normalizeLangCode(code) {
  if (!code) return 'en';
  const raw = String(code).trim().toLowerCase().replace(/_/g, '-');
  if (raw === 'zh' || raw === 'zh-cn' || raw === 'zh-sg' || raw === 'zh-hans') return 'zh-hans';
  if (raw === 'zh-tw' || raw === 'zh-hk' || raw === 'zh-mo' || raw === 'zh-hant') return 'zh-hant';
  if (TRANSLATE_LANGS[raw] || I18N[raw]) return raw;
  const base = raw.split('-')[0];
  if (base === 'zh') return 'zh-hans';
  if (TRANSLATE_LANGS[base] || I18N[base]) return base;
  return 'en';
}

function detectBrowserLang() {
  const candidates = (typeof navigator !== 'undefined' && Array.isArray(navigator.languages) && navigator.languages.length)
    ? navigator.languages
    : [(typeof navigator !== 'undefined' && navigator.language) || 'en'];
  for (const cand of candidates) {
    const norm = normalizeLangCode(cand);
    if (norm && norm !== 'en') return norm;
  }
  return 'en';
}

function getLangDisplayName(code) {
  const norm = normalizeLangCode(code);
  return TRANSLATE_LANGS[norm] || UI_LANGS[code] || code;
}

function buildGroupedLangOptionsHtml(selectedCode = uiLang) {
  const normSel = normalizeLangCode(selectedCode);
  return TRANSLATE_LANG_GROUPS
    .map(g => `<optgroup label="${escapeHtml(g.label)}">${g.langs.map(([code, name]) =>
      `<option value="${code}"${code === normSel ? ' selected' : ''}>${escapeHtml(name)}</option>`
    ).join('')}</optgroup>`)
    .join('');
}

uiLang = hasSavedLang ? normalizeLangCode(savedLangRaw) : detectBrowserLang();

const SPEECH_TAG = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', de: 'de-DE',
  ja: 'ja-JP', zh: 'zh-CN', 'zh-hans': 'zh-CN', 'zh-hant': 'zh-TW', ko: 'ko-KR',
  vi: 'vi-VN', th: 'th-TH', id: 'id-ID', ms: 'ms-MY', jv: 'jv-ID',
  tl: 'tl-PH', ceb: 'ceb-PH', my: 'my-MM', km: 'km-KH',
  it: 'it-IT', nl: 'nl-NL', ca: 'ca-ES', eu: 'eu-ES', pl: 'pl-PL',
  hu: 'hu-HU', sk: 'sk-SK', sl: 'sl-SI', hr: 'hr-HR', sr: 'sr-RS',
  bg: 'bg-BG', ru: 'ru-RU', be: 'be-BY', et: 'et-EE', lv: 'lv-LV',
  lt: 'lt-LT', hy: 'hy-AM', ka: 'ka-GE', az: 'az-AZ', ar: 'ar-SA',
  he: 'he-IL', fa: 'fa-IR', kk: 'kk-KZ', uz: 'uz-UZ', sw: 'sw-KE', af: 'af-ZA',
  hi: 'hi-IN', ur: 'ur-PK', bn: 'bn-IN', pa: 'pa-IN', mr: 'mr-IN',
  gu: 'gu-IN', ta: 'ta-IN', te: 'te-IN', ml: 'ml-IN', ne: 'ne-NP',
  si: 'si-LK',
};

// reverse word dictionaries (word -> english) built once
const REV_WORDS = {};
const SPECIAL_REV = {
  fr: { "j'ai": 'have', "c'est": 'is', "d'accord": 'okay' },
  es: { 'al': 'to', 'del': 'of' },
  pt: { 'do': 'of', 'da': 'of', 'ao': 'to' },
  de: { 'im': 'in', 'am': 'on', 'zum': 'to', 'ins': 'to' },
};
for (const lang of Object.keys(WORDS)) {
  REV_WORDS[lang] = {};
  for (const [en, word] of Object.entries(WORDS[lang])) {
    const w = word.toLowerCase();
    if (!REV_WORDS[lang][w]) REV_WORDS[lang][w] = en;
  }
}
// reverse phrasebook lookup: phrase(in lang X) -> english key
const REV_PHRASES = {};
for (const lang of ['es', 'fr', 'pt', 'de']) {
  REV_PHRASES[lang] = {};
  for (const p of PHRASES) {
    const v = (p[lang] || '').toLowerCase();
    if (!REV_PHRASES[lang][v]) REV_PHRASES[lang][v] = p;
  }
}

const normalizeText = (s) => s
  .toLowerCase()
  .replace(/[’‘`]/g, "'")
  .replace(/[.!?¡¿,;:"()]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function translateWord(w, from, to) {
  if (from === 'en' && to === 'en') return w;
  let enWord = w;
  if (from !== 'en') {
    enWord = (SPECIAL_REV[from] && SPECIAL_REV[from][w]) || (REV_WORDS[from] && REV_WORDS[from][w]) || null;
    if (!enWord) return null;
    if (to === 'en') return enWord;
  }
  if (to === 'en') return enWord;
  return (WORDS[to] && WORDS[to][enWord]) || null;
}

function translateText(text, from, to) {
  const trimmed = text.trim();
  if (!trimmed) return { out: '', kind: 'empty' };
  if (from === to) return { out: trimmed, kind: 'same' };

  const norm = normalizeText(trimmed);

  // 1) exact phrasebook match (works in any direction via English pivot)
  let phraseHit = null;
  if (from === 'en') {
    phraseHit = PHRASES.find(p => normalizeText(p.en) === norm) || null;
  } else if (REV_PHRASES[from]) {
    phraseHit = REV_PHRASES[from][norm] || null;
  }
  if (phraseHit) {
    if (to === 'en') return { out: phraseHit.en, kind: 'phrase' };
    return { out: phraseHit[to] || phraseHit.en, kind: 'phrase' };
  }

  // 2) word-by-word fallback
  const tokens = trimmed.split(/(\s+)/);
  let hits = 0, total = 0;
  const outTokens = tokens.map(tok => {
    if (/^\s+$/.test(tok)) return tok;
    const m = tok.match(/^([“"'(\[{¿¡]*)([\p{L}\p{N}’'-]+)([.,!?;:")\]}]*)$/u);
    if (!m) return tok;
    const [, pre, core, post] = m;
    const lowered = core.toLowerCase().replace(/[’‘]/g, "'");
    total++;
    const translated = translateWord(lowered, from, to);
    if (translated) { hits++; return pre + translated + post; }
    return tok;
  });

  if (hits === 0) return { out: null, kind: 'none' };
  let result = outTokens.join('');
  // restore initial capitalization
  if (/^\p{Lu}/u.test(trimmed)) result = result.charAt(0).toUpperCase() + result.slice(1);
  return { out: result, kind: 'words', hits, total };
}

/* ───────────────────────── STATE ───────────────────────── */
const LS = {
  chats: 'nova.chats.v1',
  model: 'nova.model',
  glow: 'nova.glow',
  streaming: 'nova.streaming',
  sound: 'nova.sound',
  simple: 'nova.simple',
  sidebar: 'nova.sidebar',
  palette: 'nova.palette',
  username: 'nova.username',
  team: 'nova.team',
  translations: 'nova.translations.v1',
  kbSources: 'nova.kb.sources.v1',
  kbGlossary: 'nova.kb.glossary.v1',
};

function getUsername() {
  const saved = (localStorage.getItem(LS.username) || '').trim();
  return saved || 'Username';
}

function getUserTeam() {
  return (localStorage.getItem(LS.team) || '').trim();
}

function formatTeamLabel(raw) {
  const clean = String(raw || '').trim();
  if (!clean) return '';
  return /^\d{1,5}$/.test(clean) ? `Team ${clean}` : clean;
}

function renderUserProfile() {
  const name = getUsername();
  const team = formatTeamLabel(getUserTeam());
  const nameEl = document.getElementById('userNameDisplay');
  const avatarEl = document.getElementById('userAvatar');
  const teamEl = document.getElementById('userTeamDisplay');
  const crumbEl = document.getElementById('topbarCrumbText');
  if (nameEl) nameEl.textContent = name;
  if (avatarEl) avatarEl.textContent = (name.charAt(0) || 'U').toUpperCase();
  if (teamEl) teamEl.textContent = team || 'Set team';
  if (crumbEl) crumbEl.textContent = team ? `${team} · Multilingual Robotics Assistant` : 'Multilingual Robotics Assistant';
  const footEl = document.getElementById('settingsFoot');
  if (footEl) footEl.textContent = `Primer${team ? ' · ' + team : ''} · ${name}`;
}

function openProfileModal() {
  const curName = getUsername() === 'Username' ? (localStorage.getItem(LS.username) || '') : getUsername();
  const curTeam = getUserTeam();
  openModal(`
    <h3 class="modal-title" id="modalTitle" style="text-align:left">Your profile</h3>
    <p class="modal-sub" style="text-align:left">Set your display name and robotics team.</p>
    <form class="kb-form" id="profileForm">
      <div class="kb-form-field">
        <label for="profNameInput">Username</label>
        <input class="kb-input" id="profNameInput" value="${escapeHtml(curName)}" placeholder="Enter your name" maxlength="40" autocomplete="name">
      </div>
      <div class="kb-form-field">
        <label for="profTeamInput">What team are you on?</label>
        <input class="kb-input" id="profTeamInput" value="${escapeHtml(curTeam)}" placeholder="e.g., 846, 254, Lynbrook Robotics" maxlength="60">
      </div>
      <div class="confirm-actions">
        <button type="button" class="ghost-btn" id="profCancel">Cancel</button>
        <button type="submit" class="pill primary-pill">Save profile</button>
      </div>
    </form>`);
  const nameIn = $('#profNameInput');
  const teamIn = $('#profTeamInput');
  nameIn?.focus();
  $('#profCancel')?.addEventListener('click', closeModal);
  $('#profileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nextName = (nameIn?.value || '').trim();
    const nextTeam = (teamIn?.value || '').trim();
    localStorage.setItem(LS.username, nextName);
    localStorage.setItem(LS.team, nextTeam);
    renderUserProfile();
    closeModal();
    toast('Profile updated');
  });
}

const PALETTES = {
  espresso: 'Espresso (Dark Brown)',
  roast: 'Warm Roast',
  mahogany: 'Deep Mahogany',
};

function applyPalette(key, persist = true) {
  const palette = PALETTES[key] ? key : 'espresso';
  document.body.dataset.palette = palette;
  if (persist) localStorage.setItem(LS.palette, palette);
  $$('.palette-pill').forEach(btn => {
    const active = btn.dataset.palette === palette;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  const setPal = document.getElementById('setPalette');
  if (setPal && setPal.value !== palette) {
    setPal.value = palette;
    if (window.NovaUI) window.NovaUI.syncCustomSelect(setPal);
  }
}

let chats = [];
let currentId = null;
let currentView = 'home';
let isStreaming = false;
let attachments = [];
let regenSeed = 0;

const settings = {
  glow: localStorage.getItem(LS.glow) !== '0',
  streaming: localStorage.getItem(LS.streaming) !== '0',
  sound: localStorage.getItem(LS.sound) === '1',
  simple: localStorage.getItem(LS.simple) === '1',
};

let modelKey = localStorage.getItem(LS.model) || 'spark';
if (!MODELS[modelKey]) {
  modelKey = 'spark';
  localStorage.setItem(LS.model, modelKey);
}

/* ───────────────────── DOM SHORTCUTS ───────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const chatList      = $('#chatList');
const allChatsCount = $('#allChatsCount');
const allCount      = $('#allCount');
const allGrid       = $('#allGrid');
const allEmpty      = $('#allEmpty');
const allEmptyText  = $('#allEmptyText');
const allSearch     = $('#allSearch');
const messagesEl    = $('#messages');
const chatScroll    = $('#chatScroll');
const composer      = $('#composer');
const promptInput   = $('#promptInput');
const attachRow     = $('#attachRow');
const attachMenu    = $('#attachMenu');
const plusBtn       = $('#plusBtn');
const fileInput     = $('#fileInput');
const modelBtn      = $('#modelBtn');
const modelMenu     = $('#modelMenu');
const stopBtn       = $('#stopBtn');
let   activeAbort   = null;

const isAbortError = (err) => Boolean(err) && (
  err.name === 'AbortError'
  || (err.cause && err.cause.name === 'AbortError')
  || (activeAbort && activeAbort.signal.aborted)
);
const modelLabel    = $('#modelLabel');
const micBtn        = $('#micBtn');
const sendBtn       = $('#sendBtn');
const toastEl       = $('#toast');
const modalOverlay  = $('#modalOverlay');
const modalContent  = $('#modalContent');

// composer language / translator + knowledge base DOM
const chatLangBtn          = $('#chatLangBtn');
const chatLangPopover      = $('#chatLangPopover');
const toggleComposerTrBtn  = $('#toggleComposerTrBtn');
const composerTranslateBar = $('#composerTranslateBar');
const inlineFromLangSel    = $('#inlineFromLang');
const inlineToLangSel      = $('#inlineToLang');
const inlineTrResult       = $('#inlineTrResult');
const inlinePhraseChips    = $('#inlinePhraseChips');
const kbListEl             = $('#kbList');
const kbEmptyEl            = $('#kbEmpty');
const kbStatsEl            = $('#kbStats');
const kbSearchInput        = $('#kbSearchInput');
const kbNavCountEl         = $('#kbNavCount');

const composerSlots = { home: $('#composerSlotHome'), chat: $('#composerSlotChat') };
const contextMeter  = $('#contextMeter');
const cmFill        = $('#cmFill');
const cmText        = $('#cmText');

/* Chat engines (Spark / Pro). Lazy-loaded on first use — offline fallback on failure. */
let neuralChatStatus = 'checking';   // checking | idle | ready | unavailable
const chatContext = { used: 0, max: TIER_STATE[modelKey].ctx };  // exact usage reported by the server
let engineContext = { spark: 16384, pro: 16384 };  // live values come from /api/health
const DEFAULT_TIER_REASONING = { spark: false, pro: true };
function loadTierReasoning() {
  try {
    const raw = JSON.parse(localStorage.getItem('nova.reasoning.tiers') || 'null');
    if (raw && typeof raw === 'object') return { ...DEFAULT_TIER_REASONING, ...raw };
  } catch (_) { /* ignore */ }
  const legacy = localStorage.getItem('nova.reasoning');
  if (legacy === 'off') return { spark: false, pro: false };
  return { ...DEFAULT_TIER_REASONING };
}
let tierReasoning = loadTierReasoning();
let engineReasoning = !!tierReasoning[modelKey];

function estimateChatTokens(chat) {
  if (!chat || !Array.isArray(chat.messages)) return 0;
  let chars = 0;
  let imgTokens = 0;
  for (const m of chat.messages.slice(-40)) {
    chars += (m.content || '').length + (m.thinking || '').length + 16;
    if (Array.isArray(m.images)) imgTokens += m.images.length * 256;
  }
  return Math.ceil(chars / 4) + imgTokens;
}

async function checkChatHealth() {
  try {
    const res = await fetch(API_BASE + '/api/health', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const engines = data && data.engines;
    if (engines) {
      engineContext.spark = engines.spark?.context_max || engineContext.spark;
      engineContext.pro   = engines.pro?.context_max   || engineContext.pro;
      chatContext.max = (engines[modelKey] || engines.pro || {}).context_max || chatContext.max;
      const cur = engines[modelKey];
      const st = cur && cur.status;
      if (st === 'ready') neuralChatStatus = 'ready';
      else if (st === 'idle' || st === 'loading' || st === 'downloading') neuralChatStatus = 'idle';
      else neuralChatStatus = 'unavailable';
    } else {
      const st = data && data.chat && data.chat.status;
      if (st === 'ready') neuralChatStatus = 'ready';
      else if (st === 'idle' || st === 'loading' || st === 'downloading') neuralChatStatus = 'idle';
      else neuralChatStatus = 'unavailable';
      chatContext.max = (data && data.chat && data.chat.context_max) || chatContext.max;
    }
  } catch (_) {
    neuralChatStatus = 'unavailable';
  }
  updateContextMeter(null, true);
  return neuralChatStatus;
}

function updateContextMeter(estimateTokens, exact) {
  if (!contextMeter) return;
  const showMeter = currentView === 'home' || currentView === 'chat';
  contextMeter.hidden = !showMeter;
  if (!showMeter) return;

  const used = estimateTokens != null ? estimateTokens : chatContext.used;
  const max = Math.max(1, chatContext.max || TIER_STATE[modelKey].ctx || 16384);
  const pct = Math.min(100, (used / max) * 100);
  cmFill.style.width = pct.toFixed(1) + '%';
  cmFill.classList.toggle('hot', pct >= 85);
  const approx = exact === false ? '~' : '';
  cmText.textContent = `${approx}${Math.round(used).toLocaleString()} / ${max.toLocaleString()} tokens · ${pct.toFixed(1)}%`;
  contextMeter.title = `Tokens used by this conversation vs the model's ${ctxLabel(max)} context window`;
  contextMeter.classList.toggle('offline', neuralChatStatus === 'unavailable');
}

/* ───────────────── HELPERS ───────────────── */
const uid = () => 'c' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const escapeHtml = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const fmtSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const timeAgo = (ts) => {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return min + 'm ago';
  const h = Math.floor(min / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return d + 'd ago';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const dayBucket = (ts) => {
  const now = new Date(); const d = new Date(ts);
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.floor((startOf(now) - startOf(d)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'Previous 7 days';
  return 'Older';
};

const deriveTitle = (text) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= 48) return clean;
  const cut = clean.slice(0, 48);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 20)).trim() + '…';
};

const chatPreview = (chat) => {
  const lastModel = [...chat.messages].reverse().find(m => m.role === 'model');
  const lastUser = [...chat.messages].reverse().find(m => m.role === 'user');
  return (lastModel?.content || lastUser?.content || '').replace(/[#*`>-]/g, '').trim();
};

function saveChats() {
  try { localStorage.setItem(LS.chats, JSON.stringify(chats)); } catch (_) { /* quota */ }
}
const loadChats = () => {
  try { const raw = localStorage.getItem(LS.chats); return raw ? JSON.parse(raw) : null; }
  catch (_) { return null; }
};

/* ───────── tiny markdown-ish renderer ───────── */
function md(src) {
  const esc = escapeHtml(src);
  const parts = esc.split('```');
  let out = '';
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      out += '<pre><code>' + part.replace(/^\n/, '').replace(/\n+$/, '') + '</code></pre>';
    } else {
      out += renderInline(part);
    }
  });
  return out;
}
function renderInline(text) {
  text = text
    .replace(/\[([^\]\n]+)\]\((https:\/\/github\.com\/Team846\/[A-Za-z0-9_.%\/-]+(?:#L\d+(?:-L\d+)?)?)\)/gi, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
    .replace(/^### (.*)$/gm, '<h4>$1</h4>')
    .replace(/^## (.*)$/gm, '<h3>$1</h3>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  const lines = text.split('\n');
  const out = [];
  let inUl = false, inOl = false;
  const closeLists = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
        const ul = /^\s*[-•*–—]\s+(.*)/.exec(line);
    const ol = /^\s*\d+\.\s+(.*)/.exec(line);
    const bq = /^&gt; ?(.*)/.exec(line);
    if (ul) { if (inOl) { out.push('</ol>'); inOl = false; } if (!inUl) { out.push('<ul>'); inUl = true; } out.push('<li>' + ul[1] + '</li>'); continue; }
    if (ol) { if (inUl) { out.push('</ul>'); inUl = false; } if (!inOl) { out.push('<ol>'); inOl = true; } out.push('<li>' + ol[1] + '</li>'); continue; }
    closeLists();
    if (!line.trim()) continue;
    if (bq) { out.push('<blockquote>' + bq[1] + '</blockquote>'); continue; }
    if (/^<h[34]>/.test(line)) { out.push(line); continue; }
    out.push('<p>' + line + '</p>');
  }
  closeLists();
  return out.join('\n');
}

/* ───────────────── SEED DATA ───────────────── */
function seedChats() {
  const now = Date.now();
  const H = 3600e3, D = 24 * H;
  const mk = (title, user, model, age, modelKeySeed) => ({
    id: uid() + Math.floor(Math.random() * 1e4),
    title,
    createdAt: now - age,
    updatedAt: now - age,
    model: modelKeySeed || 'spark',
    messages: [
      { role: 'user', content: user, ts: now - age },
      { role: 'model', content: model, ts: now - age + 4000 },
    ],
  });
  return [
    mk('Correction de texte',
       'Peux-tu corriger ce paragraphe ? « Les enfants aime les pommes rouge. »',
       "Bien sûr. Voici la version corrigée :\n\n> « Les enfants aiment les pommes rouges. »\n\n## Ce qui change\n\n- **aime → aiment** : le sujet « les enfants » est pluriel, donc le verbe s'accorde au pluriel.\n- **rouge → rouges** : l'adjectif s'accorde en genre et en nombre avec « pommes ».\n\n## Règle à retenir\n\nL'accord du verbe avec le sujet, puis l'accord de l'adjectif avec le nom — les deux étapes sont liées.\n\nSi tu veux, je peux corriger d'autres textes du même type.",
       3 * H, 'spark'),
    mk('Asteroid Arc Length',
       'How do I find the arc length of an asteroid’s orbit segment?',
       "Pour un segment d'orbite, tu peux traiter la trajectoire comme une portion de courbe et appliquer la formule de longueur d'arc en coordonnées polaires :\n\n**s = ∫ √(r² + (dr/dθ)²) dθ**\n\n## Étapes\n\n1. Détermine l'équation polaire r(θ) de l'orbite (souvent une ellipse : r = a(1 − e²) / (1 + e cos θ)).\n2. Calcule la dérivée dr/dθ.\n3. Intègre entre les deux angles qui délimitent le segment.\n\n## Exemple rapide\n\nPour un cercle de rayon r entre θ₁ et θ₂ : s = r · (θ₂ − θ₁).\n\nSi tu me donnes les paramètres de ton astéroïde (demi-grand axe, excentricité, période), je peux faire le calcul complet avec toi.",
       9 * H, 'pro'),
    mk('Healthy dinner recipes',
       'Find healthy dinner recipes',
       "Here are **four balanced dinners** you can get on the table in under 30 minutes:\n\n## 1. Lemon-herb salmon bowl\n\n- Salmon fillet seared 4 min per side\n- Quinoa, cucumber, avocado, tahini-lemon dressing\n\n## 2. Sheet-pan miso chicken\n\n- Chicken thighs + broccoli + carrots, 220°C for 20 min\n- Glaze: miso, honey, soy sauce, garlic\n\n## 3. 15-minute lentil soup\n\n- Red lentils simmered with tomato, cumin and spinach\n- Finish with a squeeze of lemon and yogurt\n\n## 4. Ginger-garlic tofu stir-fry\n\n- Firm tofu, snap peas, bell pepper over brown rice\n\nWant a shopping list for any of these?",
       1.2 * D, 'spark'),
    mk('Travel itinerary for Kyoto',
       'Can you sketch a 4-day Kyoto itinerary focused on temples and food?',
       "Absolutely — here's a relaxed, temple-and-food focused plan :\n\n## Day 1 — Higashiyama\n\n- Morning: Kiyomizu-dera + Sannenzaka lanes\n- Lunch: yudofu near Nanzen-ji\n- Evening: Gion stroll, kaiseki if the budget allows\n\n## Day 2 — Arashiyama\n\n- Bamboo grove before 8am to beat the crowds\n- Tenryū-ji garden, then river-side matcha\n\n## Day 3 — North\n\n- Kinkaku-ji early, then Ryōan-ji rock garden\n- Evening: Nishiki Market street food crawl\n\n## Day 4 — Local pace\n\n- Philosopher's Path, indie cafes, and a farewell bowl of ramen\n\n## Practical tips\n\n- Buy a 1-day bus pass on day 1\n- Temples close early — do mornings outside\n- Reserve one fancy dinner; casual spots rarely take bookings\n\nWant me to adapt this for rain, kids, or a tighter budget?",
       2.1 * D, 'pro'),
    mk('Cover letter for internship',
       'Draft a cover letter for a summer software engineering internship at a startup',
       "Here's a tight, confident draft you can adapt :\n\n> Dear Hiring Team,\n>\n> I'm a third-year CS student who learns by building. Last semester I shipped a side project used by 200 classmates to share notes — and I'm looking for a team where I can do the same at a higher bar. Your work on streamline inference tooling is exactly the kind of problem I want to cut my teeth on.\n>\n> I work best with small teams, clear ownership, and fast feedback loops. In my last internship I took a fuzzy bug report to a merged fix in three days, and I haven't stopped since.\n>\n> I'd love the chance to contribute this summer and learn from the people who built the product I already admire.\n>\n> Best regards\n\n## Why this works\n\n- **Specific**: names a real project and outcome\n- **Short**: respects the reader's time\n- **Forward-looking**: talks about what you'll do, not what you did\n\nWant a version tailored to a particular company? Paste their careers page and I'll rewrite it.",
       4 * D, 'pro'),
    mk('Explain gradient descent',
       'Explain gradient descent like I’m five',
       "Imagine you're on a hilly field in thick fog and you want to get to the lowest valley. You can't see far, but you can feel the slope under your feet.\n\n## The game plan\n\n1. Feel the slope in every direction.\n2. Take one small step downhill — the direction where the ground drops fastest.\n3. Repeat, step by step, until the ground feels flat. You're at the bottom.\n\nThat's gradient descent : the 'slope' is the gradient of the loss function, 'step size' is the learning rate, and the 'valley' is the minimum your model is searching for.\n\n## Two dials to know\n\n- **Learning rate too big** → you jump over the valley and might climb the other side forever.\n- **Learning rate too small** → you inch forward and take forever.\n\nWant to see it as actual Python code?",
       6 * D, 'spark'),
    mk('Morning routine optimization',
       'Help me design a 60-minute morning routine for deep focus',
       "Here's a calm, sustainable 60-minute template :\n\n## Minutes 0–10 · Wake, no phone\n\nWater first, light exposure, movement — even two minutes of stretching resets alertness.\n\n## Minutes 10–20 · Stillness\n\nFive minutes of breathing or a short journal. The goal is a quiet launch, not a perfect one.\n\n## Minutes 20–30 · Prime\n\nReview your **one** most important outcome for the day. Write it on a sticky note.\n\n## Minutes 30–60 · Deep block\n\nNinety-second setup : phone in another room, one tab, lo-fi or silence. 30 minutes on the day's hardest task before anyone else is in your head.\n\n## Rules that keep it working\n\n- Same wake time, even weekends (within 1 hour)\n- Caffeine after the first block, not before it\n- If you miss a day, just start again tomorrow — streaks are a means, not the goal\n\nWant me to adapt this to your schedule? Tell me when you wake up and how long your commute is.",
       9 * D, 'pro'),
  ];
}

/* ───────────────── TOAST ───────────────── */
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

/* ───────────────── AUDIO BLIP ───────────────── */
let audioCtx = null;
function blip(freq = 720) {
  if (!settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + 0.09);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + 0.24);
  } catch (_) { /* audio unavailable */ }
}

/* ───────────── CUSTOM LIQUID GLASS DROPDOWNS ───────────── */
window.NovaUI = (() => {
  const registry = new WeakMap();
  let openMenu = null;
  let openTrigger = null;

  function closeAll() {
    if (openMenu) { openMenu.remove(); openMenu = null; }
    if (openTrigger) { openTrigger.setAttribute('aria-expanded', 'false'); openTrigger = null; }
  }

  function selectedLabel(sel) {
    const opt = sel.options[sel.selectedIndex];
    return opt ? opt.textContent : '';
  }

  function syncCustomSelect(sel) {
    const meta = registry.get(sel);
    if (!meta) return;
    meta.labelEl.textContent = selectedLabel(sel);
  }

  function buildOptions(sel, listEl, filterText = '') {
    listEl.innerHTML = '';
    const q = filterText.trim().toLowerCase();
    let count = 0;

    const appendOpt = (opt) => {
      const label = opt.textContent || '';
      if (q && !label.toLowerCase().includes(q) && !(opt.value || '').toLowerCase().includes(q)) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nova-select-opt' + (opt.value === sel.value ? ' selected' : '');
      btn.dataset.value = opt.value;
      btn.innerHTML = `<span>${escapeHtml(label)}</span><svg class="nova-select-check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 10"/></svg>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sel.value !== opt.value) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncCustomSelect(sel);
        closeAll();
      });
      listEl.appendChild(btn);
      count++;
    };

    for (const child of sel.children) {
      if (child.tagName === 'OPTGROUP') {
        const childrenOpts = [...child.children].filter(o => o.tagName === 'OPTION');
        const matching = q
          ? childrenOpts.filter(o => o.textContent.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
          : childrenOpts;
        if (!matching.length) continue;
        const grp = document.createElement('div');
        grp.className = 'nova-select-group';
        grp.textContent = child.label || '';
        listEl.appendChild(grp);
        matching.forEach(appendOpt);
      } else if (child.tagName === 'OPTION') {
        appendOpt(child);
      }
    }
    if (!count) {
      const empty = document.createElement('div');
      empty.className = 'nova-select-empty';
      empty.textContent = 'No matches';
      listEl.appendChild(empty);
    }
  }

  function openFor(sel, trigger) {
    if (openTrigger === trigger) { closeAll(); return; }
    closeAll();
    const menu = document.createElement('div');
    menu.className = 'nova-select-menu';
    menu.setAttribute('role', 'listbox');

    let searchEl = null;
    if (sel.options.length > 8) {
      searchEl = document.createElement('input');
      searchEl.type = 'search';
      searchEl.className = 'nova-select-search';
      searchEl.placeholder = 'Search language or filter…';
      menu.appendChild(searchEl);
    }
    const listEl = document.createElement('div');
    listEl.className = 'nova-select-list';
    menu.appendChild(listEl);
    buildOptions(sel, listEl, '');
    if (searchEl) {
      searchEl.addEventListener('input', () => buildOptions(sel, listEl, searchEl.value));
    }
    menu.addEventListener('click', (e) => e.stopPropagation());

    document.body.appendChild(menu);
    const rect = trigger.getBoundingClientRect();
    const menuW = Math.max(rect.width, 230);
    const left = Math.min(rect.left, window.innerWidth - menuW - 12);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    menu.style.minWidth = Math.min(menuW, window.innerWidth - 24) + 'px';
    menu.style.left = Math.max(10, left) + 'px';
    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      menu.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
      menu.style.maxHeight = Math.min(340, Math.max(80, spaceAbove - 6)) + 'px';
    } else {
      menu.style.top = (rect.bottom + 6) + 'px';
      menu.style.maxHeight = Math.min(340, Math.max(80, spaceBelow - 6)) + 'px';
    }

    trigger.setAttribute('aria-expanded', 'true');
    openMenu = menu;
    openTrigger = trigger;

    requestAnimationFrame(() => {
      const activeOpt = listEl.querySelector('.nova-select-opt.selected');
      if (activeOpt) activeOpt.scrollIntoView({ block: 'nearest' });
      if (searchEl) searchEl.focus();
    });
  }

  function enhanceSelect(sel) {
    if (!sel) return;
    if (registry.has(sel)) { syncCustomSelect(sel); return; }
    sel.classList.add('nova-select-native-hidden');
    const wrap = document.createElement('div');
    wrap.className = 'nova-select-wrap';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nova-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const labelEl = document.createElement('span');
    labelEl.className = 'nova-select-label';
    trigger.appendChild(labelEl);
    trigger.insertAdjacentHTML('beforeend', '<svg class="nova-select-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>');
    wrap.appendChild(trigger);
    sel.parentNode.insertBefore(wrap, sel.nextSibling);
    registry.set(sel, { wrap, trigger, labelEl });
    syncCustomSelect(sel);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openFor(sel, trigger);
    });
    sel.addEventListener('change', () => syncCustomSelect(sel));
  }

  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  window.addEventListener('resize', closeAll);
  return { enhanceSelect, syncCustomSelect, closeAll };
})();

/* ───────────── VIEW SWITCHING ───────────── */
const views = { home: $('#viewHome'), chat: $('#viewChat'), all: $('#viewAll'), knowledge: $('#viewKnowledge') };

function setView(name) {
  currentView = name;
  Object.entries(views).forEach(([key, el]) => { if (el) el.classList.toggle('active', key === name); });
  if (name === 'chat') composerSlots.chat.appendChild(composer);
  else composerSlots.home.appendChild(composer);
  if (modelMenu) { modelMenu.hidden = true; modelBtn.setAttribute('aria-expanded', 'false'); }
  if (attachMenu) attachMenu.hidden = true;
  if (chatLangPopover) { chatLangPopover.hidden = true; if (chatLangBtn) chatLangBtn.setAttribute('aria-expanded', 'false'); }
  $('#allChatsBtn').classList.toggle('active', name === 'all');
  const kbBtn = $('#knowledgeBtn');
  if (kbBtn) kbBtn.classList.toggle('active', name === 'knowledge');
  updateInputAffordances();
  updateContextMeter(null, true);
}

/* ─────────── SIDEBAR (docked, 3-bars toggle) ─────────── */
function setSidebar(open) {
  if (!open) {
    const pop = $('#enginePopover');
    const caret = $('#brandCaret');
    if (pop) pop.hidden = true;
    if (caret) caret.setAttribute('aria-expanded', 'false');
  }
  document.body.classList.toggle('sidebar-collapsed', !open);
  localStorage.setItem(LS.sidebar, open ? '1' : '0');
}
function toggleSidebar() {
  const willOpen = document.body.classList.contains('sidebar-collapsed');
  setSidebar(willOpen);
}

/* ───────────── RENDER: SIDEBAR LIST ───────────── */
function groupedSortedChats() {
  return [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
}

function renderSidebarList() {
  const sorted = groupedSortedChats();
  allChatsCount.textContent = sorted.length;
  chatList.innerHTML = '';

  if (!sorted.length) {
    chatList.innerHTML = '<div class="list-empty">No chats yet.<br>Ask Primer anything to get started.</div>';
    return;
  }

  const groups = new Map();
  for (const chat of sorted) {
    const bucket = dayBucket(chat.updatedAt);
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket).push(chat);
  }

  for (const [bucket, list] of groups) {
    const label = document.createElement('div');
    label.className = 'list-group-label';
    label.textContent = bucket;
    chatList.appendChild(label);

    for (const chat of list) {
      const item = document.createElement('button');
      item.className = 'chat-item' + (chat.id === currentId ? ' active' : '');
      item.setAttribute('data-id', chat.id);
      item.innerHTML = `
        <span class="ci-title">${escapeHtml(chat.title)}</span>
        <span class="ci-del" role="button" tabindex="0" aria-label="Delete chat" title="Delete chat">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </span>`;
      chatList.appendChild(item);
    }
  }
}

/* ───────────── RENDER: ALL CHATS GRID ───────────── */
function renderAllChats() {
  const q = (allSearch.value || '').trim().toLowerCase();
  const sorted = groupedSortedChats().filter(c => {
    if (!q) return true;
    return (c.title + ' ' + chatPreview(c)).toLowerCase().includes(q);
  });

  allCount.textContent = chats.length;
  allGrid.innerHTML = '';
  allEmpty.hidden = sorted.length !== 0;

  if (!sorted.length) {
    allEmptyText.textContent = q
      ? `No chats match “${q}”.`
      : 'No chats yet. Start one with the New chat button.';
  }

  for (const chat of sorted) {
    const card = document.createElement('button');
    card.className = 'chat-card';
    card.setAttribute('data-id', chat.id);
    card.innerHTML = `
      <span class="card-title">${escapeHtml(chat.title)}</span>
      <span class="card-prev">${escapeHtml(chatPreview(chat))}</span>
      <span class="card-foot">
        <span class="card-model">
          <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><circle cx="12" cy="12" r="5.4" fill="url(#emberGrad)"/><ellipse cx="12" cy="12" rx="10.4" ry="4" transform="rotate(-24 12 12)" fill="none" stroke="#ffd166" stroke-width="2.4"/></svg>
          ${escapeHtml((MODELS[chat.model] || MODELS.spark).name)} · ${timeAgo(chat.updatedAt)}
        </span>
        <span class="card-del" role="button" tabindex="0" aria-label="Delete chat" title="Delete chat">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </span>
      </span>`;
    allGrid.appendChild(card);
  }
}

function renderAll() {
  renderSidebarList();
  renderAllChats();
}

/* ───────────── CHAT CRUD ───────────── */
function getCurrentChat() { return chats.find(c => c.id === currentId) || null; }

function startNewChat() {
  currentId = null;
  messagesEl.innerHTML = '';
  regenSeed = 0;
  chatContext.used = 0;
  chatContext.max = engineContext[modelKey] || TIER_STATE[modelKey].ctx;
  setView('home');
  updateContextMeter(0, true);
  renderSidebarList();
  promptInput.focus();
}

function openChat(id) {
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  currentId = id;
  regenSeed = 0;
  const tier = chat.model && MODELS[chat.model] ? chat.model : modelKey;
  modelKey = tier;
  localStorage.setItem(LS.model, tier);
  modelLabel.textContent = MODELS[tier].name;
  const bt = $('#brandTag');
  if (bt) bt.textContent = tier.toUpperCase();
  renderModelMenu();
  chatContext.max = engineContext[tier] || TIER_STATE[tier].ctx;
  const hasExact = typeof chat.tokensUsed === 'number' && chat.tokensUsed > 0;
  chatContext.used = hasExact ? chat.tokensUsed : estimateChatTokens(chat);
  renderMessages(chat);
  setView('chat');
  updateContextMeter(chatContext.used, hasExact);
  renderSidebarList();
}

function deleteChat(id) {
  const idx = chats.findIndex(c => c.id === id);
  if (idx === -1) return;
  chats.splice(idx, 1);
  saveChats();
  renderAll();
  if (id === currentId) startNewChat();
  toast('Chat deleted');
}

function clearAllChats() {
  chats = [];
  saveChats();
  renderAll();
  startNewChat();
  toast('All chats cleared');
}

/* ───────────── RENDER: MESSAGES ───────────── */
function attachmentChipsHTML(list) {
  return list.map(a => `
    <span class="bubble-file">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${a.dataUrl ? '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'}</svg>
      ${escapeHtml(a.name)}
    </span>`).join('');
}

function bubbleImagesHTML(images) {
  if (!images || !images.length) return '';
  return images.map(img => `
    <img class="bubble-img" src="${img.dataUrl}" alt="${escapeHtml(img.name || 'attachment')}" loading="lazy">`
  ).join('');
}

const TRANSLATE_BTN_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"/></svg>';

function userBubbleHTML(msg) {
  const att = msg.attachments && msg.attachments.length
    ? `<span class="bubble-attachments">${attachmentChipsHTML(msg.attachments)}</span>` : '';
  const imagesHTML = msg.images && msg.images.length
    ? `<span class="bubble-images">${bubbleImagesHTML(msg.images)}</span>` : '';
  return `<div class="message user"><div class="bubble">${escapeHtml(msg.content)}${att}${imagesHTML}</div><div class="user-msg-actions"><button type="button" class="icon-btn" data-action="translate-user" title="Translate message" aria-label="Translate message">${TRANSLATE_BTN_SVG}</button></div></div>`;
}

const ORBIT_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="5.4" fill="url(#emberGrad)"/><ellipse cx="12" cy="12" rx="10.4" ry="4" transform="rotate(-24 12 12)" fill="none" stroke="#ffd166" stroke-width="2.1"/></svg>';

// chars/4 token estimate over the chat (used for the meter when exact usage is unavailable)
function estimateHistoryTokens(chat) {
  if (!chat || !Array.isArray(chat.messages)) return 0;
  let chars = 0;
  for (const m of chat.messages) {
    if (typeof m.content === 'string') chars += m.content.length;
    if (m.attachments) chars += m.attachments.length * 20;
    if (m.images) chars += m.images.length * 1024; // ~256 tokens per image
  }
  return Math.ceil(chars / 4);
}

// Live token probe: ask llama-server (via Primer's backend) for the exact
// templated prompt size for the current history + draft, instead of the
// chars/4 guess. Falls back to chars/4 when the engine isn't loaded yet
// (the backend never loads a model just to count).
let tokenProbeTimer = 0, tokenProbeSeq = 0;

function scheduleTokenProbe() {
  clearTimeout(tokenProbeTimer);
  tokenProbeTimer = setTimeout(runTokenProbe, 250);
}

async function runTokenProbe() {
  if (isStreaming) return;
  const draft = promptInput.value;
  const imageAttachCount = attachments.filter(a => a.dataUrl).length;
  const fileNote = attachments.length
    ? '\n\nAttached file(s): ' + attachments.map(a => a.name).join(', ')
    : '';
  const chat = currentId ? getCurrentChat() : null;
  const messages = chat ? serializeChatMessages(chat) : [];
  if (draft.trim() || fileNote) messages.push({ role: 'user', content: draft + fileNote });
  if (!messages.length) { updateContextMeter(0, true); return; }
  const seq = ++tokenProbeSeq;
  try {
    const res = await fetch(API_BASE + '/api/token-count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        preset: modelKey,
        thinking: engineReasoning,
        tutor_language: uiLang,
        knowledge_context: typeof buildKnowledgeContext === 'function' ? buildKnowledgeContext(draft) : '',
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('probe HTTP ' + res.status);
    const data = await res.json();
    if (seq !== tokenProbeSeq || isStreaming) return;   // a newer probe superseded this one
    chatContext.max = data.context_max || chatContext.max;
    const used = (data.prompt_tokens || 0) + imageAttachCount * 256;
    updateContextMeter(used, !!data.exact && imageAttachCount === 0);
  } catch (_) {
    if (seq !== tokenProbeSeq || isStreaming) return;
    // offline fallback: chars/4 of everything visible, marked approximate
    let chars = draft.length + fileNote.length;
    if (chat) {
      for (const m of chat.messages) chars += (m.content || '').length + 16;
    }
    updateContextMeter(Math.ceil(chars / 4) + imageAttachCount * 256, false);
  }
}

function modelBlockHTML(msg, modelOfChat) {
  const m = MODELS[modelOfChat] || MODELS.spark;
  const thinking = msg.thinking && msg.thinking.trim()
    ? `<div class="mind-row">
         <button class="mind-toggle" type="button" aria-expanded="false">
           <svg class="chev" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
           <span class="mind-label">Reasoning</span>
           <span class="mind-count">${escapeHtml(String(msg.thinking.split('\n').length))} lines</span>
         </button>
       </div>
       <pre class="mind-body" hidden>${escapeHtml(msg.thinking)}</pre>`
    : '';
  return `
    <div class="message model">
      <div class="model-block">
        <div class="model-head">
          ${ORBIT_SVG}
          Primer
          <span class="model-tag">${escapeHtml(m.name)}</span>
        </div>
        ${Number.isFinite(msg.thinkingSeconds) ? `<div class="generation-summary">${escapeHtml(t('preparedIn'))} ${msg.thinkingSeconds}s</div>` : ''}
        ${thinking}
        <div class="model-body">${md(msg.content)}</div>
        <div class="model-actions">
          <button class="icon-btn" data-action="copy" title="Copy response" aria-label="Copy response">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="icon-btn" data-action="translate" title="Translate message" aria-label="Translate message">
            ${TRANSLATE_BTN_SVG}
          </button>
          <button class="icon-btn" data-action="speak" title="Listen" aria-label="Listen">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          </button>
          <button class="icon-btn" data-action="like" title="Good response" aria-label="Good response">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          </button>
          <button class="icon-btn" data-action="dislike" title="Bad response" aria-label="Bad response">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H6.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
          </button>
          <button class="icon-btn" data-action="regenerate" title="Regenerate response" aria-label="Regenerate response">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
      </div>
    </div>`;
}

function renderMessages(chat) {
  messagesEl.innerHTML = chat.messages.map(m =>
    m.role === 'user' ? userBubbleHTML(m) : modelBlockHTML(m, chat.model)
  ).join('');
  // prefer the server-reported usage from the last reply over char estimates,
  // which systematically under-counts (system prompt + tool chatter invisible to chars/4)
  const lastUsage = [...chat.messages].reverse().find(m => m.role === 'model' && m.usage);
  chatContext.used = lastUsage
    ? lastUsage.usage.prompt_tokens + lastUsage.usage.completion_tokens
    : estimateHistoryTokens(chat);
  updateContextMeter(null, true);
  requestAnimationFrame(() => { chatScroll.scrollTop = chatScroll.scrollHeight; });
}

/* ───────────── SEND FLOW ───────────── */
function updateInputAffordances() {
  const hasText = promptInput.value.trim().length > 0 || attachments.length > 0;
  sendBtn.hidden = !hasText;
  micBtn.hidden = hasText;
}

function ensureChat(firstText) {
  if (currentId) return getCurrentChat();
  const chat = {
    id: uid(),
    title: deriveTitle(firstText || 'New chat'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: modelKey,
    messages: [],
  };
  chats.unshift(chat);
  currentId = chat.id;
  return chat;
}

async function sendCurrentMessage() {
  const text = promptInput.value.trim();
  if ((!text && attachments.length === 0) || isStreaming) return;

  const chat = ensureChat(text || 'Shared files');
  const images = attachments.filter(a => a.dataUrl).map(a => ({ name: a.name, dataUrl: a.dataUrl, size: a.size }));
  const userMsg = {
    role: 'user',
    content: text,
    attachments: attachments.map(a => ({ name: a.name, size: a.size, dataUrl: a.dataUrl || null })),
    images,
    ts: Date.now(),
  };
  chat.messages.push(userMsg);
  chat.updatedAt = Date.now();
  chat.model = modelKey;

  promptInput.value = '';
  promptInput.style.height = 'auto';
  attachments = [];
  renderAttachments();
  updateInputAffordances();

  appendUserBubble(userMsg);
  setView('chat');
  saveChats();
  renderSidebarList();
  blip(620);

  isStreaming = true;
  showThinking();

  // Backend auto-downloads & lazy-loads the selected tier on first use; fall back cleanly only on real failure.
  sendNeuralChat(chat, text).catch(err => {
    console.warn('chat backend failed → offline fallback:', err);
    updateInputAffordances();
    toast('The AI model could not answer');
    const reply = chatErrorMessage(err);
    regenSeed = 0;
    streamModelReply(chat, reply);
  });
}

function appendUserBubble(msg) {
  messagesEl.insertAdjacentHTML('beforeend', userBubbleHTML(msg));
  chatScroll.scrollTop = chatScroll.scrollHeight;
}

let generationProgress = null;

function updateGenerationProgress(stage) {
  if (!generationProgress) return;
  if (stage) generationProgress.stage = stage;
  const elapsed = Math.floor((Date.now() - generationProgress.started) / 1000);
  const keys = { 'Connecting to the model': 'connecting', 'Downloading model files': 'downloading', 'Loading model': 'loading', 'Starting model': 'starting', 'Preparing an answer': 'preparing', 'Thinking': 'thinking', 'Responding': 'responding' };
  const label = keys[generationProgress.stage] ? t(keys[generationProgress.stage]) : generationProgress.stage;
  document.querySelectorAll('.generation-status').forEach(el => {
    el.textContent = `${label} · ${elapsed}s`;
  });
}

function stopGenerationProgress() {
  const progress = generationProgress;
  if (!progress) return null;
  clearInterval(progress.timer);
  clearInterval(progress.poller);
  generationProgress = null;
  return Math.max(0, Math.round(((progress.answerStarted || Date.now()) - progress.started) / 1000));
}

function showThinking(label = '') {
  stopGenerationProgress();
  const tier = modelKey;
  generationProgress = { started: Date.now(), stage: 'Connecting to the model', waitingForServer: true };
  const block = document.createElement('div');
  block.className = 'message model thinking-row';
  block.innerHTML = `
    <div class="model-block">
      <div class="model-head">
        ${ORBIT_SVG}
        Primer
        <span class="model-tag">${escapeHtml(MODELS[modelKey].name)}</span>
        <span class="thinking-status">${escapeHtml(label)}</span>
      </div>
      <div class="thinking">
        ${ORBIT_SVG}
        <span class="generation-status" role="status" aria-live="polite"></span>
      </div>
    </div>`;
  messagesEl.appendChild(block);
  updateGenerationProgress();
  generationProgress.timer = setInterval(() => updateGenerationProgress(), 1000);
  const poll = async () => {
    const progress = generationProgress;
    if (!progress || !progress.waitingForServer) return;
    try {
      const res = await fetch(API_BASE + '/api/health', { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      if (generationProgress !== progress || !progress.waitingForServer) return;
      const status = data.engines && data.engines[tier] && data.engines[tier].status;
      if (status === 'downloading') updateGenerationProgress('Downloading model files');
      else if (status === 'loading') updateGenerationProgress('Loading model');
      else if (status === 'ready') updateGenerationProgress('Preparing an answer');
      else if (status === 'idle') updateGenerationProgress('Starting model');
    } catch (_) { /* The request itself reports connection errors. */ }
  };
  generationProgress.poller = setInterval(poll, 2000);
  poll();
  chatScroll.scrollTop = chatScroll.scrollHeight;
}

function insertModelBlock(chat) {
  const thinking = messagesEl.querySelector('.thinking-row');
  if (thinking) thinking.remove();

  const m = MODELS[chat.model] || MODELS.spark;
  messagesEl.insertAdjacentHTML('beforeend', `
    <div class="message model">
      <div class="model-block">
        <div class="model-head">
          ${ORBIT_SVG}
          Primer
          <span class="model-tag">${escapeHtml(m.name)}</span>
        </div>
        <div class="generation-status" role="status" aria-live="polite"></div>
        <div class="mind-row" hidden>
          <button class="mind-toggle" type="button" aria-expanded="false">
            <svg class="chev" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
            <span class="mind-label">Reasoning</span>
            <span class="mind-count">0 lines</span>
          </button>
        </div>
        <pre class="mind-body" hidden></pre>
        <div class="model-body streaming-caret"></div>
      </div>
    </div>`);
  return messagesEl.lastElementChild.querySelector('.model-body');
}

function appendModelActions(bodyEl) {
  const actions = document.createElement('div');
  actions.className = 'model-actions';
  actions.innerHTML = `
    <button class="icon-btn" data-action="copy" title="Copy response" aria-label="Copy response"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
    <button class="icon-btn" data-action="translate" title="Translate message" aria-label="Translate message">${TRANSLATE_BTN_SVG}</button>
    <button class="icon-btn" data-action="speak" title="Listen" aria-label="Listen"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg></button>
    <button class="icon-btn" data-action="like" title="Good response" aria-label="Good response"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg></button>
    <button class="icon-btn" data-action="dislike" title="Bad response" aria-label="Bad response"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H6.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg></button>
    <button class="icon-btn" data-action="regenerate" title="Regenerate response" aria-label="Regenerate response"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>`;
  bodyEl.parentElement.appendChild(actions);
}

function finalizeModelReply(chat, bodyEl, fullText, usage, thinkingText = '', isError = false) {
  const thinkingSeconds = stopGenerationProgress();
  const mindBlock = bodyEl.parentElement ? bodyEl.parentElement.querySelector('.mind-row') : null;
  if (thinkingText && thinkingText.trim()) {
    const lines = thinkingText.split('\n').length;
    if (mindBlock) {
      mindBlock.hidden = false;
      mindBlock.querySelector('.mind-count').textContent = `${lines} lines`;
      const bodyPre = bodyEl.parentElement.querySelector('.mind-body');
      if (bodyPre) bodyPre.textContent = thinkingText;
    }
  } else if (mindBlock) {
    mindBlock.remove();   // nothing to show — tier didn't emit reasoning
  }
  const msgRecord = { role: 'model', content: fullText, ts: Date.now() };
  if (isError) msgRecord.error = true;
  if (!isError && thinkingSeconds !== null) msgRecord.thinkingSeconds = thinkingSeconds;
  if (thinkingText && thinkingText.trim()) msgRecord.thinking = thinkingText;
  if (usage && usage.prompt_tokens != null) {
    msgRecord.usage = { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens || 0 };
  }
  chat.messages.push(msgRecord);
  chat.updatedAt = Date.now();
  chat.title = chat.messages[0] ? deriveTitle(chat.messages[0].content || chat.title) : chat.title;
  if (usage && usage.prompt_tokens != null) {
    chatContext.used = usage.prompt_tokens + (usage.completion_tokens || 0);
    chatContext.max = usage.context_max || chatContext.max;
    chat.tokensUsed = chatContext.used;
    neuralChatStatus = 'ready';
  }
  saveChats();
  renderAll();
  const cleanThinking = thinkingText.trim();
  const traceEl = bodyEl.parentElement && bodyEl.parentElement.querySelector('.thinking-trace');
  if (traceEl) {
    if (cleanThinking) {
      traceEl.hidden = false;
      traceEl.open = false;
      const sumEl = traceEl.querySelector('.thinking-summary');
      if (sumEl) sumEl.textContent = 'Thought process';
      const tbEl = traceEl.querySelector('.thinking-body');
      if (tbEl) tbEl.textContent = cleanThinking;
    } else {
      traceEl.hidden = true;
    }
  }
  bodyEl.classList.remove('streaming-caret');
  bodyEl.innerHTML = md(fullText);
  appendModelActions(bodyEl);
  updateContextMeter(null, true);
  isStreaming = false;
  activeAbort = null;
  stopBtn.hidden = true;
  if (chat.model !== modelKey) {
    fetch(API_BASE + '/api/engines/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: chat.model }) }).catch(() => {});
  }
  chatScroll.scrollTop = chatScroll.scrollHeight;
  blip(880);
}

function streamModelReply(chat, fullText) {
  const bodyEl = insertModelBlock(chat);
  const nearBottom = () => chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 140;
  const autoScroll = () => { if (nearBottom()) chatScroll.scrollTop = chatScroll.scrollHeight; };

  if (!settings.streaming) {
    finalizeModelReply(chat, bodyEl, fullText, null, '', true);
    return;
  }

  const tokens = fullText.split(/(\s+)/);
  let acc = '', i = 0;
  const tick = () => {
    const step = 1 + Math.floor(Math.random() * 3);
    for (let n = 0; n < step && i < tokens.length; n++, i++) acc += tokens[i];
    bodyEl.innerHTML = md(acc);
    autoScroll();
    if (i < tokens.length) {
      setTimeout(tick, (MODELS[chat.model] || MODELS.spark).speed);
    } else {
      finalizeModelReply(chat, bodyEl, fullText, null, '', true);
    }
  };
  setTimeout(tick, 60);
}

// Serialize the stored chat into the exact OpenAI-style message array the
// backend gets — shared by the live token probe and the send path.
function serializeChatMessages(chat) {
  return chat.messages
    .filter(m => !m.error && !(m.role === 'model' && /^(?:Primer|Nova) could not (?:get an answer|reach)/.test(m.content || '')))
    .slice(-40)
    .map(m => {
      const content = m.role === 'user' && m.attachments && m.attachments.length
        ? (m.content ? m.content + '\n\n' : '') + 'Attached file(s): ' + m.attachments.map(a => a.name).join(', ')
        : m.content;
      if (m.images && m.images.length) {
        return {
          role: m.role === 'model' ? 'assistant' : (m.role || 'user'),
          content: [
            { type: 'text', text: content || '' },
            ...m.images.map(img => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
          ],
        };
      }
      return {
        role: m.role === 'model' ? 'assistant' : (m.role || 'user'),
        content,
      };
    });
}

/* LFM3-VL-2B chat over SSE. Throws (before any token, or on empty output) so
   the caller can fall back to the offline reply engine; if some tokens already
   streamed, the partial reply is finalized instead of re-asking. */
function chatErrorMessage(err) {
  if (err instanceof TypeError) {
    return 'Primer could not reach its local AI server. On Windows, open Start Primer.cmd, then try again at http://127.0.0.1:8787/.';
  }
  return `Primer could not get an answer: ${err.message || 'the AI server is unavailable'}. Please check the server and try again.`;
}

async function sendNeuralChat(chat, text) {
  tokenProbeSeq++;               // invalidate any in-flight token probe
  clearTimeout(tokenProbeTimer);
  const nearBottom = () => chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 140;
  const autoScroll = () => { if (nearBottom()) chatScroll.scrollTop = chatScroll.scrollHeight; };

  if (!MODELS[chat.model]) chat.model = modelKey;
  const messages = serializeChatMessages(chat);
  const images = messages.some(message => Array.isArray(message.content) && message.content.some(part => part.type === 'image_url'));
  if (!await ensureDownloadPermission(chat.model, images)) {
    throw new Error(hostedPreview ? 'AI chat is not available on this hosted preview. The CAD viewer supports SVN browsing and STEP files.' : 'Model download was not approved or setup is incomplete.');
  }

  const controller = new AbortController();
  activeAbort = controller;
  stopBtn.hidden = false;
  const signal = controller.signal;

  let bodyEl = null;
  let res;
  try {
    res = await fetch(API_BASE + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        preset: chat.model,
        thinking: engineReasoning,
        selected_file: window.team846 && window.team846.selected ? window.team846.selected() : null,
        tutor_language: uiLang,
        user_team: getUserTeam() || null,
        knowledge_context: [window.novaCad && window.novaCad.context() ? 'Current CAD viewer selection (model-provided data; do not invent missing specifications or claim to perform viewer actions): ' + window.novaCad.context().slice(0, 5000) : '', typeof buildKnowledgeContext === 'function' ? buildKnowledgeContext(text) : ''].filter(Boolean).join('\n\n'),
      }),
      signal,
    });
  } catch (err) {
    activeAbort = null;
    stopBtn.hidden = true;
    isStreaming = false;
    if (isAbortError(err)) { stopGenerationProgress(); messagesEl.querySelector('.thinking-row')?.remove(); toast('Stopped'); return; }
    throw err;
  }
  if (!res.ok || !res.body) {
    let detail = '';
    try { const data = await res.json(); detail = data.detail || data.error || ''; } catch (_) { /* ignore */ }
    activeAbort = null;
    stopBtn.hidden = true;
    throw new Error(`chat HTTP ${res.status} ${detail}`);
  }
  bodyEl = insertModelBlock(chat);
  if (generationProgress) generationProgress.waitingForServer = false;
  updateGenerationProgress('Preparing an answer');
  const traceEl = bodyEl.parentElement && bodyEl.parentElement.querySelector('.thinking-trace');
  const thinkingBodyEl = traceEl && traceEl.querySelector('.thinking-body');
  const thinkingSummaryEl = traceEl && traceEl.querySelector('.thinking-summary');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', acc = '', thinkingAcc = '', usage = null, promptTokens = 0, streamErr = null;
  const mindBlock = () => (bodyEl.parentElement ? bodyEl.parentElement.querySelector('.mind-row') : null);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const payload = t.slice(5).trim();
        if (!payload) continue;
        let evt;
        try { evt = JSON.parse(payload); } catch (_) { continue; }
        if (evt.type === 'start') {
          neuralChatStatus = 'ready';
          promptTokens = evt.prompt_tokens || 0;
          chatContext.max = evt.context_max || chatContext.max;
          chatContext.used = promptTokens;   // start already carries the full templated prompt (history included)
          updateContextMeter(promptTokens, evt.exact !== false);
        } else if (evt.type === 'status') {
          updateGenerationProgress(evt.stage || 'Preparing an answer');
        } else if (evt.type === 'source') {
          window.team846.openFromAI(evt.source);
        } else if (evt.type === 'note') {
          toast(evt.text || 'Note');
        } else if (evt.type === 'thinking') {
          updateGenerationProgress('Thinking');
          thinkingAcc += evt.text;
          const block = mindBlock();
          if (block) {
            block.hidden = false;
            const body = bodyEl.parentElement.querySelector('.mind-body');
            body.textContent += evt.text;
            block.querySelector('.mind-count').textContent = `${thinkingAcc.split('\n').length} lines`;
          }
        } else if (evt.type === 'token') {
          if (generationProgress && !generationProgress.answerStarted) generationProgress.answerStarted = Date.now();
          updateGenerationProgress('Responding');
          if (traceEl && traceEl.open && !acc) {
            traceEl.open = false;
            if (thinkingSummaryEl) thinkingSummaryEl.textContent = 'Thought process';
          }
          acc += evt.text;
          bodyEl.innerHTML = md(acc);
          chatContext.used = promptTokens + Math.ceil(acc.length / 4);
          updateContextMeter(chatContext.used, false);
          autoScroll();
        } else if (evt.type === 'done') {
          usage = evt.usage;
        } else if (evt.type === 'error') {
          streamErr = new Error(evt.error || 'stream error');
        }
      }
    }
  } catch (err) {
    streamErr = err;
  }

  if (streamErr) {
    const stopped = activeAbort && activeAbort.signal.aborted;
    if (acc.trim()) {
      finalizeModelReply(chat, bodyEl, acc.trim(), usage, thinkingAcc);
      toast(stopped ? 'Stopped' : 'Connection dropped — showing partial reply');
      return;
    }
    if (stopped) {
      const root = bodyEl.closest ? bodyEl.closest('.message') : null;
      if (root) root.remove(); else bodyEl.remove();
      activeAbort = null;
      stopBtn.hidden = true;
      isStreaming = false;
      stopGenerationProgress();
      toast('Stopped');
      return;
    }
    const root = bodyEl.closest ? bodyEl.closest('.message') : null;
    if (root) root.remove(); else bodyEl.remove();
    throw streamErr;
  }

  const fullText = acc.trim();
  if (!fullText) {
    const root = bodyEl.closest ? bodyEl.closest('.message') : null;
    if (root) root.remove(); else bodyEl.remove();
    throw new Error('Empty response from model');
  }
  finalizeModelReply(chat, bodyEl, fullText, usage, thinkingAcc);
}

/* ───────────── REPLY GENERATOR (with Knowledge Base lookup) ───────────── */
function generateReply(prompt, model, seedVariant) {
  const p = (prompt || '').toLowerCase();
  const team = formatTeamLabel(getUserTeam());

  // Check Knowledge Base sources & glossary first so offline answers stay useful
  if (typeof searchKnowledgeItems === 'function') {
    const kbHits = searchKnowledgeItems(prompt || '', 3);
    if (kbHits.length && (/846|swerve|cancoder|canivore|talon|loctite|bumper|intake|plamo|lfm|mimo|whisper|llama|tool|stack|model|sop|pit|knowledge|source|manual|checklist|frc|wpilib|can\b/.test(p) || kbHits[0]._score >= 3)) {
      const sections = kbHits.map(item => {
        if (item.kind === 'glossary') {
          const langTerm = (item.translations && item.translations[(uiLang === 'zh' || uiLang === 'zh-hans') ? 'zh' : uiLang]) || item.translations?.es || '';
          const tip = item.rookieTip ? `\n- **Pit tip:** ${item.rookieTip}` : '';
          const transLine = langTerm ? `\n- **Translation:** ${langTerm}` : '';
          return `### ${item.title} (${item.category})\n${item.description}${transLine}${tip}`;
        }
        return `### ${item.title}${item.subtitle ? ` · *${item.subtitle}*` : ''}\n${item.description}`;
      }).join('\n\n');
      return `Here is what Primer's **Knowledge Base** has for **${deriveTitle(prompt)}**:\n\n${sections}\n\nYou can browse or add docs, tools, and glossary entries in **Knowledge base** (sidebar).`;
    }
  }

  if (/translat|how do you say|how to say/.test(p)) {
    return `You can translate inside this conversation:\n\n- Click the **Globe (🌐) button** in the composer to switch site language or enable the **In-chat translator**.\n- Click the **globe icon** under any message to translate it directly.`;
  }

  if (/^(hi|hello|hey|yo)\b/.test(p)) {
    const teamNote = team ? ` for **${team}**` : '';
    return `Hi! I'm **Primer**${teamNote}. I'm offline from the local model server right now, so I can only search your local **Knowledge Base** and run the built-in translator until the backend is running.\n\nStart \`backend/translator_server.py\` to enable full local AI answers and repository search.`;
  }

  const topic = deriveTitle(prompt).replace(/…$/, '');
  if (settings.simple) {
    return `Offline mode for **${topic}**.\n\nThe local AI server is not connected right now, so I cannot run live inference.\n\n- Check **Knowledge base** in the sidebar for offline SOPs, tools, and glossary terms.\n- Open the **globe button** in the composer for instant translation.`;
  }

  return `The local AI server is currently unavailable, so I can't generate a full answer for **${topic}**.\n\nYou can still:\n- Search **Knowledge base** in the sidebar for offline reference docs and glossary entries\n- Use the **Code explorer** to inspect local repositories\n- Open the **In-chat translator** from the globe button in the composer`;
}

/* ───────────── ATTACHMENTS ───────────── */
function renderAttachments() {
  attachRow.innerHTML = attachments.map((a, i) => `
    <span class="attach-chip">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${a.dataUrl ? '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'}</svg>
      <span class="attach-name" title="${escapeHtml(a.name)}">${escapeHtml(a.name)}</span>
      <span class="attach-size">${fmtSize(a.size)}</span>
      <button type="button" class="attach-remove" data-idx="${i}" aria-label="Remove attachment">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </span>`).join('');
  attachRow.hidden = attachments.length === 0;
  scheduleTokenProbe();
}

function fileToResizedDataUrl(file, maxDim = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file.type || !file.type.startsWith('image/')) return resolve(null);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

async function addFiles(fileList) {
  const items = Array.from(fileList);
  for (const f of items) {
    if (attachments.length >= 6) { toast('Maximum 6 attachments'); break; }
    const isImage = (f.type || '').startsWith('image/');
    const dataUrl = isImage ? await fileToResizedDataUrl(f) : null;
    attachments.push({ name: f.name, size: f.size, type: f.type || '', dataUrl });
  }
  renderAttachments();
  updateInputAffordances();
  promptInput.focus();
}

/* ───────────── MODEL PICKER ───────────── */
const ORBIT_MINI = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="5.4" fill="url(#emberGrad)"/><ellipse cx="12" cy="12" rx="10.4" ry="4" transform="rotate(-24 12 12)" fill="none" stroke="#ffd166" stroke-width="2.1"/></svg>';

const modelsForMenu = () => Object.entries(MODELS);

function setReasoning(on) {
  engineReasoning = !!on;
  tierReasoning[modelKey] = engineReasoning;
  try { localStorage.setItem('nova.reasoning.tiers', JSON.stringify(tierReasoning)); } catch (_) { /* ignore */ }
  localStorage.setItem('nova.reasoning', engineReasoning ? 'on' : 'off');
  renderModelMenu();
  renderEnginePopover();
}

async function autoUnloadUnselected(activeTier) {
  for (const k of Object.keys(MODELS)) {
    if (k !== activeTier) {
      stopEngine(k, null, { quiet: true }).catch(() => {});
    }
  }
}

const CTX_MIN = 4096;
const CTX_MAX = 65536;
const CTX_STEP = 4096;
let isRestartingCtx = false;

function ctxSliderPct(ctx) {
  return Math.round(((Math.min(CTX_MAX, Math.max(CTX_MIN, ctx)) - CTX_MIN) / (CTX_MAX - CTX_MIN)) * 100);
}

function ctxSliderKvText(tier, ctx) {
  return tier === 'spark' ? 'GDN · fixed small KV' : `~${kvEstimateMB(tier, ctx)} MB KV q8_0`;
}

function ctxSliderHtml(tier, ctx, idPrefix) {
  const clamped = Math.min(CTX_MAX, Math.max(CTX_MIN, Math.round(ctx / CTX_STEP) * CTX_STEP || CTX_MIN));
  const pct = ctxSliderPct(clamped);
  const valText = `${ctxLabel(clamped)} tokens`;
  const kvText = ctxSliderKvText(tier, clamped);
  return `
    <div class="ctx-slider-box" data-ctx-tier="${tier}">
      <div class="ctx-slider-meta">
        <strong class="ctx-slider-val" data-ctx-val="${tier}">${escapeHtml(valText)}</strong>
        <span class="ctx-slider-kv" data-ctx-kv="${tier}">${escapeHtml(kvText)}</span>
      </div>
      <input type="range" class="ctx-slider" id="${idPrefix}Slider" data-ctx-slider="${tier}"
             min="${CTX_MIN}" max="${CTX_MAX}" step="${CTX_STEP}" value="${clamped}"
             style="--pct:${pct}%" aria-label="Context window size" ${isRestartingCtx ? 'disabled' : ''}>
      <div class="ctx-slider-ticks" aria-hidden="true">
        <span>4K</span><span>16K</span><span>32K</span><span>48K</span><span>64K</span>
      </div>
    </div>`;
}

function syncCtxSliderDisplay(tier, val, sourceEl) {
  const pct = ctxSliderPct(val);
  $$(`[data-ctx-val="${tier}"]`).forEach(el => { el.textContent = `${ctxLabel(val)} tokens`; });
  $$(`[data-ctx-kv="${tier}"]`).forEach(el => { el.textContent = ctxSliderKvText(tier, val); });
  const epLive = $('#epCtxLiveLabel');
  if (epLive && tier === modelKey) epLive.textContent = `${ctxLabel(val)} tokens`;
  $$(`[data-ctx-slider="${tier}"]`).forEach(inp => {
    if (inp !== sourceEl) inp.value = String(val);
    inp.style.setProperty('--pct', `${pct}%`);
  });
}

function renderEnginePopover() {
  const pop = $('#enginePopover');
  if (!pop) return;
  const m = MODELS[modelKey] || MODELS.pro;
  const ctx = engineCtx(modelKey);
  const epCurrent = $('#epCurrent');
  const epStatus = $('#epStatus');
  if (epCurrent) epCurrent.textContent = m.full;
  if (epStatus) {
    epStatus.textContent = `reasoning ${engineReasoning ? 'on' : 'off'} · ${ctxLabel(ctx)} context · vision on · flash attention · KV q8_0`;
  }
  $$('#epTierGrid .ep-tier-btn').forEach(btn => {
    const active = btn.dataset.tier === modelKey;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  });
  $$('#epReasoningSeg button').forEach(btn => {
    btn.classList.toggle('active', (btn.dataset.v === 'on') === engineReasoning);
  });
  const epCtxGrid = $('#epCtxGrid');
  const epCtxSec = $('#epCtxSection');
  if (epCtxGrid && epCtxSec) {
    const epVram = $('#epVramHint');
    const epLive = $('#epCtxLiveLabel');
    if (epVram) epVram.textContent = modelKey === 'spark' ? 'GDN attention' : 'KV cache q8_0';
    if (epLive) epLive.textContent = `${ctxLabel(ctx)} tokens`;
    epCtxGrid.innerHTML = ctxSliderHtml(modelKey, ctx, 'epCtx');
  }
}

function toggleEnginePopover(force) {
  const pop = $('#enginePopover');
  const caret = $('#brandCaret');
  if (!pop || !caret) return;
  const willOpen = force !== undefined ? force : pop.hidden;
  modelMenu.hidden = true;
  modelBtn.setAttribute('aria-expanded', 'false');
  attachMenu.hidden = true;
  if (chatLangPopover) chatLangPopover.hidden = true;
  if (chatLangBtn) chatLangBtn.setAttribute('aria-expanded', 'false');
  pop.hidden = !willOpen;
  caret.setAttribute('aria-expanded', String(willOpen));
  if (willOpen) renderEnginePopover();
}

function positionModelMenu() {
  if (!modelMenu || modelMenu.hidden || !modelBtn) return;
  const pad = 12;
  const gap = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const btnRect = modelBtn.getBoundingClientRect();
  if (btnRect.width === 0 && btnRect.height === 0) return;

  const menuW = Math.min(352, vw - pad * 2);
  modelMenu.style.width = `${menuW}px`;
  modelMenu.style.right = 'auto';
  modelMenu.style.bottom = 'auto';
  modelMenu.style.maxHeight = `${vh - pad * 2}px`;

  const naturalH = Math.min(modelMenu.scrollHeight || 360, vh - pad * 2);
  const left = Math.max(pad, Math.min(btnRect.right - menuW, vw - menuW - pad));
  const spaceAbove = Math.max(0, btnRect.top - pad - gap);
  const spaceBelow = Math.max(0, vh - btnRect.bottom - pad - gap);
  const openAbove = spaceAbove >= naturalH || spaceAbove >= spaceBelow;

  const availH = openAbove ? spaceAbove : spaceBelow;
  let maxH = Math.min(vh - pad * 2, availH >= 96 ? availH : Math.max(spaceAbove, spaceBelow, 120));
  const usedH = Math.min(naturalH, maxH);

  let top = openAbove
    ? btnRect.top - gap - usedH
    : btnRect.bottom + gap;
  top = Math.max(pad, Math.min(top, vh - pad - usedH));
  maxH = Math.max(80, Math.min(maxH, vh - pad - top));

  modelMenu.style.left = `${Math.round(left)}px`;
  modelMenu.style.top = `${Math.round(top)}px`;
  modelMenu.style.maxHeight = `${Math.round(maxH)}px`;
}

function renderModelMenu() {
  const tier = modelKey;
  const ctx = engineCtx(tier);
  const chip = ([key, m]) => `
    <button type="button" class="mm-chip${key === modelKey ? ' selected' : ''}" data-model="${key}" role="menuitemradio" aria-checked="${key === modelKey}" aria-label="Switch to ${escapeHtml(m.full)}">
      ${ORBIT_MINI}
      <span class="mm-chip-name">${escapeHtml(m.name)}${m.badge ? `<span class="mo-badge">${escapeHtml(m.badge)}</span>` : ''}</span>
    </button>`;
  const contextBlock = `${ctxSliderHtml(tier, ctx, 'mmCtx')}
       <small class="mm-vram">${escapeHtml(TIER_STATE[tier].vramHint)}</small>`;
  modelMenu.innerHTML = `
    <div class="mm-strip" role="radiogroup" aria-label="Model selection">${modelsForMenu().map(chip).join('')}</div>
    <div class="mm-body">
      <div class="mm-col">
        <div class="mm-label"><span>${escapeHtml(t('epReasoningLabel'))}</span><span class="mm-hint">${escapeHtml(t('epReasoningHint'))}</span></div>
        <div class="mm-seg mm-seg-tier" role="group" aria-label="Reasoning on or off">
          <button type="button" data-reason="off" class="${engineReasoning ? '' : 'active'}">${escapeHtml(t('off'))}</button>
          <button type="button" data-reason="on" class="${engineReasoning ? 'active' : ''}">${escapeHtml(t('on'))}</button>
        </div>
        <button type="button" class="mm-unload" data-unload="${tier}">${escapeHtml(t('epFreeMem'))} (unload)</button>
      </div>
      <div class="mm-col mm-col-right">
        <div class="mm-label"><span>${escapeHtml(t('epCtxLabel'))}</span><span class="mm-hint">applies to ${escapeHtml(MODELS[tier].name)}</span></div>
        ${contextBlock}
      </div>
    </div>
    <button type="button" class="mm-code-link" data-open-code>${escapeHtml(t('teamCode'))} <span aria-hidden="true">↗</span></button>
    <div class="mm-note">Images work in every tier · KV q8_0 · flash attention</div>`;
  renderEnginePopover();
  if (!modelMenu.hidden) requestAnimationFrame(positionModelMenu);
}

function selectModel(key) {
  if (!MODELS[key]) return;
  modelKey = key;
  localStorage.setItem(LS.model, key);
  const activeChat = currentId ? getCurrentChat() : null;
  if (activeChat && activeChat.model !== key) {
    activeChat.model = key;
    saveChats();
    renderSidebarList();
  }
  engineReasoning = !!tierReasoning[key];
  localStorage.setItem('nova.reasoning', engineReasoning ? 'on' : 'off');
  chatContext.max = (typeof engineContext !== 'undefined' && engineContext[key]) || (TIER_STATE[key] && TIER_STATE[key].ctx) || chatContext.max;
  modelLabel.textContent = MODELS[key].name;
  $('#brandTag').textContent = key.toUpperCase();
  renderModelMenu();
  modelMenu.hidden = true;
  modelBtn.setAttribute('aria-expanded', 'false');
  checkChatHealth();
  updateContextMeter(null, true);
  preloadModel(key);
  toast(`Switched to ${MODELS[key].full}`);
}

async function preloadModel(tier, allowDownload = true) {
  try {
    if (!await ensureDownloadPermission(tier)) return null;
    const res = await fetch(API_BASE + '/api/engines/load', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, allow_download: allowDownload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (error) {
    console.warn('Model preload unavailable; the next question will retry:', error);
    return null;
  }
}

function toggleModelMenu(force) {
  const willOpen = force !== undefined ? force : modelMenu.hidden;
  attachMenu.hidden = true;
  const ep = $('#enginePopover');
  const bc = $('#brandCaret');
  if (ep) ep.hidden = true;
  if (bc) bc.setAttribute('aria-expanded', 'false');
  if (chatLangPopover) chatLangPopover.hidden = true;
  if (chatLangBtn) chatLangBtn.setAttribute('aria-expanded', 'false');
  modelMenu.hidden = !willOpen;
  modelBtn.setAttribute('aria-expanded', String(willOpen));
  if (willOpen) {
    renderModelMenu();
    positionModelMenu();
  }
}

/* ───────────── ENGINE SETTINGS (sidebar #brandCaret & #modelMenu) ───────────── */
const brandHome    = $('#brandHome');
const brandTag     = $('#brandTag');
const brandCaret   = $('#brandCaret');
const enginePopover = $('#enginePopover');

function kvEstimateMB(tier, ctx) {
  const kb = TIER_STATE[tier].kvKB;   // KB per token at q8_0 KV
  return Math.round((kb * ctx) / 1024);
}
function ctxLabel(ctx) {
  return ctx >= 1024 ? `${Math.round(ctx / 1024)}K` : `${ctx}`;
}
function engineCtx(tier) { return engineContext[tier] || TIER_STATE[tier].ctx; }

brandHome.addEventListener('click', startNewChat);
if (brandCaret && enginePopover) {
  brandCaret.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEnginePopover();
  });
  enginePopover.addEventListener('click', (e) => {
    e.stopPropagation();
    const tierBtn = e.target.closest('[data-tier]:not([data-ctx])');
    if (tierBtn) { selectModel(tierBtn.dataset.tier); renderEnginePopover(); return; }
    const reasonBtn = e.target.closest('#epReasoningSeg [data-v]');
    if (reasonBtn) { setReasoning(reasonBtn.dataset.v === 'on'); return; }
    const unloadBtn = e.target.closest('#epUnload');
    if (unloadBtn) { stopEngine(modelKey, unloadBtn); return; }
    const resetBtn = e.target.closest('#epReset');
    if (resetBtn) {
      tierReasoning = { ...DEFAULT_TIER_REASONING };
      try { localStorage.removeItem('nova.reasoning.tiers'); } catch (_) {}
      selectModel('pro');
      if (engineCtx('pro') !== 16384) restartTier(16384, 'pro');
      else renderEnginePopover();
      toast('Engine settings reset to defaults (Pro · 16K)');
    }
  });
  enginePopover.addEventListener('input', (e) => {
    const slider = e.target.closest('[data-ctx-slider]');
    if (!slider) return;
    syncCtxSliderDisplay(slider.dataset.ctxSlider, Number(slider.value), slider);
  });
  enginePopover.addEventListener('change', (e) => {
    const slider = e.target.closest('[data-ctx-slider]');
    if (!slider || slider.disabled) return;
    const tier = slider.dataset.ctxSlider;
    const nextCtx = Number(slider.value);
    if (nextCtx !== engineCtx(tier)) restartTier(nextCtx, tier);
  });
}

async function restartTier(newCtx, tier = modelKey) {
  if (!await ensureDownloadPermission(tier)) {
    renderModelMenu();
    renderEnginePopover();
    return;
  }
  isRestartingCtx = true;
  $$(`[data-ctx-slider]`).forEach(s => { s.disabled = true; });
  toast(`Restarting ${MODELS[tier].name} with ${ctxLabel(newCtx)} context…`);
  try {
    const res = await fetch(API_BASE + '/api/engines/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, ctx: newCtx }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const restartData = await res.json().catch(() => ({}));
    let ready = Boolean(restartData.remote && restartData.status === 'ready');
    if (!ready) {
      // poll health until the local engine reports ready again
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 1500));
        try {
          const h = await (await fetch(API_BASE + '/api/health')).json();
          if (h?.engines?.[tier]?.status === 'ready') { ready = true; break; }
        } catch (_) { /* keep polling */ }
      }
    }
    engineContext[tier] = newCtx;
    if (tier === modelKey) {
      chatContext.max = newCtx;
      updateContextMeter(0, true);
    }
    toast(ready
      ? `${MODELS[tier].name} restarted · ${ctxLabel(newCtx)} context`
      : 'Engine took too long to restart — check the backend');
  } catch (err) {
    console.warn('engine restart failed:', err);
    toast('Could not restart the engine — see console');
  } finally {
    isRestartingCtx = false;
    renderModelMenu();
    renderEnginePopover();
  }
}


/* ───────────── IN-CHAT TRANSLATOR, LANGUAGE SWITCHER & SPEECH ───────────── */
const QUICK_PHRASES = [
  'Check the 120Ω CAN bus termination',
  'Verify the Swerve CANcoder offsets',
  'Inspect bumper mounting hardware',
  'I don’t understand',
  'Can you repeat that?',
  'Speak slowly please',
  'Check the battery voltage under load',
  'I need help',
];

/* PLaMo-3 & LLM engine backend (same-origin on Render/localhost, or configurable via <meta name="nova-api-base">).
   Falls back cleanly to the built-in offline phrasebook automatically. */
const ENGINE_PREF_KEY = 'nova.engine';   // 'auto' | 'neural' | 'offline'
const META_API_BASE = document.querySelector('meta[name="nova-api-base"]')?.content?.trim() || '';
const API_BASE = (window.NOVA_API_BASE || META_API_BASE).replace(/\/+$/, '')
  || (/^https?:$/.test(location.protocol) ? '' : 'http://127.0.0.1:8787');
let pythonSetupPromise = null;
let downloadApprovalPromise = null;
let pythonConfirmed = false;
let hostedPreview = false;

function setupDialog(content, actions) {
  const overlay = document.getElementById('setupOverlay');
  const container = document.getElementById('setupContent');
  container.innerHTML = content + '<div class="setup-actions"></div>';
  const buttons = container.querySelector('.setup-actions');
  overlay.hidden = false;
  return new Promise(resolve => {
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.primary ? 'pill upgrade-pill' : 'pill dark-pill';
      button.textContent = action.label;
      button.addEventListener('click', () => { overlay.hidden = true; resolve(action.value); });
      buttons.appendChild(button);
    }
    buttons.querySelector('button')?.focus();
  });
}

async function getSetupStatus() {
  const response = await fetch(API_BASE + '/api/setup', { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('The updated Primer server is not running.');
  return response.json();
}

async function ensurePythonSetup() {
  if (pythonConfirmed) return true;
  if (pythonSetupPromise) return pythonSetupPromise;
  pythonSetupPromise = (async () => {
    let choice = await setupDialog(
      '<h2 id="setupTitle">First, check Python</h2><p>Primer needs Python 3.10 or newer to run its local AI server. Do you already have Python installed and working?</p>',
      [{ label: 'Yes, Python works', value: 'yes', primary: true }, { label: 'No', value: 'no' }]);
    while (choice) {
      if (choice === 'no') {
        choice = await setupDialog(
          '<h2 id="setupTitle">Install Python first</h2><p>Download and install Python 3.10 or newer from the <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer">official Python website</a>. On Windows, enable “Add Python to PATH”. Then run <strong>Start Primer.cmd</strong> and return to Primer.</p>',
          [{ label: 'I installed it — check again', value: 'yes', primary: true }, { label: 'Not now', value: null }]);
        continue;
      }
      try {
        await getSetupStatus();
        pythonConfirmed = true;
        if (location.protocol === 'file:') {
          location.replace('http://127.0.0.1:8787/?python_confirmed=1');
          return false;
        }
        return true;
      } catch (_) {
        choice = await setupDialog(
          '<h2 id="setupTitle">Start the Primer server</h2><p>Python may be installed, but Primer could not reach its local server. On Windows, run <strong>Start Primer.cmd</strong>, then open <a href="http://127.0.0.1:8787/">Primer at 127.0.0.1:8787</a>. Then check again.</p>',
          [{ label: 'Check again', value: 'yes', primary: true }, { label: 'Not now', value: null }]);
      }
    }
    return false;
  })();
  try { return await pythonSetupPromise; } finally { pythonSetupPromise = null; }
}

async function ensureDownloadPermission(tier, needsVision = false) {
  if (location.protocol === 'https:') {
    try {
      const response = await fetch(API_BASE + '/api/health', { signal: AbortSignal.timeout(5000) });
      const health = response.ok ? await response.json() : null;
      hostedPreview = health?.mode === 'hosted-preview';
      if (hostedPreview) {
        toast('This hosted preview supports SVN browsing and STEP files. AI models are not available here yet.');
        return false;
      }
      if (!response.ok) throw new Error('Hosted server unavailable');
    } catch (_) {
      toast('The hosted Primer server is unavailable. Please try again.');
      return false;
    }
  }
  if (location.protocol !== 'https:' && !await ensurePythonSetup()) return false;
  let status;
  try { status = await getSetupStatus(); }
  catch (_) {
    if (location.protocol === 'https:') {
      toast('The hosted Primer server is unavailable. Please try again.');
      return false;
    }
    pythonConfirmed = false;
    return ensurePythonSetup().then(ok => ok ? ensureDownloadPermission(tier, needsVision) : false);
  }
  if (status.remote?.[tier]) return true;
  const missing = (tier !== 'whisper' && !status.runtime) || !status.models[tier] || (needsVision && !status.models[tier + '_vision']);
  if (!missing || status.consent) return true;
  if (location.protocol === 'https:') {
    if (tier !== 'translation') {
      toast(`${tier === 'whisper' ? 'Speech' : tier.toUpperCase()} model is not configured on the hosted server.`);
    }
    return false;
  }
  if (!downloadApprovalPromise) {
    downloadApprovalPromise = (async () => {
      const approved = await setupDialog(
        '<h2 id="setupTitle">Download local AI files?</h2><p>Primer can download the required runtime and Spark or Pro model files to this computer. Spark is about 1.1 GB and Pro about 5.8 GB; vision, translation, or speech files may be needed when those features are used.</p><p>Downloads require internet and free disk space.</p>',
        [{ label: 'Yes, allow downloads', value: true, primary: true }, { label: 'No, not now', value: false }]);
      if (!approved) return false;
      const response = await fetch(API_BASE + '/api/setup/consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved: true }) });
      if (!response.ok) throw new Error('Could not save download permission.');
      return true;
    })();
  }
  try { return await downloadApprovalPromise; }
  finally { downloadApprovalPromise = null; }
}

let enginePref = localStorage.getItem(ENGINE_PREF_KEY) || 'auto';
let neuralStatus = 'checking';            // checking | ready | unavailable
let neuralDetail = null;
let translateSeq = 0;
let lastInlineTranslation = '';
let inlineTrDebounce = null;
let inlineTranslationRunning = false;
let inlineTranslationQueued = false;

function renderEnginePill() {
  const pill = $('#enginePill');
  const txt = $('#enginePillText');
  if (!pill || !txt) return;
  pill.dataset.state = neuralStatus;
  txt.textContent = neuralStatus === 'ready'
    ? 'PLaMo-3'
    : neuralStatus === 'available'
      ? 'On demand'
    : neuralStatus === 'checking'
      ? 'Checking…'
      : 'Offline dict';
}

async function checkNeuralHealth() {
  neuralStatus = 'checking';
  renderEnginePill();
  try {
    const res = await fetch(API_BASE + '/api/health', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    neuralDetail = data;
    neuralStatus = data && data.status === 'ready' ? 'ready' : data && data.status !== 'error' ? 'available' : 'unavailable';
  } catch (_) {
    neuralDetail = null;
    neuralStatus = 'unavailable';
  }
  renderEnginePill();
  return neuralStatus;
}

async function neuralTranslate(text, from, to, form) {
  if (!await ensureDownloadPermission('translation')) throw new Error('Download permission was not granted.');
  const body = { text, source_lang: from, target_lang: to };
  if (form && to === 'ja') body.form = form;
  const res = await fetch(API_BASE + '/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch (_) { /* ignore */ }
    throw new Error(`PLaMo HTTP ${res.status}${detail ? ' — ' + detail : ''}`);
  }
  return res.json();   // { translation, engine, seconds }
}

async function runTranslationWithFallback(text, from, to) {
  const clean = (text || '').trim();
  if (!clean) return { out: '', kind: 'empty' };
  if (from === to) return { out: clean, kind: 'same' };
  const wantNeural = enginePref === 'neural' || (enginePref === 'auto' && neuralStatus !== 'unavailable');
  if (wantNeural) {
    try {
      const data = await neuralTranslate(clean, from, to);
      const out = (data.translation || '').trim();
      if (out) {
        neuralStatus = 'ready';
        renderEnginePill();
        return { out, kind: 'neural', seconds: data.seconds };
      }
    } catch (_) {
      if (enginePref !== 'neural') {
        neuralStatus = 'unavailable';
        renderEnginePill();
      }
    }
  }
  const offline = translateText(clean, from, to);
  return offline;
}

function populateLangSelects() {
  if (!inlineFromLangSel || !inlineToLangSel) return;
  const opts = TRANSLATE_LANG_GROUPS
    .map(g => `<optgroup label="${escapeHtml(g.label)}">${g.langs.map(([code, name]) => `<option value="${code}">${escapeHtml(name)}</option>`).join('')}</optgroup>`)
    .join('');
  inlineFromLangSel.innerHTML = opts;
  inlineToLangSel.innerHTML = opts;
  inlineFromLangSel.value = 'en';
  const mappedUi = UI_TO_TRANSLATE_CODE[uiLang] || uiLang;
  inlineToLangSel.value = TRANSLATE_LANGS[mappedUi] && uiLang !== 'en' ? mappedUi : 'es';
  if (window.NovaUI) {
    window.NovaUI.enhanceSelect(inlineFromLangSel);
    window.NovaUI.enhanceSelect(inlineToLangSel);
  }
}

function renderUiLangGrid() {
  const sel = $('#clpUiLangSelect');
  if (!sel) return;
  const current = normalizeLangCode(uiLang);
  sel.innerHTML = buildGroupedLangOptionsHtml(current);
  sel.value = TRANSLATE_LANGS[current] ? current : 'en';
  if (window.NovaUI) window.NovaUI.enhanceSelect(sel);
  if (!sel.dataset.bound) {
    sel.dataset.bound = '1';
    sel.addEventListener('change', () => {
      applyI18n(sel.value, true, true);
      if (chatLangPopover) chatLangPopover.hidden = true;
      if (chatLangBtn) chatLangBtn.setAttribute('aria-expanded', 'false');
      toast(getLangDisplayName(sel.value));
    });
  }
}

function renderInlinePhraseChips() {
  if (!inlinePhraseChips) return;
  inlinePhraseChips.innerHTML = QUICK_PHRASES.map(p => `
    <button type="button" class="phrase-chip" data-phrase="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('');
}

function toggleComposerTranslator(force) {
  if (!composerTranslateBar) return;
  const willShow = force !== undefined ? force : composerTranslateBar.hidden;
  composerTranslateBar.hidden = !willShow;
  if (toggleComposerTrBtn) toggleComposerTrBtn.setAttribute('aria-pressed', String(willShow));
  if (chatLangBtn) chatLangBtn.classList.toggle('tr-active', willShow);
  if (willShow) doInlineTranslate();
}

function scheduleInlineTranslate(immediate) {
  if (!composerTranslateBar || composerTranslateBar.hidden) return;
  clearTimeout(inlineTrDebounce);
  if (immediate) doInlineTranslate();
  else inlineTrDebounce = setTimeout(doInlineTranslate, 260);
}

async function doInlineTranslate() {
  if (!inlineTrResult || !inlineFromLangSel || !inlineToLangSel) return;
  const seq = ++translateSeq;
  const src = promptInput.value.trim();
  if (!src) {
    inlineTranslationQueued = false;
    lastInlineTranslation = '';
    inlineTrResult.textContent = t('inlineTrPh');
    inlineTrResult.classList.add('is-empty');
    return;
  }
  if (inlineTranslationRunning) {
    inlineTranslationQueued = true;
    return;
  }
  inlineTranslationRunning = true;
  inlineTrResult.classList.remove('is-empty');
  if (neuralStatus !== 'unavailable') inlineTrResult.textContent = 'Translating…';
  try {
    const res = await runTranslationWithFallback(src, inlineFromLangSel.value, inlineToLangSel.value);
    if (seq !== translateSeq) return;
    if (res.out) {
      lastInlineTranslation = res.out;
      inlineTrResult.textContent = res.out;
    } else {
      lastInlineTranslation = '';
      inlineTrResult.textContent = 'No offline phrasebook match for this sentence (start PLaMo backend for full neural translation).';
      inlineTrResult.classList.add('is-empty');
    }
  } finally {
    inlineTranslationRunning = false;
    if (inlineTranslationQueued && !composerTranslateBar.hidden) {
      inlineTranslationQueued = false;
      doInlineTranslate();
    }
  }
}

async function translateWithChatContext() {
  const text = promptInput.value.trim();
  if (!text || !inlineToLangSel || !inlineTrResult) return;
  if (isStreaming) { toast('Wait for the current answer to finish.'); return; }
  clearTimeout(inlineTrDebounce);
  const seq = ++translateSeq;
  const button = $('#inlineContextBtn');
  button.disabled = true;
  inlineTrResult.classList.remove('is-empty');
  inlineTrResult.textContent = 'Translating with the conversation…';
  const target = TRANSLATE_LANGS[inlineToLangSel.value] || inlineToLangSel.value;
  const chat = getCurrentChat();
  const history = chat ? serializeChatMessages(chat).slice(-8) : [];
  history.push({ role: 'user', content: `Translate the text below into ${target}. Use the preceding conversation only to resolve context. Return only the translation.\n\n${text}` });
  try {
    const images = history.some(message => Array.isArray(message.content) && message.content.some(part => part.type === 'image_url'));
    if (!await ensureDownloadPermission(modelKey, images)) throw new Error(hostedPreview ? 'AI translation is not available on this hosted preview.' : 'Download permission was not granted.');
    const res = await fetch(API_BASE + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, preset: modelKey, thinking: false, tutor_language: uiLang }),
    });
    if (!res.ok || !res.body) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || error.error || `HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', translated = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n'); buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const event = JSON.parse(line.slice(5));
        if (event.type === 'token') translated += event.text || '';
        if (event.type === 'error') throw new Error(event.error || 'Translation failed');
      }
    }
    if (seq !== translateSeq) return;
    if (!translated.trim()) throw new Error('The model returned an empty translation.');
    lastInlineTranslation = translated.trim();
    inlineTrResult.textContent = lastInlineTranslation;
  } catch (error) {
    if (seq !== translateSeq) return;
    inlineTrResult.textContent = `Translation unavailable: ${error.message}`;
    inlineTrResult.classList.add('is-empty');
  } finally {
    button.disabled = false;
    button.textContent = t('useChatContext');
  }
}

async function translateMessageInline(messageEl, rawText) {
  if (!messageEl || !rawText.trim()) return;
  const existing = messageEl.querySelector('.msg-translate-box');
  if (existing) { existing.remove(); return; }
  const targetLang = inlineToLangSel ? inlineToLangSel.value : (UI_TO_TRANSLATE_CODE[uiLang] || (uiLang === 'en' ? 'es' : uiLang));
  const box = document.createElement('div');
  box.className = 'msg-translate-box';
  box.innerHTML = `<div class="msg-tr-head"><span>Translating → ${escapeHtml(TRANSLATE_LANGS[targetLang] || targetLang)}</span><button type="button" class="msg-tr-close" aria-label="Hide translation">✕</button></div><div class="msg-tr-text">Translating…</div>`;
  const container = messageEl.querySelector('.model-block') || messageEl;
  container.appendChild(box);
  box.querySelector('.msg-tr-close').addEventListener('click', () => box.remove());

  const srcGuess = inlineFromLangSel ? inlineFromLangSel.value : 'en';
  const res = await runTranslationWithFallback(rawText.slice(0, 800), srcGuess, targetLang);
  const textNode = box.querySelector('.msg-tr-text');
  if (!textNode) return;
  if (res.out) {
    textNode.textContent = res.out;
  } else {
    // fallback via English target if message wasn't in English
    const resAlt = await runTranslationWithFallback(rawText.slice(0, 800), targetLang === 'en' ? 'es' : 'en', targetLang);
    textNode.textContent = resAlt.out || 'Start the local backend (:8787) for full multi-sentence neural translation.';
  }
}

let activeTtsAudio = null;
let activeTtsUrl = null;
let activeUtterance = null;
let speakSeq = 0;

function stopSpeaking() {
  if (activeTtsAudio) {
    try { activeTtsAudio.pause(); } catch (_) { /* ignore */ }
    activeTtsAudio = null;
  }
  if (activeTtsUrl) {
    try { URL.revokeObjectURL(activeTtsUrl); } catch (_) { /* ignore */ }
    activeTtsUrl = null;
  }
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  } catch (_) { /* ignore */ }
  activeUtterance = null;
}

function findSpeechVoice(voices, tag) {
  if (!voices || !voices.length) return null;
  const norm = (s) => String(s || '').toLowerCase().replace(/_/g, '-');
  const wanted = norm(tag || 'en-US');
  const base = wanted.split('-')[0];
  const exact = voices.find(v => norm(v.lang) === wanted);
  if (exact) return exact;
  const prefix = voices.find(v => {
    const vl = norm(v.lang);
    return vl === base || vl.startsWith(base + '-');
  });
  if (prefix) return prefix;
  const aliases = {
    fil: ['tl'],
    tl: ['fil'],
    jv: ['jw'],
    jw: ['jv'],
    zh: ['cmn'],
    nb: ['no'],
    no: ['nb'],
  };
  for (const alt of (aliases[base] || [])) {
    const altMatch = voices.find(v => {
      const vl = norm(v.lang);
      return vl === alt || vl.startsWith(alt + '-');
    });
    if (altMatch) return altMatch;
  }
  return null;
}

function waitForVoices(synth) {
  const existing = synth.getVoices ? synth.getVoices() : [];
  if (existing && existing.length) return Promise.resolve(existing);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (synth.removeEventListener) synth.removeEventListener('voiceschanged', finish);
      resolve(synth.getVoices ? synth.getVoices() : []);
    };
    if (synth.addEventListener) synth.addEventListener('voiceschanged', finish);
    setTimeout(finish, 400);
  });
}

async function speakBrowser(text, lang, seq) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) { toast('Speech is not supported in this browser'); return; }
    const voices = await waitForVoices(synth);
    if (seq !== speakSeq) return;
    const tag = SPEECH_TAG[lang] || (lang && lang !== 'auto' ? lang : 'en-US');
    const voice = findSpeechVoice(voices, tag);
    const utter = new SpeechSynthesisUtterance(text);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang || tag;
    } else {
      utter.lang = tag;
    }
    utter.rate = 0.92;
    activeUtterance = utter;
    const clearUtter = () => {
      if (activeUtterance === utter) activeUtterance = null;
    };
    utter.onend = clearUtter;
    utter.onerror = (ev) => {
      clearUtter();
      if (ev && (ev.error === 'canceled' || ev.error === 'interrupted')) return;
      toast('Speech is unavailable right now');
    };
    synth.cancel();
    try { synth.resume(); } catch (_) { /* ignore */ }
    setTimeout(() => {
      if (seq !== speakSeq) return;
      try {
        synth.resume();
        synth.speak(utter);
      } catch (_) {
        clearUtter();
        toast('Speech is unavailable right now');
      }
    }, 60);
  } catch (_) {
    toast('Speech is unavailable right now');
  }
}

async function speak(text, lang) {
  const cleanText = (text || '').trim();
  if (!cleanText) return;
  const seq = ++speakSeq;
  stopSpeaking();
  const langCode = lang || 'auto';
  try {
    const res = await fetch(API_BASE + '/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, lang: langCode, language: langCode }),
      signal: AbortSignal.timeout(30000),
    });
    if (seq !== speakSeq) return;
    if (res.ok) {
      const blob = await res.blob();
      if (seq !== speakSeq) return;
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        activeTtsUrl = url;
        activeTtsAudio = audio;
        const cleanup = () => {
          if (activeTtsAudio === audio) activeTtsAudio = null;
          if (activeTtsUrl === url) {
            try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
            activeTtsUrl = null;
          }
        };
        audio.onended = cleanup;
        audio.onerror = () => {
          cleanup();
          if (seq === speakSeq) speakBrowser(cleanText, lang, seq);
        };
        await audio.play();
        return;
      }
    }
  } catch (_) {
    /* Fall back to browser Web Speech API */
  }
  if (seq !== speakSeq) return;
  await speakBrowser(cleanText, lang, seq);
}

/* ───────────── KNOWLEDGE DATABASE (Tools, Team 846 Docs, Glossary + User Sources) ───────────── */
const BUILTIN_KB_TOOLS = [
  {
    id: 'tool-blue-alliance', kind: 'tools', title: 'The Blue Alliance Read API', subtitle: 'FRC teams, events, rankings and matches',
    category: 'Live FRC data', builtin: true, url: 'https://www.thebluealliance.com/apidocs',
    description: 'Read-only API for current team and event data. Configure TBA_AUTH_KEY on the local server to enable live queries; the offline knowledge base remains available without it.',
    tags: ['FRC', 'Teams', 'Events', 'API'],
  },
  {
    id: 'tool-wpilib', kind: 'tools', title: 'WPILib', subtitle: 'FRC programming and controls',
    category: 'Official documentation', builtin: true, url: 'https://docs.wpilib.org/',
    description: 'Official guides for robot programming, control systems, simulation, and WPILib tools.',
    tags: ['WPILib', 'Programming', 'Controls'],
  },
  {
    id: 'tool-team846', kind: 'tools', title: 'Team 846 GitHub', subtitle: 'Public team repositories',
    category: 'Code', builtin: true, url: 'https://github.com/Team846',
    description: 'Public Team 846 repositories, available in the Team 846 code explorer.',
    tags: ['Team 846', 'GitHub', 'Code'],
  },
];

const BUILTIN_KB_DOCS = [
  {
    id: 'doc-first', kind: 'docs', title: 'FIRST season information', subtitle: 'Game and season materials',
    category: 'Official documentation', builtin: true, url: 'https://www.firstinspires.org/robotics/frc/game-and-season',
    description: 'FIRST publishes current season game materials, rules, and official resources here.',
    tags: ['FIRST', 'Game manual', 'Rules'],
  },
  {
    id: 'doc-frcdesign', kind: 'docs', title: 'FRC Design Handbook', subtitle: 'CAD and robot design',
    category: 'Design resource', builtin: true, url: 'https://frcdesign.org/',
    description: 'A community design handbook covering mechanisms, CAD, and engineering practices for FRC.',
    tags: ['CAD', 'Design', 'Mechanisms'],
  },
  {
    id: 'doc-846-training', kind: 'docs', title: 'Team 846 training code', subtitle: 'Public team repository',
    category: 'Team 846 code', builtin: true, url: 'https://github.com/Team846/2026-training',
    repo: '2026-training', path: 'INTAKE_EXAMPLE.md',
    description: 'Public Team 846 training repository with example robot code and documentation.',
    tags: ['Team 846', 'Training', 'Code'],
  },
];

const BUILTIN_KB_GLOSSARY = [
  {
    id: 'gl-swerve', kind: 'glossary', title: 'SDS MK4i Swerve', category: 'Mechanical · Drivetrain', builtin: true,
    description: 'Four independent powered and steered wheel modules allowing omnidirectional holonomic robot movement.',
    rookieTip: 'Always double-check module zero offsets and L2 pinion Loctite before driving on carpet.',
    translations: { es: 'Módulo Swerve SDS MK4i', zh: 'SDS MK4i 舵轮模组', hi: 'एसडीएस एमके4आई स्वर्व', vi: 'Mô-đun lái đa hướng MK4i', fr: 'Module Swerve SDS MK4i' },
    tags: ['Drivetrain', 'MK4i', 'Omnidirectional'],
  },
  {
    id: 'gl-cancoder', kind: 'glossary', title: 'CANCoder Magnet Offset', category: 'Electrical & Code · Sensors', builtin: true,
    description: 'Saved calibration offset aligning each swerve module’s absolute magnetic encoder 0° position with the physical straight-forward bevel gear direction.',
    rookieTip: 'Place the bevel gear inward on the left side and confirm all 4 wheels point straight with Phoenix Tuner X.',
    translations: { es: 'Compensación magnética del CANCoder', zh: 'CANCoder 磁编零点偏置', hi: 'कैनकोडर मैग्नेट ऑफ़सेट', vi: 'Độ lệch nam châm CANCoder', fr: 'Décalage magnétique CANCoder' },
    tags: ['Sensor', 'Zeroing', 'Phoenix Tuner'],
  },
  {
    id: 'gl-canivore', kind: 'glossary', title: 'CANivore', category: 'Electrical · Networking', builtin: true,
    description: 'CTRE USB-to-CAN FD adapter running high-speed 1000 Hz closed-loop swerve control separate from the roboRIO base CAN bus.',
    rookieTip: 'Keep the CANivore 120Ω termination switch ON if it sits at the end of your CAN daisy chain.',
    translations: { es: 'CANivore (Adaptador CAN FD)', zh: 'CANivore CAN FD 适配器', hi: 'कैनीवोर CAN FD अडैप्टर', vi: 'Bộ chuyển đổi CAN FD CANivore', fr: 'Adaptateur CAN FD CANivore' },
    tags: ['CAN FD', 'CTRE', 'Networking'],
  },
  {
    id: 'gl-talonfx', kind: 'glossary', title: 'TalonFX (Kraken X60)', category: 'Mechanical / Electrical · Actuator', builtin: true,
    description: 'Brushless FRC drive/steer motor with an integrated Falcon/Kraken motor controller and rotor encoder connected via CAN FD.',
    rookieTip: 'Watch stator current limits — drive uses 80A max, steer typically 40A max.',
    translations: { es: 'TalonFX (Kraken X60)', zh: 'TalonFX 无刷一体电机', hi: 'टैलनएफएक्स मोटर', vi: 'Động cơ TalonFX tích hợp', fr: 'Moteur TalonFX (Kraken X60)' },
    tags: ['Kraken X60', 'Motor', 'Phoenix 6'],
  },
  {
    id: 'gl-bumper', kind: 'glossary', title: 'Bumper Zone', category: 'Inspection & Rules', builtin: true,
    description: 'Mandatory 5-inch vertical perimeter envelope around the frame holding wooden + pool-noodle bumpers covered in Cordura fabric.',
    rookieTip: 'Inspect corners for frame-backing cuts before every qualification match; rips fail field inspection.',
    translations: { es: 'Zona de defensas (Bumpers)', zh: '防撞梁安装区域', hi: 'बम्पर ज़ोन', vi: 'Vùng gắn cản bảo vệ', fr: 'Zone de pare-chocs' },
    tags: ['Rules', 'Inspection', 'Cordura'],
  },
  {
    id: 'gl-loctite', kind: 'glossary', title: 'Loctite 243', category: 'Pit Safety · Fasteners', builtin: true,
    description: 'Blue oil-tolerant medium-strength threadlocker applied to metal-to-metal bolts so robot vibrations never loosen swerve hardware.',
    rookieTip: 'NEVER put Loctite near polycarbonate or acrylic — it chemically crazes and cracks plastic!',
    translations: { es: 'Fijador de roscas Loctite 243', zh: '乐泰 243 蓝色螺纹锁固剂', hi: 'लॉकटाइट 243 थ्रेडलॉकर', vi: 'Keo khóa ren xanh Loctite 243', fr: 'Frein-filet bleu Loctite 243' },
    tags: ['Threadlocker', 'Safety', 'Polycarbonate Warning'],
  },
  {
    id: 'gl-intake', kind: 'glossary', title: 'Over-Bumper Intake', category: 'Mechanisms · CAD', builtin: true,
    description: 'Rotating ground-pickup roller mechanism deploying outside the frame bumper perimeter to pull game pieces cleanly into the hopper.',
    rookieTip: 'Check belt tension after hard defensive hits.',
    translations: { es: 'Recolector sobre bumper', zh: '越障式前部吸球机构', hi: 'ओवर-बम्पर इनटेक', vi: 'Cơ cấu thu bóng qua cản', fr: 'Collecteur par-dessus pare-chocs' },
    tags: ['Mechanism', 'Rollers', 'CAD'],
  },
  {
    id: 'gl-term', kind: 'glossary', title: '120Ω Termination Resistor', category: 'Electrical · Diagnostics', builtin: true,
    description: 'Bus impedance resistor at both physical ends of the CAN twisted pair (~60Ω measured powered-off across CAN-H and CAN-L).',
    rookieTip: 'If a subsystem vanishes randomly on Driver Station, measure ohms across yellow/green CAN wires: 120Ω means one resistor is missing or disconnected.',
    translations: { es: 'Resistencia terminal de 120Ω', zh: '120欧姆 CAN 总线终端电阻', hi: '120Ω टर्मिनेशन रेसिस्टर', vi: 'Điện trở đầu cuối 120Ω', fr: 'Résistance de terminaison 120Ω' },
    tags: ['CAN Bus', 'Troubleshooting', 'Multimeter'],
  },
];


let kbActiveTab = 'all';
let tbaSourceStatus = 'checking';

async function refreshTbaSourceStatus() {
  try {
    const response = await fetch(API_BASE + '/api/tba/status', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('status unavailable');
    const data = await response.json();
    tbaSourceStatus = data.configured ? 'configured' : 'missing';
  } catch (_) {
    tbaSourceStatus = 'unavailable';
  }
  if (currentView === 'knowledge') renderKnowledgeBase();
}

function loadUserKbSources() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS.kbSources) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) { return []; }
}
function saveUserKbSources(list) {
  try { localStorage.setItem(LS.kbSources, JSON.stringify(list)); return true; } catch (_) { return false; }
}
function loadUserKbGlossary() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS.kbGlossary) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) { return []; }
}
function saveUserKbGlossary(list) {
  try { localStorage.setItem(LS.kbGlossary, JSON.stringify(list)); return true; } catch (_) { return false; }
}

function allKnowledgeItems() {
  return [
    ...loadUserKbSources(),
    ...loadUserKbGlossary(),
    ...BUILTIN_KB_TOOLS,
    ...BUILTIN_KB_DOCS,
    ...BUILTIN_KB_GLOSSARY,
  ];
}

function searchKnowledgeItems(query, limit = 100) {
  const q = (query || '').trim().toLowerCase();
  const stop = new Set(['the', 'and', 'for', 'what', 'how', 'about', 'does', 'with', 'using', 'from', 'this', 'that', 'your']);
  const terms = q.match(/[\p{L}\p{N}_-]{2,}/gu)?.filter(w => !stop.has(w)) || [];
  const items = allKnowledgeItems();
  if (!terms.length) return q ? [] : items.slice(0, limit);
  const scored = items.map(item => {
    const hay = [
      item.title,
      item.subtitle,
      item.category,
      item.description,
      item.url,
      item.rookieTip,
      ...(item.tags || []),
      ...(item.translations ? Object.values(item.translations) : []),
    ].filter(Boolean).join(' ').toLowerCase();
    let score = 0;
    for (const term of terms) {
      if ((item.title || '').toLowerCase().includes(term)) score += 3;
      if (hay.includes(term)) score += 1;
    }
    return { ...item, _score: score };
  }).filter(x => x._score > 0);
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, limit);
}

function buildKnowledgeContext(query) {
  const hits = searchKnowledgeItems(query, 4);
  if (!hits.length) return '';
  return hits.map(item => {
    const content = item.description || '';
    const terms = (query || '').toLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) || [];
    const index = terms.map(term => content.toLowerCase().indexOf(term)).find(pos => pos >= 0);
    const start = Math.max(0, (index ?? 0) - 300);
    const excerpt = content.slice(start, start + 1600);
    const parts = [`[${item.kind.toUpperCase()}] ${item.title}${item.subtitle ? ` (${item.subtitle})` : ''}${item.url ? ` (${item.url})` : ''}: ${excerpt}`];
    if (item.rookieTip) parts.push(`Tip: ${item.rookieTip}`);
    return parts.join(' ');
  }).join('\n');
}

function renderKnowledgeBase() {
  const all = allKnowledgeItems();
  if (kbNavCountEl) kbNavCountEl.textContent = String(all.length);
  if (!kbListEl) return;

  const query = kbSearchInput ? kbSearchInput.value.trim() : '';
  let items = query ? searchKnowledgeItems(query, 200) : all;
  if (kbActiveTab !== 'all') items = items.filter(it => it.kind === kbActiveTab);

  if (kbStatsEl) {
    const toolsCount = all.filter(i => i.kind === 'tools').length;
    const docsCount = all.filter(i => i.kind === 'docs').length;
    const glossCount = all.filter(i => i.kind === 'glossary').length;
    kbStatsEl.textContent = `${items.length} shown · ${toolsCount} tools · ${docsCount} docs & sources · ${glossCount} glossary terms`;
  }

  kbListEl.innerHTML = '';
  if (kbEmptyEl) kbEmptyEl.hidden = items.length !== 0;

  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'kb-card';
    card.dataset.id = item.id;
    const kindLabel = item.builtin === false
      ? 'Custom'
      : item.kind === 'tools' ? 'Tools & Stack' : item.kind === 'docs' ? 'Reference Doc' : 'Glossary';
    const badgeKind = item.builtin === false ? 'custom' : item.kind;

    let transHtml = '';
    if (item.translations && Object.keys(item.translations).length) {
      const preferred = uiLang === 'zh-hant' ? 'zh' : uiLang;
      const entries = Object.entries(item.translations).sort(([a], [b]) => (a === preferred ? -1 : b === preferred ? 1 : 0));
      transHtml = `<div class="kb-trans-pills">${entries.slice(0, 3).map(([code, val]) => `<span class="kb-trans-pill"><strong>${escapeHtml(code)}</strong>${escapeHtml(val)}</span>`).join('')}</div>`;
    }

    const tagsHtml = (item.tags || []).slice(0, 4).map(tg => `<span class="kb-tag">${escapeHtml(tg)}</span>`).join('');
    const deleteBtn = item.builtin === false
      ? `<button type="button" class="mini-btn danger kb-del-btn" data-kb-del="${escapeHtml(item.id)}" data-kind="${escapeHtml(item.kind)}">Delete</button>`
      : '';
    const repoBtn = item.repo && item.path
      ? `<button type="button" class="mini-btn" data-kb-code="${escapeHtml(item.repo)}|${escapeHtml(item.path)}">View code</button>`
      : '';
    const sourceLink = item.url && /^https?:\/\//i.test(item.url)
      ? `<a class="mini-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>` : '';
    const tbaInfo = item.id === 'tool-blue-alliance'
      ? `<div class="kb-source-status">${tbaSourceStatus === 'configured' ? 'API key configured' : tbaSourceStatus === 'missing' ? 'API key needed for live data' : tbaSourceStatus === 'checking' ? 'Checking API configuration…' : 'Server unavailable'} · <a href="https://www.thebluealliance.com/" target="_blank" rel="noopener noreferrer">Powered by The Blue Alliance</a></div>` : '';

    card.innerHTML = `
      <div class="kb-card-top">
        <span class="kb-badge" data-kind="${escapeHtml(badgeKind)}">${escapeHtml(kindLabel)}</span>
        <span class="kb-tag">${escapeHtml(item.category || '')}</span>
      </div>
      <div class="kb-title">${escapeHtml(item.title)}</div>
      ${item.subtitle ? `<div class="kb-sub">${escapeHtml(item.subtitle)}</div>` : ''}
      <div class="kb-desc">${escapeHtml((item.description || '').length > 260 ? item.description.slice(0, 260) + '…' : (item.description || ''))}</div>
      ${tbaInfo}
      ${transHtml}
      ${tagsHtml ? `<div class="kb-tags">${tagsHtml}</div>` : ''}
      <div class="kb-card-actions">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" class="mini-btn" data-kb-ask="${escapeHtml(item.id)}">Ask Primer</button>
          ${repoBtn}
          ${sourceLink}
        </div>
        ${deleteBtn}
      </div>`;
    kbListEl.appendChild(card);
  }
}

function askNovaAboutKbItem(item) {
  if (!item) return;
  startNewChat();
  const teamLabel = formatTeamLabel(getUserTeam()) || 'Team 846';
  promptInput.value = item.id === 'tool-blue-alliance'
    ? `Using The Blue Alliance, what events has ${teamLabel} attended this season?`
    : `Using Knowledge Base "${item.title}": explain key setup details, gotchas, and how we use it.`;
  updateInputAffordances();
  promptInput.focus();
}

function openAddSourceModal() {
  openModal(`
    <h3 class="modal-title" id="modalTitle" style="text-align:left">${escapeHtml(t('kbAddSource'))}</h3>
    <p class="modal-sub" style="text-align:left">${escapeHtml(t('sourceHelp'))}</p>
    <form class="kb-form" id="kbAddForm">
      <label class="kb-dropzone">
        <span><strong>${escapeHtml(t('uploadText'))}</strong> (.txt, .md, .java, .py, .json, .csv)</span>
        <span class="mini-btn">${escapeHtml(t('chooseFile'))}</span>
        <input type="file" id="kbFilePicker" hidden accept=".txt,.md,.java,.py,.json,.csv,.log,.xml,.yaml,.yml">
      </label>

      <div class="kb-form-field">
        <label for="kbSourceKind">${escapeHtml(t('category'))}</label>
        <select id="kbSourceKind">
          <option value="docs">Reference Doc / Note</option>
          <option value="tools">Tool / Stack Reference</option>
          <option value="glossary">Technical Glossary Term</option>
        </select>
      </div>

      <div class="kb-form-field">
        <label for="kbSourceTitle">${escapeHtml(t('sourceTitle'))} *</label>
        <input class="kb-input" id="kbSourceTitle" required placeholder="e.g., Autonomous PathPlanner Tuning Notes">
      </div>

      <div class="kb-form-field">
        <label for="kbSourceSub">Subtitle / Tagline</label>
        <input class="kb-input" id="kbSourceSub" placeholder="e.g., Robotics Software · Drivetrain PID">
      </div>

      <div class="kb-form-field">
        <label for="kbSourceUrl">${escapeHtml(t('sourceLink'))}</label>
        <input class="kb-input" id="kbSourceUrl" type="url" placeholder="https://…">
      </div>

      <div class="kb-form-field">
        <label for="kbSourceDesc">${escapeHtml(t('sourceContent'))} *</label>
        <textarea class="kb-textarea" id="kbSourceDesc" required placeholder="Paste notes, parameters, tool documentation, or definition…"></textarea>
      </div>

      <div class="kb-form-field" id="kbGlossaryFields" hidden>
        <label for="kbSourceTrans">Spanish / Chinese / Hint (optional)</label>
        <input class="kb-input" id="kbSourceTrans" placeholder="e.g., es: Ajuste PID · tip: test at 25% speed first">
      </div>

      <div class="kb-form-field">
        <label for="kbSourceTags">${escapeHtml(t('sourceTags'))}</label>
        <input class="kb-input" id="kbSourceTags" placeholder="swerve, pid, vision, tool">
      </div>

      <div class="kb-form-actions">
        <button type="button" class="mini-btn" id="kbCancelBtn">${escapeHtml(t('cancel'))}</button>
        <button type="submit" class="mini-btn primary">${escapeHtml(t('saveSource'))}</button>
      </div>
    </form>`);

  const kindSel = $('#kbSourceKind');
  if (window.NovaUI) window.NovaUI.enhanceSelect(kindSel);
  const gFields = $('#kbGlossaryFields');
  kindSel.addEventListener('change', () => {
    gFields.hidden = kindSel.value !== 'glossary';
  });

  $('#kbCancelBtn').addEventListener('click', closeModal);
  $('#kbFilePicker').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    $('#kbSourceTitle').value = file.name;
    $('#kbSourceSub').value = `Uploaded file · ${fmtSize(file.size)}`;
    if (/\.pdf$/i.test(file.name)) {
      toast('PDF extraction is not available. Paste text or choose a text file.');
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || '');
        const text = raw.slice(0, 200000);
        if (raw.length > text.length) toast('The first 200,000 characters were added.');
        $('#kbSourceDesc').value = text;
      };
      reader.readAsText(file);
    }
  });

  $('#kbAddForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const kind = kindSel.value;
    const title = $('#kbSourceTitle').value.trim();
    const subtitle = $('#kbSourceSub').value.trim();
    const description = $('#kbSourceDesc').value.trim();
    const url = $('#kbSourceUrl').value.trim();
    const tags = $('#kbSourceTags').value.split(',').map(s => s.trim()).filter(Boolean);
    if (!title || !description) return;
    if (url && !/^https?:\/\//i.test(url)) { toast('Use an http or https source link.'); return; }

    if (kind === 'glossary') {
      const rawTrans = $('#kbSourceTrans').value.trim();
      const translations = {};
      if (rawTrans) translations[uiLang === 'zh-hant' ? 'zh' : uiLang] = rawTrans;
      const list = loadUserKbGlossary();
      list.unshift({
        id: 'ug_' + uid(),
        kind: 'glossary',
        title,
        category: subtitle || 'Custom Glossary',
        description,
        url,
        rookieTip: rawTrans || '',
        translations,
        tags,
        builtin: false,
      });
      if (!saveUserKbGlossary(list)) { toast('Could not save this source. Browser storage may be full.'); return; }
    } else {
      const list = loadUserKbSources();
      list.unshift({
        id: 'us_' + uid(),
        kind,
        title,
        subtitle: subtitle || (kind === 'tools' ? 'Custom Tool' : 'Custom Source'),
        category: kind === 'tools' ? 'Custom Tool' : 'Custom Doc',
        description,
        url,
        tags,
        builtin: false,
      });
      if (!saveUserKbSources(list)) { toast('Could not save this source. Browser storage may be full.'); return; }
    }
    closeModal();
    renderKnowledgeBase();
    toast(`Added “${title}” to Knowledge Base`);
  });
}

/* ───────────── MODALS ───────────── */
let startupLangDismiss = null;
function openModal(html) {
  modalContent.innerHTML = html;
  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  if (window.NovaUI) window.NovaUI.closeAll();
  modalOverlay.hidden = true;
  modalContent.innerHTML = '';
  document.body.style.overflow = '';
  if (startupLangDismiss) {
    const finish = startupLangDismiss;
    startupLangDismiss = null;
    finish();
  }
}

const SVG_CHECK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 10"/></svg>';
const ORBIT_BIG = '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><circle cx="16" cy="16" r="6.6" fill="url(#emberGrad)"/><ellipse cx="16" cy="16" rx="13" ry="5.3" transform="rotate(-24 16 16)" fill="none" stroke="#ffd166" stroke-width="2" opacity="0.9"/><circle cx="26.6" cy="9.4" r="1.5" fill="#ffd166"/></svg>';

function openStartupLanguageModal(initialLang = 'en', onDone = () => {}) {
  const startCode = TRANSLATE_LANGS[normalizeLangCode(initialLang)] ? normalizeLangCode(initialLang) : 'en';
  const curName = localStorage.getItem(LS.username) || '';
  const curTeam = localStorage.getItem(LS.team) || '';
  let finished = false;
  const finishOnce = (chosenLang, nextName, nextTeam) => {
    if (finished) return;
    finished = true;
    startupLangDismiss = null;
    if (nextName !== undefined) localStorage.setItem(LS.username, nextName.trim());
    if (nextTeam !== undefined) localStorage.setItem(LS.team, nextTeam.trim());
    else if (localStorage.getItem(LS.team) === null) localStorage.setItem(LS.team, '');
    renderUserProfile();
    applyI18n(chosenLang || uiLang, true, true);
    onDone();
  };
  startupLangDismiss = () => finishOnce(uiLang);

  const quickLangs = [
    ['en', 'English'],
    ['es', 'Español'],
    ['zh-hans', '简体中文'],
    ['zh-hant', '繁體中文'],
    ['hi', 'हिन्दी'],
    ['vi', 'Tiếng Việt'],
    ['fr', 'Français'],
    ['ja', '日本語'],
    ['ko', '한국어'],
    ['ar', 'العربية'],
  ];

  openModal(`
    <div class="modal-hero">${ORBIT_BIG}</div>
    <h3 class="modal-title" id="modalTitle">Welcome to Primer</h3>
    <p class="modal-sub">Set your team, name, and preferred language across the interface and chat.</p>
    <div class="startup-lang-picker">
      <div class="startup-grid">
        <div class="startup-field">
          <label class="startup-field-label" for="startupTeamInput">What team are you on?</label>
          <input class="startup-input" id="startupTeamInput" value="${escapeHtml(curTeam)}" placeholder="e.g., 846, 254, Team name" maxlength="60">
        </div>
        <div class="startup-field">
          <label class="startup-field-label" for="startupNameInput">Username (optional)</label>
          <input class="startup-input" id="startupNameInput" value="${escapeHtml(curName)}" placeholder="Your name" maxlength="40" autocomplete="name">
        </div>
      </div>
      <label class="startup-field-label" for="startupLangSelect">Site &amp; chat language (53 supported)</label>
      <select id="startupLangSelect" aria-label="Choose startup language">
        ${buildGroupedLangOptionsHtml(startCode)}
      </select>
      <div class="startup-quick-row" role="group" aria-label="Popular languages">
        ${quickLangs.map(([code, label]) => `<button type="button" class="startup-quick-btn${code === startCode ? ' active' : ''}" data-start-lang="${code}">${escapeHtml(label)}</button>`).join('')}
      </div>
    </div>
    <button class="cta-btn" id="startupLangConfirm" type="button">Continue to Primer</button>
    <p class="cancel-note">You can change your team, username, or language anytime in the sidebar.</p>`);

  const sel = $('#startupLangSelect');
  const teamInput = $('#startupTeamInput');
  const nameInput = $('#startupNameInput');
  sel.value = startCode;
  if (window.NovaUI) window.NovaUI.enhanceSelect(sel);
  setTimeout(() => teamInput?.focus(), 40);

  const syncQuickBtns = (code) => {
    $$('.startup-quick-btn', modalContent).forEach(btn => btn.classList.toggle('active', btn.dataset.startLang === code));
  };

  sel.addEventListener('change', () => {
    syncQuickBtns(sel.value);
    applyI18n(sel.value, true, false);
  });

  $$('.startup-quick-btn', modalContent).forEach(btn => {
    btn.addEventListener('click', () => {
      sel.value = btn.dataset.startLang;
      if (window.NovaUI) window.NovaUI.syncCustomSelect(sel);
      syncQuickBtns(sel.value);
      applyI18n(sel.value, true, false);
    });
  });

  const confirmStartup = () => {
    const chosen = sel.value || 'en';
    const nextName = nameInput ? nameInput.value : '';
    const nextTeam = teamInput ? teamInput.value : '';
    startupLangDismiss = null;
    closeModal();
    finishOnce(chosen, nextName, nextTeam);
  };

  $('#startupLangConfirm').addEventListener('click', confirmStartup);
  [teamInput, nameInput].forEach(inp => inp?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmStartup(); }
  }));
}

function openSettingsModal() {
  const row = (id, name, desc, checked) => `
    <div class="setting-row">
      <div class="setting-text">
        <div class="setting-name">${name}</div>
        <div class="setting-desc">${desc}</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
        <span class="track"></span>
        <span class="thumb"></span>
      </label>
    </div>`;
  const currentLang = TRANSLATE_LANGS[normalizeLangCode(uiLang)] ? normalizeLangCode(uiLang) : 'en';
  const currentPalette = localStorage.getItem(LS.palette) || 'espresso';
  const curName = localStorage.getItem(LS.username) || '';
  const curTeam = localStorage.getItem(LS.team) || '';
  const usernameRow = `
    <div class="setting-row">
      <div class="setting-text">
        <div class="setting-name">Username</div>
        <div class="setting-desc">Shown in your sidebar profile</div>
      </div>
      <input class="setting-input" id="setUsername" value="${escapeHtml(curName)}" placeholder="Username" maxlength="40" aria-label="Username">
    </div>`;
  const teamRow = `
    <div class="setting-row">
      <div class="setting-text">
        <div class="setting-name">Team</div>
        <div class="setting-desc">Your robotics team number or name</div>
      </div>
      <input class="setting-input" id="setTeam" value="${escapeHtml(curTeam)}" placeholder="e.g., 846 or 254" maxlength="60" aria-label="Team">
    </div>`;
  const langRow = `
    <div class="setting-row">
      <div class="setting-text">
        <div class="setting-name">${t('langName')}</div>
        <div class="setting-desc">${t('langDesc')}</div>
      </div>
      <label class="i18n-select-wrap">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"/></svg>
        <select id="setLang" aria-label="${escapeHtml(t('langName'))}">
          ${buildGroupedLangOptionsHtml(currentLang)}
        </select>
      </label>
    </div>`;
  const paletteRow = `
    <div class="setting-row">
      <div class="setting-text">
        <div class="setting-name">Color palette</div>
        <div class="setting-desc">Switch between dark espresso themes</div>
      </div>
      <label class="i18n-select-wrap">
        <select id="setPalette" aria-label="Color palette">
          ${Object.entries(PALETTES).map(([k, label]) => `<option value="${k}"${k === currentPalette ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}
        </select>
      </label>
    </div>`;
  const curTeamFormatted = formatTeamLabel(curTeam);
  openModal(`
    <h3 class="modal-title" id="modalTitle" style="text-align:left">${escapeHtml(t('settingsTitle'))}</h3>
    <p class="modal-sub" style="text-align:left">${escapeHtml(t('settingsSub'))}</p>
    <div class="settings-rows">
      ${usernameRow}
      ${teamRow}
      ${langRow}
      ${paletteRow}
      ${row('setSimple', t('simpleName'), t('simpleDesc'), settings.simple)}
      ${row('setGlow', t('glowName'), t('glowDesc'), settings.glow)}
      ${row('setStreaming', t('streamName'), t('streamDesc'), settings.streaming)}
      ${row('setSound', t('soundName'), t('soundDesc'), settings.sound)}
    </div>
    <p class="settings-foot" id="settingsFoot">Primer${curTeamFormatted ? ' · ' + escapeHtml(curTeamFormatted) : ''} · ${escapeHtml(getUsername())}</p>`);

  $('#setUsername')?.addEventListener('input', (e) => {
    localStorage.setItem(LS.username, e.target.value.trim());
    renderUserProfile();
  });
  $('#setTeam')?.addEventListener('input', (e) => {
    localStorage.setItem(LS.team, e.target.value.trim());
    renderUserProfile();
  });
  const setLangSel = $('#setLang');
  if (window.NovaUI) window.NovaUI.enhanceSelect(setLangSel);
  setLangSel.addEventListener('change', (e) => {
    applyI18n(e.target.value, true, true);
    toast(getLangDisplayName(e.target.value));
  });
  const setPaletteSel = $('#setPalette');
  if (window.NovaUI) window.NovaUI.enhanceSelect(setPaletteSel);
  setPaletteSel.addEventListener('change', (e) => {
    applyPalette(e.target.value, true);
    toast(`Theme: ${PALETTES[e.target.value] || e.target.value}`);
  });
  $('#setSimple').addEventListener('change', (e) => {
    settings.simple = e.target.checked;
    localStorage.setItem(LS.simple, settings.simple ? '1' : '0');
  });
  $('#setGlow').addEventListener('change', (e) => {
    settings.glow = e.target.checked;
    localStorage.setItem(LS.glow, settings.glow ? '1' : '0');
    document.body.classList.toggle('no-glow', !settings.glow);
  });
  $('#setStreaming').addEventListener('change', (e) => {
    settings.streaming = e.target.checked;
    localStorage.setItem(LS.streaming, settings.streaming ? '1' : '0');
  });
  $('#setSound').addEventListener('change', (e) => {
    settings.sound = e.target.checked;
    localStorage.setItem(LS.sound, settings.sound ? '1' : '0');
    if (settings.sound) blip(880);
  });
}

function openConfirmModal(title, sub, confirmLabel, danger, onConfirm) {
  openModal(`
    <h3 class="confirm-title" id="modalTitle">${escapeHtml(title)}</h3>
    <p class="confirm-sub">${escapeHtml(sub)}</p>
    <div class="confirm-actions">
      <button class="ghost-btn" id="confirmCancel">Cancel</button>
      <button class="${danger ? 'danger-btn' : 'cta-btn'}" id="confirmOk" ${danger ? '' : 'style="flex:1;margin-top:0;height:44px"'}>${escapeHtml(confirmLabel)}</button>
    </div>`);
  $('#confirmCancel').addEventListener('click', closeModal);
  $('#confirmOk').addEventListener('click', () => { closeModal(); onConfirm(); });
}

/* ───────────── EVENT WIRING ───────────── */

// per-chat delete always goes through a confirmation modal
function confirmDeleteChat(id) {
  const chat = chats.find(c => c.id === id);
  const raw = chat && chat.title ? chat.title : 'this chat';
  const label = raw.length > 44 ? raw.slice(0, 44) + '…' : raw;
  openConfirmModal(
    `Delete “${label}”?`,
    'This permanently deletes this conversation on this device. This cannot be undone.',
    'Delete',
    true,
    () => deleteChat(id),
  );
}

// sidebar actions
$('#newChatBtn').addEventListener('click', startNewChat);
$('#allChatsBtn').addEventListener('click', () => { setView('all'); renderAllChats(); });
$('#knowledgeBtn').addEventListener('click', () => { setView('knowledge'); renderKnowledgeBase(); refreshTbaSourceStatus(); });
$('#openKnowledgeLink').addEventListener('click', () => { setView('knowledge'); renderKnowledgeBase(); refreshTbaSourceStatus(); });
$('#emptyNewChatBtn').addEventListener('click', startNewChat);
$('#userProfileBtn')?.addEventListener('click', openProfileModal);
$('#settingsBtn').addEventListener('click', openSettingsModal);
$('#searchChatsBtn').addEventListener('click', () => { setView('all'); renderAllChats(); setTimeout(() => allSearch.focus(), 60); });
const confirmClearAll = () => openConfirmModal('Clear all chats?', 'This permanently deletes every conversation on this device. This action cannot be undone.', 'Clear all', true, clearAllChats);
$('#clearRecentBtn').addEventListener('click', () => {
  if (!chats.length) return toast('Nothing to clear');
  confirmClearAll();
});
$('#clearAllBtn').addEventListener('click', () => {
  if (!chats.length) return toast('Nothing to clear');
  confirmClearAll();
});

// 3-bars: docked sidebar toggle (permanent sidebar, no overlay)
$('#menuBtn').addEventListener('click', toggleSidebar);

// delegation: chat list + all-chats grid (open / delete)
chatList.addEventListener('click', (e) => {
  const del = e.target.closest('.ci-del');
  const item = e.target.closest('.chat-item');
  if (del && item) { e.stopPropagation(); confirmDeleteChat(item.dataset.id); return; }
  if (item) openChat(item.dataset.id);
});
chatList.addEventListener('keydown', (e) => {
  const del = e.target.closest('.ci-del');
  if (del && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    const item = del.closest('.chat-item');
    if (item) confirmDeleteChat(item.dataset.id);
  }
});
allGrid.addEventListener('click', (e) => {
  const del = e.target.closest('.card-del');
  const card = e.target.closest('.chat-card');
  if (del && card) { e.stopPropagation(); confirmDeleteChat(card.dataset.id); return; }
  if (card) openChat(card.dataset.id);
});
allGrid.addEventListener('keydown', (e) => {
  const del = e.target.closest('.card-del');
  if (del && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    const card = del.closest('.chat-card');
    if (card) confirmDeleteChat(card.dataset.id);
  }
});
allSearch.addEventListener('input', renderAllChats);

// composer submit
composer.addEventListener('submit', (e) => { e.preventDefault(); sendCurrentMessage(); });

// textarea auto-resize + affordances
promptInput.addEventListener('input', () => {
  promptInput.style.height = 'auto';
  promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
  updateInputAffordances();
  scheduleTokenProbe();
  scheduleInlineTranslate(false);
});
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    sendCurrentMessage();
  }
});

// attach flow
plusBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  modelMenu.hidden = true;
  modelBtn.setAttribute('aria-expanded', 'false');
  attachMenu.hidden = !attachMenu.hidden;
});
attachMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-attach]');
  if (!btn) return;
  const kind = btn.dataset.attach;
  attachMenu.hidden = true;
  if (kind === 'file') { fileInput.accept = ''; fileInput.click(); }
  else if (kind === 'image') { fileInput.accept = 'image/*'; fileInput.click(); }
});
fileInput.addEventListener('change', () => { if (fileInput.files.length) addFiles(fileInput.files); fileInput.value = ''; });
attachRow.addEventListener('click', (e) => {
  const btn = e.target.closest('.attach-remove');
  if (!btn) return;
  attachments.splice(Number(btn.dataset.idx), 1);
  renderAttachments();
  updateInputAffordances();
});

// drag & drop onto composer
['dragenter', 'dragover'].forEach(evt =>
  composer.addEventListener(evt, (e) => { e.preventDefault(); composer.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(evt =>
  composer.addEventListener(evt, (e) => { e.preventDefault(); composer.classList.remove('dragging'); }));
composer.addEventListener('drop', (e) => {
  if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
});

// model picker
modelBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleModelMenu(); });
stopBtn.addEventListener('click', () => { if (activeAbort) activeAbort.abort(); });
modelMenu.addEventListener('click', (e) => {
  if (e.target.closest('[data-ctx-slider]')) { e.stopPropagation(); return; }
  if (e.target.closest('[data-open-code]')) {
    e.stopPropagation();
    modelMenu.hidden = true;
    modelBtn.setAttribute('aria-expanded', 'false');
    $('#githubToggle').click();
    return;
  }
  const reasonBtn = e.target.closest('[data-reason]');
  if (reasonBtn) { e.stopPropagation(); setReasoning(reasonBtn.dataset.reason === 'on'); return; }
  const opt = e.target.closest('[data-model]');
  if (opt) selectModel(opt.dataset.model);
});

modelMenu.addEventListener('input', (e) => {
  const slider = e.target.closest('[data-ctx-slider]');
  if (!slider) return;
  syncCtxSliderDisplay(slider.dataset.ctxSlider, Number(slider.value), slider);
});

modelMenu.addEventListener('change', (e) => {
  const slider = e.target.closest('[data-ctx-slider]');
  if (!slider || slider.disabled) return;
  const tier = slider.dataset.ctxSlider;
  const nextCtx = Number(slider.value);
  if (nextCtx !== engineCtx(tier)) restartTier(nextCtx, tier);
});

// per-tier "Free memory" button inside the engine panels
modelMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-unload]');
  if (!btn || btn.disabled) return;
  e.stopPropagation();
  stopEngine(btn.dataset.unload, btn);
});

async function stopEngine(tier, btn, { quiet = false } = {}) {
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Unloading…'; }
  try {
    const res = await fetch(API_BASE + '/api/engines/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || ('HTTP ' + res.status));
    const model = (MODELS[tier] && MODELS[tier].name) || tier;
    if (!quiet) {
      const msg = data.remote
        ? `${model} is hosted via Inference Endpoint`
        : (data.stopped === false ? `${model} was not running` : `${model} unloaded — memory freed; reloads on next message`);
      toast(msg);
      checkChatHealth();
      if (!modelMenu.hidden) renderModelMenu();
    }
    return { ok: true, tier, stopped: data.stopped !== false };
  } catch (err) {
    console.warn('engine unload failed:', err);
    if (!quiet) {
      toast('Unload failed — see console');
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
    return { ok: false, tier, error: err.message };
  }
}

// in-composer site language switcher & inline translator bar
if (chatLangBtn && chatLangPopover) {
  chatLangBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    modelMenu.hidden = true;
    modelBtn.setAttribute('aria-expanded', 'false');
    attachMenu.hidden = true;
    const ep = $('#enginePopover');
    const bc = $('#brandCaret');
    if (ep) ep.hidden = true;
    if (bc) bc.setAttribute('aria-expanded', 'false');
    const willOpen = chatLangPopover.hidden;
    chatLangPopover.hidden = !willOpen;
    chatLangBtn.setAttribute('aria-expanded', String(willOpen));
  });
  chatLangPopover.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

if (toggleComposerTrBtn) {
  toggleComposerTrBtn.addEventListener('click', () => {
    toggleComposerTranslator();
    if (chatLangPopover) chatLangPopover.hidden = true;
    if (chatLangBtn) chatLangBtn.setAttribute('aria-expanded', 'false');
  });
}
const inlineTrCloseBtn = $('#inlineTrClose');
if (inlineTrCloseBtn) inlineTrCloseBtn.addEventListener('click', () => toggleComposerTranslator(false));
if (inlineFromLangSel) inlineFromLangSel.addEventListener('change', () => scheduleInlineTranslate(true));
if (inlineToLangSel) inlineToLangSel.addEventListener('change', () => scheduleInlineTranslate(true));
if ($('#inlineContextBtn')) $('#inlineContextBtn').addEventListener('click', translateWithChatContext);
const inlineSwapBtn = $('#inlineSwapBtn');
if (inlineSwapBtn) {
  inlineSwapBtn.addEventListener('click', () => {
    const a = inlineFromLangSel.value;
    inlineFromLangSel.value = inlineToLangSel.value;
    inlineToLangSel.value = a;
    if (window.NovaUI) {
      window.NovaUI.syncCustomSelect(inlineFromLangSel);
      window.NovaUI.syncCustomSelect(inlineToLangSel);
    }
    if (lastInlineTranslation) {
      promptInput.value = lastInlineTranslation;
      promptInput.dispatchEvent(new Event('input'));
    }
    scheduleInlineTranslate(true);
  });
}
if ($('#inlineSpeakBtn')) {
  $('#inlineSpeakBtn').addEventListener('click', () => {
    if (lastInlineTranslation) speak(lastInlineTranslation, inlineToLangSel.value);
    else if (promptInput.value.trim()) speak(promptInput.value.trim(), inlineFromLangSel.value);
  });
}
if ($('#inlineCopyBtn')) {
  $('#inlineCopyBtn').addEventListener('click', () => {
    if (!lastInlineTranslation) return toast('Nothing translated yet');
    navigator.clipboard.writeText(lastInlineTranslation).then(() => toast('Copied translation'));
  });
}
if ($('#inlineInsertBtn')) {
  $('#inlineInsertBtn').addEventListener('click', () => {
    if (!lastInlineTranslation) return toast('Type text below first');
    promptInput.value = lastInlineTranslation;
    promptInput.dispatchEvent(new Event('input'));
    promptInput.focus();
  });
}
if ($('#inlineSendBtn')) {
  $('#inlineSendBtn').addEventListener('click', () => {
    if (!lastInlineTranslation) return toast('Nothing translated yet');
    promptInput.value = lastInlineTranslation;
    promptInput.dispatchEvent(new Event('input'));
    sendCurrentMessage();
  });
}
if (inlinePhraseChips) {
  inlinePhraseChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.phrase-chip');
    if (!chip) return;
    if (inlineFromLangSel.value !== 'en') {
      const target = inlineToLangSel.value === 'en' ? 'es' : inlineToLangSel.value;
      inlineToLangSel.value = target === 'en' ? 'es' : target;
      inlineFromLangSel.value = 'en';
      if (window.NovaUI) {
        window.NovaUI.syncCustomSelect(inlineFromLangSel);
        window.NovaUI.syncCustomSelect(inlineToLangSel);
      }
    }
    promptInput.value = chip.dataset.phrase;
    promptInput.dispatchEvent(new Event('input'));
    scheduleInlineTranslate(true);
  });
}
if ($('#enginePill')) {
  $('#enginePill').addEventListener('click', async () => {
    const status = await checkNeuralHealth();
    toast(status === 'ready'
      ? `PLaMo-3 ready${neuralDetail?.quantization ? ' (' + neuralDetail.quantization + ')' : ''}`
      : 'PLaMo unreachable (:8787) — using offline dictionary');
    scheduleInlineTranslate(true);
  });
}

// Knowledge Base wiring
if ($('#kbAddBtn')) $('#kbAddBtn').addEventListener('click', openAddSourceModal);
if ($('#kbTabs')) {
  $('#kbTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.kb-tab');
    if (!tab) return;
    kbActiveTab = tab.dataset.tab || 'all';
    $$('#kbTabs .kb-tab').forEach(b => {
      const on = b === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    renderKnowledgeBase();
  });
}
if (kbSearchInput) kbSearchInput.addEventListener('input', renderKnowledgeBase);
if (kbListEl) {
  kbListEl.addEventListener('click', (e) => {
    const askBtn = e.target.closest('[data-kb-ask]');
    if (askBtn) {
      const item = allKnowledgeItems().find(x => x.id === askBtn.dataset.kbAsk);
      askNovaAboutKbItem(item);
      return;
    }
    const codeBtn = e.target.closest('[data-kb-code]');
    if (codeBtn) {
      const [repo, filePath] = codeBtn.dataset.kbCode.split('|');
      if (window.team846 && window.team846.openSnapshotFile) {
        window.team846.openSnapshotFile(repo, filePath);
      } else if ($('#githubToggle')) {
        $('#githubToggle').click();
      }
      return;
    }
    const delBtn = e.target.closest('[data-kb-del]');
    if (delBtn) {
      const id = delBtn.dataset.kbDel;
      const kind = delBtn.dataset.kind;
      if (kind === 'glossary') saveUserKbGlossary(loadUserKbGlossary().filter(x => x.id !== id));
      else saveUserKbSources(loadUserKbSources().filter(x => x.id !== id));
      renderKnowledgeBase();
      toast('Source removed');
    }
  });
}

// top bar palette pills & workbench quick cards
$$('.palette-pills [data-palette]').forEach(btn => {
  btn.addEventListener('click', () => {
    applyPalette(btn.dataset.palette, true);
    toast(`Theme: ${PALETTES[btn.dataset.palette] || btn.dataset.palette}`);
  });
});
$$('[data-workbench-action]').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.workbenchAction;
    if (action === 'code') {
      const ghToggle = $('#githubToggle');
      if (ghToggle) ghToggle.click();
    } else if (action === 'translate') {
      toggleComposerTranslator(true);
      promptInput.focus();
    }
  });
});

// close popovers on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.model-picker') && !e.target.closest('#modelMenu')) {
    modelMenu.hidden = true;
    modelBtn.setAttribute('aria-expanded', 'false');
  }
  if (!e.target.closest('.attach-menu') && !e.target.closest('.plus-btn')) attachMenu.hidden = true;
  if (enginePopover && !e.target.closest('#enginePopover') && !e.target.closest('#brandCaret') && !e.target.closest('.nova-select-menu')) {
    enginePopover.hidden = true;
    if (brandCaret) brandCaret.setAttribute('aria-expanded', 'false');
  }
  if (chatLangPopover && !e.target.closest('#chatLangWrap') && !e.target.closest('.nova-select-menu')) {
    chatLangPopover.hidden = true;
    if (chatLangBtn) chatLangBtn.setAttribute('aria-expanded', 'false');
  }
});

window.addEventListener('resize', () => {
  if (modelMenu && !modelMenu.hidden) positionModelMenu();
});
window.addEventListener('scroll', () => {
  if (modelMenu && !modelMenu.hidden) positionModelMenu();
}, true);

// modal close paths
$('#modalClose').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!modalOverlay.hidden) closeModal();
    modelMenu.hidden = true;
    modelBtn.setAttribute('aria-expanded', 'false');
    attachMenu.hidden = true;
    if (enginePopover) enginePopover.hidden = true;
    if (brandCaret) brandCaret.setAttribute('aria-expanded', 'false');
    if (chatLangPopover) chatLangPopover.hidden = true;
    if (chatLangBtn) chatLangBtn.setAttribute('aria-expanded', 'false');
  }
});

// ── image lightbox ──
const lightbox = $('#lightbox');
const lightboxImg = $('#lightboxImg');
const openLightbox = (src, alt) => {
  lightboxImg.src = src;
  lightboxImg.alt = alt || 'Attached image';
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
};
const closeLightbox = () => {
  lightbox.hidden = true;
  lightboxImg.src = '';
  document.body.style.overflow = '';
};
$('#lightboxClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
messagesEl.addEventListener('click', (e) => {
  const img = e.target.closest('.bubble-img');
  if (img) openLightbox(img.src, img.alt);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
});

// thinking disclosure (delegated, works for live and restored messages)
messagesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.mind-toggle');
  if (!btn) return;
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!open));
  const block = btn.closest('.model-block');
  const body = block ? block.querySelector('.mind-body') : null;
  if (body) body.hidden = open;
});

// message action buttons (delegated)
messagesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const msgWrap = btn.closest('.message');
  const block = btn.closest('.model-block');
  const body = block ? block.querySelector('.model-body') : (msgWrap ? msgWrap.querySelector('.bubble') : null);
  const text = body ? body.innerText : '';

  if (action === 'copy') {
    navigator.clipboard.writeText(text).then(
      () => toast('Copied to clipboard'),
      () => toast('Could not access clipboard')
    );
  } else if (action === 'translate' || action === 'translate-user') {
    translateMessageInline(msgWrap, text);
  } else if (action === 'speak') {
    speak(text, uiLang);
  } else if (action === 'like' || action === 'dislike') {
    const sibling = action === 'like'
      ? btn.parentElement.querySelector('[data-action="dislike"]')
      : btn.parentElement.querySelector('[data-action="like"]');
    if (sibling) sibling.classList.remove('active');
    btn.classList.toggle('active');
    toast(btn.classList.contains('active') ? 'Thanks for the feedback' : 'Feedback removed');
  } else if (action === 'regenerate') {
    if (isStreaming) return;
    const chat = getCurrentChat();
    if (!chat) return;
    const lastModelIdx = [...chat.messages].reverse().findIndex(m => m.role === 'model');
    if (lastModelIdx === -1) return;
    chat.messages.splice(chat.messages.length - 1 - lastModelIdx, 1);
    regenSeed = 1 + Math.floor(Math.random() * 10);
    saveChats();
    renderMessages(chat);
    isStreaming = true;
    showThinking();
    const lastUser = [...chat.messages].reverse().find(m => m.role === 'user');
    const promptText = lastUser ? lastUser.content : '';
    sendNeuralChat(chat, promptText).catch(err => {
      console.warn('chat backend failed → offline fallback:', err);
      toast('The AI model could not answer');
      const reply = chatErrorMessage(err);
      streamModelReply(chat, reply);
    });
  }
});

// ── voice input (Whisper large-v3-turbo via the backend, /api/transcribe) ──
let mediaRecorder = null;
let micChunks = [];

async function toggleMic(target, btn) {
  if (btn.classList.contains('listening')) {
    try { mediaRecorder && mediaRecorder.state !== 'inactive' && mediaRecorder.stop(); }
    catch (_) { /* recorder already stopped */ }
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    micChunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) micChunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      finishTranscription(target, btn);
    };
    mediaRecorder = rec;
    rec.start();
    btn.classList.add('listening');
    toast('Listening… tap the mic again to stop');
  } catch (_) {
    toast('Microphone unavailable — check permissions');
  }
}

async function finishTranscription(target, btn) {
  btn.classList.remove('listening');
  btn.disabled = true;
  try {
    if (!micChunks.length) { toast('No audio captured'); return; }
    if (!await ensureDownloadPermission('whisper')) { toast('Speech model download was not approved.'); return; }
    const blob = new Blob(micChunks, { type: micChunks[0].type || 'audio/webm' });
    const res = await fetch(`${API_BASE}/api/transcribe?language=auto`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'audio/webm' },
      body: blob,
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = (data.text || '').trim();
    if (!text) { toast('Could not make out any speech'); return; }
    promptInput.value = (promptInput.value + ' ' + text).trim();
    promptInput.dispatchEvent(new Event('input'));
    promptInput.focus();
    const heard = (data.language || 'auto');
    toast(`Heard (${heard}): “${text.slice(0, 60)}${text.length > 60 ? '…' : ''}”`);
  } catch (err) {
    console.warn('transcription failed:', err);
    toast('Voice transcription unavailable — is the backend running on :8787?');
  } finally {
    btn.disabled = false;
  }
}

micBtn.addEventListener('click', () => toggleMic('chat', micBtn));

// ── keyboard shortcuts ──
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    startNewChat();
    return;
  }
  if (mod && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    toggleSidebar();
    return;
  }
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if (e.key === '/' && !typing) {
    e.preventDefault();
    if (currentView === 'chat') setView('chat'); else setView('home');
    promptInput.focus();
  }
});

/* ───────────── INIT ───────────── */
(function init() {
  if (new URLSearchParams(location.search).get('python_confirmed') === '1') {
    pythonConfirmed = true;
    history.replaceState(null, '', location.pathname);
  }
  // sidebar: open by default on desktop, closed on small screens (user preference wins)
  const storedSidebar = localStorage.getItem(LS.sidebar);
  const sidebarOpen = storedSidebar !== null ? storedSidebar === '1' : window.innerWidth > 900;
  document.body.classList.toggle('sidebar-collapsed', !sidebarOpen);

  if (!settings.glow) document.body.classList.add('no-glow');

  // Load saved chats without creating demo conversations.
  const stored = loadChats();
  const sanitize = (list) => list.map(c => ({
    ...c,
    model: MODELS[c.model] ? c.model : 'pro',
    messages: (c.messages || []).filter((m, i, arr) =>
      i === 0 || !(m.role === 'model' && arr[i - 1].role === 'model' && m.content === arr[i - 1].content)),
  }));
  chats = Array.isArray(stored) ? sanitize(stored) : [];
  saveChats();

  // in-composer language switcher & translator setup
  populateLangSelects();
  renderUiLangGrid();
  renderInlinePhraseChips();
  checkNeuralHealth();

  // Team 846 GitHub explorer dark dropdown enhancement
  const ghLangSel = $('#githubLanguageFilter');
  if (ghLangSel && window.NovaUI) window.NovaUI.enhanceSelect(ghLangSel);

  // Knowledge Base setup
  renderKnowledgeBase();

  // model picker & brand engine popover state
  modelLabel.textContent = MODELS[modelKey].name;
  brandTag.textContent = modelKey.toUpperCase();
  renderModelMenu();

  // darker brown studio palette
  applyPalette(localStorage.getItem(LS.palette) || 'espresso', false);

  // sidebar username + team badge
  renderUserProfile();

  // i18n last so it can label every element (only persist if already saved)
  applyI18n(uiLang, false, hasSavedLang);

  renderAll();
  setView('home');
  updateInputAffordances();
  checkChatHealth();

  // Ask for team and preferred language on first launch before kicking off downloads/preload
  const hasSavedTeam = localStorage.getItem(LS.team) !== null;
  const startPreload = () => preloadModel(modelKey, true);
  if (!hasSavedLang || !hasSavedTeam) {
    openStartupLanguageModal(uiLang, startPreload);
  } else {
    startPreload();
  }
})();

