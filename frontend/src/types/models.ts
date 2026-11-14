export type SupportedLanguage = 'en' | 'es' | 'zh' | 'hi' | 'vi' | 'fr';

export type TranslationMode = 'bilingual_rookie' | 'full_native' | 'side_by_side';

export type ThemeMode = 'dark' | 'light';

export type AppView = 'chat' | 'knowledge_base';

export type DemoScenarioState = 'live' | 'empty' | 'error';

export type SearchRouteScope =
  | 'auto'
  | 'internal_rag'
  | 'chief_delphi'
  | 'wpilib_rules'
  | 'vision_lfm3';

export type AgentToolType =
  | 'controller'
  | 'internal_rag'
  | 'chief_delphi'
  | 'vision_lfm3'
  | 'reranker';

export type AgentStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'insufficient_retry'
  | 'error';

export interface AgentReasoningStep {
  id: string;
  tool: AgentToolType;
  title: string;
  detail: string;
  status: AgentStepStatus;
  durationMs?: number;
  iteration?: number;
  sufficiencyPassed?: boolean;
}

export interface VisualAnnotation {
  id: string;
  xPercent: number;
  yPercent: number;
  label: string;
  severity: 'critical' | 'warning' | 'reference';
  description: string;
  targetImage: 'student_photo' | 'cad_schematic';
}

export interface VisualComparisonData {
  id: string;
  title: string;
  studentPhotoUrl: string;
  studentPhotoCaption: string;
  cadSchematicUrl: string;
  cadSchematicCaption: string;
  cadDocumentSource: string;
  visionModel: 'LiquidAI LFM3-VL-2B';
  embeddingModel: 'EmbeddingGemma-2';
  similarityScore: number;
  detectedIssueSummary: string;
  annotations: VisualAnnotation[];
}

export interface TroubleshootingStepTranslation {
  title: string;
  instruction: string;
  warningCallout?: string;
}

export interface TroubleshootingStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  warningCallout?: string;
  completed: boolean;
  highlightedTerms?: string[];
  translations?: Partial<Record<SupportedLanguage, TroubleshootingStepTranslation>>;
}

export interface CodeSnippet {
  id: string;
  filename: string;
  language: 'java' | 'cpp' | 'python' | 'json';
  subsystem: string;
  code: string;
  explanation: string;
}

export interface SourceCitation {
  id: string;
  title: string;
  sourceType: 'team_sop' | 'cad_pdf' | 'chief_delphi' | 'game_manual' | 'team_code';
  badgeLabel: string;
  pageOrThread: string;
  excerpt: string;
  retrievalMethod:
    | 'EmbeddingGemma-2 Dense'
    | 'BM25 Keyword'
    | 'Hybrid RAG + Reranker'
    | 'ChiefDelphi Web API';
  relevanceScore: number;
  url: string;
}

export interface MediaAttachment {
  id: string;
  name: string;
  type: 'image' | 'video';
  previewUrl: string;
  fileSizeLabel: string;
  presetType?: 'swerve_bevel' | 'can_wiring' | 'intake_roller';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  content: string;
  translations?: Partial<Record<SupportedLanguage, string>>;
  detectedInputLanguage?: SupportedLanguage;
  selectedScope?: SearchRouteScope;
  attachments?: MediaAttachment[];
  reasoningSteps?: AgentReasoningStep[];
  sufficiencyLoops?: number;
  visualComparison?: VisualComparisonData;
  troubleshootingSteps?: TroubleshootingStep[];
  codeSnippets?: CodeSnippet[];
  citations?: SourceCitation[];
  isStreaming?: boolean;
  isError?: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  tags: string[];
  messages: ChatMessage[];
}

export type IngestionStage =
  | 'queued'
  | 'rendering_pages'
  | 'generating_embeddings'
  | 'indexing_bm25'
  | 'indexed'
  | 'error';

export type DocumentCategory =
  | 'Game Manual'
  | 'Spec Sheet'
  | 'CAD PDF'
  | 'Team Code'
  | '846 SOP';

export interface IngestionDocument {
  id: string;
  filename: string;
  category: DocumentCategory;
  fileSize: string;
  pageCount: number;
  stage: IngestionStage;
  progressPercent: number;
  visualEmbeddingsCount: number;
  bm25TokensCount: number;
  uploadedBy: string;
  uploadedAt: string;
}

export type GlossaryCategory =
  | 'Drivetrain'
  | 'Electrical & CAN'
  | 'Controls & WPILib'
  | 'FRC Rules'
  | '846 Custom Hardware';

export interface GlossaryTranslationEntry {
  term: string;
  definition: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  category: GlossaryCategory;
  subsystem: string;
  definition: string;
  rookieTip: string;
  aliases: string[];
  translations: Record<SupportedLanguage, GlossaryTranslationEntry>;
}
