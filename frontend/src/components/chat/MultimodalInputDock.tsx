import React, { useRef, useState } from 'react';
import {
  Camera,
  Database,
  Eye,
  Film,
  Globe,
  Image as ImageIcon,
  Paperclip,
  Send,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import {
  MediaAttachment,
  SearchRouteScope,
  SupportedLanguage,
} from '../../types/models';
import {
  MULTILINGUAL_QUICK_PROMPTS,
  SAMPLE_MECHANISM_ATTACHMENTS,
  UI_TRANSLATIONS,
} from '../../mocks/mockData';

interface MultimodalInputDockProps {
  language: SupportedLanguage;
  isGenerating: boolean;
  onSendMessage: (
    text: string,
    scope: SearchRouteScope,
    attachments: MediaAttachment[]
  ) => void;
}

const SCOPE_OPTIONS: {
  id: SearchRouteScope;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'auto', label: 'Auto (Agentic Controller)', icon: Sparkles },
  { id: 'internal_rag', label: 'Internal 846 Docs / SOPs', icon: Database },
  { id: 'chief_delphi', label: 'ChiefDelphi / Web Search', icon: Globe },
  { id: 'wpilib_rules', label: 'WPILib / 2026 Rules', icon: Wrench },
  { id: 'vision_lfm3', label: 'Force LFM3-VL-2B Vision', icon: Eye },
];

