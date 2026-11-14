import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Camera,
  Database,
  Film,
  Languages,
  Sparkles,
  User,
  Wrench,
} from 'lucide-react';
import {
  AgentReasoningStep,
  AppView,
  ChatMessage,
  ChatThread,
  DemoScenarioState,
  DocumentCategory,
  GlossaryTerm,
  IngestionDocument,
  MediaAttachment,
  SearchRouteScope,
  SupportedLanguage,
  ThemeMode,
  TranslationMode,
} from './types/models';
import {
  INITIAL_DOCUMENTS,
  INITIAL_GLOSSARY_TERMS,
  INITIAL_THREADS,
  MULTILINGUAL_QUICK_PROMPTS,
  SAMPLE_MECHANISM_ATTACHMENTS,
} from './mocks/mockData';
import { simulateAgentQuery, simulateDocumentIngestion } from './mocks/mockService';
import { HeaderBar } from './components/HeaderBar';
import { LeftSidebar } from './components/LeftSidebar';
import { RichResponseCard } from './components/chat/RichResponseCard';
import { MultimodalInputDock } from './components/chat/MultimodalInputDock';
import { AgentThinkingAccordion } from './components/chat/AgentThinkingAccordion';
import { KnowledgeBaseDashboard } from './components/knowledge/KnowledgeBaseDashboard';

