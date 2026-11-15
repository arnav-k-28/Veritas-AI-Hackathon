/* ═══════════════════════════════════════════════════════════
   NOVA — student companion: chat + translator + study buddy
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ───────────────────────── MODELS ───────────────────────── */
const MODELS = {
  spark: { name: 'Spark', full: 'Spark · LFM3-VL-2B',             desc: 'LFM3-VL-2B · instant replies, vision, 128K context — the everyday pick', speed: 11, badge: 'Fast' },
  pro:   { name: 'Pro',   full: 'Pro · MiMo V2.6 Distill 9B',     desc: 'MiMo-V2.6-Distill-Qwen-9B · strong reasoning + tools, vision, 16K context', speed: 21, badge: 'Recommended' },
  ultra: { name: 'Ultra', full: 'Ultra · Qwen3.6-35B-A3B',         desc: 'Qwen3.6-35B-A3B · MoE 3B active, strongest reasoning, 32K context', speed: 33, badge: 'Best' },
};

// per-tier engine state (match backend ENGINE_CTX)
const TIER_STATE = {
  spark: { ctx: 131072, kvKB: 0,  vramHint: 'GDN attention — KV cache is tiny (~10 MB even at 128K)' },
  pro:   { ctx: 16384,  kvKB: 17, vramHint: 'KV q8_0: 4K ~68 MB · 8K ~136 MB · 16K ~272 MB · 32K ~544 MB · 64K ~1.1 GB' },
  ultra: { ctx: 32768,  kvKB: 11, vramHint: 'KV q8_0: 4K ~44 MB · 8K ~88 MB · 16K ~176 MB · 32K ~352 MB · 64K ~704 MB' },
};

/* ───────────────────────── I18N (UI language) ───────────────────────── */
const UI_LANGS = { en: 'English', es: 'Español', fr: 'Français', pt: 'Português' };
const UI_TITLES = {
  en: 'Nova — Where should we start?',
  es: 'Nova — ¿Por dónde empezamos?',
  fr: 'Nova — Par quoi commencer ?',
  pt: 'Nova — Por onde começamos?',
};
const I18N = {
  en: {
    newChat: 'New chat', translateNav: 'Translate', allChats: 'All chats', recent: 'Recent', clearBtn: 'Clear',
    freePlan: 'Free plan', askNova: 'Ask Nova', getApp: 'Get app', upgrade: 'Upgrade',
    whereStart: 'Where should we <em>start?</em>',
    disclaimer: 'Nova can make mistakes. Double-check important info.',
    translatorLink: 'Open the translator — built for international students',
    allChatsTitle: 'All chats', allChatsSub: 'conversations with Nova', searchChats: 'Search chats', clearAllBtn: 'Clear all',
    translateTitle: 'Translator', translateSub: 'For international students — English and back, in seconds',
    translateNote: 'Works offline — no internet needed. Best for short sentences and everyday campus phrases.',
    phraseTitle: 'Quick phrases for campus life', historyTitle: 'Translation history',
    historyEmpty: 'No translations yet — they will appear here automatically.',
    sourcePh: 'Type or paste text here…', targetPh: 'Translation appears here…',
    noTranslation: 'No offline match. Try a shorter sentence or a quick phrase below.',
    settingsTitle: 'Settings', settingsSub: 'Make Nova yours.',
    langName: 'App language', langDesc: 'Switch the whole interface language',
    simpleName: 'Simple English mode', simpleDesc: 'Nova answers in short, simple sentences — easier while you are learning English',
    glowName: 'Ambient glow', glowDesc: 'Soft ember backdrop behind the interface',
    streamName: 'Streaming responses', streamDesc: 'Watch Nova think in real time, word by word',
    soundName: 'Sound effects', soundDesc: 'Gentle chimes when messages are sent and received',
    phrasebookMatch: 'Phrasebook match', wordMatch: 'Word-by-word (approximate)',
  },
  es: {
    newChat: 'Nueva conversación', translateNav: 'Traducir', allChats: 'Todas las conversaciones', recent: 'Recientes', clearBtn: 'Borrar',
    freePlan: 'Plan gratis', askNova: 'Pregúntale a Nova', getApp: 'Obtener app', upgrade: 'Mejorar',
    whereStart: '¿Por dónde <em>empezamos?</em>',
    disclaimer: 'Nova puede cometer errores. Verifica la información importante.',
    translatorLink: 'Abrir el traductor — hecho para estudiantes internacionales',
    allChatsTitle: 'Todas las conversaciones', allChatsSub: 'conversaciones con Nova', searchChats: 'Buscar conversaciones', clearAllBtn: 'Borrar todo',
    translateTitle: 'Traductor', translateSub: 'Para estudiantes internacionales — al inglés y de vuelta, en segundos',
    translateNote: 'Funciona sin conexión. Ideal para frases cortas y frases universitarias del día a día.',
    phraseTitle: 'Frases rápidas para la vida universitaria', historyTitle: 'Historial de traducciones',
    historyEmpty: 'Aún no hay traducciones — aparecerán aquí automáticamente.',
    sourcePh: 'Escribe o pega el texto aquí…', targetPh: 'La traducción aparecerá aquí…',
    noTranslation: 'Sin coincidencia sin conexión. Prueba una frase más corta o una frase rápida.',
    settingsTitle: 'Ajustes', settingsSub: 'Haz que Nova sea tuyo.',
    langName: 'Idioma de la aplicación', langDesc: 'Cambia todo el idioma de la interfaz',
    simpleName: 'Modo inglés simple', simpleDesc: 'Nova responde con frases cortas y sencillas — más fácil mientras aprendes inglés',
    glowName: 'Resplandor ambiental', glowDesc: 'Fondo cálido detrás de la interfaz',
    streamName: 'Respuestas en tiempo real', streamDesc: 'Mira a Nova pensar en tiempo real, palabra por palabra',
    soundName: 'Efectos de sonido', soundDesc: 'Campanas suaves al enviar y recibir mensajes',
    phrasebookMatch: 'Coincidencia de frase', wordMatch: 'Palabra por palabra (aproximado)',
  },
  fr: {
    newChat: 'Nouvelle discussion', translateNav: 'Traduire', allChats: 'Toutes les discussions', recent: 'Récentes', clearBtn: 'Effacer',
    freePlan: 'Forfait gratuit', askNova: 'Demande à Nova', getApp: "Télécharger l'app", upgrade: 'Passer à la version supérieure',
    whereStart: 'Par quoi <em>commencer&nbsp;?</em>',
    disclaimer: 'Nova peut faire des erreurs. Vérifiez les informations importantes.',
    translatorLink: 'Ouvrir le traducteur — pensé pour les étudiants internationaux',
    allChatsTitle: 'Toutes les discussions', allChatsSub: 'discussions avec Nova', searchChats: 'Rechercher des discussions', clearAllBtn: 'Tout effacer',
    translateTitle: 'Traducteur', translateSub: "Pour les étudiants internationaux — vers l'anglais et retour, en quelques secondes",
    translateNote: "Fonctionne hors ligne — aucune connexion requise. Idéal pour les phrases courtes et du quotidien.",
    phraseTitle: 'Phrases rapides pour la vie sur le campus', historyTitle: 'Historique des traductions',
    historyEmpty: "Aucune traduction pour l'instant — elles apparaîtront ici automatiquement.",
    sourcePh: 'Tapez ou collez votre texte ici…', targetPh: "La traduction s'affichera ici…",
    noTranslation: 'Aucune correspondance hors ligne. Essayez une phrase plus courte ou une phrase rapide ci-dessous.',
    settingsTitle: 'Paramètres', settingsSub: 'Personnalisez Nova.',
    langName: "Langue de l'application", langDesc: "Changez toute la langue de l'interface",
    simpleName: 'Mode anglais simple', simpleDesc: 'Nova répond avec des phrases courtes et simples — plus facile quand vous apprenez l’anglais',
    glowName: 'Halo ambiant', glowDesc: "Un doux arrière-plan ember derrière l'interface",
    streamName: 'Réponses en streaming', streamDesc: 'Regardez Nova réfléchir en temps réel, mot par mot',
    soundName: 'Effets sonores', soundDesc: 'Douces carillons quand les messages sont envoyés et reçus',
    phrasebookMatch: 'Correspondance phrase', wordMatch: 'Mot à mot (approximatif)',
  },
  pt: {
    newChat: 'Nova conversa', translateNav: 'Traduzir', allChats: 'Todas as conversas', recent: 'Recentes', clearBtn: 'Apagar',
    freePlan: 'Plano gratuito', askNova: 'Pergunte à Nova', getApp: 'Baixar o app', upgrade: 'Fazer upgrade',
    whereStart: 'Por onde <em>começamos?</em>',
    disclaimer: 'A Nova pode cometer erros. Verifique as informações importantes.',
    translatorLink: 'Abrir o tradutor — feito para estudantes internacionais',
    allChatsTitle: 'Todas as conversas', allChatsSub: 'conversas com a Nova', searchChats: 'Buscar conversas', clearAllBtn: 'Apagar tudo',
    translateTitle: 'Tradutor', translateSub: 'Para estudantes internacionais — para o inglês e de volta, em segundos',
    translateNote: 'Funciona offline — sem necessidade de internet. Ideal para frases curtas e do dia a dia no campus.',
    phraseTitle: 'Frases rápidas para a vida no campus', historyTitle: 'Histórico de traduções',
    historyEmpty: 'Nenhuma tradução ainda — elas aparecerão aqui automaticamente.',
    sourcePh: 'Digite ou cole o texto aqui…', targetPh: 'A tradução aparecerá aqui…',
    noTranslation: 'Sem correspondência offline. Tente uma frase mais curta ou uma frase rápida abaixo.',
    settingsTitle: 'Configurações', settingsSub: 'Deixe a Nova do seu jeito.',
    langName: 'Idioma do aplicativo', langDesc: 'Mude todo o idioma da interface',
    simpleName: 'Modo inglês simples', simpleDesc: 'A Nova responde com frases curtas e simples — mais fácil enquanto você aprende inglês',
    glowName: 'Brilho ambiental', glowDesc: 'Fundo quente por trás da interface',
    streamName: 'Respostas em tempo real', streamDesc: 'Veja a Nova pensar em tempo real, palavra por palavra',
    soundName: 'Efeitos sonoros', soundDesc: 'Sinos suaves ao enviar e receber mensagens',
    phrasebookMatch: 'Correspondência de frase', wordMatch: 'Palavra por palavra (aproximado)',
  },
};