export const MultimodalInputDock: React.FC<MultimodalInputDockProps> = ({
  language,
  isGenerating,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedScope, setSelectedScope] = useState<SearchRouteScope>('auto');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [samplePickerOpen, setSamplePickerOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const ui = UI_TRANSLATIONS[language];

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const mapped: MediaAttachment[] = Array.from(files).map((file, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: file.name,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      previewUrl: URL.createObjectURL(file),
      fileSizeLabel: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    }));
    setAttachments((prev) => [...prev, ...mapped]);
  };

  const attachPreset = (preset: MediaAttachment) => {
    setAttachments((prev) => {
      if (prev.some((p) => p.id === preset.id)) return prev;
      return [...prev, preset];
    });
    setSamplePickerOpen(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isGenerating) return;

    onSendMessage(
      trimmed || 'Inspect this attached mechanism photo against Team 846 CAD & SOPs.',
      selectedScope,
      attachments
    );
    setInputText('');
    setAttachments([]);
  };

  const handleQuickPrompt = (promptId: string) => {
    const found = MULTILINGUAL_QUICK_PROMPTS.find((q) => q.id === promptId);
    if (!found) return;
    setInputText(found.text);
    if (found.presetAttachmentId) {
      const sample = SAMPLE_MECHANISM_ATTACHMENTS.find(
        (s) => s.id === found.presetAttachmentId
      );
      if (sample) setAttachments([sample]);
    }
  };

  return (
    <div className="theme-bg-surface theme-border border-t px-3 sm:px-5 py-3 space-y-2.5 shrink-0">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider theme-text-muted shrink-0 mr-1">
          Demo Prompts:
        </span>
        {MULTILINGUAL_QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.id}
            type="button"
            onClick={() => handleQuickPrompt(qp.id)}
            className="px-2.5 py-1 rounded-full theme-bg-elevated hover:theme-bg-hover theme-border border text-[11px] font-medium theme-text-secondary shrink-0 transition-colors"
          >
            {qp.badge}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {SCOPE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = selectedScope === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedScope(opt.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border shrink-0 transition-all ${
                isActive
                  ? 'theme-accent-bg border-banana-500 shadow-sm'
                  : 'theme-bg-elevated theme-border theme-text-muted hover:theme-text-primary'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl theme-bg-elevated theme-border border">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative flex items-center gap-2 p-1.5 pr-7 rounded-lg theme-bg-surface theme-border border max-w-xs"
            >
              {att.type === 'video' ? (
                <div className="w-12 h-12 rounded-md bg-espresso-800 flex items-center justify-center shrink-0">
                  <Film className="w-5 h-5 text-banana-400" />
                </div>
              ) : (
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className="w-12 h-12 rounded-md object-cover bg-espresso-950 shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold theme-text-primary truncate">
                  {att.name}
                </p>
                <p className="text-[10px] theme-text-muted">{att.fileSizeLabel}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                }
                aria-label={`Remove ${att.name}`}
                className="absolute right-1.5 top-1.5 p-0.5 rounded-full bg-red-500/15 hover:bg-red-500/30 text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 rounded-2xl theme-bg-elevated theme-border border p-2 focus-within:ring-2 focus-within:ring-banana-400/70 transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="flex items-center gap-1 pb-0.5 relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload robot mechanism photo or video"
            className="p-2 rounded-xl theme-bg-surface hover:theme-bg-hover theme-border border theme-text-secondary hover:theme-text-primary transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setCameraModalOpen(true)}
            title="Pit Camera Trigger / Capture Photo"
            className="p-2 rounded-xl theme-bg-surface hover:theme-bg-hover theme-border border theme-text-secondary hover:theme-text-primary transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSamplePickerOpen((prev) => !prev)}
            title="Attach Sample Team 846 Mechanism Photo"
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl theme-bg-surface hover:theme-bg-hover theme-border border text-[11px] font-semibold text-banana-700 dark:text-banana-300 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sample Photo</span>
          </button>

          {samplePickerOpen && (
            <div className="absolute bottom-12 left-0 w-72 rounded-2xl theme-bg-surface theme-border border p-2.5 shadow-2xl z-40 space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold theme-text-primary">
                  Attach Sample 846 Mechanism Photo
                </span>
                <button
                  type="button"
                  onClick={() => setSamplePickerOpen(false)}
                  className="p-0.5 rounded hover:theme-bg-hover theme-text-muted"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {SAMPLE_MECHANISM_ATTACHMENTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => attachPreset(sample)}
                  className="w-full flex items-center gap-2.5 p-1.5 rounded-xl theme-bg-elevated hover:theme-bg-hover theme-border border text-left transition-colors"
                >
                  <img
                    src={sample.previewUrl}
                    alt={sample.name}
                    className="w-11 h-9 rounded-md object-cover bg-espresso-950 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold theme-text-primary truncate">
                      {sample.name}
                    </p>
                    <p className="text-[10px] theme-text-muted">{sample.fileSizeLabel}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={ui.inputPlaceholder}
          className="flex-1 bg-transparent resize-none py-2 px-1.5 text-sm theme-text-primary placeholder:theme-text-muted focus:outline-none max-h-32"
        />

        <button
          type="submit"
          disabled={isGenerating || (!inputText.trim() && attachments.length === 0)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl theme-accent-bg font-bold text-xs shadow-sm disabled:opacity-45 disabled:cursor-not-allowed hover:brightness-95 transition-all shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{ui.sendLabel}</span>
        </button>
      </form>

      {cameraModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCameraModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl theme-bg-surface theme-border border p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-banana-500" />
                <h3 className="text-sm font-bold theme-text-primary">
                  Pit Camera Capture (LFM3-VL-2B Vision)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCameraModalOpen(false)}
                className="p-1 rounded-lg theme-bg-elevated"
              >
                <X className="w-4 h-4 theme-text-primary" />
              </button>
            </div>

            <p className="text-xs theme-text-secondary leading-relaxed">
              On mobile devices in the pit, tapping <strong>Launch Device Camera</strong> opens
              your rear camera directly. On desktop, you can simulate capturing a pit mechanism
              snapshot below.
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => {
                  cameraInputRef.current?.click();
                  setCameraModalOpen(false);
                }}
                className="w-full py-2.5 px-3 rounded-xl theme-accent-bg font-bold text-xs flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Launch Device Camera / File Picker
              </button>
              <button
                type="button"
                onClick={() => {
                  attachPreset(SAMPLE_MECHANISM_ATTACHMENTS[0]);
                  setCameraModalOpen(false);
                }}
                className="w-full py-2.5 px-3 rounded-xl theme-bg-elevated hover:theme-bg-hover theme-border border font-semibold text-xs theme-text-primary"
              >
                Simulate Snapshot: MK4i Swerve Bevel Fault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
