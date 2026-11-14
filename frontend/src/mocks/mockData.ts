import {
  ChatThread,
  GlossaryTerm,
  IngestionDocument,
  MediaAttachment,
  SupportedLanguage,
} from '../types/models';
import {
  canCadSchematicSvg,
  canStudentPhotoSvg,
  intakeCadSchematicSvg,
  intakeStudentPhotoSvg,
  swerveCadSchematicSvg,
  swerveStudentPhotoSvg,
} from './schematicAssets';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'zh', label: 'Mandarin', nativeName: '中文', flag: '🇨🇳' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'vi', label: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'fr', label: 'French', nativeName: 'Français', flag: '🇫🇷' },
];

export interface UiStringBundle {
  chatTab: string;
  kbTab: string;
  newChat: string;
  bilingualBadge: string;
  inputPlaceholder: string;
  sendLabel: string;
  stepsCompleted: string;
  visualComparisonTitle: string;
  agentThinkingTitle: string;
  sourcesLabel: string;
  glossaryTitle: string;
}

export const UI_TRANSLATIONS: Record<SupportedLanguage, UiStringBundle> = {
  en: {
    chatTab: 'Student Pit Chat',
    kbTab: 'Knowledge Base & Ingestion',
    newChat: 'New Troubleshooting Session',
    bilingualBadge: 'Bilingual Rookie Mode (Tech terms anchored)',
    inputPlaceholder:
      'Ask Team 846 AI about swerve offsets, CAN errors, 2026 rules, or attach a mechanism photo...',
    sendLabel: 'Send',
    stepsCompleted: 'Troubleshooting Checklist',
    visualComparisonTitle: 'LFM3-VL-2B Visual Comparison vs. 846 CAD',
    agentThinkingTitle: 'Agentic Controller Reasoning',
    sourcesLabel: 'Verified Sources & Citations',
    glossaryTitle: 'Team 846 Multilingual Glossary',
  },
  es: {
    chatTab: 'Chat de Pit (Estudiantes)',
    kbTab: 'Base de Conocimiento e Ingesta',
    newChat: 'Nueva Sesión de Diagnóstico',
    bilingualBadge: 'Modo Novato Bilingüe (Términos FRC en inglés)',
    inputPlaceholder:
      'Pregunta al bot del Equipo 846 sobre swerve, errores CAN, reglas 2026 o adjunta una foto...',
    sendLabel: 'Enviar',
    stepsCompleted: 'Lista de Solución Paso a Paso',
    visualComparisonTitle: 'Comparación Visual LFM3-VL-2B vs. CAD 846',
    agentThinkingTitle: 'Razonamiento del Controlador Agéntico',
    sourcesLabel: 'Fuentes y Citas Verificadas',
    glossaryTitle: 'Glosario Multilingüe Equipo 846',
  },
  zh: {
    chatTab: '维修区学生问答',
    kbTab: '知识库与离线文档解析',
    newChat: '新建排障会话',
    bilingualBadge: '双语新手模式（保留英文FRC专业术语）',
    inputPlaceholder:
      '向 846 战队 AI 询问 Swerve 校准、CAN 总线故障、2026 规则，或上传机械结构照片...',
    sendLabel: '发送',
    stepsCompleted: '分步排障清单',
    visualComparisonTitle: 'LFM3-VL-2B 视觉比对 vs. 846 CAD 图纸',
    agentThinkingTitle: '智能体控制器推理过程',
    sourcesLabel: '已验证文档与论坛引用',
    glossaryTitle: '846 战队多语种术语表',
  },
  hi: {
    chatTab: 'स्टूडेंट पिट चैट',
    kbTab: 'नॉलेज बेस और डॉक्यूमेंट अपलोड',
    newChat: 'नया ट्रबलशूटिंग सत्र',
    bilingualBadge: 'द्विभाषी रूकी मोड (FRC शब्द अंग्रेज़ी में सुरक्षित)',
    inputPlaceholder:
      'Team 846 AI से swerve offset, CAN error, 2026 नियमों के बारे में पूछें या फोटो जोड़ें...',
    sendLabel: 'भेजें',
    stepsCompleted: 'स्टेप-बाई-स्टेप रिपेयर चेकलिस्ट',
    visualComparisonTitle: 'LFM3-VL-2B विज़ुअल तुलना बनाम 846 CAD',
    agentThinkingTitle: 'एजेंटिक कंट्रोलर रीजनिंग',
    sourcesLabel: 'सत्यापित स्रोत और संदर्भ',
    glossaryTitle: 'Team 846 बहुभाषी शब्दावली',
  },
  vi: {
    chatTab: 'Chat Hỗ Trợ Pit',
    kbTab: 'Kho Kiến Thức & Nhập Tài Liệu',
    newChat: 'Phiên Gỡ Lỗi Mới',
    bilingualBadge: 'Chế Độ Tân Binh Song Ngữ (Giữ nguyên thuật ngữ FRC)',
    inputPlaceholder:
      'Hỏi Team 846 AI về Swerve, lỗi CAN, luật 2026 hoặc đính kèm ảnh cơ cấu robot...',
    sendLabel: 'Gửi',
    stepsCompleted: 'Danh Sách Sửa Chữa Từng Bước',
    visualComparisonTitle: 'So Sánh Hình Ảnh LFM3-VL-2B vs. CAD 846',
    agentThinkingTitle: 'Luồng Suy Luận Agentic Controller',
    sourcesLabel: 'Nguồn & Trích Dẫn Đã Xác Minh',
    glossaryTitle: 'Từ Điển Đa Ngôn Ngữ Team 846',
  },
  fr: {
    chatTab: 'Chat Pit Étudiant',
    kbTab: 'Base de Connaissances & Ingestion',
    newChat: 'Nouvelle Session Dépannage',
    bilingualBadge: 'Mode Recrue Bilingue (Termes FRC ancrés)',
    inputPlaceholder:
      'Posez une question à Team 846 AI (Swerve, bus CAN, règles 2026) ou joignez une photo...',
    sendLabel: 'Envoyer',
    stepsCompleted: 'Liste de Dépannage Étape par Étape',
    visualComparisonTitle: 'Comparaison Visuelle LFM3-VL-2B vs. CAD 846',
    agentThinkingTitle: 'Raisonnement du Contrôleur Agentique',
    sourcesLabel: 'Sources et Citations Vérifiées',
    glossaryTitle: 'Glossaire Multilingue Team 846',
  },
};

export const SAMPLE_MECHANISM_ATTACHMENTS: MediaAttachment[] = [
  {
    id: 'sample-swerve',
    name: 'IMG_846_MK4I_BEVEL_FAULT.jpg',
    type: 'image',
    previewUrl: swerveStudentPhotoSvg,
    fileSizeLabel: '1.8 MB • Pit Photo',
    presetType: 'swerve_bevel',
  },
  {
    id: 'sample-can',
    name: 'CAN_BELLYPAN_TALON_ORANGE.jpg',
    type: 'image',
    previewUrl: canStudentPhotoSvg,
    fileSizeLabel: '1.4 MB • Bellypan Cam',
    presetType: 'can_wiring',
  },
  {
    id: 'sample-intake',
    name: 'OVER_BUMPER_INTAKE_CRACK.jpg',
    type: 'image',
    previewUrl: intakeStudentPhotoSvg,
    fileSizeLabel: '2.1 MB • Mech Cam',
    presetType: 'intake_roller',
  },
];