let uiLang = localStorage.getItem('nova.lang') || 'en';
if (!I18N[uiLang]) uiLang = 'en';
const t = (key) => (I18N[uiLang] && I18N[uiLang][key]) || I18N.en[key] || key;

function applyI18n(lang) {
  uiLang = I18N[lang] ? lang : 'en';
  localStorage.setItem('nova.lang', uiLang);
  document.documentElement.lang = uiLang;
  document.title = UI_TITLES[uiLang];
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $$('[data-i18n-ph]').forEach(el => { el.setAttribute('placeholder', t(el.dataset.i18nPh)); });
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

/* All 53 languages supported by PLaMo-3-translate — grouped by region.
   English ↔ X and Japanese ↔ X are the strongest pairs (PFN's main
   training/eval focus); X ↔ Y still works, best for major languages. */
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

const SPEECH_TAG = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', de: 'de-DE',
  ja: 'ja-JP', 'zh-hans': 'zh-CN', 'zh-hant': 'zh-TW', ko: 'ko-KR',
  vi: 'vi-VN', th: 'th-TH', id: 'id-ID', ms: 'ms-MY', jv: 'jv-ID',
  tl: 'tl-PH', ceb: 'ceb-PH', my: 'my-MM', km: 'km-KH',
  it: 'it-IT', nl: 'nl-NL', ca: 'ca-ES', eu: 'eu-ES', pl: 'pl-PL',
  hu: 'hu-HU', sk: 'sk-SK', sl: 'sl-SI', hr: 'hr-HR', sr: 'sr-RS',
  bg: 'bg-BG', ru: 'ru-RU', be: 'be-BY', et: 'et-EE', lv: 'lv-LV',
  lt: 'lt-LT', hy: 'hy-AM', ka: 'ka-GE', az: 'az-AZ', ar: 'ar-SA',
  he: 'he-IL', fa: 'fa-IR', kk: 'kk-KZ', uz: 'uz-UZ', sw: 'sw-KE',
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
  translations: 'nova.translations.v1',
};

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
if (!MODELS[modelKey]) modelKey = 'spark';
// one-time: never default the UI to the heaviest tier — Ultra is RAM-heavy; Pro is the sane daily driver
if (!localStorage.getItem('nova.view.default-pro-migrated')) {
  if (modelKey === 'ultra') { modelKey = 'pro'; localStorage.setItem(LS.model, 'pro'); }
  localStorage.setItem('nova.view.default-pro-migrated', '1');
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

// translator DOM
const fromLangSel   = $('#fromLang');
const toLangSel     = $('#toLang');
const jaFormWrap    = $('#jaFormWrap');
const jaFormSel     = $('#jaForm');
const sourceText    = $('#sourceText');
const targetText    = $('#targetText');
const charCount     = $('#charCount');
const matchInfo     = $('#matchInfo');
const phraseChips   = $('#phraseChips');
const historyList   = $('#historyList');
const historyEmpty  = $('#historyEmpty');

const composerSlots = { home: $('#composerSlotHome'), chat: $('#composerSlotChat') };
const contextMeter  = $('#contextMeter');
const cmFill        = $('#cmFill');
const cmText        = $('#cmText');

/* Chat engines (Spark / Pro / Ultra). Lazy-loaded on first use — offline fallback on failure. */
let neuralChatStatus = 'checking';   // checking | idle | ready | unavailable
const chatContext = { used: 0, max: TIER_STATE[modelKey].ctx };  // exact usage reported by the server
let engineContext = { spark: 131072, pro: 16384, ultra: 32768 };  // live values come from /api/health
const DEFAULT_TIER_REASONING = { spark: false, pro: true, ultra: true };
function loadTierReasoning() {
  try {
    const raw = JSON.parse(localStorage.getItem('nova.reasoning.tiers') || 'null');
    if (raw && typeof raw === 'object') return { ...DEFAULT_TIER_REASONING, ...raw };
  } catch (_) { /* ignore */ }
  const legacy = localStorage.getItem('nova.reasoning');
  if (legacy === 'off') return { spark: false, pro: false, ultra: false };
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
      engineContext.ultra = engines.ultra?.context_max || engineContext.ultra;
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
       4 * D, 'ultra'),
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

/* ───────────── VIEW SWITCHING ───────────── */
const views = { home: $('#viewHome'), chat: $('#viewChat'), all: $('#viewAll'), translate: $('#viewTranslate') };

function setView(name) {
  currentView = name;
  Object.entries(views).forEach(([key, el]) => el.classList.toggle('active', key === name));
  if (name === 'chat') composerSlots.chat.appendChild(composer);
  else composerSlots.home.appendChild(composer);
  $('#allChatsBtn').classList.toggle('active', name === 'all');
  $('#translateBtn').classList.toggle('active', name === 'translate');
  updateInputAffordances();
  updateContextMeter(null, true);
}

/* ─────────── SIDEBAR (docked, 3-bars toggle) ─────────── */
function setSidebar(open) {
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
    chatList.innerHTML = '<div class="list-empty">No chats yet.<br>Ask Nova anything to get started.</div>';
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

function userBubbleHTML(msg) {
  const att = msg.attachments && msg.attachments.length
    ? `<span class="bubble-attachments">${attachmentChipsHTML(msg.attachments)}</span>` : '';
  const imagesHTML = msg.images && msg.images.length
    ? `<span class="bubble-images">${bubbleImagesHTML(msg.images)}</span>` : '';
  return `<div class="message user"><div class="bubble">${escapeHtml(msg.content)}${att}${imagesHTML}</div></div>`;
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
          Nova
          <span class="model-tag">${escapeHtml(m.name)}</span>
        </div>
        ${thinking}
        <div class="model-body">${md(msg.content)}</div>
        <div class="model-actions">
          <button class="icon-btn" data-action="copy" title="Copy response" aria-label="Copy response">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
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

  // Backend lazy-loads LFMSpark on first use. Optimistically try the neural path; only fall back on real failure.
  sendNeuralChat(chat, text).catch(err => {
    console.warn('chat backend failed → offline fallback:', err);
    updateInputAffordances();
    toast('LLM unreachable — using offline replies');
    const reply = 'Nova could not reach the AI model. No Team 846 repositories were searched for this answer. Please check the local server and try again.';
    regenSeed = 0;
    streamModelReply(chat, reply);
  });
}

function appendUserBubble(msg) {
  messagesEl.insertAdjacentHTML('beforeend', userBubbleHTML(msg));
  chatScroll.scrollTop = chatScroll.scrollHeight;
}

function showThinking() {
  const block = document.createElement('div');
  block.className = 'message model thinking-row';
  block.innerHTML = `
    <div class="model-block">
      <div class="model-head">
        ${ORBIT_SVG}
        Nova
        <span class="model-tag">${escapeHtml(MODELS[modelKey].name)}</span>
      </div>
      <div class="thinking">
        ${ORBIT_SVG}
        <div class="shimmer-bar"></div>
      </div>
    </div>`;
  messagesEl.appendChild(block);
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
          Nova
          <span class="model-tag">${escapeHtml(m.name)}</span>
        </div>
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
    <button class="icon-btn" data-action="like" title="Good response" aria-label="Good response"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg></button>
    <button class="icon-btn" data-action="dislike" title="Bad response" aria-label="Bad response"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H6.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg></button>
    <button class="icon-btn" data-action="regenerate" title="Regenerate response" aria-label="Regenerate response"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>`;
  bodyEl.parentElement.appendChild(actions);
}

function finalizeModelReply(chat, bodyEl, fullText, usage, thinkingText = '') {
  const mindBlock = bodyEl.parentElement ? bodyEl.parentElement.querySelector('.mind-row') : null;
  if (thinkingText && thinkingText.trim()) {
    const lines = thinkingText.split('\n').length;
    if (mindBlock) {
      mindBlock.hidden = false;
      mindBlock.querySelector('.mind-count').textContent = `${lines} lines`;
      mindBlock.querySelector('.mind-body').textContent = thinkingText;
    }
  } else if (mindBlock) {
    mindBlock.remove();   // nothing to show — tier didn't emit reasoning
  }
  const msgRecord = { role: 'model', content: fullText, ts: Date.now() };
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
  chatScroll.scrollTop = chatScroll.scrollHeight;
  blip(880);
}

function streamModelReply(chat, fullText) {
  const bodyEl = insertModelBlock(chat);
  const nearBottom = () => chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 140;
  const autoScroll = () => { if (nearBottom()) chatScroll.scrollTop = chatScroll.scrollHeight; };

  if (!settings.streaming) {
    finalizeModelReply(chat, bodyEl, fullText, null);
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
      setTimeout(tick, MODELS[chat.model].speed);
    } else {
      finalizeModelReply(chat, bodyEl, fullText, null);
    }
  };
  setTimeout(tick, 60);
}

/* LFM3-VL-2B chat over SSE. Throws (before any token, or on empty output) so
   the caller can fall back to the offline reply engine; if some tokens already
   streamed, the partial reply is finalized instead of re-asking. */
async function sendNeuralChat(chat, text) {
  const nearBottom = () => chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 140;
  const autoScroll = () => { if (nearBottom()) chatScroll.scrollTop = chatScroll.scrollHeight; };

  const messages = chat.messages.slice(-40).map(m => {
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

  const controller = new AbortController();
  activeAbort = controller;
  stopBtn.hidden = false;
  const historyTokens = estimateHistoryTokens(chat);   // meter shows history + in-flight draft, not just the new reply
  let signal = controller.signal;
  try {
    if (typeof AbortSignal.any === 'function') {
      signal = AbortSignal.any([controller.signal, AbortSignal.timeout(240000)]);
    } else {
      setTimeout(() => controller.abort(), 240000);
    }
  } catch (_) { signal = controller.signal; }

  let res;
  try {
    res = await fetch(API_BASE + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, preset: modelKey, thinking: engineReasoning, selected_file: window.team846.selected(), tutor_language: document.getElementById('tutorLanguage').value }),
      signal,
    });
  } catch (err) {
    const root = bodyEl && bodyEl.closest ? bodyEl.closest('.message') : null;
    if (root) root.remove(); else if (bodyEl) bodyEl.remove();
    activeAbort = null;
    stopBtn.hidden = true;
    isStreaming = false;
    if (isAbortError(err)) { toast('Stopped'); return; }
    throw err;
  }
  if (!res.ok || !res.body) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch (_) { /* ignore */ }
    const root = bodyEl.closest ? bodyEl.closest('.message') : null;
    if (root) root.remove(); else bodyEl.remove();
    throw new Error(`chat HTTP ${res.status} ${detail}`);
  }
  const bodyEl = insertModelBlock(chat);
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
          chatContext.used = promptTokens + historyTokens;
          updateContextMeter(null, false);
        } else if (evt.type === 'source') {
          window.team846.openFromAI(evt.source);
        } else if (evt.type === 'note') {
          toast(evt.text || 'Note');
        } else if (evt.type === 'thinking') {
          thinkingAcc += evt.text;
          const block = mindBlock();
          if (block) {
            block.hidden = false;
            const body = block.querySelector('.mind-body');
            body.textContent += evt.text;
            block.querySelector('.mind-count').textContent = `${thinkingAcc.split('\n').length} lines`;
          }
        } else if (evt.type === 'token') {
          if (traceEl && traceEl.open && !acc) {
            traceEl.open = false;
            if (thinkingSummaryEl) thinkingSummaryEl.textContent = 'Thought process';
          }
          acc += evt.text;
          bodyEl.innerHTML = md(acc);
          chatContext.used = historyTokens + promptTokens + Math.ceil(acc.length / 4);
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

/* ───────────── REPLY GENERATOR ───────────── */
function generateReply(prompt, model, seedVariant) {
  const p = prompt.toLowerCase();
  const deep = model === 'ultra';
  const short = model === 'spark';
  const v = seedVariant ? 1 : 0;

  const deepDive = "\n\n## Going one level deeper\n\nThe subtle part is trade-offs : a good answer here is rarely the maximal answer, it's the one that fits your constraints (time, budget, energy, risk). Define the constraint first, then optimize. If you share yours, I can sharpen this further.";
  const shortTail = "\n\nWant me to expand any part of this?";
  const tail = deep ? deepDive : shortTail;

  if (settings.simple) {
    const topicSimple = deriveTitle(prompt).replace(/…$/, '');
    return `Here is a simple answer about **${topicSimple}**.\n\n1. First, know your goal. What do you want?\n2. Look for three good sources of information.\n3. Make a small plan. Do one step at a time.\n4. Check your work. Ask someone who knows this topic.\n5. If you are stuck, ask me again. Give me more details.\n\nI can also explain this in another language. Open the translator from the sidebar.`;
  }

  // — translate request inside chat
  if (/translat|how do you say|how to say/.test(p)) {
    return `You can ask me to translate anything right here — or use the built-in **Translator** (in the sidebar) for instant, offline translations.\n\n## How the translator works\n\n- Type a phrase like *"Where is the library?"*\n- Pick English → your language in the drop-downs\n- Tap the speaker button to hear it out loud\n\n## Try these in the translator\n\n- Where is the dining hall?\n- What time is the exam?\n- I don’t understand\n- Can you repeat that?\n- I feel sick\n\nThe translator also keeps a **history** of your recent translations, and works without internet — perfect for class, the dorm, or the doctor’s office.${tail}`;
  }

  if (/study guide|study plan|revise|revision/.test(p)) {
    return `Great — here's an effective, reusable study-guide framework :\n\n## 1. Start from the exam, not the book\n\n- Collect past papers or the syllabus and list every recurring topic.\n- Weight your time by **frequency × weakness** — not by what feels urgent.\n\n## 2. Build the guide in passes\n\n- **Pass 1 — Skeleton** : headings only, one line each. 20 minutes.\n- **Pass 2 — Fill** : definitions, formulas, one worked example per heading.\n- **Pass 3 — Compress** : rewrite each section in 2–3 lines from memory.\n\n## 3. Practice actively\n\n- Retrieval practice beats re-reading 3:1. Close the guide, write what you remember.\n- Spaced repetition : review after 1 day, 3 days, 7 days, 21 days.\n- Interleave topics — mixing problem types feels harder and works better.\n\n## 4. Exam-week protocol\n\n- Day -3 : full timed mock under real conditions.\n- Day -2 : review mistakes only, not the whole syllabus.\n- Day -1 : light review + sleep. No new material.\n${tail}`;
  }

  if (/dinner|recipe|cook|meal/.test(p)) {
    return `Here are four healthy dinners, all under 30 minutes :\n\n## 1. Miso-glazed salmon bowl\n- Salmon + broccoli, 12 min under the broiler\n- Brown rice, sesame, quick-pickled cucumber\n\n## 2. Sheet-pan chicken, peppers & chickpeas\n- One pan, 220°C, 20 minutes — paprika, garlic, olive oil, lemon\n\n## 3. 15-minute ginger tofu stir-fry\n- Firm tofu, snap peas, carrots, ginger-soy glaze over soba noodles\n\n## 4. Big-batch lentil bolognese\n- Red lentils + crushed tomato + oregano; serve over zoodles or pasta\n\n## A simple formula to improvise your own\n**Protein + 2 vegetables + smart carb + bright finish** (lemon, herbs, yogurt, chili crisp).\n\nWant a shopping list for any of them, or a 5-day meal plan built around these?${deep ? deepDive : ''}`;
  }

  if (/master|subject|strongest|closest/.test(p)) {
    return `Based on the pattern this question implies, here's how to find your closest-to-mastered subject :\n\n## The three signals of real mastery\n\n1. **Easy recall** — you can explain it without notes, in plain words.\n2. **Transfer** — you can spot the concept inside an unfamiliar problem.\n3. **Teaching** — someone else gets it after five minutes with you.\n\n## A quick self-test (10 minutes)\n\n- For each candidate subject, write down the **five core ideas** from memory.\n- Then explain each to an imaginary 12-year-old. No jargon allowed.\n- Score yourself honestly : fuzzy recall = not yet mastered.\n\n## My honest guess\n\nFor most people who ask this, the answer is whichever subject they've explained out loud recently. Teaching is the strongest mastery signal there is.\n\nPaste your recent study topics and I'll give you a sharper read.${tail}`;
  }

  if (/french|translat|traduction|français/.test(p)) {
    return `Happy to help with French. Here's the essentials for the past tense you're likely after :\n\n## Passé composé (the everyday past)\n\n**Formation :** avoir/être (présent) + participe passé\n\n- J'ai mangé. — *I ate / I have eaten.*\n- Nous sommes allés. — *We went.* (aller uses être)\n- Elle est arrivée. — *She arrived.* (agreement with être)\n\n## When to use être vs avoir\n\nEtre verbs = motion or state change (*aller, venir, arriver, partir, naître, mourir, rester*) **plus** all reflexive verbs. Everything else takes avoir.\n\n## Agreement rules\n\n- With être : the participle agrees with the **subject** (elle est allée).\n- With avoir : agreement only if the COD comes **before** the verb (Les pommes que j'ai mangées…).\n\nWant me to correct a specific text? Paste it and I'll mark every change with the reason.${tail}`;
  }

  if (/arc length|asteroid|orbite|orbital|orbit/.test(p)) {
    return `For an orbit segment, treat the path as a curve in polar coordinates and integrate :\n\n**s = ∫θ₁→θ₂ √(r² + (dr/dθ)²) dθ**\n\n## Worked outline\n\n1. Start from the ellipse : **r(θ) = a(1 − e²) / (1 + e·cos θ)**\n2. Differentiate : dr/dθ = −a(1 − e²)·e·sin θ / (1 + e cos θ)²\n3. Plug into the arc-length integral and evaluate between your two true anomalies.\n4. For small e, a series expansion (s ≈ a·Δθ·(1 + e·cos θ̄)) is very accurate and avoids elliptic integrals.\n\n## Sanity checks\n\n- Circle (e = 0) : s = r·Δθ ✓\n- Full revolution : integral returns the perimeter — compare with Ramanujan's approximation for ellipses.\n\nGive me a, e and your angular range and I'll compute the number end-to-end.${tail}`;
  }

  if (/code|function|python|javascript|typescript|bug|error|debug/.test(p)) {
    return `Let's get concrete. Here's a pattern for the thing you're describing :\n\n\`\`\`js\n// debounce: run 'fn' only after 'wait' ms of silence\nfunction debounce(fn, wait = 300) {\n  let timer;\n  return function (...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), wait);\n  };\n}\n\n// usage\nconst onType = debounce((e) => console.log(e.target.value), 250);\ninput.addEventListener('input', onType);\n\`\`\`\n\n## Why this works\n\n- Every keystroke **resets the timer**, so the function only fires once the user pauses.\n- The closure keeps \`timer\` private per debounced instance.\n- \`fn.apply(this, args)\` preserves both context and arguments.\n\n## Common traps\n\n- Forgetting to clear the pending timeout on unmount → memory leaks.\n- Debouncing the *wrong* layer : debounce the side effect, not the state update.\n\nShow me your actual function and I'll debug it line by line.${tail}`;
  }

  if (/cover letter|resume|cv|intern|career|job/.test(p)) {
    return `Here's a sharp, adaptable cover-letter skeleton :\n\n> **Dear [Team],**\n> I'm [one line on who you are]. [One specific achievement with a number.] I'm applying because [one honest reason tied to them, not you].\n> I work best with [your working style]. Last [project/role], I [concrete result]. I'd bring the same bar to [team/problem].\n> I'd love to contribute and learn from you.\n\n## The three rules\n\n1. **One page, always.**\n2. **Numbers beat adjectives** — "shipped to 200 users" beats "passionate developer".\n3. **Mirror their language** — read the job post and their eng blog; reuse their actual phrasing.\n\n## What to cut without mercy\n\n- "I am a hard worker." — everyone says it.\n- Your whole life story. They need signal, not autobiography.\n- Generic praise. Flattery with no specifics reads as filler.\n\nPaste the job description and your background, and I'll write the full letter.${tail}`;
  }

  if (/^(hi|hello|hey|yo)\b/.test(p)) {
    return `Hey! Great to see you. I'm **Nova** — here's what I can do well :\n\n- **Explain anything**, from quantum mechanics to why bread rises, at the depth you ask for\n- **Draft & edit** — emails, essays, cover letters, scripts\n- **Code** — explain, write, debug, and review in most languages\n- **Plan** — study guides, itineraries, routines, project breakdowns\n- **Translate** — open the Translator in the sidebar for instant campus phrases in your language\n\nWhat's on your mind today?${short ? '' : '\n\nTip : the more context you give me, the sharper my answer gets.'}`;
  }

  const topic = deriveTitle(prompt).replace(/…$/, '');
  const variants = [
    `Good question. Here's how I'd think about **${topic}** :\n\n## The short answer\n\nIt depends on your goal — but the winning move is almost always to get concrete fast : define what "done" looks like, pick the smallest next step, and learn from that.\n\n## A practical path\n\n1. **Clarify** — write down what success looks like in one sentence.\n2. **Gather** — collect the 3–5 facts or resources that actually matter.\n3. **Narrow** — eliminate options with a quick filter, not a long analysis.\n4. **Act** — do the smallest version of the thing. Ship, test, adjust.\n5. **Reflect** — after each step, ask what you learned and what changes.\n\n## The trap to avoid\n\nOptimizing before you have feedback. Early reps beat perfect plans.\n\nGive me more specifics — context, constraints, what you've already tried — and I'll turn this into a tailored answer.${tail}`,
    `Let's dig into **${topic}**.\n\n## First principles\n\nMost questions like this come down to three levers : **information** (what do you know), **constraints** (time, budget, risk), and **feedback** (how fast can you test). When any one is missing, guessing fills the gap — so let's supply them.\n\n## A workable approach\n\n- **Information** : list what you know vs. what you're assuming. Assumptions are fine — just label them.\n- **Constraints** : pick your hard limits early; they make decisions easy.\n- **Feedback** : design the cheapest possible experiment or draft. A rough answer you can react to beats a perfect one in your head.\n\n## What good looks like\n\nYou'll know you're making progress when the question starts changing — from *"what should I do?"* to *"does this specific option work?"*\n\nTell me what you've tried and I'll adapt this to your exact situation.${tail}`,
  ];
  return variants[v] || variants[0];
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

function renderModelMenu() {
  const tier = modelKey;
  const ctx = engineCtx(tier);
  const chip = ([key, m]) => `
    <button type="button" class="mm-chip${key === modelKey ? ' selected' : ''}" data-model="${key}" role="menuitemradio" aria-checked="${key === modelKey}" aria-label="Switch to ${escapeHtml(m.full)}">
      ${ORBIT_MINI}
      <span class="mm-chip-name">${escapeHtml(m.name)}${m.badge ? `<span class="mo-badge">${escapeHtml(m.badge)}</span>` : ''}</span>
    </button>`;
  const contextBlock = tier !== 'spark'
    ? `<div class="mm-ctx" data-ctx-tier="${tier}" role="group" aria-label="Context window size">
         ${CTX_STEPS.map(size => `<button type="button" data-ctx="${size}" data-tier="${tier}" class="${size === ctx ? 'active' : ''}"><b>${ctxLabel(size)}</b><small>~${kvEstimateMB(tier, size)} MB</small></button>`).join('')}
       </div>
       <small class="mm-vram">${escapeHtml(TIER_STATE[tier].vramHint)}</small>`
    : `<div class="mm-note" style="text-align:left;padding:2px 0">128K fixed · GDN KV ~10 MB · no context options for Spark</div>`;
  modelMenu.innerHTML = `
    <div class="mm-strip" role="radiogroup" aria-label="Model selection">${modelsForMenu().map(chip).join('')}</div>
    <div class="mm-body">
      <div class="mm-col">
        <div class="mm-label">Reasoning<span class="mm-hint">hidden thinking step · slower, often smarter</span></div>
        <div class="mm-seg mm-seg-tier" role="group" aria-label="Reasoning on or off">
          <button type="button" data-reason="off" class="${engineReasoning ? '' : 'active'}">Off</button>
          <button type="button" data-reason="on" class="${engineReasoning ? 'active' : ''}">On</button>
        </div>
        <button type="button" class="mm-unload" data-unload="${tier}" style="margin-top:10px">Free memory (unload)</button>
      </div>
      <div class="mm-col mm-col-right">
        <div class="mm-label">Context window<span class="mm-hint">applies to ${escapeHtml(MODELS[tier].name)}</span></div>
        ${contextBlock}
      </div>
    </div>
    <div class="mm-note">Images work in every tier · KV q8_0 · flash attention</div>`;
}

function selectModel(key) {
  if (!MODELS[key]) return;
  const previous = modelKey;
  modelKey = key;
  localStorage.setItem(LS.model, key);
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
  if (previous !== key) autoUnloadUnselected(key);
  toast(`Switched to ${MODELS[key].full}`);
}

function toggleModelMenu(force) {
  const willOpen = force !== undefined ? force : modelMenu.hidden;
  attachMenu.hidden = true;
  modelMenu.hidden = !willOpen;
  if (!willOpen) { /* nothing to clean up — panels are flat */ }
  modelBtn.setAttribute('aria-expanded', String(willOpen));
}

/* ───────────── ENGINE SETTINGS (inside the chat model picker) ───────────── */
const brandHome    = $('#brandHome');
const brandTag     = $('#brandTag');

const CTX_STEPS = [4096, 8192, 16384, 32768, 65536];

function kvEstimateMB(tier, ctx) {
  const kb = TIER_STATE[tier].kvKB;   // KB per token at q8_0 KV
  return Math.round((kb * ctx) / 1024);
}
function ctxLabel(ctx) {
  return ctx >= 1024 ? `${Math.round(ctx / 1024)}K` : `${ctx}`;
}
function engineCtx(tier) { return engineContext[tier] || TIER_STATE[tier].ctx; }

brandHome.addEventListener('click', startNewChat);

async function restartTier(newCtx, tier = modelKey) {
  $$(`[data-ctx-tier="${tier}"] button`).forEach(b => { b.disabled = true; });
  toast(`Restarting ${MODELS[tier].name} with ${ctxLabel(newCtx)} context…`);
  try {
    const res = await fetch(API_BASE + '/api/engines/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, ctx: newCtx }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // poll health until the engine reports ready again
    const deadline = Date.now() + 90000;
    let ready = false;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const h = await (await fetch(API_BASE + '/api/health')).json();
        if (h?.engines?.[tier]?.status === 'ready') { ready = true; break; }
      } catch (_) { /* keep polling */ }
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
    if (!modelMenu.hidden) renderModelMenu();
  }
}


/* ───────────── TRANSLATOR UI ───────────── */
const QUICK_PHRASES = [
  'Where is the library?',
  'Where is the dining hall?',
  'Where is the bathroom?',
  'I don’t understand',
  'Can you repeat that?',
  'Speak slowly please',
  'What time is the exam?',
  'I feel sick',
  'I need help',
  'How much does it cost?',
  'I lost my student ID',
  'Help!',
];

/* PLaMo-3 engine: served by backend/translator_server.py on :8787.
   Falls back to the built-in offline phrasebook automatically. */
const ENGINE_PREF_KEY = 'nova.engine';   // 'auto' | 'neural' | 'offline'
const API_BASE = location.port === '8787' ? '' : 'http://127.0.0.1:8787';
let enginePref = localStorage.getItem(ENGINE_PREF_KEY) || 'auto';
let neuralStatus = 'checking';            // checking | ready | unavailable
let neuralDetail = null;
let translateSeq = 0;
let neuralInFlight = false;
let neuralQueued = false;

function renderEnginePill() {
  const pill = $('#enginePill');
  const txt = $('#enginePillText');
  if (!pill) return;
  pill.dataset.state = neuralStatus;
  const quant = neuralDetail && neuralDetail.quantization ? ` · ${neuralDetail.quantization}` : '';
  txt.textContent = neuralStatus === 'ready'
    ? `PLaMo-3${quant}`
    : neuralStatus === 'checking'
      ? 'Checking PLaMo…'
      : 'PLaMo unreachable';
}

function renderEngineSeg() {
  $$('#engineSeg button').forEach(btn => btn.classList.toggle('active', btn.dataset.engine === enginePref));
}

async function checkNeuralHealth() {
  neuralStatus = 'checking';
  renderEnginePill();
  try {
    const res = await fetch(API_BASE + '/api/health', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    neuralDetail = data;
    neuralStatus = data && data.ok ? 'ready' : 'unavailable';
  } catch (_) {
    neuralDetail = null;
    neuralStatus = 'unavailable';
  }
  renderEnginePill();
  return neuralStatus;
}

async function neuralTranslate(text, from, to, form) {
  const body = { text, source_lang: from, target_lang: to };
  if (form && to === 'ja') body.form = form;
  const res = await fetch(API_BASE + '/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch (_) { /* ignore */ }
    throw new Error(`PLaMo HTTP ${res.status}${detail ? ' — ' + detail : ''}`);
  }
  return res.json();   // { translation, engine, seconds }
}

function populateLangSelects() {
  const opts = TRANSLATE_LANG_GROUPS
    .map(g => `<optgroup label="${escapeHtml(g.label)}">${g.langs.map(([code, name]) => `<option value="${code}">${escapeHtml(name)}</option>`).join('')}</optgroup>`)
    .join('');
  fromLangSel.innerHTML = opts;
  toLangSel.innerHTML = opts;
  fromLangSel.value = 'en';
  toLangSel.value = 'es';
}

let lastTranslation = null;
let translateDebounce = null;
let historyDebounce = null;

function renderTarget(result, neuralInfo) {
  if (result.kind === 'empty' || result.kind === 'same') {
    targetText.textContent = result.out || '';
    if (!result.out) targetText.innerHTML = `<span class="tr-placeholder">${escapeHtml(t('targetPh'))}</span>`;
    matchInfo.textContent = '';
    lastTranslation = result.out || null;
    return;
  }
  if (result.out === null) {
    targetText.innerHTML = `<span class="tr-placeholder">${escapeHtml(t('noTranslation'))}</span>`;
    matchInfo.textContent = '';
    lastTranslation = null;
    return;
  }
  targetText.textContent = result.out;
  matchInfo.textContent = neuralInfo
    ? `PLaMo-3-translate · Q4_K_M · ${neuralInfo.seconds ?? '?'}s`
    : (result.kind === 'phrase' ? t('phrasebookMatch') : `${t('wordMatch')} · ${result.hits}/${result.total}`);
  lastTranslation = result.out;
}

function doTranslate(logHistory) {
  const seq = ++translateSeq;
  const from = fromLangSel.value, to = toLangSel.value;
  const src = sourceText.value;
  charCount.textContent = `${src.length} / 500`;

  const wantNeural = from !== to && src.trim().length > 0 &&
    (enginePref === 'neural' || (enginePref === 'auto' && neuralStatus !== 'unavailable'));

  if (wantNeural) {
    if (neuralInFlight) { neuralQueued = true; return; }
    neuralInFlight = true;
    targetText.innerHTML = `<span class="tr-placeholder">Translating with PLaMo…</span>`;
    matchInfo.textContent = '';
    const form = toLangSel.value === 'ja' ? (jaFormSel.value === 'plain' ? 'plain' : 'polite') : undefined;
    neuralTranslate(src.trim(), from, to, form)
      .then(data => {
        if (seq !== translateSeq) return;      // stale response
        const out = (data.translation || '').trim();
        renderTarget({ out, kind: 'neural' }, data);
        if (logHistory && out) {
          clearTimeout(historyDebounce);
          historyDebounce = setTimeout(() => addTranslationToHistory(src.trim(), out, from, to, 'neural'), 1200);
        }
      })
      .catch(err => {
        console.warn('PLaMo failed, falling back to offline:', err);
        if (seq !== translateSeq) return;
        if (enginePref !== 'neural') {
          neuralStatus = 'unavailable';
          renderEnginePill();
        } else {
          toast('PLaMo unreachable — showing offline approximation');
        }
        const offline = translateText(src, from, to);
        renderTarget(offline, null);
        clearTimeout(historyDebounce);
        if (offline.out) historyDebounce = setTimeout(() => addTranslationToHistory(src.trim(), offline.out, from, to, 'offline'), 1200);
      })
      .finally(() => {
        neuralInFlight = false;
        if (neuralQueued) { neuralQueued = false; doTranslate(false); }
      });
    return;
  }

  const result = translateText(src, from, to);
  renderTarget(result, null);

  clearTimeout(historyDebounce);
  if (logHistory && result.out) {
    historyDebounce = setTimeout(() => addTranslationToHistory(src.trim(), result.out, from, to, 'offline'), 1200);
  }
}

function translateNow() { doTranslate(true); }

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

function renderPhraseChips() {
  phraseChips.innerHTML = QUICK_PHRASES.map(p => `
    <button class="phrase-chip" data-phrase="${escapeHtml(p)}">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      ${escapeHtml(p)}
    </button>`).join('');
}

function loadTranslationHistory() {
  try { const raw = localStorage.getItem(LS.translations); return raw ? JSON.parse(raw) : []; }
  catch (_) { return []; }
}
function saveTranslationHistory(list) {
  try { localStorage.setItem(LS.translations, JSON.stringify(list.slice(0, 50))); } catch (_) { /* quota */ }
}

function addTranslationToHistory(src, tgt, from, to, engine) {
  const list = loadTranslationHistory();
  const last = list[0];
  if (last && last.src === src && last.tgt === tgt && last.from === from && last.to === to) return;
  list.unshift({ id: uid(), src, tgt, from, to, engine: engine || 'offline', ts: Date.now() });
  saveTranslationHistory(list);
  renderHistory();
}

function renderHistory() {
  const list = loadTranslationHistory();
  historyList.innerHTML = '';
  historyEmpty.hidden = list.length !== 0;
  for (const item of list) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.dataset.id = item.id;
    div.innerHTML = `
      <span class="hi-src" title="${escapeHtml(item.src)}">${escapeHtml(item.src)}</span>
      <span class="hi-arrow">${fromToArrow(item)}</span>
      <span class="hi-tgt" title="${escapeHtml(item.tgt)}">${escapeHtml(item.tgt)}</span>
      <span class="hi-time">${timeAgo(item.ts)}${item.engine === 'neural' ? '<br><span class="hi-engine">PLaMo</span>' : ''}</span>`;
    historyList.appendChild(div);
  }
}
const fromToArrow = (item) => `${(TRANSLATE_LANGS[item.from] || item.from).slice(0, 2).toUpperCase()} → ${(TRANSLATE_LANGS[item.to] || item.to).slice(0, 2).toUpperCase()}`;

function restoreHistoryItem(id) {
  const item = loadTranslationHistory().find(x => x.id === id);
  if (!item) return;
  fromLangSel.value = item.from;
  toLangSel.value = item.to;
  sourceText.value = item.src;
  doTranslate(false);
}

/* ───────────── MODALS ───────────── */
function openModal(html) {
  modalContent.innerHTML = html;
  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modalOverlay.hidden = true;
  modalContent.innerHTML = '';
  document.body.style.overflow = '';
}

const SVG_CHECK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 10"/></svg>';
const ORBIT_BIG = '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><circle cx="16" cy="16" r="6.6" fill="url(#emberGrad)"/><ellipse cx="16" cy="16" rx="13" ry="5.3" transform="rotate(-24 16 16)" fill="none" stroke="#ffd166" stroke-width="2" opacity="0.9"/><circle cx="26.6" cy="9.4" r="1.5" fill="#ffd166"/></svg>';

function openUpgradeModal() {
  openModal(`
    <div class="modal-hero">${ORBIT_BIG}</div>
    <h3 class="modal-title" id="modalTitle">Nova Advanced</h3>
    <p class="modal-sub">Unlock the full Nova experience — deeper reasoning, more context, zero limits.</p>
    <ul class="feature-list">
      <li>${SVG_CHECK}<span><strong>Nova Ultra</strong> — our most capable reasoning model, always on</span></li>
      <li>${SVG_CHECK}<span><strong>2× longer context</strong> — upload whole codebases or books</span></li>
      <li>${SVG_CHECK}<span><strong>Priority access</strong> — skip the queue at peak hours</span></li>
      <li>${SVG_CHECK}<span><strong>Early features</strong> — research previews before everyone else</span></li>
      <li>${SVG_CHECK}<span><strong>Nova in your pocket</strong> — sync across every device</span></li>
    </ul>
    <div class="price-row"><span class="price">$19.99</span><span class="price-per">/ month</span></div>
    <button class="cta-btn" id="confirmUpgrade">
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="5.4" fill="currentColor"/><ellipse cx="12" cy="12" rx="10.4" ry="4" transform="rotate(-24 12 12)" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>
      Upgrade now
    </button>
    <p class="cancel-note">Cancel anytime · No hidden fees</p>`);
  $('#confirmUpgrade').addEventListener('click', () => {
    closeModal();
    toast('This is a demo — but great taste in plans!');
  });
}

function openGetAppModal() {
  openModal(`
    <h3 class="modal-title" id="modalTitle">Get the Nova app</h3>
    <p class="modal-sub">Scan the code with your phone's camera<br>to take Nova everywhere.</p>
    <div class="qr-wrap"><canvas id="qrCanvas" width="189" height="189" aria-label="QR code linking to the Nova app"></canvas></div>
    <div class="store-row">
      <button class="store-btn" data-store="App Store">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M16.7 12.9c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-2-.9-3.3-.9-1.7 0-3.2 1-4.1 2.5-1.7 3-.4 7.5 1.3 10 .8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3-2.4.7-1 1.2-2.6 1.3-3.9-1-.5-2.1-1.5-2.4-3zM14.4 5.6c.7-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.8-1.4z"/></svg>
        <span><small>Download on the</small><b>App Store</b></span>
      </button>
      <button class="store-btn" data-store="Google Play">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d="M4 3.5v17c0 .4.4.6.7.4l9.4-8.5c.3-.3.3-.8 0-1L4.7 3.1c-.3-.2-.7 0-.7.4zm13.2 6.4l2.6 1.5c.9.5.9 1.7 0 2.2l-2.6 1.5-2.2-2.6 2.2-2.6zM6.3 2.6l8.7 8-2.3 2.3-8.5-8.2c.8-.8 1.4-1.4 2.1-2.1zm8.7 10.8l2.3 2.1-8.7 8c-.8-.7-1.5-1.4-2.3-2.2l8.7-7.9z" opacity=".92"/></svg>
        <span><small>Get it on</small><b>Google Play</b></span>
      </button>
    </div>`);
  drawQR($('#qrCanvas'));
  $$('.store-btn', modalContent).forEach(btn =>
    btn.addEventListener('click', () => toast(`The ${btn.dataset.store} build is coming soon in this demo`)));
}

function drawQR(canvas) {
  const ctx = canvas.getContext('2d');
  const n = 25, cell = 7, quiet = 1;
  const size = (n + quiet * 2) * cell;
  canvas.width = canvas.height = size;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#101318';

  let seed = 20261113;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const finder = (cx, cy) => {
    ctx.fillStyle = '#101318';
    ctx.fillRect((cx + quiet) * cell, (cy + quiet) * cell, 7 * cell, 7 * cell);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((cx + 1 + quiet) * cell, (cy + 1 + quiet) * cell, 5 * cell, 5 * cell);
    ctx.fillStyle = '#101318';
    ctx.fillRect((cx + 2 + quiet) * cell, (cy + 2 + quiet) * cell, 3 * cell, 3 * cell);
  };
  const inFinder = (r, c) =>
    (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (inFinder(r, c)) continue;
      if (rand() < 0.42) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
    }
  }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
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
  const langRow = `
    <div class="setting-row">
      <div class="setting-text">
        <div class="setting-name">${t('langName')}</div>
        <div class="setting-desc">${t('langDesc')}</div>
      </div>
      <label class="i18n-select-wrap">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"/></svg>
        <select id="setLang" aria-label="${escapeHtml(t('langName'))}">
          ${Object.entries(UI_LANGS).map(([code, name]) => `<option value="${code}"${code === uiLang ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('')}
        </select>
      </label>
    </div>`;
  openModal(`
    <h3 class="modal-title" id="modalTitle" style="text-align:left">${escapeHtml(t('settingsTitle'))}</h3>
    <p class="modal-sub" style="text-align:left">${escapeHtml(t('settingsSub'))}</p>
    <div class="settings-rows">
      ${langRow}
      ${row('setSimple', t('simpleName'), t('simpleDesc'), settings.simple)}
      ${row('setGlow', t('glowName'), t('glowDesc'), settings.glow)}
      ${row('setStreaming', t('streamName'), t('streamDesc'), settings.streaming)}
      ${row('setSound', t('soundName'), t('soundDesc'), settings.sound)}
    </div>
    <p class="settings-foot">Nova v2.4.1 · web preview · Username</p>`);

  $('#setLang').addEventListener('change', (e) => {
    applyI18n(e.target.value);
    toast(t('settingsSub'));
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
$('#translateBtn').addEventListener('click', () => setView('translate'));
$('#openTranslatorLink').addEventListener('click', () => setView('translate'));
$('#emptyNewChatBtn').addEventListener('click', startNewChat);
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
  if (currentView === 'chat') {
    updateContextMeter(chatContext.used + Math.ceil(promptInput.value.length / 4), false);
  } else if (currentView === 'home') {
    updateContextMeter(Math.ceil(promptInput.value.length / 4), false);
  }
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
  else toast('Drive import is disabled in this demo');
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
  const reasonBtn = e.target.closest('[data-reason]');
  if (reasonBtn) { e.stopPropagation(); setReasoning(reasonBtn.dataset.reason === 'on'); return; }
  const ctxBtn = e.target.closest('[data-ctx]');
  if (ctxBtn && !ctxBtn.disabled) { e.stopPropagation(); restartTier(Number(ctxBtn.dataset.ctx), ctxBtn.dataset.tier); return; }
  const opt = e.target.closest('[data-model]');
  if (opt) selectModel(opt.dataset.model);
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
      toast(data.stopped === false ? `${model} was not running` : `${model} unloaded — memory freed; reloads on next message`);
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

// translator wiring
sourceText.addEventListener('input', () => {
  clearTimeout(translateDebounce);
  translateDebounce = setTimeout(translateNow, 260);
});
fromLangSel.addEventListener('change', translateNow);
toLangSel.addEventListener('change', () => { updateJaFormVisibility(); translateNow(); });
jaFormSel.addEventListener('change', () => {
  localStorage.setItem('nova.jaForm', jaFormSel.value);
  translateNow();
});
function updateJaFormVisibility() {
  jaFormWrap.hidden = toLangSel.value !== 'ja';
}
$('#swapBtn').addEventListener('click', () => {
  const a = fromLangSel.value;
  fromLangSel.value = toLangSel.value;
  toLangSel.value = a;
  updateJaFormVisibility();
  sourceText.value = lastTranslation || '';
  doTranslate(false);
});
$('#speakSource').addEventListener('click', () => speak(sourceText.value, fromLangSel.value));
$('#speakTarget').addEventListener('click', () => speak(lastTranslation || '', toLangSel.value));
$('#copySource').addEventListener('click', () => {
  if (!sourceText.value.trim()) return;
  navigator.clipboard.writeText(sourceText.value).then(() => toast('Copied'));
});
$('#copyTarget').addEventListener('click', () => {
  if (!lastTranslation) return toast('Nothing to copy yet');
  navigator.clipboard.writeText(lastTranslation).then(() => toast('Copied'));
});
$('#clearSource').addEventListener('click', () => {
  sourceText.value = '';
  doTranslate(false);
  sourceText.focus();
});
phraseChips.addEventListener('click', (e) => {
  const chip = e.target.closest('.phrase-chip');
  if (!chip) return;
  if (fromLangSel.value !== 'en') {
    // quick phrases are authored in English; flip source to English automatically
    const other = toLangSel.value === 'en' ? 'es' : toLangSel.value;
    toLangSel.value = other === 'en' ? 'es' : other;
    fromLangSel.value = 'en';
  }
  sourceText.value = chip.dataset.phrase;
  translateNow();
});
$('#clearHistoryBtn').addEventListener('click', () => {
  saveTranslationHistory([]);
  renderHistory();
  toast('Translation history cleared');
});
historyList.addEventListener('click', (e) => {
  const item = e.target.closest('.history-item');
  if (item) restoreHistoryItem(item.dataset.id);
});
historyList.addEventListener('keydown', (e) => {
  const item = e.target.closest('.history-item');
  if (item && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); restoreHistoryItem(item.dataset.id); }
});

// engine selection (Auto / PLaMo / Offline) + health re-check on pill click
$('#engineSeg').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-engine]');
  if (!btn) return;
  enginePref = btn.dataset.engine;
  localStorage.setItem(ENGINE_PREF_KEY, enginePref);
  renderEngineSeg();
  if (enginePref === 'neural' && neuralStatus !== 'ready') {
    toast('PLaMo server not reachable on :8787 — start backend/translator_server.py');
  }
  doTranslate(false);
});
$('#enginePill').addEventListener('click', async () => {
  const status = await checkNeuralHealth();
  toast(status === 'ready'
    ? `PLaMo ready${neuralDetail?.quantization ? ' (' + neuralDetail.quantization + ')' : ''} — GPU: ${neuralDetail?.device || '?'}`
    : 'PLaMo unreachable — start backend/translator_server.py (or use Offline mode)');
  doTranslate(false);
});

// top bar
$('#getAppBtn').addEventListener('click', openGetAppModal);
$('#upgradeBtn').addEventListener('click', openUpgradeModal);

// close popovers on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.model-picker')) { modelMenu.hidden = true; modelBtn.setAttribute('aria-expanded', 'false'); }
  if (!e.target.closest('.attach-menu') && !e.target.closest('.plus-btn')) attachMenu.hidden = true;
});

// modal close paths
$('#modalClose').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!modalOverlay.hidden) closeModal();
    modelMenu.hidden = true;
    attachMenu.hidden = true;
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
  const block = btn.closest('.model-block');
  const body = block ? block.querySelector('.model-body') : null;
  const text = body ? body.innerText : '';

  if (action === 'copy') {
    navigator.clipboard.writeText(text).then(
      () => toast('Copied to clipboard'),
      () => toast('Could not access clipboard')
    );
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
      toast('LLM unreachable — using offline replies');
      const reply = 'Nova could not reach the AI model. No Team 846 repositories were searched for this answer. Please check the local server and try again.';
      streamModelReply(chat, reply);
    });
  }
});

// ── voice input (Whisper large-v3-turbo via the backend, /api/transcribe) ──
const trMicBtn = $('#trMicBtn');
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
    const blob = new Blob(micChunks, { type: micChunks[0].type || 'audio/webm' });
    const lang = (target === 'translate' && fromLangSel.value && fromLangSel.value !== 'en')
      ? fromLangSel.value
      : 'auto';
    const res = await fetch(`${API_BASE}/api/transcribe?language=${encodeURIComponent(lang)}`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'audio/webm' },
      body: blob,
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = (data.text || '').trim();
    if (!text) { toast('Could not make out any speech'); return; }
    if (target === 'chat') {
      promptInput.value = (promptInput.value + ' ' + text).trim();
      promptInput.dispatchEvent(new Event('input'));
      promptInput.focus();
    } else {
      if (data.language && typeof TRANSLATE_LANGS !== 'undefined' && TRANSLATE_LANGS[data.language] && data.language !== fromLangSel.value) {
        fromLangSel.value = data.language;
        if (toLangSel.value === fromLangSel.value) {
          toLangSel.value = fromLangSel.value === 'en' ? 'ja' : 'en';
        }
      }
      if (typeof updateJaFormVisibility === 'function') updateJaFormVisibility();
      sourceText.value = text;
      sourceText.dispatchEvent(new Event('input'));
    }
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
trMicBtn.addEventListener('click', () => toggleMic('translate', trMicBtn));

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
  // sidebar: open by default on desktop, closed on small screens (user preference wins)
  const storedSidebar = localStorage.getItem(LS.sidebar);
  const sidebarOpen = storedSidebar !== null ? storedSidebar === '1' : window.innerWidth > 900;
  document.body.classList.toggle('sidebar-collapsed', !sidebarOpen);

  if (!settings.glow) document.body.classList.add('no-glow');

  // load or seed chats (repair consecutive duplicate model messages)
  const stored = loadChats();
  const sanitize = (list) => list.map(c => ({
    ...c,
    messages: (c.messages || []).filter((m, i, arr) =>
      i === 0 || !(m.role === 'model' && arr[i - 1].role === 'model' && m.content === arr[i - 1].content)),
  }));
  chats = Array.isArray(stored) && stored.length ? sanitize(stored) : seedChats();
  saveChats();

  // translator setup
  populateLangSelects();
  jaFormSel.value = localStorage.getItem('nova.jaForm') || 'polite';
  updateJaFormVisibility();
  renderPhraseChips();
  renderHistory();
  renderEngineSeg();
  checkNeuralHealth().then(() => { if (currentView === 'translate') doTranslate(false); });

  // model picker state
  modelLabel.textContent = MODELS[modelKey].name;
  brandTag.textContent = modelKey.toUpperCase();
  renderModelMenu();

  // i18n last so it can label every element
  applyI18n(uiLang);

  renderAll();
  setView('home');
  updateInputAffordances();
  checkChatHealth();   // async — flips the chat engine to LFM3-VL when ready
})();