export function App() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeView, setActiveView] = useState<AppView>('chat');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [translationMode, setTranslationMode] =
    useState<TranslationMode>('bilingual_rookie');
  const [demoScenario, setDemoScenario] = useState<DemoScenarioState>('live');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    INITIAL_THREADS[0]?.id ?? null
  );
  const [documents, setDocuments] = useState<IngestionDocument[]>(INITIAL_DOCUMENTS);
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>(
    INITIAL_GLOSSARY_TERMS
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [liveSteps, setLiveSteps] = useState<AgentReasoningStep[]>([]);
  const [lastQueryContext, setLastQueryContext] = useState<{
    text: string;
    scope: SearchRouteScope;
    attachments: MediaAttachment[];
  } | null>(null);

  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === 'doc-7' && d.stage !== 'indexed'
            ? {
                ...d,
                stage: 'indexed',
                progressPercent: 100,
                visualEmbeddingsCount: d.pageCount,
                bm25TokensCount: 3180,
              }
            : d
        )
      );
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages.length, liveSteps.length, isGenerating]);

  const handleNewChat = () => {
    const newThread: ChatThread = {
      id: `thread-${Date.now()}`,
      title: 'New Pit Troubleshooting Session',
      subtitle: 'Team 846 Multimodal Agentic RAG',
      updatedAt: 'Just now',
      tags: ['New Session'],
      messages: [],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setActiveView('chat');
    if (demoScenario === 'empty') setDemoScenario('live');
  };

  const handleDeleteThread = (threadId: string) => {
    setThreads((prev) => {
      const remaining = prev.filter((t) => t.id !== threadId);
      if (activeThreadId === threadId) {
        setActiveThreadId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  };

  const handleSendMessage = async (
    text: string,
    scope: SearchRouteScope,
    attachments: MediaAttachment[]
  ) => {
    if (demoScenario === 'empty') {
      setDemoScenario('live');
    }

    let targetThreadId = activeThreadId;
    if (!targetThreadId) {
      const created: ChatThread = {
        id: `thread-${Date.now()}`,
        title: text.slice(0, 42) || 'Mechanism Vision Inspection',
        subtitle: `Scope: ${scope} • Team 846 AI`,
        updatedAt: 'Just now',
        tags: attachments.length > 0 ? ['Vision', '846 Pit'] : ['Pit Query'],
        messages: [],
      };
      setThreads((prev) => [created, ...prev]);
      setActiveThreadId(created.id);
      targetThreadId = created.id;
    }

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text,
      selectedScope: scope,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setLastQueryContext({ text, scope, attachments });

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== targetThreadId) return t;
        const isFreshTitle = t.messages.length === 0;
        return {
          ...t,
          title: isFreshTitle ? text.slice(0, 44) : t.title,
          subtitle: attachments.length > 0 ? 'LFM3-VL-2B Vision + Hybrid RAG' : t.subtitle,
          updatedAt: 'Just now',
          messages: [...t.messages, userMsg],
        };
      })
    );

    setIsGenerating(true);
    setLiveSteps([]);

    await simulateAgentQuery({
      query: text,
      scope,
      attachments,
      activeLanguage: language,
      shouldFail: demoScenario === 'error',
      callbacks: {
        onStepsUpdate: (steps) => {
          setLiveSteps(steps);
        },
        onComplete: (botMessage) => {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === targetThreadId
                ? { ...t, updatedAt: 'Just now', messages: [...t.messages, botMessage] }
                : t
            )
          );
          setIsGenerating(false);
          setLiveSteps([]);
        },
        onError: (errMessage) => {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === targetThreadId
                ? { ...t, updatedAt: 'Error', messages: [...t.messages, errMessage] }
                : t
            )
          );
          setIsGenerating(false);
          setLiveSteps([]);
        },
      },
    });
  };

  const handleRetryLastError = () => {
    if (!lastQueryContext) return;
    setDemoScenario('live');
    setTimeout(() => {
      handleSendMessage(
        lastQueryContext.text,
        lastQueryContext.scope,
        lastQueryContext.attachments
      );
    }, 50);
  };

  const handleToggleStepComplete = (messageId: string, stepId: string) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeThreadId) return t;
        return {
          ...t,
          messages: t.messages.map((m) => {
            if (m.id !== messageId || !m.troubleshootingSteps) return m;
            return {
              ...m,
              troubleshootingSteps: m.troubleshootingSteps.map((s) =>
                s.id === stepId ? { ...s, completed: !s.completed } : s
              ),
            };
          }),
        };
      })
    );
  };

  const handleResetSteps = (messageId: string) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeThreadId) return t;
        return {
          ...t,
          messages: t.messages.map((m) => {
            if (m.id !== messageId || !m.troubleshootingSteps) return m;
            return {
              ...m,
              troubleshootingSteps: m.troubleshootingSteps.map((s) => ({
                ...s,
                completed: false,
              })),
            };
          }),
        };
      })
    );
  };

  const upsertIngestingDoc = (doc: IngestionDocument) => {
    setDocuments((prev) => {
      const exists = prev.some((d) => d.id === doc.id);
      if (exists) {
        return prev.map((d) => (d.id === doc.id ? doc : d));
      }
      return [doc, ...prev];
    });
  };

  const handleUploadFiles = (files: File[], category: DocumentCategory) => {
    files.forEach((file) => {
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      const estPages = file.name.endsWith('.pdf') ? 14 : 4;
      simulateDocumentIngestion(
        file.name,
        category,
        sizeStr,
        estPages,
        upsertIngestingDoc
      );
    });
  };

  const handleSimulateSampleIngestion = (category: DocumentCategory) => {
    const sampleNames: Record<DocumentCategory, { name: string; size: string; pages: number }> = {
      'CAD PDF': { name: '846_2026_Shooter_Pivot_CAD_Rev2.pdf', size: '14.2 MB', pages: 22 },
      '846 SOP': { name: '846_Bumper_Fab_and_Inspection_SOP.pdf', size: '5.8 MB', pages: 11 },
      'Game Manual': { name: '2026_FRC_Team_Update_09.pdf', size: '3.4 MB', pages: 8 },
      'Spec Sheet': { name: 'CTRE_Kraken_X60_Datasheet.pdf', size: '2.6 MB', pages: 10 },
      'Team Code': { name: 'ShooterSubsystem.java', size: '18 KB', pages: 3 },
    };
    const picked = sampleNames[category];
    simulateDocumentIngestion(
      picked.name,
      category,
      picked.size,
      picked.pages,
      upsertIngestingDoc
    );
  };

  const activeIngestionCount = documents.filter((d) => d.stage !== 'indexed').length;

  const showEmptyState =
    demoScenario === 'empty' ||
    !activeThread ||
    activeThread.messages.length === 0;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden theme-bg-primary theme-text-primary">
      <HeaderBar
        activeView={activeView}
        onViewChange={setActiveView}
        language={language}
        onLanguageChange={setLanguage}
        translationMode={translationMode}
        onTranslationModeChange={setTranslationMode}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        demoScenario={demoScenario}
        onDemoScenarioChange={setDemoScenario}
        activeIngestionCount={activeIngestionCount}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <LeftSidebar
          isOpen={sidebarOpen}
          threads={demoScenario === 'empty' ? [] : threads}
          activeThreadId={demoScenario === 'empty' ? null : activeThreadId}
          onSelectThread={(id) => {
            setActiveThreadId(id);
            setActiveView('chat');
            if (demoScenario === 'empty') setDemoScenario('live');
          }}
          onNewChat={handleNewChat}
          onDeleteThread={handleDeleteThread}
          documents={documents}
          onNavigateKnowledgeBase={() => setActiveView('knowledge_base')}
          language={language}
        />

        {activeView === 'knowledge_base' ? (
          <KnowledgeBaseDashboard
            documents={documents}
            onUploadFiles={handleUploadFiles}
            onSimulateSampleIngestion={handleSimulateSampleIngestion}
            onDeleteDocument={(id) =>
              setDocuments((prev) => prev.filter((d) => d.id !== id))
            }
            glossaryTerms={glossaryTerms}
            onAddGlossaryTerm={(term) => setGlossaryTerms((prev) => [term, ...prev])}
            onDeleteGlossaryTerm={(id) =>
              setGlossaryTerms((prev) => prev.filter((t) => t.id !== id))
            }
            language={language}
          />
        ) : (
          <main className="flex-1 flex flex-col min-w-0 min-h-0">
            {demoScenario === 'error' && (
              <div className="px-4 py-2 bg-red-500/15 border-b border-red-500/40 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-red-500 dark:text-red-300 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Error Simulation Active: Next query will demonstrate agentic timeout &amp;
                    recovery UI.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDemoScenario('live')}
                  className="px-2.5 py-1 rounded-lg bg-red-500 text-white font-bold text-[11px]"
                >
                  Restore Live
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-5">
              <div className="max-w-4xl mx-auto space-y-5">
                {showEmptyState ? (
                  <div className="py-10 px-4 text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl theme-accent-bg shadow-lg font-black text-2xl">
                      846
                    </div>
                    <div className="space-y-2 max-w-xl mx-auto">
                      <h1 className="text-xl sm:text-2xl font-extrabold theme-text-primary">
                        Team 846 “The Funky Monkeys” Pit Assistant
                      </h1>
                      <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
                        Ask a question in any supported language, or upload a photo/video of a
                        broken mechanism. Powered by{' '}
                        <strong>EmbeddingGemma-2 + BM25 Hybrid RAG</strong>,{' '}
                        <strong>ChiefDelphi Search</strong>, and{' '}
                        <strong>LiquidAI LFM3-VL-2B Vision</strong>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                      {MULTILINGUAL_QUICK_PROMPTS.map((qp) => {
                        const sampleAtt = qp.presetAttachmentId
                          ? SAMPLE_MECHANISM_ATTACHMENTS.find(
                              (s) => s.id === qp.presetAttachmentId
                            )
                          : undefined;
                        return (
                          <button
                            key={qp.id}
                            type="button"
                            onClick={() =>
                              handleSendMessage(
                                qp.text,
                                sampleAtt ? 'auto' : 'wpilib_rules',
                                sampleAtt ? [sampleAtt] : []
                              )
                            }
                            className="p-3.5 rounded-2xl theme-bg-surface hover:theme-bg-hover theme-border border transition-all space-y-1.5 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md theme-accent-soft text-banana-700 dark:text-banana-300">
                                {qp.badge}
                              </span>
                              {sampleAtt ? (
                                <Camera className="w-3.5 h-3.5 text-banana-500" />
                              ) : (
                                <Languages className="w-3.5 h-3.5 text-banana-500" />
                              )}
                            </div>
                            <p className="text-xs font-medium theme-text-primary group-hover:text-banana-600 dark:group-hover:text-banana-300 transition-colors">
                              {qp.text}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] theme-text-muted">
                      <span className="flex items-center gap-1">
                        <Database className="w-3.5 h-3.5 text-banana-500" />
                        {documents.length} Team 846 Docs Indexed
                      </span>
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5 text-banana-500" />
                        {glossaryTerms.length} Bilingual Glossary Terms
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-banana-500" />
                        Sufficiency Loop Verified
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeThread.messages.map((msg) => {
                      if (msg.role === 'user') {
                        const translatedUserText =
                          language !== 'en' && msg.translations?.[language]
                            ? msg.translations[language]
                            : undefined;
                        return (
                          <div key={msg.id} className="flex items-start gap-3 justify-end">
                            <div className="max-w-2xl rounded-2xl rounded-tr-sm theme-bg-elevated theme-border border px-4 py-3 space-y-2 shadow-sm">
                              <div className="flex items-center justify-between gap-3 text-[11px] theme-text-muted">
                                <span className="font-bold theme-text-primary">
                                  Rookie / Pit Student
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {msg.selectedScope && msg.selectedScope !== 'auto' && (
                                    <span className="px-1.5 py-0.2 rounded theme-accent-soft text-banana-700 dark:text-banana-300 font-semibold text-[10px]">
                                      Scope: {msg.selectedScope}
                                    </span>
                                  )}
                                  <span>{msg.timestamp}</span>
                                </div>
                              </div>

                              <p className="text-sm theme-text-primary leading-relaxed">
                                {msg.content}
                              </p>

                              {translatedUserText && (
                                <p className="text-xs theme-text-secondary italic border-t theme-border pt-1.5">
                                  Translated ({language.toUpperCase()}): {translatedUserText}
                                </p>
                              )}

                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {msg.attachments.map((att) => (
                                    <div
                                      key={att.id}
                                      className="rounded-xl overflow-hidden theme-border border bg-espresso-950 w-44"
                                    >
                                      {att.type === 'video' ? (
                                        <div className="h-24 flex flex-col items-center justify-center gap-1 text-banana-400">
                                          <Film className="w-6 h-6" />
                                          <span className="text-[10px]">Video Clip</span>
                                        </div>
                                      ) : (
                                        <img
                                          src={att.previewUrl}
                                          alt={att.name}
                                          className="w-full h-24 object-cover"
                                        />
                                      )}
                                      <div className="px-2 py-1 text-[10px] text-cream-100 truncate bg-espresso-900">
                                        {att.name}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="w-8 h-8 rounded-xl theme-bg-elevated theme-border border flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 theme-text-primary" />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl theme-accent-bg flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <RichResponseCard
                              message={msg}
                              language={language}
                              translationMode={translationMode}
                              glossaryTerms={glossaryTerms}
                              onToggleStepComplete={handleToggleStepComplete}
                              onResetSteps={handleResetSteps}
                              onRetryError={handleRetryLastError}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {isGenerating && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl theme-accent-bg flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <AgentThinkingAccordion
                            steps={liveSteps}
                            sufficiencyLoops={
                              liveSteps.some((s) => s.status === 'insufficient_retry') ? 2 : 1
                            }
                            isStreaming={true}
                            language={language}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={feedEndRef} />
              </div>
            </div>

            <MultimodalInputDock
              language={language}
              isGenerating={isGenerating}
              onSendMessage={handleSendMessage}
            />
          </main>
        )}
      </div>
    </div>
  );
}

export default App;
