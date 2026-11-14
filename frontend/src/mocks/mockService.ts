import {
  AgentReasoningStep,
  ChatMessage,
  DocumentCategory,
  IngestionDocument,
  MediaAttachment,
  SearchRouteScope,
  SupportedLanguage,
  VisualComparisonData,
} from '../types/models';
import {
  canCadSchematicSvg,
  intakeCadSchematicSvg,
  swerveCadSchematicSvg,
} from './schematicAssets';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SimulatedAgentCallbacks {
  onStepsUpdate: (steps: AgentReasoningStep[]) => void;
  onComplete: (message: ChatMessage) => void;
  onError: (errorMessage: ChatMessage) => void;
}

const detectLanguageHint = (text: string): SupportedLanguage | undefined => {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u0900-\u097f]/.test(text)) return 'hi';
  if (/[àáạảãâầấậẩẫăằắặẳẵđèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i.test(text))
    return 'vi';
  if (/[¿¡ñáéíóú]/i.test(text) || /\b(cómo|qué|cable|rueda|parpadea|equipo)\b/i.test(text))
    return 'es';
  if (/\b(bonjour|pourquoi|roue|réparer|comment)\b/i.test(text)) return 'fr';
  return undefined;
};

const pickVisualComparison = (
  query: string,
  attachments: MediaAttachment[]
): VisualComparisonData | undefined => {
  if (attachments.length === 0) return undefined;
  const first = attachments[0];
  const q = query.toLowerCase();

  if (
    first.presetType === 'can_wiring' ||
    q.includes('can') ||
    q.includes('talon') ||
    q.includes('wire') ||
    q.includes('cable')
  ) {
    return {
      id: `vc-${Date.now()}`,
      title: 'Bellypan CAN Wiring vs. 846 Electrical SOP v4',
      studentPhotoUrl: first.previewUrl,
      studentPhotoCaption: `Student Upload: ${first.name}`,
      cadSchematicUrl: canCadSchematicSvg,
      cadSchematicCaption: 'Retrieved SOP Diagram: 846_Pit_Electrical_SOP_v4.pdf (p. 7)',
      cadDocumentSource: 'EmbeddingGemma-2 Multimodal Store • Page 7',
      visionModel: 'LiquidAI LFM3-VL-2B',
      embeddingModel: 'EmbeddingGemma-2',
      similarityScore: 0.94,
      detectedIssueSummary:
        'Matched student bellypan image to 846 Electrical SOP p.7: inspect sharp aluminum tube pass-throughs for pinched CAN-H/CAN-L wires.',
      annotations: [
        {
          id: 'dyn-can-1',
          xPercent: 34,
          yPercent: 44,
          label: 'Inspect Pass-Through',
          severity: 'critical',
          description: 'Check yellow/green CAN twisted pair for abrasion and missing grommet.',
          targetImage: 'student_photo',
        },
        {
          id: 'dyn-can-2',
          xPercent: 69,
          yPercent: 56,
          label: 'Check Status LED',
          severity: 'warning',
          description: 'Verify CANivore / TalonFX status LED transitions from orange/red to solid green.',
          targetImage: 'student_photo',
        },
        {
          id: 'dyn-can-3',
          xPercent: 34,
          yPercent: 44,
          label: 'SOP Grommet Spec',
          severity: 'reference',
          description: 'Required rubber grommet + 60Ω termination check across CAN-H/L.',
          targetImage: 'cad_schematic',
        },
      ],
    };
  }

  if (
    first.presetType === 'intake_roller' ||
    q.includes('intake') ||
    q.includes('bumper') ||
    q.includes('polycarb') ||
    q.includes('裂')
  ) {
    return {
      id: `vc-${Date.now()}`,
      title: 'Over-Bumper Intake vs. 846 Intake CAD Rev5',
      studentPhotoUrl: first.previewUrl,
      studentPhotoCaption: `Student Upload: ${first.name}`,
      cadSchematicUrl: intakeCadSchematicSvg,
      cadSchematicCaption: 'Retrieved CAD PDF: 846_OverBumper_Intake_CAD_Rev5.pdf (p. 9)',
      cadDocumentSource: 'EmbeddingGemma-2 Multimodal Store • Page 9',
      visionModel: 'LiquidAI LFM3-VL-2B',
      embeddingModel: 'EmbeddingGemma-2',
      similarityScore: 0.93,
      detectedIssueSummary:
        'LFM3-VL-2B matched uploaded mechanism to Over-Bumper Intake Rev5: verify 3mm aluminum reinforcement gusset and HTD belt tension.',
      annotations: [
        {
          id: 'dyn-int-1',
          xPercent: 42,
          yPercent: 48,
          label: 'Reinforcement Gusset Check',
          severity: 'critical',
          description: 'Verify 3mm 6061 aluminum gusset is bolted across polycarbonate pivot area.',
          targetImage: 'student_photo',
        },
        {
          id: 'dyn-int-2',
          xPercent: 42,
          yPercent: 48,
          label: 'CAD Rev5 Gusset Spec',
          severity: 'reference',
          description: '846 CAD Rev5 requires #10-32 locknuts (no Loctite on polycarbonate).',
          targetImage: 'cad_schematic',
        },
      ],
    };
  }

  return {
    id: `vc-${Date.now()}`,
    title: 'Mechanism Inspection vs. 846 MK4i Swerve CAD Rev3',
    studentPhotoUrl: first.previewUrl,
    studentPhotoCaption: `Student Upload: ${first.name}`,
    cadSchematicUrl: swerveCadSchematicSvg,
    cadSchematicCaption: 'Retrieved CAD PDF: Funky_Monkeys_MK4i_Assembly_Rev3.pdf (p. 14)',
    cadDocumentSource: 'EmbeddingGemma-2 Multimodal Store • Page 14',
    visionModel: 'LiquidAI LFM3-VL-2B',
    embeddingModel: 'EmbeddingGemma-2',
    similarityScore: 0.95,
    detectedIssueSummary:
      'LFM3-VL-2B aligned your uploaded photo with MK4i Assembly Rev3 p.14. Verify 0.5mm bevel shim, CANCoder air gap, and M4 Loctite 243 torque.',
    annotations: [
      {
        id: 'dyn-sw-1',
        xPercent: 28,
        yPercent: 34,
        label: 'Bevel Mesh & Shim',
        severity: 'critical',
        description: 'Confirm 0.5mm thrust shim sits cleanly behind driven bevel gear.',
        targetImage: 'student_photo',
      },
      {
        id: 'dyn-sw-2',
        xPercent: 72,
        yPercent: 24,
        label: 'CANCoder LED & Gap',
        severity: 'warning',
        description: 'Check Phoenix Tuner X Magnet Health = GREEN (1.2mm air gap).',
        targetImage: 'student_photo',
      },
      {
        id: 'dyn-sw-3',
        xPercent: 28,
        yPercent: 34,
        label: 'CAD Ref: 0.5mm Shim',
        severity: 'reference',
        description: '0.08mm–0.15mm gear backlash target from Team 846 CAD PDF.',
        targetImage: 'cad_schematic',
      },
    ],
  };
};