export const MULTILINGUAL_QUICK_PROMPTS: {
  id: string;
  lang: SupportedLanguage;
  badge: string;
  text: string;
  presetAttachmentId?: string;
}[] = [
  {
    id: 'qp-1',
    lang: 'en',
    badge: 'EN • Swerve + Photo',
    text: 'Front-left SDS MK4i Swerve is grinding and steering 45° off after a hard defense hit. Check my photo!',
    presetAttachmentId: 'sample-swerve',
  },
  {
    id: 'qp-2',
    lang: 'es',
    badge: 'ES • CAN Bus + Foto',
    text: 'El TalonFX parpadea en naranja/rojo y el CANivore muestra 94% de uso. ¿Se pellizcó un cable CAN?',
    presetAttachmentId: 'sample-can',
  },
  {
    id: 'qp-3',
    lang: 'zh',
    badge: 'ZH • 规则与Intake',
    text: '我们的 Over-Bumper Intake 撞裂了，而且不确定 2026 Bumper Zone 伸出尺寸有没有犯规？',
    presetAttachmentId: 'sample-intake',
  },
  {
    id: 'qp-4',
    lang: 'hi',
    badge: 'HI • WPILib CANCoder',
    text: 'नए Swerve Module में CANCoder Magnet Offset को कैसे रीसेट करें और Loctite कहाँ लगाएं?',
  },
];

export const INITIAL_GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'term-1',
    term: 'SDS MK4i Swerve',
    category: 'Drivetrain',
    subsystem: 'Drivetrain',
    definition:
      'Team 846’s inverted coaxial swerve drive module allowing independent wheel rotation (drive) and azimuth steering (steer) using Kraken X60 / Falcon 500 motors.',
    rookieTip:
      'Always check the 0.5mm thrust shim behind the bevel gear when reassembling after a heavy field collision.',
    aliases: ['MK4i', 'Swerve Pod', 'Inverted Swerve'],
    translations: {
      en: {
        term: 'SDS MK4i Swerve',
        definition: 'Inverted coaxial swerve module with independent drive and steer motors.',
      },
      es: {
        term: 'SDS MK4i Swerve',
        definition: 'Módulo swerve coaxial invertido con motores independientes de tracción y giro.',
      },
      zh: {
        term: 'SDS MK4i Swerve',
        definition: '846 战队使用的倒置同轴全向舵轮模组，支持独立驱动和转向控制。',
      },
      hi: {
        term: 'SDS MK4i Swerve',
        definition: 'इनवर्टेड कोएक्सियल स्वर्व मॉड्यूल जिसमें ड्राइव और स्टीयर मोटर अलग होते हैं।',
      },
      vi: {
        term: 'SDS MK4i Swerve',
        definition: 'Cụm bánh xe swerve đồng trục đảo ngược giúp chạy và xoay độc lập.',
      },
      fr: {
        term: 'SDS MK4i Swerve',
        definition: 'Module swerve coaxial inversé à moteurs de traction et direction indépendants.',
      },
    },
  },
  {
    id: 'term-2',
    term: 'CANCoder Magnet Offset',
    category: 'Controls & WPILib',
    subsystem: 'Drivetrain / Sensors',
    definition:
      'The stored angular zero-point (in rotations from -0.5 to +0.5) aligning a swerve wheel straight forward relative to the chassis.',
    rookieTip:
      'Use a straight aluminum bar against the bevelled wheel side, zero in Phoenix Tuner X, and paste the value into SwerveConstants.java.',
    aliases: ['Steer Zero', 'Absolute Encoder Offset'],
    translations: {
      en: {
        term: 'CANCoder Magnet Offset',
        definition: 'Stored zero-angle calibration aligning the wheel straight forward.',
      },
      es: {
        term: 'CANCoder Magnet Offset',
        definition: 'Calibración del punto cero angular que alinea la rueda hacia adelante.',
      },
      zh: {
        term: 'CANCoder Magnet Offset',
        definition: '将舵轮绝对编码器零点对齐底盘正前方的角度偏置值。',
      },
      hi: {
        term: 'CANCoder Magnet Offset',
        definition: 'पहिये को सीधे आगे संरेखित करने वाला एब्सोल्यूट एनकोडर ज़ीरो ऑफसेट।',
      },
      vi: {
        term: 'CANCoder Magnet Offset',
        definition: 'Giá trị hiệu chỉnh góc 0 giúp bánh swerve hướng thẳng về phía trước.',
      },
      fr: {
        term: 'CANCoder Magnet Offset',
        definition: 'Décalage angulaire mémorisé alignant la roue droit vers l’avant.',
      },
    },
  },
  {
    id: 'term-3',
    term: 'CANivore',
    category: 'Electrical & CAN',
    subsystem: 'Bellypan Electronics',
    definition:
      'CTRE USB-to-CAN-FD adapter used on Team 846 robots to run drivetrain motors and CANCoders at 1000 Hz without saturating the RoboRIO CAN bus.',
    rookieTip:
      'If CANivore LED turns red or utilization hits >85%, inspect yellow/green twisted pairs near sharp frame edges.',
    aliases: ['CAN-FD Hub', 'Drivetrain Bus'],
    translations: {
      en: {
        term: 'CANivore',
        definition: 'CTRE CAN-FD bus adapter isolating high-rate swerve traffic.',
      },
      es: {
        term: 'CANivore',
        definition: 'Adaptador USB-a-CAN-FD que aísla el tráfico rápido del tren motriz.',
      },
      zh: {
        term: 'CANivore',
        definition: 'CTRE 高速 CAN-FD 总线适配器，用于分担底盘电机与编码器通信负载。',
      },
      hi: {
        term: 'CANivore',
        definition: 'हाई-स्पीड CAN-FD अडैप्टर जो RoboRIO बस से स्वर्व ट्रैफ़िक अलग करता है।',
      },
      vi: {
        term: 'CANivore',
        definition: 'Bộ chuyển đổi CAN-FD tốc độ cao tách biệt lưu lượng swerve khỏi RoboRIO.',
      },
      fr: {
        term: 'CANivore',
        definition: 'Adaptateur USB-vers-CAN-FD isolant le trafic rapide du châssis.',
      },
    },
  },
  {
    id: 'term-4',
    term: 'TalonFX',
    category: 'Electrical & CAN',
    subsystem: 'Actuators',
    definition:
      'Integrated brushless motor controller built into Falcon 500 and Kraken X60 motors, controlled over CAN/CAN-FD via Phoenix 6.',
    rookieTip:
      'Blinking orange/red LEDs indicate a CAN frame timeout or hardware fault — check the Wago/Anderson splice first.',
    aliases: ['Kraken X60', 'Falcon 500'],
    translations: {
      en: {
        term: 'TalonFX',
        definition: 'Integrated Phoenix 6 motor controller inside Kraken X60 / Falcon 500.',
      },
      es: {
        term: 'TalonFX',
        definition: 'Controlador de motor integrado en Kraken X60 y Falcon 500.',
      },
      zh: {
        term: 'TalonFX',
        definition: '集成在 Kraken X60 / Falcon 500 电机内部的 Phoenix 6 控制器。',
      },
      hi: {
        term: 'TalonFX',
        definition: 'Kraken X60 / Falcon 500 में इनबिल्ट Phoenix 6 मोटर कंट्रोलर।',
      },
      vi: {
        term: 'TalonFX',
        definition: 'Bộ điều khiển động cơ tích hợp trong Kraken X60 / Falcon 500.',
      },
      fr: {
        term: 'TalonFX',
        definition: 'Contrôleur intégré aux moteurs Kraken X60 et Falcon 500.',
      },
    },
  },
  {
    id: 'term-5',
    term: 'Bumper Zone',
    category: 'FRC Rules',
    subsystem: 'Frame & Bumpers',
    definition:
      'The vertical region between the floor and 7.5 in. (or current season spec) where robot bumpers must fully protect the Frame Perimeter.',
    rookieTip:
      'During inspection, inspectors test corner gaps and measure maximum extension outside the frame perimeter.',
    aliases: ['Frame Perimeter', 'R401-R408'],
    translations: {
      en: {
        term: 'Bumper Zone',
        definition: 'Mandatory height and perimeter zone where bumpers shield the chassis.',
      },
      es: {
        term: 'Bumper Zone',
        definition: 'Zona obligatoria de altura y perímetro donde los parachoques protegen el chasis.',
      },
      zh: {
        term: 'Bumper Zone',
        definition: '规则规定的保险杠保护高度与车架周界区域。',
      },
      hi: {
        term: 'Bumper Zone',
        definition: 'नियमों द्वारा निर्धारित ऊँचाई और परिधि क्षेत्र जहाँ बम्पर चेसिस की रक्षा करते हैं।',
      },
      vi: {
        term: 'Bumper Zone',
        definition: 'Vùng chiều cao và chu vi bắt buộc nơi cản bảo vệ khung robot.',
      },
      fr: {
        term: 'Bumper Zone',
        definition: 'Zone réglementaire de hauteur et de périmètre protégée par les pare-chocs.',
      },
    },
  },
  {
    id: 'term-6',
    term: 'Loctite 243',
    category: '846 Custom Hardware',
    subsystem: 'Pit Mechanical SOP',
    definition:
      'Oil-tolerant blue medium-strength threadlocker mandated by Team 846 on every swerve module M4/M3 steel fastener.',
    rookieTip:
      'NEVER put liquid Loctite on polycarbonate or acrylic — it causes stress cracking within minutes!',
    aliases: ['Blue Threadlocker', '846 Fastener Rule'],
    translations: {
      en: {
        term: 'Loctite 243',
        definition: 'Blue medium threadlocker required on steel drivetrain fasteners (never plastic).',
      },
      es: {
        term: 'Loctite 243',
        definition: 'Fijador de roscas azul obligatorio en pernos de acero (jamás en policarbonato).',
      },
      zh: {
        term: 'Loctite 243',
        definition: '846 战队规定用于金属螺栓的蓝色中强度螺纹锁固剂（严禁接触聚碳酸酯）。',
      },
      hi: {
        term: 'Loctite 243',
        definition: 'स्टील बोल्ट के लिए नीला थ्रेडलॉकर (प्लास्टिक/पॉलीकार्बोनेट पर कभी न लगाएं)।',
      },
      vi: {
        term: 'Loctite 243',
        definition: 'Keo khóa ren xanh dùng cho ốc kim loại (tuyệt đối không dùng lên nhựa).',
      },
      fr: {
        term: 'Loctite 243',
        definition: 'Frein-filet bleu obligatoire sur visserie acier (jamais sur polycarbonate).',
      },
    },
  },
  {
    id: 'term-7',
    term: 'Over-Bumper Intake',
    category: '846 Custom Hardware',
    subsystem: 'Game Piece Manipulation',
    definition:
      'Team 846’s pivoting roller intake that deploys over the front bumper frame to acquire game pieces without leaving a bumper cutout.',
    rookieTip:
      'Always verify the hardstop bolt before enabling in pit test mode so the intake does not exceed max extension.',
    aliases: ['Slapdown Intake', 'Funky Roller'],
    translations: {
      en: {
        term: 'Over-Bumper Intake',
        definition: 'Pivoting roller intake deploying above the front bumper rail.',
      },
      es: {
        term: 'Over-Bumper Intake',
        definition: 'Intake pivotante con rodillos que se despliega sobre el parachoques frontal.',
      },
      zh: {
        term: 'Over-Bumper Intake',
        definition: '跨过前保险杠伸出吸取比赛道具的翻转滚轮拾取机构。',
      },
      hi: {
        term: 'Over-Bumper Intake',
        definition: 'फ्रंट बम्पर के ऊपर से बाहर निकलकर गेम पीस उठाने वाला पिवोटिंग रोलर इनटेक।',
      },
      vi: {
        term: 'Over-Bumper Intake',
        definition: 'Cơ cấu cuốn vật phẩm gập mở phía trên thanh cản trước.',
      },
      fr: {
        term: 'Over-Bumper Intake',
        definition: 'Système de prise pivotant déployé au-dessus du pare-chocs avant.',
      },
    },
  },
  {
    id: 'term-8',
    term: '120Ω Termination Resistor',
    category: 'Electrical & CAN',
    subsystem: 'CAN Bus',
    definition:
      'End-of-line resistor placed across CAN-H (yellow) and CAN-L (green) at both ends of a daisy-chained CAN bus; a healthy powered-off bus reads ~60Ω.',
    rookieTip:
      'Use a multimeter across Yellow and Green with battery disconnected. 120Ω = missing one terminator; 0Ω = dead short.',
    aliases: ['CAN Termination', '60 Ohm Check'],
    translations: {
      en: {
        term: '120Ω Termination Resistor',
        definition: 'Bus-end resistor; two ends in parallel should measure ~60Ω off-power.',
      },
      es: {
        term: '120Ω Termination Resistor',
        definition: 'Resistencia final del bus CAN; apagado debe medir ~60Ω entre amarillo y verde.',
      },
      zh: {
        term: '120Ω Termination Resistor',
        definition: 'CAN 总线两端终端电阻；断电测量黄绿线间应约为 60 欧姆。',
      },
      hi: {
        term: '120Ω Termination Resistor',
        definition: 'CAN बस टर्मिनेशन रेसिस्टर; बैटरी बंद होने पर ~60Ω रीडिंग आनी चाहिए।',
      },
      vi: {
        term: '120Ω Termination Resistor',
        definition: 'Điện trở đầu cuối CAN; đo khi tắt nguồn phải đạt khoảng 60Ω.',
      },
      fr: {
        term: '120Ω Termination Resistor',
        definition: 'Résistance de terminaison CAN ; hors tension on doit mesurer ~60Ω.',
      },
    },
  },
];

