import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckSquare,
  Code2,
  Copy,
  ExternalLink,
  FileCode,
  FileText,
  Globe,
  Languages,
  RotateCcw,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import {
  ChatMessage,
  GlossaryTerm,
  SourceCitation,
  SupportedLanguage,
  TranslationMode,
} from '../../types/models';
import { UI_TRANSLATIONS } from '../../mocks/mockData';
import { AgentThinkingAccordion } from './AgentThinkingAccordion';
import { VisualComparisonCard } from './VisualComparisonCard';

interface RichResponseCardProps {
  message: ChatMessage;
  language: SupportedLanguage;
  translationMode: TranslationMode;
  glossaryTerms: GlossaryTerm[];
  onToggleStepComplete: (messageId: string, stepId: string) => void;
  onResetSteps: (messageId: string) => void;
  onRetryError?: () => void;
}

export const RichResponseCard: React.FC<RichResponseCardProps> = ({
  message,
  language,
  translationMode,
  glossaryTerms,
  onToggleStepComplete,
  onResetSteps,
  onRetryError,
}) => {
  const [localLangView, setLocalLangView] = useState<'follow_global' | 'english' | 'side_by_side'>(
    'follow_global'
  );
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [inspectedCitation, setInspectedCitation] = useState<SourceCitation | null>(null);

  const ui = UI_TRANSLATIONS[language];

  const termRegex = useMemo(() => {
    if (glossaryTerms.length === 0) return null;
    const escaped = glossaryTerms
      .map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length);
    return new RegExp(`(${escaped.join('|')})`, 'gi');
  }, [glossaryTerms]);

  const renderAnnotatedText = (text: string) => {
    if (!termRegex) return text;
    const parts = text.split(termRegex);
    return parts.map((part, idx) => {
      const matched = glossaryTerms.find(
        (g) => g.term.toLowerCase() === part.toLowerCase()
      );
      if (!matched) return <React.Fragment key={idx}>{part}</React.Fragment>;
      return (
        <button
          key={idx}
          type="button"
          onClick={() => setSelectedTerm(matched)}
          title={`Click for ${language.toUpperCase()} glossary definition`}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded-md font-semibold text-[0.92em] bg-banana-400/20 text-banana-700 dark:text-banana-300 border border-banana-500/40 hover:bg-banana-400/35 transition-colors cursor-pointer"
        >
          <span>{part}</span>
          <BookOpen className="w-2.5 h-2.5 opacity-80" />
        </button>
      );
    });
  };

  const handleCopyCode = async (snippetId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for restricted clipboard environments
    }
    setCopiedCodeId(snippetId);
    setTimeout(() => setCopiedCodeId((prev) => (prev === snippetId ? null : prev)), 2000);
  };

  const effectiveTranslation =
    language !== 'en' && message.translations?.[language]
      ? message.translations[language]
      : undefined;

  const showSideBySide =
    localLangView === 'side_by_side' ||
    (localLangView === 'follow_global' &&
      language !== 'en' &&
      translationMode === 'side_by_side' &&
      Boolean(effectiveTranslation));

  const displayPrimaryText =
    localLangView === 'english' || language === 'en'
      ? message.content
      : effectiveTranslation ?? message.content;

  const steps = message.troubleshootingSteps ?? [];
  const completedStepsCount = steps.filter((s) => s.completed).length;

  return (
    <div className="space-y-3">
      {message.reasoningSteps && message.reasoningSteps.length > 0 && (
        <AgentThinkingAccordion
          steps={message.reasoningSteps}
          sufficiencyLoops={message.sufficiencyLoops}
          isStreaming={message.isStreaming}
          language={language}
        />
      )}

      {message.isError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-red-500 dark:text-red-300">
                Agentic Retrieval Error (Simulated)
              </p>
              <p className="theme-text-secondary mt-0.5">{displayPrimaryText}</p>
            </div>
          </div>
          {onRetryError && (
            <button
              type="button"
              onClick={onRetryError}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
            >
              Retry Query
            </button>
          )}
        </div>
      )}

      {!message.isError && (
        <div className="rounded-2xl theme-bg-surface theme-border border p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b theme-border">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold theme-accent-bg">
                <Sparkles className="w-3 h-3" />
                Team 846 AI Answer
              </span>
              {language !== 'en' && (
                <span className="text-[11px] font-medium text-banana-700 dark:text-banana-300 flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" />
                  {translationMode === 'bilingual_rookie'
                    ? ui.bilingualBadge
                    : `Translated (${language.toUpperCase()})`}
                </span>
              )}
            </div>

            {effectiveTranslation && (
              <div className="flex items-center gap-1 text-[11px] p-0.5 rounded-lg theme-bg-elevated theme-border border">
                <button
                  type="button"
                  onClick={() => setLocalLangView('follow_global')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    localLangView === 'follow_global'
                      ? 'theme-accent-bg'
                      : 'theme-text-muted hover:theme-text-primary'
                  }`}
                >
                  {language.toUpperCase()}
                </button>
                <button
                  type="button"
                  onClick={() => setLocalLangView('side_by_side')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    localLangView === 'side_by_side'
                      ? 'theme-accent-bg'
                      : 'theme-text-muted hover:theme-text-primary'
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  type="button"
                  onClick={() => setLocalLangView('english')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    localLangView === 'english'
                      ? 'theme-accent-bg'
                      : 'theme-text-muted hover:theme-text-primary'
                  }`}
                >
                  EN
                </button>
              </div>
            )}
          </div>

          {showSideBySide && effectiveTranslation ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl theme-bg-elevated/60 theme-border border">
                <p className="text-[10px] font-bold uppercase tracking-wider theme-text-muted mb-1">
                  English (Original Pit Reference)
                </p>
                <p className="text-sm leading-relaxed theme-text-primary">
                  {renderAnnotatedText(message.content)}
                </p>
              </div>
              <div className="p-3 rounded-xl theme-accent-soft border border-banana-500/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-banana-700 dark:text-banana-300 mb-1">
                  Translated ({language.toUpperCase()}) • Tech Terms Anchored
                </p>
                <p className="text-sm leading-relaxed theme-text-primary">
                  {renderAnnotatedText(effectiveTranslation)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed theme-text-primary">
              {renderAnnotatedText(displayPrimaryText)}
            </p>
          )}

          {selectedTerm && (
            <div className="p-3 rounded-xl theme-bg-elevated border border-banana-500/60 space-y-1.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <BookOpen className="w-4 h-4 text-banana-500 shrink-0" />
                  <span className="text-xs font-bold theme-text-primary">
                    {selectedTerm.term}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded theme-bg-surface theme-border border theme-text-muted">
                    {selectedTerm.category} • {selectedTerm.subsystem}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTerm(null)}
                  className="p-1 rounded hover:theme-bg-hover theme-text-muted"
                  aria-label="Close glossary definition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs theme-text-secondary">
                {language !== 'en'
                  ? selectedTerm.translations[language]?.definition ?? selectedTerm.definition
                  : selectedTerm.definition}
              </p>
              {language !== 'en' && (
                <p className="text-[11px] theme-text-muted italic">
                  EN: {selectedTerm.definition}
                </p>
              )}
              <p className="text-[11px] text-banana-700 dark:text-banana-300 font-medium">
                846 Pit Tip: {selectedTerm.rookieTip}
              </p>
            </div>
          )}

          {message.visualComparison && (
            <VisualComparisonCard
              comparison={message.visualComparison}
              language={language}
            />
          )}

          {steps.length > 0 && (
            <div className="rounded-xl theme-bg-elevated/60 theme-border border p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold theme-text-primary">
                    {ui.stepsCompleted}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full theme-accent-soft text-banana-700 dark:text-banana-300 font-bold">
                    {completedStepsCount}/{steps.length} Done
                  </span>
                </div>
                {completedStepsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onResetSteps(message.id)}
                    className="flex items-center gap-1 text-[11px] theme-text-muted hover:theme-text-primary transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              <div className="w-full h-1.5 rounded-full theme-bg-surface overflow-hidden">
                <div
                  className="h-full bg-banana-400 transition-all duration-300"
                  style={{
                    width: `${Math.round((completedStepsCount / steps.length) * 100)}%`,
                  }}
                />
              </div>

              <div className="space-y-2">
                {steps.map((step) => {
                  const translatedStep =
                    localLangView !== 'english' && language !== 'en'
                      ? step.translations?.[language]
                      : undefined;
                  const stepTitle = translatedStep?.title ?? step.title;
                  const stepInstruction = translatedStep?.instruction ?? step.instruction;
                  const stepWarning = translatedStep?.warningCallout ?? step.warningCallout;

                  return (
                    <div
                      key={step.id}
                      onClick={() => onToggleStepComplete(message.id, step.id)}
                      role="checkbox"
                      aria-checked={step.completed}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onToggleStepComplete(message.id, step.id);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        step.completed
                          ? 'bg-emerald-500/10 border-emerald-500/40 opacity-85'
                          : 'theme-bg-surface theme-border hover:border-banana-500/60'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {step.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Square className="w-4 h-4 text-banana-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded theme-bg-elevated theme-text-muted">
                            Step {step.stepNumber}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              step.completed
                                ? 'line-through theme-text-muted'
                                : 'theme-text-primary'
                            }`}
                          >
                            {stepTitle}
                          </span>
                        </div>
                        <p className="text-xs theme-text-secondary leading-relaxed">
                          {renderAnnotatedText(stepInstruction)}
                        </p>
                        {stepWarning && (
                          <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-200 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{stepWarning}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {message.codeSnippets &&
            message.codeSnippets.map((snippet) => {
              const isCopied = copiedCodeId === snippet.id;
              return (
                <div
                  key={snippet.id}
                  className="rounded-xl overflow-hidden theme-border border bg-[#120d0a] text-cream-50"
                >
                  <div className="px-3.5 py-2 bg-espresso-900 border-b border-espresso-700 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="w-3.5 h-3.5 text-banana-400 shrink-0" />
                      <span className="text-xs font-mono font-semibold truncate text-cream-50">
                        {snippet.filename}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-espresso-800 text-banana-300 font-medium">
                        {snippet.subsystem}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(snippet.id, snippet.code)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-espresso-800 hover:bg-espresso-700 text-xs font-semibold text-banana-300 border border-espresso-600 transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3.5 overflow-x-auto">
                    <pre className="text-xs font-mono leading-relaxed text-cream-100">
                      <code>{snippet.code}</code>
                    </pre>
                  </div>
                  <div className="px-3.5 py-2 bg-espresso-900/70 border-t border-espresso-800 text-[11px] text-espresso-400 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-banana-400 shrink-0" />
                    <span>{snippet.explanation}</span>
                  </div>
                </div>
              );
            })}

          {message.citations && message.citations.length > 0 && (
            <div className="pt-2 border-t theme-border space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
                {ui.sourcesLabel}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {message.citations.map((cit) => (
                  <button
                    key={cit.id}
                    type="button"
                    onClick={() => setInspectedCitation(cit)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg theme-bg-elevated hover:theme-bg-hover theme-border border text-xs transition-colors"
                  >
                    {cit.sourceType === 'chief_delphi' ? (
                      <Globe className="w-3 h-3 text-banana-500" />
                    ) : (
                      <FileText className="w-3 h-3 text-banana-500" />
                    )}
                    <span className="font-semibold theme-text-primary">{cit.badgeLabel}</span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      {Math.round(cit.relevanceScore * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {inspectedCitation && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInspectedCitation(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl theme-bg-surface theme-border border p-5 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded theme-accent-bg">
                  {inspectedCitation.retrievalMethod}
                </span>
                <h4 className="text-sm font-bold theme-text-primary mt-1.5">
                  {inspectedCitation.title}
                </h4>
                <p className="text-xs theme-text-muted">{inspectedCitation.pageOrThread}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedCitation(null)}
                className="p-1.5 rounded-lg theme-bg-elevated theme-bg-hover"
                aria-label="Close citation details"
              >
                <X className="w-4 h-4 theme-text-primary" />
              </button>
            </div>

            <div className="p-3 rounded-xl theme-bg-elevated theme-border border text-xs theme-text-secondary leading-relaxed">
              “{inspectedCitation.excerpt}”
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="theme-text-muted">
                Context Reranker Confidence:{' '}
                <strong className="text-emerald-500">
                  {Math.round(inspectedCitation.relevanceScore * 100)}%
                </strong>
              </span>
              {inspectedCitation.sourceType === 'chief_delphi' ? (
                <a
                  href={inspectedCitation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-banana-600 dark:text-banana-400 hover:underline"
                >
                  Open ChiefDelphi <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[11px] font-mono theme-text-muted">
                  Indexed in Team 846 Store
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