export async function simulateAgentQuery(params: {
  query: string;
  scope: SearchRouteScope;
  attachments: MediaAttachment[];
  activeLanguage: SupportedLanguage;
  shouldFail: boolean;
  callbacks: SimulatedAgentCallbacks;
}): Promise<void> {
  const { query, scope, attachments, activeLanguage, shouldFail, callbacks } = params;
  const hasMedia = attachments.length > 0 || scope === 'vision_lfm3';
  const detectedLang = detectLanguageHint(query) ?? activeLanguage;
  const needsSecondLoop =
    scope === 'auto' &&
    (query.toLowerCase().includes('can') ||
      query.toLowerCase().includes('rule') ||
      query.toLowerCase().includes('bumper') ||
      query.toLowerCase().includes('regla') ||
      query.includes('规则'));

  const steps: AgentReasoningStep[] = [
    {
      id: 'live-1',
      tool: 'controller',
      title: 'Agentic Core: Routing Query & Cross-Lingual Embedding',
      detail:
        detectedLang !== 'en'
          ? `Detected ${detectedLang.toUpperCase()} query. Encoding cross-lingual intent with EmbeddingGemma-2 (scope: ${scope}).`
          : `Analyzing query intent and selecting optimal retrieval tools (scope: ${scope}).`,
      status: 'running',
      iteration: 1,
    },
  ];
  callbacks.onStepsUpdate([...steps]);
  await sleep(360);

  steps[0] = { ...steps[0], status: 'completed', durationMs: 180 };
  steps.push({
    id: 'live-2',
    tool: 'internal_rag',
    title: 'Searching Internal RAG (EmbeddingGemma-2 & BM25)...',
    detail: 'Querying Team 846 Multimodal Vector Store (CAD PDFs, SOPs, Java repo) & BM25 Keyword Index...',
    status: 'running',
    iteration: 1,
  });
  callbacks.onStepsUpdate([...steps]);
  await sleep(520);

  if (shouldFail) {
    steps[1] = {
      ...steps[1],
      status: 'error',
      detail: 'Connection timeout reaching EmbeddingGemma-2 Vector Store / LFM3-VL-2B inference endpoint (Simulated Error).',
    };
    callbacks.onStepsUpdate([...steps]);
    await sleep(200);
    callbacks.onError({
      id: `msg-err-${Date.now()}`,
      role: 'assistant',
      timestamp: 'Just now',
      isError: true,
      reasoningSteps: [...steps],
      content:
        'Unable to reach the simulated Team 846 Hybrid RAG / LFM3-VL-2B service. Switch off "Simulate Error" in the top bar and click Retry.',
      translations: {
        es: 'No se pudo conectar con el servicio simulado de RAG Híbrido / LFM3-VL-2B. Desactiva "Simulate Error" arriba y reintenta.',
        zh: '无法连接到模拟的 Team 846 混合检索 / LFM3-VL-2B 服务。请在顶部关闭“Simulate Error”后重试。',
        hi: 'सिमुलेटेड Team 846 RAG / LFM3-VL-2B सेवा से कनेक्ट नहीं हो सका। ऊपर "Simulate Error" बंद करें और पुनः प्रयास करें।',
        vi: 'Không thể kết nối dịch vụ Team 846 RAG / LFM3-VL-2B mô phỏng. Hãy tắt "Simulate Error" ở thanh trên và thử lại.',
        fr: 'Impossible de joindre le service simulé Team 846 RAG / LFM3-VL-2B. Désactivez « Simulate Error » en haut et réessayez.',
      },
    });
    return;
  }

  steps[1] = {
    ...steps[1],
    status: 'completed',
    durationMs: 415,
    detail: 'Retrieved 4 top chunks from 846_Pit_Electrical_SOP_v4.pdf, MK4i CAD Rev3, and SwerveConstants.java.',
  };

  if (hasMedia) {
    steps.push({
      id: 'live-3',
      tool: 'vision_lfm3',
      title: 'Running LFM3-VL-2B Vision Inspection on mechanism photo...',
      detail: 'Comparing uploaded mechanism media against top EmbeddingGemma-2 CAD PDF page renders...',
      status: 'running',
      iteration: 1,
    });
    callbacks.onStepsUpdate([...steps]);
    await sleep(600);
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      status: 'completed',
      durationMs: 590,
      detail: 'Extracted visual anomaly regions and matched reference CAD PDF schematic with 0.94+ cosine similarity.',
    };
  }

  if (needsSecondLoop) {
    steps.push({
      id: 'live-loop',
      tool: 'reranker',
      title: 'Sufficiency Check #1: Is Context Sufficient? → NO',
      detail: 'Internal SOP lacked latest ChiefDelphi / 2026 rule edge-case. Looping back to Agentic Controller...',
      status: 'insufficient_retry',
      durationMs: 170,
      iteration: 1,
      sufficiencyPassed: false,
    });
    callbacks.onStepsUpdate([...steps]);
    await sleep(480);
  }

  if (scope === 'auto' || scope === 'chief_delphi' || scope === 'wpilib_rules' || needsSecondLoop) {
    steps.push({
      id: 'live-4',
      tool: 'chief_delphi',
      title: 'Querying ChiefDelphi & Web Search API...',
      detail: 'Scanning ChiefDelphi threads & WPILib / 2026 FRC Game Manual rules...',
      status: 'running',
      iteration: needsSecondLoop ? 2 : 1,
    });
    callbacks.onStepsUpdate([...steps]);
    await sleep(480);
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      status: 'completed',
      durationMs: 430,
      detail: 'Verified community fixes on ChiefDelphi + WPILib Phoenix 6 API documentation.',
    };
  }

  steps.push({
    id: 'live-5',
    tool: 'reranker',
    title: 'Reranking context & verifying sufficiency...',
    detail: 'Cross-encoding BM25 + EmbeddingGemma-2 + Vision findings...',
    status: 'running',
    iteration: needsSecondLoop ? 2 : 1,
  });
  callbacks.onStepsUpdate([...steps]);
  await sleep(390);
  steps[steps.length - 1] = {
    ...steps[steps.length - 1],
    status: 'completed',
    durationMs: 205,
    detail: 'Is Context Sufficient? → YES (0.94 confidence). Generating multilingual Team 846 troubleshooting guide.',
    sufficiencyPassed: true,
  };
  callbacks.onStepsUpdate([...steps]);

  const visualComparison = pickVisualComparison(query, attachments);
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const responseMessage: ChatMessage = {
    id: `msg-bot-${Date.now()}`,
    role: 'assistant',
    timestamp: nowStr,
    detectedInputLanguage: detectedLang,
    sufficiencyLoops: needsSecondLoop ? 2 : 1,
    reasoningSteps: [...steps],
    visualComparison,
    content:
      `Based on Team 846’s Multimodal Vector Store (EmbeddingGemma-2 + BM25) and LiquidAI LFM3-VL-2B analysis for "${query.slice(0, 90)}${query.length > 90 ? '...' : ''}", verify the hardware interface (SDS MK4i Swerve / CANivore / Over-Bumper Intake) against the CAD reference first, then apply the checklist and WPILib calibration snippet below.`,
    translations: {
      es: `Según el Vector Store Multimodal del Equipo 846 (EmbeddingGemma-2 + BM25) y el análisis LiquidAI LFM3-VL-2B para "${query.slice(0, 75)}", verifica primero el ensamblaje físico (SDS MK4i Swerve / CANivore) contra el CAD y sigue la lista interactiva abajo.`,
      zh: `基于 846 战队多模态向量库（EmbeddingGemma-2 + BM25）与 LiquidAI LFM3-VL-2B 对您问题的分析，请先对照 CAD 图纸核对机械/电气接口（SDS MK4i Swerve / CANivore / Over-Bumper Intake），再按下方分步清单与 WPILib 代码执行校准。`,
      hi: `Team 846 के मल्टीमॉडल वेक्टर स्टोर (EmbeddingGemma-2 + BM25) और LiquidAI LFM3-VL-2B विश्लेषण के अनुसार, पहले CAD से हार्डवेयर (SDS MK4i Swerve / CANivore) की जांच करें और नीचे दिए गए स्टेप्स और WPILib कोड को लागू करें।`,
      vi: `Dựa trên Kho Vector Đa Phương Thức của Team 846 (EmbeddingGemma-2 + BM25) và phân tích LiquidAI LFM3-VL-2B, hãy đối chiếu phần cứng (SDS MK4i Swerve / CANivore) với bản vẽ CAD rồi làm theo danh sách và đoạn mã WPILib bên dưới.`,
      fr: `D’après le Vector Store Multimodal Team 846 (EmbeddingGemma-2 + BM25) et l’analyse LiquidAI LFM3-VL-2B, vérifiez d’abord le montage (SDS MK4i Swerve / CANivore) par rapport au plan CAD puis suivez la procédure ci-dessous.`,
    },
    troubleshootingSteps: [
      {
        id: `dyn-ts-1-${Date.now()}`,
        stepNumber: 1,
        title: 'Safety lockout & physical inspection against 846 CAD reference',
        instruction:
          'Unplug main Anderson battery connector, put the drivetrain on pit blocks, and verify fastener torque using Loctite 243 (metal-to-metal only).',
        warningCallout: 'Never apply Loctite 243 onto polycarbonate plates or electrical connectors.',
        completed: false,
        highlightedTerms: ['Loctite 243', 'SDS MK4i Swerve'],
        translations: {
          es: {
            title: 'Bloqueo de seguridad e inspección física contra el CAD 846',
            instruction:
              'Desconecta la batería Anderson y verifica el torque de pernos con Loctite 243 (solo metal con metal).',
            warningCallout: 'Nunca apliques Loctite 243 sobre policarbonato.',
          },
          zh: {
            title: '断电安全锁定并对照 846 CAD 进行机械检查',
            instruction: '拔掉主电池 Anderson 插头，检查金属紧固件扭矩及 Loctite 243（仅限金属螺纹）。',
            warningCallout: '严禁将 Loctite 243 涂抹在聚碳酸酯板上。',
          },
          hi: {
            title: 'सुरक्षा लॉकआउट और 846 CAD के साथ भौतिक जांच',
            instruction: 'बैटरी प्लग निकालें और केवल मेटल बोल्ट पर Loctite 243 के साथ टॉर्क जांचें।',
          },
          vi: {
            title: 'Ngắt nguồn an toàn và kiểm tra đối chiếu bản vẽ CAD 846',
            instruction: 'Rút giắc pin Anderson và kiểm tra lực siết ốc kim loại với Loctite 243.',
          },
          fr: {
            title: 'Mise en sécurité et contrôle visuel par rapport au CAD 846',
            instruction: 'Débranchez la batterie Anderson et vérifiez le couple des vis acier avec Loctite 243.',
          },
        },
      },
      {
        id: `dyn-ts-2-${Date.now()}`,
        stepNumber: 2,
        title: 'Verify CANivore bus health & CANCoder Magnet Offset',
        instruction:
          'Run Phoenix Tuner X self-test on CANivore ("846_CANivore"), verify 120Ω Termination Resistor (~60Ω off-power), and confirm green LEDs on TalonFX / CANCoder.',
        completed: false,
        highlightedTerms: ['CANivore', 'CANCoder Magnet Offset', '120Ω Termination Resistor', 'TalonFX'],
        translations: {
          es: {
            title: 'Verifica salud del CANivore y CANCoder Magnet Offset',
            instruction:
              'Ejecuta Phoenix Tuner X en "846_CANivore", mide ~60Ω del 120Ω Termination Resistor y confirma LED verde en TalonFX.',
          },
          zh: {
            title: '检查 CANivore 总线健康度与 CANCoder Magnet Offset',
            instruction: '在 Phoenix Tuner X 中检查 CANivore 总线，断电测量 120Ω Termination Resistor（并联应为 ~60Ω），确认绿灯。',
          },
          hi: {
            title: 'CANivore बस और CANCoder Magnet Offset जांचें',
            instruction: 'Phoenix Tuner X में CANivore चेक करें और 120Ω Termination Resistor (~60Ω) सत्यापित करें।',
          },
          vi: {
            title: 'Kiểm tra CANivore và CANCoder Magnet Offset',
            instruction: 'Chạy Phoenix Tuner X trên CANivore và đo 120Ω Termination Resistor (~60Ω khi tắt nguồn).',
          },
          fr: {
            title: 'Vérifier le bus CANivore et le CANCoder Magnet Offset',
            instruction: 'Testez le bus CANivore dans Phoenix Tuner X et mesurez ~60Ω aux bornes de la 120Ω Termination Resistor.',
          },
        },
      },
      {
        id: `dyn-ts-3-${Date.now()}`,
        stepNumber: 3,
        title: 'Deploy & log pit test check in WPILib AdvantageScope',
        instruction:
          'Deploy updated constants, run a 20% slow test on blocks, and verify Bumper Zone clearance before returning to queue.',
        completed: false,
        highlightedTerms: ['Bumper Zone'],
        translations: {
          es: {
            title: 'Despliega código y valida en WPILib AdvantageScope',
            instruction: 'Prueba al 20% sobre bloques y confirma espacio libre en Bumper Zone.',
          },
          zh: {
            title: '部署代码并在 WPILib AdvantageScope 记录测试',
            instruction: '架空以 20% 速度测试，并核对 Bumper Zone 合规间隙。',
          },
          hi: {
            title: 'कोड डिप्लॉय करें और WPILib AdvantageScope में जांचें',
            instruction: 'ब्लॉक्स पर 20% गति से टेस्ट करें और Bumper Zone क्लियरेंस देखें।',
          },
          vi: {
            title: 'Nạp code và kiểm tra log WPILib AdvantageScope',
            instruction: 'Chạy thử 20% trên khối kê và kiểm tra khoảng hở Bumper Zone.',
          },
          fr: {
            title: 'Déployer et vérifier dans WPILib AdvantageScope',
            instruction: 'Testez à 20 % sur cales et contrôlez le gabarit Bumper Zone.',
          },
        },
      },
    ],
    codeSnippets: [
      {
        id: `dyn-code-${Date.now()}`,
        filename: 'src/main/java/frc/robot/util/PitDiagnostics846.java',
        language: 'java',
        subsystem: 'Team 846 • Pit Self-Test',
        explanation:
          'Quick Team 846 Phoenix 6 diagnostic helper to check CANivore bus utilization and CANCoder magnet health in the pit.',
        code: `// Team 846 Pit Diagnostic Check (Phoenix 6 + WPILib)
public static boolean isSubsystemHealthy(CANBus canBus, CANcoder encoder) {
    var status = canBus.getStatus();
    double busUtilPct = status.BusUtilization * 100.0;
    var magnetHealth = encoder.getMagnetHealth().getValue();

    SmartDashboard.putNumber("Pit/CANivoreUtilPct", busUtilPct);
    SmartDashboard.putString("Pit/CANCoderHealth", magnetHealth.toString());

    return busUtilPct < 75.0 && magnetHealth == MagnetHealthValue.Magnet_Green;
}`,
      },
    ],
    citations: [
      {
        id: `dyn-cit-1-${Date.now()}`,
        title: '846_Pit_Electrical_SOP_v4.pdf',
        sourceType: 'team_sop',
        badgeLabel: '846 SOP v4 • p. 4-7',
        pageOrThread: 'Pages 4–7 — Fasteners, CANivore & 60Ω Test',
        excerpt:
          'Verify CANivore bus utilization stays below 75% and all steel MK4i bolts use Loctite 243.',
        retrievalMethod: 'Hybrid RAG + Reranker',
        relevanceScore: 0.94,
        url: '#sop-v4',
      },
      {
        id: `dyn-cit-2-${Date.now()}`,
        title: 'Funky_Monkeys_MK4i_Assembly_Rev3.pdf',
        sourceType: 'cad_pdf',
        badgeLabel: '846 CAD PDF • p. 14',
        pageOrThread: 'Page 14 — Module Assembly Tolerances',
        excerpt: 'Exploded schematic reference retrieved via EmbeddingGemma-2 visual page embeddings.',
        retrievalMethod: 'EmbeddingGemma-2 Dense',
        relevanceScore: 0.92,
        url: '#cad-rev3',
      },
      {
        id: `dyn-cit-3-${Date.now()}`,
        title: 'ChiefDelphi & WPILib Phoenix 6 Troubleshooting Guide',
        sourceType: 'chief_delphi',
        badgeLabel: 'ChiefDelphi / WPILib',
        pageOrThread: 'Phoenix 6 Diagnostics & Magnet Health',
        excerpt:
          'Magnet_Green indicates optimal 1.2mm air gap; BusUtilization > 85% points to damaged CAN wiring or missing 120Ω terminator.',
        retrievalMethod: 'ChiefDelphi Web API',
        relevanceScore: 0.89,
        url: 'https://www.chiefdelphi.com',
      },
    ],
  };

  callbacks.onComplete(responseMessage);
}