export const INITIAL_DOCUMENTS: IngestionDocument[] = [
  {
    id: 'doc-1',
    filename: 'Funky_Monkeys_MK4i_Assembly_Rev3.pdf',
    category: 'CAD PDF',
    fileSize: '18.4 MB',
    pageCount: 28,
    stage: 'indexed',
    progressPercent: 100,
    visualEmbeddingsCount: 28,
    bm25TokensCount: 4120,
    uploadedBy: 'Lead Mech Mentor (Sarah K.)',
    uploadedAt: '2 hours ago',
  },
  {
    id: 'doc-2',
    filename: '846_Pit_Electrical_SOP_v4.pdf',
    category: '846 SOP',
    fileSize: '6.2 MB',
    pageCount: 16,
    stage: 'indexed',
    progressPercent: 100,
    visualEmbeddingsCount: 16,
    bm25TokensCount: 6890,
    uploadedBy: 'Electrical Lead (Marcus T.)',
    uploadedAt: 'Yesterday',
  },
  {
    id: 'doc-3',
    filename: '2026_FRC_Game_Manual.pdf',
    category: 'Game Manual',
    fileSize: '34.1 MB',
    pageCount: 158,
    stage: 'indexed',
    progressPercent: 100,
    visualEmbeddingsCount: 158,
    bm25TokensCount: 49200,
    uploadedBy: 'Drive Coach (Alex R.)',
    uploadedAt: '2 days ago',
  },
  {
    id: 'doc-4',
    filename: 'SwerveModule.java',
    category: 'Team Code',
    fileSize: '24 KB',
    pageCount: 4,
    stage: 'indexed',
    progressPercent: 100,
    visualEmbeddingsCount: 4,
    bm25TokensCount: 1340,
    uploadedBy: 'Controls Lead (Priya N.)',
    uploadedAt: '3 hours ago',
  },
  {
    id: 'doc-5',
    filename: 'CTRE_CANCoder_Phoenix6_SpecSheet.pdf',
    category: 'Spec Sheet',
    fileSize: '4.7 MB',
    pageCount: 12,
    stage: 'indexed',
    progressPercent: 100,
    visualEmbeddingsCount: 12,
    bm25TokensCount: 3810,
    uploadedBy: 'Controls Lead (Priya N.)',
    uploadedAt: '3 days ago',
  },
  {
    id: 'doc-6',
    filename: '846_OverBumper_Intake_CAD_Rev5.pdf',
    category: 'CAD PDF',
    fileSize: '21.0 MB',
    pageCount: 19,
    stage: 'indexed',
    progressPercent: 100,
    visualEmbeddingsCount: 19,
    bm25TokensCount: 2950,
    uploadedBy: 'CAD Subteam (Leo W.)',
    uploadedAt: '5 hours ago',
  },
  {
    id: 'doc-7',
    filename: '846_Rookie_Pit_Checklist_2026.pdf',
    category: '846 SOP',
    fileSize: '2.9 MB',
    pageCount: 9,
    stage: 'generating_embeddings',
    progressPercent: 68,
    visualEmbeddingsCount: 6,
    bm25TokensCount: 1900,
    uploadedBy: 'Pit Captain (Elena V.)',
    uploadedAt: 'Just now',
  },
];

