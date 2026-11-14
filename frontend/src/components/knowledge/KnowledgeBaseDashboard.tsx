import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Cpu,
  Database,
  FileCode2,
  FileImage,
  FileUp,
  Layers,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  DocumentCategory,
  GlossaryCategory,
  GlossaryTerm,
  IngestionDocument,
  IngestionStage,
  SupportedLanguage,
} from '../../types/models';
import { LANGUAGE_OPTIONS, UI_TRANSLATIONS } from '../../mocks/mockData';

interface KnowledgeBaseDashboardProps {
  documents: IngestionDocument[];
  onUploadFiles: (files: File[], category: DocumentCategory) => void;
  onSimulateSampleIngestion: (category: DocumentCategory) => void;
  onDeleteDocument: (docId: string) => void;
  glossaryTerms: GlossaryTerm[];
  onAddGlossaryTerm: (term: GlossaryTerm) => void;
  onDeleteGlossaryTerm: (termId: string) => void;
  language: SupportedLanguage;
}

const DOC_CATEGORIES: DocumentCategory[] = [
  '846 SOP',
  'CAD PDF',
  'Game Manual',
  'Spec Sheet',
  'Team Code',
];

const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  'Drivetrain',
  'Electrical & CAN',
  'Controls & WPILib',
  'FRC Rules',
  '846 Custom Hardware',
];

const STAGE_LABEL: Record<IngestionStage, string> = {
  queued: 'Queued for Ingestion',
  rendering_pages: '1/3 Rendering PDF Pages as Images',
  generating_embeddings: '2/3 Generating EmbeddingGemma-2 Visual/Text Embeddings',
  indexing_bm25: '3/3 Building BM25 Keyword Index',
  indexed: 'Indexed in Multimodal Vector Store & BM25',
  error: 'Ingestion Failed',
};

