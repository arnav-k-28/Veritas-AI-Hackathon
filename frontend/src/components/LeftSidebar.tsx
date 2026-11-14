import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  FileText,
  Layers,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  Cpu,
  Trash2,
} from 'lucide-react';
import {
  ChatThread,
  IngestionDocument,
  SupportedLanguage,
} from '../types/models';
import { UI_TRANSLATIONS } from '../mocks/mockData';

interface LeftSidebarProps {
  isOpen: boolean;
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread: (threadId: string) => void;
  documents: IngestionDocument[];
  onNavigateKnowledgeBase: () => void;
  language: SupportedLanguage;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen,
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onDeleteThread,
  documents,
  onNavigateKnowledgeBase,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const ui = UI_TRANSLATIONS[language];

  if (!isOpen) return null;

  const filteredThreads = threads.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const indexedDocsCount = documents.filter((d) => d.stage === 'indexed').length;
  const totalPagesEmbedded = documents.reduce((acc, d) => acc + d.visualEmbeddingsCount, 0);
  const totalBm25Tokens = documents.reduce((acc, d) => acc + d.bm25TokensCount, 0);

  return (
    <aside className="w-72 lg:w-80 shrink-0 theme-bg-surface theme-border border-r flex flex-col h-full overflow-hidden">
      {/* Top Action + Search */}
      <div className="p-3 space-y-2.5 theme-border border-b">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl theme-accent-bg font-bold text-xs shadow-sm hover:brightness-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{ui.newChat}</span>
        </button>

        <div className="relative">
          <Search className="w-3.5 h-3.5 theme-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter threads or subsystems..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs theme-bg-elevated theme-border border theme-text-primary placeholder:theme-text-muted focus:outline-none focus:ring-1 focus:ring-banana-400"
          />
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
            Pit Chat History
          </span>
          <span className="text-[11px] theme-text-muted">{filteredThreads.length}</span>
        </div>

        {filteredThreads.length === 0 ? (
          <div className="px-3 py-6 text-center rounded-xl theme-bg-elevated/60 theme-border border border-dashed">
            <p className="text-xs theme-text-muted">No matching sessions yet.</p>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            return (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectThread(thread.id);
                }}
                className={`group p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'theme-accent-soft border-banana-500/60 shadow-sm'
                    : 'theme-bg-elevated/40 theme-border hover:theme-bg-elevated'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <MessageSquare
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        isActive ? 'text-banana-600 dark:text-banana-400' : 'theme-text-muted'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold theme-text-primary truncate">
                        {thread.title}
                      </p>
                      <p className="text-[11px] theme-text-muted truncate mt-0.5">
                        {thread.subtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteThread(thread.id);
                    }}
                    aria-label="Delete thread"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/15 text-red-400 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2 gap-1">
                  <div className="flex flex-wrap gap-1">
                    {thread.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded theme-bg-surface theme-border border theme-text-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] theme-text-muted shrink-0">
                    {thread.updatedAt}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom: Multimodal Vector Store & BM25 Metadata Panel */}
      <div className="p-3 theme-border border-t theme-bg-elevated/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-banana-600 dark:text-banana-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider theme-text-primary">
              Vector &amp; BM25 Index
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateKnowledgeBase}
            className="text-[11px] font-semibold text-banana-600 dark:text-banana-400 hover:underline flex items-center gap-0.5"
          >
            Manage <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Live Telemetry Badges */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="p-2 rounded-lg theme-bg-surface theme-border border">
            <p className="theme-text-muted text-[10px]">EmbeddingGemma-2</p>
            <p className="font-bold theme-text-primary">{totalPagesEmbedded} Visual Pages</p>
          </div>
          <div className="p-2 rounded-lg theme-bg-surface theme-border border">
            <p className="theme-text-muted text-[10px]">BM25 Keyword</p>
            <p className="font-bold theme-text-primary">
              {(totalBm25Tokens / 1000).toFixed(1)}k Tokens
            </p>
          </div>
        </div>

        {/* Mini Indexed Docs Preview */}
        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-[10px] theme-text-muted px-0.5">
            <span>Indexed Team 846 Files ({indexedDocsCount}/{documents.length})</span>
            <span className="flex items-center gap-1 text-emerald-500 font-medium">
              <Cpu className="w-3 h-3" /> Ready
            </span>
          </div>
          {documents.slice(0, 4).map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={onNavigateKnowledgeBase}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg theme-bg-surface hover:theme-bg-hover theme-border border text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-3 h-3 theme-text-muted shrink-0" />
                <span className="text-[11px] theme-text-primary truncate">{doc.filename}</span>
              </div>
              {doc.stage === 'indexed' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              ) : (
                <Loader2 className="w-3 h-3 text-banana-400 animate-spin shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