export async function simulateDocumentIngestion(
  filename: string,
  category: DocumentCategory,
  fileSize: string,
  pageCount: number,
  onProgress: (doc: IngestionDocument) => void
): Promise<void> {
  const id = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const baseDoc: IngestionDocument = {
    id,
    filename,
    category,
    fileSize,
    pageCount,
    stage: 'queued',
    progressPercent: 8,
    visualEmbeddingsCount: 0,
    bm25TokensCount: 0,
    uploadedBy: 'Pit Mentor (You)',
    uploadedAt: 'Just now',
  };

  onProgress(baseDoc);
  await sleep(450);

  onProgress({
    ...baseDoc,
    stage: 'rendering_pages',
    progressPercent: 32,
  });
  await sleep(750);

  onProgress({
    ...baseDoc,
    stage: 'generating_embeddings',
    progressPercent: 68,
    visualEmbeddingsCount: Math.max(1, Math.floor(pageCount * 0.7)),
  });
  await sleep(850);

  onProgress({
    ...baseDoc,
    stage: 'indexing_bm25',
    progressPercent: 90,
    visualEmbeddingsCount: pageCount,
    bm25TokensCount: pageCount * 380,
  });
  await sleep(600);

  onProgress({
    ...baseDoc,
    stage: 'indexed',
    progressPercent: 100,
    visualEmbeddingsCount: pageCount,
    bm25TokensCount: pageCount * 412,
  });
}
