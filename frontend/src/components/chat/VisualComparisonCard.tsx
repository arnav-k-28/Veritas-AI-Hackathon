import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Maximize2,
  X,
  Columns2,
  SlidersHorizontal,
  Sparkles,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { SupportedLanguage, VisualAnnotation, VisualComparisonData } from '../../types/models';
import { UI_TRANSLATIONS } from '../../mocks/mockData';

interface VisualComparisonCardProps {
  comparison: VisualComparisonData;
  language: SupportedLanguage;
}

export const VisualComparisonCard: React.FC<VisualComparisonCardProps> = ({
  comparison,
  language,
}) => {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'slider'>('split');
  const [sliderPos, setSliderPos] = useState(50);
  const [selectedAnnotation, setSelectedAnnotation] = useState<VisualAnnotation | null>(
    comparison.annotations[0] ?? null
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const ui = UI_TRANSLATIONS[language];
  const studentAnnotations = comparison.annotations.filter(
    (a) => a.targetImage === 'student_photo'
  );
  const cadAnnotations = comparison.annotations.filter((a) => a.targetImage === 'cad_schematic');

  const renderAnnotationPin = (ann: VisualAnnotation, index: number) => {
    const isSelected = selectedAnnotation?.id === ann.id;
    const pinColors =
      ann.severity === 'critical'
        ? 'bg-red-500 text-white ring-red-400/50'
        : ann.severity === 'warning'
        ? 'bg-amber-500 text-espresso-950 ring-amber-400/50'
        : 'bg-emerald-500 text-white ring-emerald-400/50';

    return (
      <button
        key={ann.id}
        type="button"
        onClick={() => setSelectedAnnotation(ann)}
        style={{ left: `${ann.xPercent}%`, top: `${ann.yPercent}%` }}
        title={ann.label}
        className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shadow-lg transition-transform ${pinColors} ${
          isSelected ? 'scale-125 ring-4 z-20' : 'hover:scale-110 ring-2 z-10'
        }`}
      >
        {index + 1}
      </button>
    );
  };

  const renderVisualPanels = (tall = false) => {
    const imgHeightClass = tall ? 'h-[360px] sm:h-[440px]' : 'h-56 sm:h-64';

    if (viewMode === 'slider') {
      return (
        <div className="space-y-2">
          <div
            className={`relative w-full ${imgHeightClass} rounded-xl overflow-hidden theme-border border bg-espresso-950 select-none`}
          >
            {/* Base: Retrieved CAD Schematic */}
            <img
              src={comparison.cadSchematicUrl}
              alt={comparison.cadSchematicCaption}
              className="absolute inset-0 w-full h-full object-contain bg-[#131924]"
            />

            {/* Clipped Top: Student Photo */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={comparison.studentPhotoUrl}
                alt={comparison.studentPhotoCaption}
                className="w-full h-full object-contain bg-[#18120e]"
                style={{ width: `${(100 / Math.max(sliderPos, 1)) * 100}%`, maxWidth: 'none' }}
              />
            </div>

            {/* Divider line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-banana-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-banana-400 text-espresso-950 flex items-center justify-center shadow-md font-bold text-xs">
                ↔
              </div>
            </div>

            <span className="absolute left-3 bottom-2.5 px-2 py-0.5 rounded bg-espresso-950/85 text-cream-50 text-[10px] font-semibold">
              Student Pit Photo
            </span>
            <span className="absolute right-3 bottom-2.5 px-2 py-0.5 rounded bg-espresso-950/85 text-banana-300 text-[10px] font-semibold">
              846 CAD Schematic
            </span>
          </div>

          <div className="flex items-center gap-3 px-1">
            <span className="text-[11px] font-medium theme-text-muted">Student Photo</span>
            <input
              type="range"
              min={5}
              max={95}
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              aria-label="Compare student photo and CAD schematic"
              className="flex-1 accent-banana-400 cursor-pointer"
            />
            <span className="text-[11px] font-medium theme-text-muted">CAD PDF</span>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left: Student Uploaded Photo */}
        <div className="rounded-xl overflow-hidden theme-border border bg-[#140f0c] flex flex-col">
          <div className="px-3 py-1.5 bg-espresso-900/90 border-b border-espresso-700 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-cream-50 truncate">
              {comparison.studentPhotoCaption}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold shrink-0">
              Pit Upload
            </span>
          </div>
          <div className={`relative w-full ${imgHeightClass} overflow-hidden`}>
            <img
              src={comparison.studentPhotoUrl}
              alt={comparison.studentPhotoCaption}
              className="w-full h-full object-contain"
            />
            {showAnnotations &&
              studentAnnotations.map((ann, idx) => renderAnnotationPin(ann, idx))}
          </div>
        </div>

        {/* Right: Top Retrieved CAD / Schematic */}
        <div className="rounded-xl overflow-hidden theme-border border bg-[#131924] flex flex-col">
          <div className="px-3 py-1.5 bg-espresso-900/90 border-b border-espresso-700 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-banana-300 truncate">
              {comparison.cadSchematicCaption}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold shrink-0">
              {Math.round(comparison.similarityScore * 100)}% Match
            </span>
          </div>
          <div className={`relative w-full ${imgHeightClass} overflow-hidden`}>
            <img
              src={comparison.cadSchematicUrl}
              alt={comparison.cadSchematicCaption}
              className="w-full h-full object-contain"
            />
            {showAnnotations &&
              cadAnnotations.map((ann, idx) =>
                renderAnnotationPin(ann, studentAnnotations.length + idx)
              )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="rounded-2xl theme-bg-surface theme-border border p-3.5 space-y-3 my-3">
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold theme-accent-bg">
                <Sparkles className="w-3 h-3" />
                {comparison.visionModel}
              </span>
              <span className="text-xs font-bold theme-text-primary">
                {ui.visualComparisonTitle}
              </span>
            </div>
            <p className="text-[11px] theme-text-muted mt-0.5">
              {comparison.cadDocumentSource} • {comparison.detectedIssueSummary}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === 'split' ? 'slider' : 'split'))}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold theme-bg-elevated theme-bg-hover theme-border border theme-text-primary transition-colors"
              title="Switch between Split-Screen and Overlay Slider"
            >
              {viewMode === 'split' ? (
                <>
                  <SlidersHorizontal className="w-3 h-3 text-banana-500" />
                  <span>Slider</span>
                </>
              ) : (
                <>
                  <Columns2 className="w-3 h-3 text-banana-500" />
                  <span>Split</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowAnnotations((s) => !s)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold theme-bg-elevated theme-bg-hover theme-border border theme-text-primary transition-colors"
            >
              {showAnnotations ? (
                <>
                  <Eye className="w-3 h-3 text-banana-500" />
                  <span>Pins On</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 theme-text-muted" />
                  <span>Pins Off</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold theme-accent-bg hover:brightness-95 transition-all"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Lightbox</span>
            </button>
          </div>
        </div>

        {/* Visual Panels */}
        {renderVisualPanels(false)}

        {/* Active Pin Inspection Callout */}
        {selectedAnnotation && (
          <div className="p-2.5 rounded-xl theme-bg-elevated theme-border border flex items-start gap-2.5">
            {selectedAnnotation.severity === 'reference' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  selectedAnnotation.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                }`}
              />
            )}
            <div className="text-xs min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold theme-text-primary">{selectedAnnotation.label}</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded theme-bg-surface theme-text-muted font-semibold">
                  {selectedAnnotation.targetImage === 'student_photo'
                    ? 'Detected on Pit Photo'
                    : '846 CAD Target Spec'}
                </span>
              </div>
              <p className="text-[11px] theme-text-secondary mt-0.5">
                {selectedAnnotation.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Split-Screen Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="w-full max-w-5xl rounded-2xl theme-bg-surface theme-border border p-4 sm:p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold theme-text-primary">{comparison.title}</h3>
                <p className="text-xs theme-text-muted">
                  {comparison.visionModel} + {comparison.embeddingModel} •{' '}
                  {Math.round(comparison.similarityScore * 100)}% visual schematic match
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="p-2 rounded-xl theme-bg-elevated theme-bg-hover theme-border border"
                aria-label="Close lightbox"
              >
                <X className="w-4 h-4 theme-text-primary" />
              </button>
            </div>

            {renderVisualPanels(true)}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {comparison.annotations.map((ann, idx) => (
                <button
                  key={ann.id}
                  type="button"
                  onClick={() => setSelectedAnnotation(ann)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedAnnotation?.id === ann.id
                      ? 'theme-accent-soft border-banana-500'
                      : 'theme-bg-elevated theme-border hover:theme-bg-hover'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full theme-accent-bg text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold theme-text-primary truncate">
                      {ann.label}
                    </span>
                  </div>
                  <p className="text-[11px] theme-text-secondary mt-1 line-clamp-2">
                    {ann.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