export const INITIAL_THREADS: ChatThread[] = [
  {
    id: 'thread-swerve',
    title: 'MK4i Swerve Grinding + 45° Steer Offset',
    subtitle: 'LFM3-VL-2B Vision + 846 CAD PDF p.14 + SwerveModule.java',
    updatedAt: '4m ago',
    tags: ['Drivetrain', 'Vision Match 96%', 'WPILib'],
    messages: [
      {
        id: 'm1-user',
        role: 'user',
        timestamp: '10:42 AM',
        content:
          'Our front-left SDS MK4i Swerve module started clicking/grinding after we hit the stage wall, and now the wheel faces ~45° sideways when we enable. I snapped a quick pit photo—what broke and how do I fix it fast?',
        translations: {
          es: 'Nuestro módulo SDS MK4i Swerve delantero izquierdo empezó a crujir después de chocar con la pared y ahora la rueda apunta ~45° de lado al habilitar. Tomé una foto en el pit: ¿qué se rompió y cómo lo arreglo rápido?',
          zh: '我们的左前 SDS MK4i Swerve 模组在撞墙后开始发出异响，现在使能时轮子偏了约 45°。我在维修区拍了张照片——哪里坏了，怎么快速修好？',
          hi: 'हमारा फ्रंट-लेफ्ट SDS MK4i Swerve मॉड्यूल दीवार से टकराने के बाद आवाज़ कर रहा है और पहिया ~45° मुड़ा हुआ है। मैंने फोटो खींची है—क्या टूटा है और जल्दी कैसे ठीक करें?',
          vi: 'Cụm SDS MK4i Swerve trước-trái bị kêu lạch cạch sau va chạm và bánh bị lệch ~45° khi bật robot. Mình đã chụp ảnh—lỗi gì và sửa nhanh thế nào?',
          fr: 'Notre module SDS MK4i Swerve avant-gauche grince après un choc et la roue pointe à ~45° de travers. Voici une photo prise au pit : qu’est-ce qui est cassé et comment réparer vite ?',
        },
        selectedScope: 'auto',
        attachments: [SAMPLE_MECHANISM_ATTACHMENTS[0]],
      },
      {
        id: 'm1-bot',
        role: 'assistant',
        timestamp: '10:42 AM',
        sufficiencyLoops: 1,
        reasoningSteps: [
          {
            id: 'step-1',
            tool: 'controller',
            title: 'Agentic Controller: Route Selection',
            detail:
              'Detected image attachment + mechanism symptoms ("grinding", "45° sideways"). Selected Internal Hybrid RAG + LFM3-VL-2B Vision Inspection + ChiefDelphi verification.',
            status: 'completed',
            durationMs: 140,
            iteration: 1,
          },
          {
            id: 'step-2',
            tool: 'internal_rag',
            title: 'Searching Internal RAG (EmbeddingGemma-2 & BM25)',
            detail:
              'Matched 3 visual CAD pages in Funky_Monkeys_MK4i_Assembly_Rev3.pdf (p.14) and 2 Java files (SwerveModule.java, SwerveConstants.java).',
            status: 'completed',
            durationMs: 410,
            iteration: 1,
          },
          {
            id: 'step-3',
            tool: 'vision_lfm3',
            title: 'Running LFM3-VL-2B Vision Inspection on mechanism photo',
            detail:
              'Aligned student photo against CAD PDF p.14. Detected: (1) brass wear shavings & missing 0.5mm bevel shim, (2) blinking RED CANCoder LED, (3) backed-out M4 steering bolt.',
            status: 'completed',
            durationMs: 690,
            iteration: 1,
          },
          {
            id: 'step-4',
            tool: 'chief_delphi',
            title: 'Querying ChiefDelphi & Web Search API',
            detail:
              'Cross-checked thread #461209 ("MK4i bevel gear slip after defense hit") confirming magnet carrier slip causes ~45° offset + red CANCoder LED.',
            status: 'completed',
            durationMs: 380,
            iteration: 1,
          },
          {
            id: 'step-5',
            tool: 'reranker',
            title: 'Reranking context & verifying sufficiency',
            detail:
              'Is Context Sufficient? -> YES (0.96 confidence). Merged visual callouts, 846 Loctite SOP, and CANCoder offset code.',
            status: 'completed',
            durationMs: 210,
            iteration: 1,
            sufficiencyPassed: true,
          },
        ],
        content:
          'LiquidAI LFM3-VL-2B compared your pit photo against Team 846’s CAD render (MK4i Assembly Rev3, p. 14). The impact sheared or displaced the 0.5mm thrust shim behind the bevel gear and shifted the CANCoder magnet carrier, causing both the gear grinding and the 45° steer offset (confirmed by the red status LED on CANCoder #12). Follow the pit repair checklist below before your next match.',
        translations: {
          es: 'LiquidAI LFM3-VL-2B comparó tu foto del pit con el plano CAD del Equipo 846 (MK4i Assembly Rev3, p. 14). El impacto desplazó la arandela de 0.5 mm detrás del engranaje cónico y movió el soporte magnético del CANCoder, causando el ruido y el desfase de 45° (confirmado por el LED rojo en CANCoder #12). Sigue la lista de reparación abajo.',
          zh: 'LiquidAI LFM3-VL-2B 已将你的现场照片与 846 战队 CAD 图纸（MK4i Assembly Rev3 第 14 页）比对。碰撞导致锥齿轮后方的 0.5mm 垫片移位，并使 CANCoder 磁铁座滑移，从而产生齿轮异响和 45° 转向偏置（CANCoder #12 红灯闪烁可印证）。请按下方清单依次检修。',
          hi: 'LiquidAI LFM3-VL-2B ने आपकी पिट फोटो की तुलना Team 846 CAD (MK4i Assembly Rev3, p. 14) से की। टक्कर से बेवल गियर के पीछे 0.5mm शिम खिसक गया है और CANCoder मैग्नेट अपनी जगह से हिल गया है (लाल LED से पुष्टि)। अगले मैच से पहले नीचे दिए गए स्टेप्स पूरा करें।',
          vi: 'LiquidAI LFM3-VL-2B đã đối chiếu ảnh thực tế với bản vẽ CAD của Team 846 (MK4i Assembly Rev3, trang 14). Va chạm làm lệch vòng đệm 0.5mm sau bánh răng côn và làm trượt nam châm CANCoder, gây tiếng kêu và lệch góc 45° (đèn LED đỏ trên CANCoder #12). Làm theo danh sách bên dưới.',
          fr: 'LiquidAI LFM3-VL-2B a comparé votre photo au plan CAD Team 846 (MK4i Assembly Rev3, p. 14). Le choc a déplacé la cale de 0,5 mm derrière le pignon conique et décalé l’aimant du CANCoder (LED rouge sur CANCoder #12). Suivez la procédure ci-dessous.',
        },
        visualComparison: {
          id: 'vc-swerve-1',
          title: 'Front-Left SDS MK4i Swerve Pod — Pit Inspection vs. 846 CAD Rev3',
          studentPhotoUrl: swerveStudentPhotoSvg,
          studentPhotoCaption: 'Student Upload: IMG_846_MK4I_BEVEL_FAULT.jpg',
          cadSchematicUrl: swerveCadSchematicSvg,
          cadSchematicCaption: 'Retrieved CAD PDF: Funky_Monkeys_MK4i_Assembly_Rev3.pdf (p. 14)',
          cadDocumentSource: 'EmbeddingGemma-2 Multimodal Store • Page 14',
          visionModel: 'LiquidAI LFM3-VL-2B',
          embeddingModel: 'EmbeddingGemma-2',
          similarityScore: 0.96,
          detectedIssueSummary:
            '3 discrepancies detected: Missing 0.5mm bevel thrust shim, CANCoder #12 red fault LED, and backed-out M4 steering plate fastener.',
          annotations: [
            {
              id: 'ann-1',
              xPercent: 28,
              yPercent: 34,
              label: '1. Bevel Gear Shim Gap',
              severity: 'critical',
              description:
                'LFM3-VL-2B detected brass shavings and axial play. Install a fresh 0.5mm stainless shim behind the 15T bevel gear.',
              targetImage: 'student_photo',
            },
            {
              id: 'ann-2',
              xPercent: 72,
              yPercent: 24,
              label: '2. CANCoder #12 Red LED',
              severity: 'critical',
              description:
                'Magnet air gap shifted outside 1.2mm ±0.3mm spec after impact. Re-seat magnet on shaft and re-zero offset.',
              targetImage: 'student_photo',
            },
            {
              id: 'ann-3',
              xPercent: 52,
              yPercent: 74,
              label: '3. Loose M4 Fastener',
              severity: 'warning',
              description:
                'M4 BHCS backed out ~2 turns. Clean threads, apply Loctite 243, torque to 2.8 N·m.',
              targetImage: 'student_photo',
            },
            {
              id: 'ann-4',
              xPercent: 28,
              yPercent: 34,
              label: 'CAD Ref: 0.5mm Shim Stack',
              severity: 'reference',
              description: 'Target gear mesh backlash: 0.08mm–0.15mm with 0.5mm shim installed.',
              targetImage: 'cad_schematic',
            },
            {
              id: 'ann-5',
              xPercent: 72,
              yPercent: 24,
              label: 'CAD Ref: Solid Green LED',
              severity: 'reference',
              description: 'CANCoder magnet centered at 1.2mm gap displays solid green status.',
              targetImage: 'cad_schematic',
            },
            {
              id: 'ann-6',
              xPercent: 52,
              yPercent: 74,
              label: 'CAD Ref: M4x12 + Loctite 243',
              severity: 'reference',
              description: '846 SOP mandates Loctite 243 on all steel MK4i steering plate bolts.',
              targetImage: 'cad_schematic',
            },
          ],
        },
        troubleshootingSteps: [
          {
            id: 'ts-1',
            stepNumber: 1,
            title: 'Disable robot & disconnect main Anderson battery plug',
            instruction:
              'Place the chassis on pit blocks so the front-left SDS MK4i Swerve wheel spins freely off the mat before loosening hardware.',
            warningCallout: 'Never reach under bevel gears while battery is plugged in.',
            completed: true,
            highlightedTerms: ['SDS MK4i Swerve'],
            translations: {
              es: {
                title: 'Deshabilita el robot y desconecta la batería principal',
                instruction:
                  'Coloca el chasis sobre bloques en el pit para que el SDS MK4i Swerve gire libremente antes de aflojar pernos.',
                warningCallout: 'Nunca metas los dedos en los engranajes con la batería conectada.',
              },
              zh: {
                title: '断电并拔掉主电池 Anderson 插头',
                instruction: '将底盘架在维修垫块上，确保左前 SDS MK4i Swerve 轮子悬空后再拆卸螺丝。',
                warningCallout: '通电状态下严禁触碰锥齿轮咬合处。',
              },
              hi: {
                title: 'रोबोट बंद करें और मुख्य बैटरी प्लग निकालें',
                instruction: 'स्क्रू ढीले करने से पहले चेसिस को पिट ब्लॉक पर रखें ताकि SDS MK4i Swerve फ्री घूमे।',
                warningCallout: 'बैटरी लगे होने पर बेवल गियर के पास हाथ न डालें।',
              },
              vi: {
                title: 'Ngắt nguồn robot và rút giắc pin chính Anderson',
                instruction: 'Đặt khung robot lên khối kê để bánh SDS MK4i Swerve xoay tự do trước khi tháo ốc.',
                warningCallout: 'Không chạm tay vào bánh răng khi chưa ngắt pin.',
              },
              fr: {
                title: 'Couper le robot et débrancher la batterie principale',
                instruction: 'Posez le châssis sur des cales afin que le SDS MK4i Swerve tourne librement.',
                warningCallout: 'Ne touchez jamais les pignons batterie branchée.',
              },
            },
          },
          {
            id: 'ts-2',
            stepNumber: 2,
            title: 'Inspect bevel gear & replace missing 0.5mm thrust shim',
            instruction:
              'Remove the 4 perimeter M4 bolts, clear brass wear shavings, and confirm the 0.5mm shim sits flush behind the driven wheel bevel gear (CAD p. 14).',
            completed: true,
            highlightedTerms: ['Loctite 243'],
            translations: {
              es: {
                title: 'Inspecciona el engranaje y repón la arandela de 0.5 mm',
                instruction:
                  'Retira los 4 pernos M4, limpia las virutas y verifica la arandela de 0.5 mm detrás del engranaje (CAD p. 14).',
              },
              zh: {
                title: '检查锥齿轮并更换缺失的 0.5mm 止推垫片',
                instruction: '拆下 4 颗 M4 螺栓，清理金属碎屑，确认 0.5mm 垫片平整安装在从动锥齿轮后方（CAD 第14页）。',
              },
              hi: {
                title: 'बेवल गियर जांचें और 0.5mm शिम दोबारा लगाएं',
                instruction: '4 M4 बोल्ट हटाएं, धातु के कण साफ करें और CAD p.14 के अनुसार 0.5mm शिम लगाएं।',
              },
              vi: {
                title: 'Kiểm tra bánh răng côn và lắp lại vòng đệm 0.5mm',
                instruction: 'Tháo 4 ốc M4, lau sạch mạt đồng và lắp đúng vòng đệm 0.5mm phía sau bánh răng (CAD tr.14).',
              },
              fr: {
                title: 'Inspecter le pignon conique et replacer la cale 0,5 mm',
                instruction: 'Retirez les 4 vis M4, nettoyez la limaille et replacez la cale de 0,5 mm (CAD p. 14).',
              },
            },
          },
          {
            id: 'ts-3',
            stepNumber: 3,
            title: 'Apply Loctite 243 & torque M4 fasteners to 2.8 N·m',
            instruction:
              'Apply one small drop of blue Loctite 243 on steel M4x12 fasteners only and tighten in a star pattern.',
            warningCallout: 'Keep Loctite 243 strictly away from polycarbonate bellypan covers.',
            completed: false,
            highlightedTerms: ['Loctite 243'],
            translations: {
              es: {
                title: 'Aplica Loctite 243 y aprieta los pernos M4 a 2.8 N·m',
                instruction: 'Aplica una gota de Loctite 243 azul solo en acero y aprieta en cruz.',
                warningCallout: 'Evita que Loctite 243 toque el policarbonato.',
              },
              zh: {
                title: '涂抹 Loctite 243 并以 2.8 N·m 拧紧 M4 螺栓',
                instruction: '仅在金属 M4x12 螺栓上点涂蓝色 Loctite 243，按对角顺序拧紧。',
                warningCallout: '严禁将 Loctite 243 沾到聚碳酸酯护板上。',
              },
              hi: {
                title: 'Loctite 243 लगाएं और M4 बोल्ट 2.8 N·m पर कसें',
                instruction: 'केवल स्टील M4x12 बोल्ट पर नीला Loctite 243 लगाएं और क्रॉस पैटर्न में कसें।',
                warningCallout: 'Loctite 243 को पॉलीकार्बोनेट शीट से दूर रखें।',
              },
              vi: {
                title: 'Tra keo Loctite 243 và siết ốc M4 lực 2.8 N·m',
                instruction: 'Chỉ nhỏ một giọt Loctite 243 lên ốc thép M4x12 và siết chéo đều.',
                warningCallout: 'Tuyệt đối không để Loctite 243 dính vào tấm nhựa polycarbonate.',
              },
              fr: {
                title: 'Appliquer du Loctite 243 et serrer les vis M4 à 2,8 N·m',
                instruction: 'Déposez une goutte de Loctite 243 sur les vis acier M4x12 et serrez en étoile.',
                warningCallout: 'Éloignez le Loctite 243 du polycarbonate.',
              },
            },
          },
          {
            id: 'ts-4',
            stepNumber: 4,
            title: 'Re-seat CANCoder #12 magnet & verify green LED',
            instruction:
              'Verify 1.2mm air gap above the magnet carrier; confirm Phoenix Tuner X shows Magnet Health = GREEN.',
            completed: false,
            highlightedTerms: ['CANCoder Magnet Offset'],
            translations: {
              es: {
                title: 'Reasienta el imán de CANCoder #12 y verifica LED verde',
                instruction: 'Confirma espacio de aire de 1.2 mm y Magnet Health = GREEN en Phoenix Tuner X.',
              },
              zh: {
                title: '重新固定 CANCoder #12 磁铁并确认绿灯常亮',
                instruction: '检查 1.2mm 气隙，在 Phoenix Tuner X 中确认 Magnet Health 为 GREEN。',
              },
              hi: {
                title: 'CANCoder #12 मैग्नेट सेट करें और हरी LED जांचें',
                instruction: '1.2mm एयर गैप चेक करें और Phoenix Tuner X में Magnet Health = GREEN देखें।',
              },
              vi: {
                title: 'Lắp lại nam châm CANCoder #12 và kiểm tra đèn xanh',
                instruction: 'Đảm bảo khe hở 1.2mm và Magnet Health = GREEN trên Phoenix Tuner X.',
              },
              fr: {
                title: 'Repositionner l’aimant du CANCoder #12 (LED verte)',
                instruction: 'Vérifiez l’entrefer de 1,2 mm et Magnet Health = GREEN dans Phoenix Tuner X.',
              },
            },
          },
          {
            id: 'ts-5',
            stepNumber: 5,
            title: 'Align wheel with 846 aluminum jig & update CANCoder Magnet Offset',
            instruction:
              'Clamp Team 846’s straight alignment bar across the front/back wheels (bevel gears facing inward), read Raw Absolute Position in Phoenix Tuner X, and update kFrontLeftSteerOffset in SwerveConstants.java.',
            completed: false,
            highlightedTerms: ['CANCoder Magnet Offset', 'CANivore'],
            translations: {
              es: {
                title: 'Alinea con la barra 846 y actualiza CANCoder Magnet Offset',
                instruction:
                  'Coloca la barra recta 846 sobre las ruedas (engranajes hacia adentro) y actualiza kFrontLeftSteerOffset en SwerveConstants.java.',
              },
              zh: {
                title: '用 846 对齐直尺校直并更新 CANCoder Magnet Offset',
                instruction: '将 846 铝制直尺贴紧前后轮外侧（锥齿轮朝内），读取绝对角度并写入 SwerveConstants.java。',
              },
              hi: {
                title: '846 अलाइनमेंट बार से सीधा करें और CANCoder Magnet Offset अपडेट करें',
                instruction:
                  'आगे-पीछे के पहियों पर सीधी एल्यूमीनियम बार लगाएं और SwerveConstants.java में kFrontLeftSteerOffset अपडेट करें।',
              },
              vi: {
                title: 'Căn thẳng bằng thước nhôm 846 và cập nhật CANCoder Magnet Offset',
                instruction:
                  'Áp thước nhôm 846 dọc hai bánh xe (bánh răng quay vào trong) và cập nhật kFrontLeftSteerOffset trong SwerveConstants.java.',
              },
              fr: {
                title: 'Aligner avec la règle 846 et mettre à jour CANCoder Magnet Offset',
                instruction:
                  'Placez la barre d’alignement 846 le long des roues et mettez à jour kFrontLeftSteerOffset dans SwerveConstants.java.',
              },
            },
          },
        ],
        codeSnippets: [
          {
            id: 'code-swerve-1',
            filename: 'src/main/java/frc/robot/subsystems/swerve/SwerveConstants.java',
            language: 'java',
            subsystem: 'Drivetrain • Phoenix 6 CANivore',
            explanation:
              'Update kFrontLeftSteerOffset (in rotations) after re-seating the CANCoder magnet and running Zero in Phoenix Tuner X.',
            code: `// Team 846 (The Funky Monkeys) - 2026 MK4i Swerve Offsets
public static final String kCANivoreBus = "846_CANivore";

public static final SwerveModuleConstants kFrontLeft = new SwerveModuleConstants()
    .withDriveMotorId(10)
    .withSteerMotorId(11)
    .withCANcoderId(12)
    // TODO(Pit): Re-read Raw Absolute Position w/ bevel gears facing INWARD
    .withCANcoderOffsetRotations(-0.3418)
    .withDriveInvert(false)
    .withSteerInvert(true);

public static void configureCANcoder(CANcoder encoder, double offsetRotations) {
    var config = new CANcoderConfiguration();
    config.MagnetSensor.AbsoluteSensorDiscontinuityPoint = 0.5;
    config.MagnetSensor.SensorDirection = SensorDirectionValue.CounterClockwise_Positive;
    config.MagnetSensor.MagnetOffset = offsetRotations;
    encoder.getConfigurator().apply(config);
}`,
          },
        ],
        citations: [
          {
            id: 'cit-1',
            title: 'Funky_Monkeys_MK4i_Assembly_Rev3.pdf',
            sourceType: 'cad_pdf',
            badgeLabel: '846 CAD PDF • p. 14',
            pageOrThread: 'Page 14 — Bevel Gear & CANCoder Stack',
            excerpt:
              'Install 1x 0.5mm stainless thrust shim between bearing and 15T helical bevel gear. Maintain 1.2mm ±0.3mm air gap below CANCoder #12 PCB.',
            retrievalMethod: 'EmbeddingGemma-2 Dense',
            relevanceScore: 0.96,
            url: '#cad-mk4i-p14',
          },
          {
            id: 'cit-2',
            title: '846_Pit_Electrical_SOP_v4.pdf',
            sourceType: 'team_sop',
            badgeLabel: '846 SOP • p. 4',
            pageOrThread: 'Page 4 — Threadlocker & Swerve Re-Zeroing',
            excerpt:
              'All steel M4 swerve pod bolts require Loctite 243 torqued to 2.8 N·m. Never apply threadlocker near polycarbonate.',
            retrievalMethod: 'BM25 Keyword',
            relevanceScore: 0.91,
            url: '#sop-v4-p4',
          },
          {
            id: 'cit-3',
            title: 'ChiefDelphi: MK4i Bevel Gear Slip & 45° Steer Offset',
            sourceType: 'chief_delphi',
            badgeLabel: 'ChiefDelphi #461209',
            pageOrThread: 'Thread #461209 • Accepted Answer',
            excerpt:
              'If your wheel jumps ~45 degrees after a defense hit and CANCoder blinks red, the magnet carrier slipped or axial bevel play pulled the rotor.',
            retrievalMethod: 'ChiefDelphi Web API',
            relevanceScore: 0.89,
            url: 'https://www.chiefdelphi.com',
          },
          {
            id: 'cit-4',
            title: 'SwerveModule.java / SwerveConstants.java',
            sourceType: 'team_code',
            badgeLabel: '846 Code • L14-31',
            pageOrThread: 'Lines 14–31 • kFrontLeft Config',
            excerpt:
              'withCANcoderId(12).withCANcoderOffsetRotations(-0.3418) on CANivore bus "846_CANivore".',
            retrievalMethod: 'Hybrid RAG + Reranker',
            relevanceScore: 0.94,
            url: '#code-swerve-constants',
          },
        ],
      },
    ],
  },
  {
    id: 'thread-can',
    title: 'TalonFX Orange/Red Blink + CANivore 94% Bus',
    subtitle: 'Demonstrates Agentic Sufficiency Loop (2 Passes)',
    updatedAt: '28m ago',
    tags: ['Electrical', 'CANivore', 'Sufficiency Loop'],
    messages: [
      {
        id: 'm2-user',
        role: 'user',
        timestamp: '10:14 AM',
        detectedInputLanguage: 'es',
        content:
          'El TalonFX de la torreta parpadea en naranja/rojo y la utilización del CANivore subió al 94%. ¿Se pellizcó un cable CAN?',
        translations: {
          en: 'The turret TalonFX is blinking orange/red and CANivore utilization spiked to 94%. Did a CAN wire get pinched?',
        },
        selectedScope: 'auto',
        attachments: [SAMPLE_MECHANISM_ATTACHMENTS[1]],
      },
      {
        id: 'm2-bot',
        role: 'assistant',
        timestamp: '10:15 AM',
        sufficiencyLoops: 2,
        reasoningSteps: [
          {
            id: 'c-step-1',
            tool: 'internal_rag',
            title: 'Pass 1: Internal RAG (EmbeddingGemma-2 & BM25)',
            detail:
              'Retrieved 846_Pit_Electrical_SOP_v4.pdf p.7 (CAN topology & 60Ω check), but lacked Phoenix 6 94% bus utilization cause.',
            status: 'completed',
            durationMs: 390,
            iteration: 1,
          },
          {
            id: 'c-step-2',
            tool: 'reranker',
            title: 'Pass 1 Sufficiency Gate: Is Context Sufficient? → NO',
            detail:
              'Reranker flagged missing root-cause explanation for 94% CAN-FD utilization spike + orange/red blink combo. Looping back to Agentic Controller.',
            status: 'insufficient_retry',
            durationMs: 180,
            iteration: 1,
            sufficiencyPassed: false,
          },
          {
            id: 'c-step-3',
            tool: 'vision_lfm3',
            title: 'Pass 2: LFM3-VL-2B Vision Inspection on bellypan photo',
            detail:
              'Detected exposed copper on yellow/green twisted pair rubbing against un-grommeted 1x2 aluminum C-channel tube.',
            status: 'completed',
            durationMs: 610,
            iteration: 2,
          },
          {
            id: 'c-step-4',
            tool: 'chief_delphi',
            title: 'Pass 2: ChiefDelphi & CTRE Phoenix 6 Docs Lookup',
            detail:
              'Confirmed intermittent CAN-H/CAN-L frame collisions from a pinched wire cause bus retries (94% utilization) and TalonFX orange/red fault blink.',
            status: 'completed',
            durationMs: 440,
            iteration: 2,
          },
          {
            id: 'c-step-5',
            tool: 'reranker',
            title: 'Pass 2 Sufficiency Gate: Is Context Sufficient? → YES',
            detail:
              'Confidence reached 0.95. Combined visual short localization with 846 60Ω multimeter SOP.',
            status: 'completed',
            durationMs: 190,
            iteration: 2,
            sufficiencyPassed: true,
          },
        ],
        content:
          'Yes — LFM3-VL-2B spotted nicked insulation on your yellow/green CAN twisted pair passing over a sharp 1x2 aluminum tube edge without a rubber grommet. Intermittent shorts force CANivore packet retries, spiking bus utilization to 94% and triggering the TalonFX orange/red CAN fault LED.',
        translations: {
          es: 'Sí — LFM3-VL-2B detectó aislamiento dañado en tu par trenzado amarillo/verde CAN rozando un tubo de aluminio 1x2 sin pasacables de goma. Los cortocircuitos intermitentes causan reintentos en el CANivore, subiendo el uso al 94% y activando el LED naranja/rojo del TalonFX.',
          zh: '是的 — LFM3-VL-2B 在你的照片中发现黄/绿双绞 CAN 线穿过 1x2 铝管锋利边缘时绝缘层被割破且缺少橡胶护套。间歇性短路会触发 CANivore 反复重传数据包，导致总线占用率飙升至 94% 并让 TalonFX 闪烁橙/红故障灯。',
          hi: 'हाँ — LFM3-VL-2B ने फोटो में देखा कि पीली/हरी CAN तार बिना रबर ग्रोमेट के तेज 1x2 एल्यूमीनियम ट्यूब से कट गई है। इससे CANivore में पैकेट रिट्राई बढ़कर 94% हो जाता है और TalonFX पर नारंगी/लाल LED जलती है।',
          vi: 'Đúng vậy — LFM3-VL-2B phát hiện dây xoắn CAN vàng/xanh bị cấn rách vỏ tại cạnh ống nhôm 1x2 do thiếu gioăng cao su. Chập chập chờn làm CANivore gửi lại gói tin liên tục, đẩy tải lên 94% và TalonFX nháy cam/đỏ.',
          fr: 'Oui — LFM3-VL-2B a repéré une gaine entaillée sur la paire torsadée CAN jaune/verte contre un tube aluminium 1x2 sans passe-fil. Ces micro-courts-circuits saturent le CANivore à 94 % et déclenchent la LED orange/rouge du TalonFX.',
        },
        visualComparison: {
          id: 'vc-can-1',
          title: 'Bellypan CAN Routing — Pit Photo vs. 846 Electrical SOP v4',
          studentPhotoUrl: canStudentPhotoSvg,
          studentPhotoCaption: 'Student Upload: CAN_BELLYPAN_TALON_ORANGE.jpg',
          cadSchematicUrl: canCadSchematicSvg,
          cadSchematicCaption: 'Retrieved SOP Diagram: 846_Pit_Electrical_SOP_v4.pdf (p. 7)',
          cadDocumentSource: 'EmbeddingGemma-2 Multimodal Store • Page 7',
          visionModel: 'LiquidAI LFM3-VL-2B',
          embeddingModel: 'EmbeddingGemma-2',
          similarityScore: 0.95,
          detectedIssueSummary:
            '2 findings: Nicked CAN-H/CAN-L insulation on sharp tube edge (missing grommet) + TalonFX orange/red bus fault.',
          annotations: [
            {
              id: 'can-ann-1',
              xPercent: 34,
              yPercent: 44,
              label: 'Pinched CAN-H/CAN-L Wire',
              severity: 'critical',
              description:
                'Exposed conductor touching bare aluminum edge. Splice with heat-shrink & install snap-in grommet.',
              targetImage: 'student_photo',
            },
            {
              id: 'can-ann-2',
              xPercent: 69,
              yPercent: 56,
              label: 'TalonFX Orange/Red Blink',
              severity: 'critical',
              description: 'Indicates stale/dropped CANivore status frames due to electrical noise.',
              targetImage: 'student_photo',
            },
            {
              id: 'can-ann-3',
              xPercent: 34,
              yPercent: 44,
              label: 'SOP Ref: Rubber Grommet',
              severity: 'reference',
              description: 'Team 846 requires snap-in grommets on every chassis wire pass-through.',
              targetImage: 'cad_schematic',
            },
            {
              id: 'can-ann-4',
              xPercent: 69,
              yPercent: 56,
              label: 'SOP Ref: 60Ω Bus Check',
              severity: 'reference',
              description: 'Two 120Ω Termination Resistors in parallel must read ~60Ω powered off.',
              targetImage: 'cad_schematic',
            },
          ],
        },
        troubleshootingSteps: [
          {
            id: 'can-ts-1',
            stepNumber: 1,
            title: 'Measure resistance across Yellow & Green with power OFF',
            instruction:
              'Unplug the main battery and probe CAN-H (Yellow) to CAN-L (Green). A healthy bus with two 120Ω Termination Resistors measures ~60Ω; <30Ω confirms a short.',
            completed: false,
            highlightedTerms: ['120Ω Termination Resistor', 'CANivore'],
          },
          {
            id: 'can-ts-2',
            stepNumber: 2,
            title: 'Cut out pinched section, splice, and add rubber edge grommet',
            instruction:
              'Replace the damaged segment near the 1x2 C-channel using Wago/solder-seal sleeves, slide on a snap-in grommet, and zip-tie strain relief per 846 SOP p. 7.',
            completed: false,
            highlightedTerms: ['TalonFX'],
          },
        ],
        citations: [
          {
            id: 'can-cit-1',
            title: '846_Pit_Electrical_SOP_v4.pdf',
            sourceType: 'team_sop',
            badgeLabel: '846 Electrical SOP • p. 7',
            pageOrThread: 'Page 7 — CAN Bus Termination & Grommets',
            excerpt:
              'Every CAN pass-through across milled aluminum requires a snap-in grommet. Powered-off resistance across CAN-H/L must read 58–62 Ω.',
            retrievalMethod: 'Hybrid RAG + Reranker',
            relevanceScore: 0.95,
            url: '#sop-elec-p7',
          },
          {
            id: 'can-cit-2',
            title: 'ChiefDelphi: Phoenix 6 CANivore >90% Utilization Causes',
            sourceType: 'chief_delphi',
            badgeLabel: 'ChiefDelphi #458912',
            pageOrThread: 'Thread #458912 • CTRE Engineer Reply',
            excerpt:
              'High bus utilization with orange/red TalonFX blinks almost always points to physical bus reflections, missing 120Ω terminator, or an intermittent CAN-H/L short.',
            retrievalMethod: 'ChiefDelphi Web API',
            relevanceScore: 0.91,
            url: 'https://www.chiefdelphi.com',
          },
        ],
      },
    ],
  },
  {
    id: 'thread-rules',
    title: '2026 Bumper Zone & Over-Bumper Intake Extension',
    subtitle: 'Game Manual §R401–R408 + 846 Intake CAD p.9',
    updatedAt: 'Yesterday',
    tags: ['FRC Rules', 'Intake', 'Multilingual'],
    messages: [
      {
        id: 'm3-user',
        role: 'user',
        timestamp: 'Yesterday',
        content:
          'How far outside the Frame Perimeter can our Over-Bumper Intake extend during a match, and why did our polycarbonate side plate crack?',
        selectedScope: 'wpilib_rules',
        attachments: [SAMPLE_MECHANISM_ATTACHMENTS[2]],
      },
      {
        id: 'm3-bot',
        role: 'assistant',
        timestamp: 'Yesterday',
        sufficiencyLoops: 1,
        reasoningSteps: [
          {
            id: 'r-step-1',
            tool: 'internal_rag',
            title: 'Searching Game Manual & 846 Intake CAD (EmbeddingGemma-2 & BM25)',
            detail:
              'Matched 2026_FRC_Game_Manual.pdf (§R104 / §R401 Bumper Zone) and 846_OverBumper_Intake_CAD_Rev5.pdf p.9.',
            status: 'completed',
            durationMs: 360,
            iteration: 1,
          },
          {
            id: 'r-step-2',
            tool: 'vision_lfm3',
            title: 'Running LFM3-VL-2B Vision Inspection on intake plate',
            detail:
              'Identified missing 3mm aluminum gusset and potential chemical stress craze around bolt holes.',
            status: 'completed',
            durationMs: 540,
            iteration: 1,
          },
          {
            id: 'r-step-3',
            tool: 'reranker',
            title: 'Reranking context & verifying sufficiency',
            detail: 'Is Context Sufficient? -> YES (0.93 confidence).',
            status: 'completed',
            durationMs: 170,
            iteration: 1,
            sufficiencyPassed: true,
          },
        ],
        content:
          'Under 2026 Game Manual expansion rules, robot extensions outside the Frame Perimeter (starting configuration + maximum 12 in. extension beyond the perimeter at any time) must stay strictly within inspection limits, while your bumpers remain uninterrupted in the Bumper Zone. Visually, your intake plate cracked because the 3mm aluminum gusset shown in CAD Rev5 p.9 was omitted (or Loctite 243 touched the polycarbonate).',
        visualComparison: {
          id: 'vc-intake-1',
          title: 'Over-Bumper Intake Plate — Pit Photo vs. 846 Intake CAD Rev5',
          studentPhotoUrl: intakeStudentPhotoSvg,
          studentPhotoCaption: 'Student Upload: OVER_BUMPER_INTAKE_CRACK.jpg',
          cadSchematicUrl: intakeCadSchematicSvg,
          cadSchematicCaption: 'Retrieved CAD PDF: 846_OverBumper_Intake_CAD_Rev5.pdf (p. 9)',
          cadDocumentSource: 'EmbeddingGemma-2 Multimodal Store • Page 9',
          visionModel: 'LiquidAI LFM3-VL-2B',
          embeddingModel: 'EmbeddingGemma-2',
          similarityScore: 0.93,
          detectedIssueSummary:
            'Missing 3mm aluminum reinforcement gusset + HTD belt slack on intake roller drive.',
          annotations: [
            {
              id: 'int-ann-1',
              xPercent: 42,
              yPercent: 48,
              label: 'Polycarb Stress Crack',
              severity: 'critical',
              description: 'Missing 3mm aluminum gusset caused flex fracture. Also inspect for Loctite 243 residue.',
              targetImage: 'student_photo',
            },
            {
              id: 'int-ann-2',
              xPercent: 68,
              yPercent: 36,
              label: 'HTD Belt Slack',
              severity: 'warning',
              description: 'Adjust cam tensioner until deflection is 4mm max.',
              targetImage: 'student_photo',
            },
            {
              id: 'int-ann-3',
              xPercent: 42,
              yPercent: 48,
              label: 'CAD Ref: 3mm Al Gusset',
              severity: 'reference',
              description: 'Install #10-32 rivets + 3mm 6061 gusset plate per Rev5.',
              targetImage: 'cad_schematic',
            },
          ],
        },
        troubleshootingSteps: [
          {
            id: 'int-ts-1',
            stepNumber: 1,
            title: 'Swap cracked polycarbonate arm & bolt 3mm aluminum gusset',
            instruction:
              'Use spare pre-cut Rev5 polycarbonate plate with nylon locknuts (NO Loctite 243!) and rivet the 3mm gusset.',
            warningCallout: 'Using Loctite 243 on polycarbonate causes instant brittle cracking.',
            completed: false,
            highlightedTerms: ['Over-Bumper Intake', 'Loctite 243'],
          },
          {
            id: 'int-ts-2',
            stepNumber: 2,
            title: 'Verify extension hardstop & Bumper Zone inspection gauge',
            instruction:
              'Deploy intake fully and measure horizontal projection outside the Frame Perimeter with a tape measure (< 12 in. limit).',
            completed: false,
            highlightedTerms: ['Bumper Zone'],
          },
        ],
        citations: [
          {
            id: 'int-cit-1',
            title: '2026_FRC_Game_Manual.pdf',
            sourceType: 'game_manual',
            badgeLabel: 'Game Manual • R104 / R401',
            pageOrThread: 'Pages 68–73 — Frame Perimeter & Bumper Zone',
            excerpt:
              'Bumpers must protect the Frame Perimeter within the Bumper Zone; deployed Over-Bumper mechanisms may not exceed maximum allowed horizontal extension.',
            retrievalMethod: 'BM25 Keyword',
            relevanceScore: 0.94,
            url: '#manual-r401',
          },
          {
            id: 'int-cit-2',
            title: '846_OverBumper_Intake_CAD_Rev5.pdf',
            sourceType: 'cad_pdf',
            badgeLabel: '846 CAD PDF • p. 9',
            pageOrThread: 'Page 9 — Gusset & HTD Belt Tension',
            excerpt:
              '3mm 6061-T6 gusset bridges pivot bearing to polycarbonate side wall; target 4mm HTD 5mm belt deflection.',
            retrievalMethod: 'EmbeddingGemma-2 Dense',
            relevanceScore: 0.93,
            url: '#cad-intake-p9',
          },
        ],
      },
    ],
  },
];
