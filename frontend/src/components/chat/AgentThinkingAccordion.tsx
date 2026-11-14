import React, { useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Eye,
  Globe,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';
import {
  AgentReasoningStep,
  AgentToolType,
  SupportedLanguage,
} from '../../types/models';
import { UI_TRANSLATIONS } from '../../mocks/mockData';

interface AgentThinkingAccordionProps {
  steps: AgentReasoningStep[];
  sufficiencyLoops?: number;
  isStreaming?: boolean;
  language: SupportedLanguage;
}

const getToolIcon = (tool: AgentToolType) => {
  switch (tool) {
    case 'controller':
      return BrainCircuit;
    case 'internal_rag':
      return Database;
    case 'chief_delphi':
      return Globe;
    case 'vision_lfm3':
      return Eye;
    case 'reranker':
      return ShieldCheck;
  }
};

export const AgentThinkingAccordion: React.FC<AgentThinkingAccordionProps> = ({
  steps,
  sufficiencyLoops = 1,
  isStreaming = false,
  language,
}) => {
  const [expanded, setExpanded] = useState(isStreaming || sufficiencyLoops > 1);
  const ui = UI_TRANSLATIONS[language];

  if (!steps || steps.length === 0) return null;

  const activeStep = steps.find((s) => s.status === 'running') ?? steps[steps.length - 1];
  const hasError = steps.some((s) => s.status === 'error');
  const totalMs = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);

  return (
    <div className="rounded-xl theme-bg-surface theme-border border overflow-hidden mb-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:theme-bg-hover transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isStreaming ? (
            <Loader2 className="w-4 h-4 text-banana-500 dark:text-banana-400 animate-spin shrink-0" />
          ) : hasError ? (
            <AlertOctagon className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold theme-text-primary">
                {ui.agentThinkingTitle}
              </span>
              {sufficiencyLoops > 1 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-banana-400/20 text-banana-700 dark:text-banana-300 border border-banana-500/30">
                  <RefreshCw className="w-2.5 h-2.5" />
                  {sufficiencyLoops}x Sufficiency Loop
                </span>
              )}
              {!isStreaming && totalMs > 0 && (
                <span className="text-[11px] theme-text-muted">
                  • {steps.length} steps • {(totalMs / 1000).toFixed(2)}s
                </span>
              )}
            </div>
            <p className="text-[11px] theme-text-muted truncate mt-0.5">
              {isStreaming ? activeStep.title : activeStep.detail}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 theme-text-muted">
          <span className="text-[10px] font-medium hidden sm:inline">
            {expanded ? 'Hide trace' : 'Show trace'}
          </span>
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3 pt-1.5 space-y-2 border-t theme-border theme-bg-primary/40">
          {steps.map((step) => {
            const Icon = getToolIcon(step.tool);
            return (
              <div
                key={step.id}
                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs ${
                  step.status === 'running'
                    ? 'theme-accent-soft border-banana-500/50'
                    : step.status === 'insufficient_retry'
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : step.status === 'error'
                    ? 'bg-red-500/10 border-red-500/40'
                    : 'theme-bg-surface theme-border'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.status === 'running' ? (
                    <Loader2 className="w-3.5 h-3.5 text-banana-500 animate-spin" />
                  ) : step.status === 'insufficient_retry' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                  ) : step.status === 'error' ? (
                    <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold theme-text-primary">{step.title}</span>
                    <div className="flex items-center gap-1.5">
                      {step.iteration && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded theme-bg-elevated theme-text-muted font-mono">
                          Pass #{step.iteration}
                        </span>
                      )}
                      {step.durationMs !== undefined && (
                        <span className="text-[10px] theme-text-muted font-mono">
                          {step.durationMs}ms
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] theme-text-secondary mt-0.5 leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