export const KnowledgeBaseDashboard: React.FC<KnowledgeBaseDashboardProps> = ({
  documents,
  onUploadFiles,
  onSimulateSampleIngestion,
  onDeleteDocument,
  glossaryTerms,
  onAddGlossaryTerm,
  onDeleteGlossaryTerm,
  language,
}) => {
  const [selectedDocCategory, setSelectedDocCategory] =
    useState<DocumentCategory>('CAD PDF');
  const [isDragging, setIsDragging] = useState(false);
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossaryFilterCat, setGlossaryFilterCat] = useState<string>('All');
  const [addTermModalOpen, setAddTermModalOpen] = useState(false);

  const [newTermName, setNewTermName] = useState('');
  const [newTermCategory, setNewTermCategory] =
    useState<GlossaryCategory>('846 Custom Hardware');
  const [newTermSubsystem, setNewTermSubsystem] = useState('');
  const [newTermDefinition, setNewTermDefinition] = useState('');
  const [newTermTip, setNewTermTip] = useState('');
  const [newTermAliases, setNewTermAliases] = useState('');
  const [newTermSpanish, setNewTermSpanish] = useState('');
  const [newTermChinese, setNewTermChinese] = useState('');
  const [newTermHindi, setNewTermHindi] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ui = UI_TRANSLATIONS[language];

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUploadFiles(files, selectedDocCategory);
    }
  };

  const handleCreateTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTermName.trim() || !newTermDefinition.trim()) return;

    const termObj: GlossaryTerm = {
      id: `term-${Date.now()}`,
      term: newTermName.trim(),
      category: newTermCategory,
      subsystem: newTermSubsystem.trim() || 'General Robot',
      definition: newTermDefinition.trim(),
      rookieTip: newTermTip.trim() || 'Check with your Team 846 subteam lead before modifying.',
      aliases: newTermAliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      translations: {
        en: { term: newTermName.trim(), definition: newTermDefinition.trim() },
        es: {
          term: newTermName.trim(),
          definition: newTermSpanish.trim() || `[ES] ${newTermDefinition.trim()}`,
        },
        zh: {
          term: newTermName.trim(),
          definition: newTermChinese.trim() || `[ZH] ${newTermDefinition.trim()}`,
        },
        hi: {
          term: newTermName.trim(),
          definition: newTermHindi.trim() || `[HI] ${newTermDefinition.trim()}`,
        },
        vi: {
          term: newTermName.trim(),
          definition: `[VI] ${newTermDefinition.trim()}`,
        },
        fr: {
          term: newTermName.trim(),
          definition: `[FR] ${newTermDefinition.trim()}`,
        },
      },
    };

    onAddGlossaryTerm(termObj);
    setNewTermName('');
    setNewTermSubsystem('');
    setNewTermDefinition('');
    setNewTermTip('');
    setNewTermAliases('');
    setNewTermSpanish('');
    setNewTermChinese('');
    setNewTermHindi('');
    setAddTermModalOpen(false);
  };

  const filteredGlossary = glossaryTerms.filter((t) => {
    const matchesCat = glossaryFilterCat === 'All' || t.category === glossaryFilterCat;
    const q = glossarySearch.toLowerCase();
    const matchesSearch =
      !q ||
      t.term.toLowerCase().includes(q) ||
      t.definition.toLowerCase().includes(q) ||
      t.aliases.some((a) => a.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
      <div className="rounded-2xl theme-bg-surface theme-border border p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-accent-bg uppercase tracking-wider">
                Offline Ingestion Pipeline
              </span>
              <h2 className="text-base sm:text-lg font-bold theme-text-primary">
                Team 846 Multimodal Knowledge Base &amp; Glossary
              </h2>
            </div>
            <p className="text-xs theme-text-muted mt-1">
              Populate the <strong>EmbeddingGemma-2 Multimodal Vector Store</strong> and{' '}
              <strong>BM25 Keyword Index</strong> with CAD PDFs, Game Manuals, Spec Sheets, and
              Java code.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl theme-bg-elevated theme-border border">
              <span className="theme-text-muted">Indexed Docs: </span>
              <strong className="theme-text-primary">
                {documents.filter((d) => d.stage === 'indexed').length}/{documents.length}
              </strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl theme-bg-elevated theme-border border">
              <span className="theme-text-muted">Glossary Terms: </span>
              <strong className="text-banana-600 dark:text-banana-400">
                {glossaryTerms.length}
              </strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
          {[
            {
              icon: FileUp,
              title: 'Game Manuals, Spec Sheets, CAD PDFs',
              sub: 'Raw Team 846 & FRC Uploads',
            },
            {
              icon: FileImage,
              title: 'Render Pages as Images',
              sub: 'High-DPI visual schematic frames',
            },
            {
              icon: Cpu,
              title: 'EmbeddingGemma-2 Embeddings',
              sub: 'Cross-lingual visual + text vectors',
            },
            {
              icon: Database,
              title: 'Vector Store + BM25 Index',
              sub: 'Ready for LFM3-VL-2B retrieval',
            },
          ].map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.title}
                className="relative p-2.5 rounded-xl theme-bg-elevated theme-border border flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg theme-accent-soft flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-banana-600 dark:text-banana-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold theme-text-primary truncate">
                    {stage.title}
                  </p>
                  <p className="text-[10px] theme-text-muted truncate">{stage.sub}</p>
                </div>
                {idx < 3 && (
                  <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-banana-500 absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 theme-bg-surface rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 rounded-2xl theme-bg-surface theme-border border p-4 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
              <FileUp className="w-4 h-4 text-banana-500" />
              Document Drag-and-Drop Zone
            </h3>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold theme-text-muted">
              Target Document Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DOC_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedDocCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    selectedDocCategory === cat
                      ? 'theme-accent-bg border-banana-500'
                      : 'theme-bg-elevated theme-border theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.java,.py,.cpp,.md,.txt,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) onUploadFiles(files, selectedDocCategory);
              e.target.value = '';
            }}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            className={`flex-1 min-h-[180px] rounded-2xl border-2 border-dashed p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-banana-400 theme-accent-soft scale-[0.99]'
                : 'theme-border theme-bg-elevated/50 hover:border-banana-500/70'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl theme-accent-soft flex items-center justify-center mb-3">
              <Layers className="w-5 h-5 text-banana-600 dark:text-banana-400" />
            </div>
            <p className="text-xs font-bold theme-text-primary">
              Drop Game Manuals, CAD PDFs, SOPs, or Java files here
            </p>
            <p className="text-[11px] theme-text-muted mt-1">
              or click to browse local files • Categorized as{' '}
              <strong className="text-banana-600 dark:text-banana-300">
                {selectedDocCategory}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSimulateSampleIngestion(selectedDocCategory)}
            className="w-full py-2.5 px-3 rounded-xl theme-accent-bg font-bold text-xs flex items-center justify-center gap-2 hover:brightness-95 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Simulate {selectedDocCategory} Pipeline Upload</span>
          </button>
        </div>

        <div className="lg:col-span-7 rounded-2xl theme-bg-surface theme-border border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
              <Cpu className="w-4 h-4 text-banana-500" />
              Ingestion Pipeline Progress &amp; Indexed Store
            </h3>
            <span className="text-[11px] theme-text-muted">
              EmbeddingGemma-2 + BM25
            </span>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {documents.map((doc) => {
              const isDone = doc.stage === 'indexed';
              return (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl theme-bg-elevated/60 theme-border border space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {doc.category === 'Team Code' ? (
                        <FileCode2 className="w-4 h-4 text-banana-500 mt-0.5 shrink-0" />
                      ) : (
                        <FileImage className="w-4 h-4 text-banana-500 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold theme-text-primary truncate">
                            {doc.filename}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded theme-bg-surface theme-border border theme-text-secondary font-medium">
                            {doc.category}
                          </span>
                        </div>
                        <p className="text-[11px] theme-text-muted mt-0.5">
                          {doc.fileSize} • {doc.pageCount} pages • Uploaded by {doc.uploadedBy} ({doc.uploadedAt})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Indexed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full theme-accent-soft text-banana-700 dark:text-banana-300">
                          <Loader2 className="w-3 h-3 animate-spin" /> {doc.progressPercent}%
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteDocument(doc.id)}
                        aria-label={`Remove ${doc.filename}`}
                        className="p-1 rounded hover:bg-red-500/15 text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        className={`font-semibold ${
                          isDone
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-banana-700 dark:text-banana-300'
                        }`}
                      >
                        {STAGE_LABEL[doc.stage]}
                      </span>
                      <span className="font-mono theme-text-muted">
                        {doc.visualEmbeddingsCount} vecs • {doc.bm25TokensCount} BM25 tokens
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full theme-bg-surface overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isDone ? 'bg-emerald-500' : 'bg-banana-400'
                        }`}
                        style={{ width: `${doc.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl theme-bg-surface theme-border border p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-banana-500" />
              {ui.glossaryTitle}
            </h3>
            <p className="text-xs theme-text-muted mt-0.5">
              Terms added here automatically highlight as interactive bilingual tooltips inside the
              Student Pit Chat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddTermModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl theme-accent-bg font-bold text-xs shadow-sm hover:brightness-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team 846 Term</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 theme-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={glossarySearch}
              onChange={(e) => setGlossarySearch(e.target.value)}
              placeholder="Search Team 846 robot part names, jargon, aliases..."
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs theme-bg-elevated theme-border border theme-text-primary placeholder:theme-text-muted focus:outline-none focus:ring-1 focus:ring-banana-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['All', ...GLOSSARY_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setGlossaryFilterCat(cat)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                  glossaryFilterCat === cat
                    ? 'theme-accent-bg border-banana-500'
                    : 'theme-bg-elevated theme-border theme-text-secondary hover:theme-text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl theme-border border">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="theme-bg-elevated theme-border border-b text-[11px] uppercase tracking-wider theme-text-muted">
                <th className="py-2.5 px-3 font-bold">846 Term &amp; Aliases</th>
                <th className="py-2.5 px-3 font-bold">Category / Subsystem</th>
                <th className="py-2.5 px-3 font-bold">
                  Definition ({language.toUpperCase()}) &amp; Rookie Tip
                </th>
                <th className="py-2.5 px-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {filteredGlossary.map((item) => {
                const activeTranslation =
                  language !== 'en'
                    ? item.translations[language]?.definition
                    : undefined;
                return (
                  <tr
                    key={item.id}
                    className="hover:theme-bg-elevated/40 transition-colors align-top"
                  >
                    <td className="py-3 px-3 min-w-[180px]">
                      <span className="font-bold theme-text-primary">{item.term}</span>
                      {item.aliases.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.aliases.map((alias) => (
                            <span
                              key={alias}
                              className="text-[10px] px-1.5 py-0.2 rounded theme-bg-elevated theme-text-muted"
                            >
                              {alias}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 min-w-[150px]">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold theme-accent-soft text-banana-700 dark:text-banana-300">
                        {item.category}
                      </span>
                      <p className="text-[11px] theme-text-muted mt-1">{item.subsystem}</p>
                    </td>
                    <td className="py-3 px-3 space-y-1">
                      {activeTranslation ? (
                        <>
                          <p className="theme-text-primary font-medium">{activeTranslation}</p>
                          <p className="text-[11px] theme-text-muted">EN: {item.definition}</p>
                        </>
                      ) : (
                        <p className="theme-text-primary">{item.definition}</p>
                      )}
                      <p className="text-[11px] text-banana-700 dark:text-banana-300 font-medium">
                        Tip: {item.rookieTip}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteGlossaryTerm(item.id)}
                        aria-label={`Delete ${item.term}`}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addTermModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setAddTermModalOpen(false)}
        >
          <form
            onSubmit={handleCreateTerm}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl theme-bg-surface theme-border border p-5 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold theme-text-primary">
                Add Custom Team 846 Terminology
              </h3>
              <button
                type="button"
                onClick={() => setAddTermModalOpen(false)}
                className="p-1.5 rounded-lg theme-bg-elevated"
              >
                <X className="w-4 h-4 theme-text-primary" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold theme-text-muted">
                  Term / Robot Part Name *
                </label>
                <input
                  required
                  type="text"
                  value={newTermName}
                  onChange={(e) => setNewTermName(e.target.value)}
                  placeholder="e.g. Funky Climber Hook"
                  className="mt-1 w-full px-3 py-2 rounded-xl text-xs theme-bg-elevated theme-border border theme-text-primary focus:outline-none focus:ring-1 focus:ring-banana-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold theme-text-muted">
                  Category
                </label>
                <select
                  value={newTermCategory}
                  onChange={(e) => setNewTermCategory(e.target.value as GlossaryCategory)}
                  className="mt-1 w-full px-3 py-2 rounded-xl text-xs theme-bg-elevated theme-border border theme-text-primary focus:outline-none"
                >
                  {GLOSSARY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold theme-text-muted">
                  Subsystem
                </label>
                <input
                  type="text"
                  value={newTermSubsystem}
                  onChange={(e) => setNewTermSubsystem(e.target.value)}
                  placeholder="e.g. Endgame / Climber"
                  className="mt-1 w-full px-3 py-2 rounded-xl text-xs theme-bg-elevated theme-border border theme-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold theme-text-muted">
                  Aliases (comma separated)
                </label>
                <input
                  type="text"
                  value={newTermAliases}
                  onChange={(e) => setNewTermAliases(e.target.value)}
                  placeholder="e.g. Ratchet Hook, Stage Latch"
                  className="mt-1 w-full px-3 py-2 rounded-xl text-xs theme-bg-elevated theme-border border theme-text-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold theme-text-muted">
                English Definition *
              </label>
              <textarea
                required
                rows={2}
                value={newTermDefinition}
                onChange={(e) => setNewTermDefinition(e.target.value)}
                placeholder="Clear definition for new FRC Team 846 members..."
                className="mt-1 w-full px-3 py-2 rounded-xl text-xs theme-bg-elevated theme-border border theme-text-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold theme-text-muted">
                Pit / Rookie Tip
              </label>
              <input
                type="text"
                value={newTermTip}
                onChange={(e) => setNewTermTip(e.target.value)}
                placeholder="e.g. Always verify spring preload before queuing."
                className="mt-1 w-full px-3 py-2 rounded-xl text-xs theme-bg-elevated theme-border border theme-text-primary focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-xl theme-bg-elevated/70 theme-border border space-y-2">
              <p className="text-[11px] font-bold text-banana-700 dark:text-banana-300">
                Multilingual Translations ({LANGUAGE_OPTIONS.length - 1} supported languages)
              </p>
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  value={newTermSpanish}
                  onChange={(e) => setNewTermSpanish(e.target.value)}
                  placeholder="Español (ES) translation (optional)..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs theme-bg-surface theme-border border theme-text-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={newTermChinese}
                  onChange={(e) => setNewTermChinese(e.target.value)}
                  placeholder="中文 (ZH) translation (optional)..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs theme-bg-surface theme-border border theme-text-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={newTermHindi}
                  onChange={(e) => setNewTermHindi(e.target.value)}
                  placeholder="हिन्दी (HI) translation (optional)..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs theme-bg-surface theme-border border theme-text-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddTermModalOpen(false)}
                className="px-3.5 py-2 rounded-xl theme-bg-elevated theme-border border text-xs font-semibold theme-text-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl theme-accent-bg text-xs font-bold shadow-sm hover:brightness-95"
              >
                Save to 846 Glossary
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
