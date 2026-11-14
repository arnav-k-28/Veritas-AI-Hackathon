import React from 'react';
import {
  Bot,
  Database,
  Globe,
  Languages,
  Menu,
  Moon,
  Sun,
  AlertTriangle,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import {
  AppView,
  DemoScenarioState,
  SupportedLanguage,
  ThemeMode,
  TranslationMode,
} from '../types/models';
import { LANGUAGE_OPTIONS, UI_TRANSLATIONS } from '../mocks/mockData';

interface HeaderBarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  translationMode: TranslationMode;
  onTranslationModeChange: (mode: TranslationMode) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  demoScenario: DemoScenarioState;
  onDemoScenarioChange: (state: DemoScenarioState) => void;
  activeIngestionCount: number;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeView,
  onViewChange,
  language,
  onLanguageChange,
  translationMode,
  onTranslationModeChange,
  theme,
  onToggleTheme,
  demoScenario,
  onDemoScenarioChange,
  activeIngestionCount,
  sidebarOpen,
  onToggleSidebar,
}) => {
  const ui = UI_TRANSLATIONS[language];

  return (
    <header className="theme-bg-surface theme-border border-b px-3 py-2.5 flex flex-wrap items-center justify-between gap-2.5 z-30 shrink-0">
      {/* Left: Sidebar Toggle + Team 846 Brand + View Switcher */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="p-2 rounded-lg theme-bg-elevated theme-bg-hover theme-border border transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4 theme-text-primary" />
        </button>

        <div className="flex items-center gap-2.5 pr-2">
          <div className="w-9 h-9 rounded-xl theme-accent-bg flex items-center justify-center font-black text-sm shadow-sm tracking-tight">
            846
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight theme-text-primary">
                FunkyBot AI
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-banana-400/20 text-banana-600 dark:text-banana-300 border border-banana-500/30">
                <Bot className="w-3 h-3" />
                LFM3-VL-2B
              </span>
            </div>
            <p className="text-[11px] theme-text-muted">
              FRC Team 846 • The Funky Monkeys
            </p>
          </div>
        </div>

        {/* Mode Switcher: Student Chat vs Mentor Knowledge Base */}
        <nav className="flex items-center p-1 rounded-xl theme-bg-elevated theme-border border">
          <button
            type="button"
            onClick={() => onViewChange('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'chat'
                ? 'theme-accent-bg shadow-sm'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{ui.chatTab}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('knowledge_base')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'knowledge_base'
                ? 'theme-accent-bg shadow-sm'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{ui.kbTab}</span>
            {activeIngestionCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-espresso-950 text-banana-400 dark:bg-espresso-950 dark:text-banana-300">
                {activeIngestionCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Right: Language Track Controls + Demo State Simulator + Theme Toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Language Track Selector */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl theme-bg-elevated theme-border border">
          <Globe className="w-3.5 h-3.5 text-banana-600 dark:text-banana-400 shrink-0" />
          <select
            aria-label="Select interface and translation language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            className="bg-transparent text-xs font-semibold theme-text-primary focus:outline-none cursor-pointer pr-1"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option
                key={opt.code}
                value={opt.code}
                className="bg-cream-50 text-espresso-950 dark:bg-espresso-900 dark:text-cream-50"
              >
                {opt.flag} {opt.nativeName} ({opt.code.toUpperCase()})
              </option>
            ))}
          </select>

          {language !== 'en' && (
            <div className="flex items-center gap-1 border-l theme-border pl-2">
              <Languages className="w-3.5 h-3.5 theme-text-muted hidden md:block" />
              <select
                aria-label="Translation display mode"
                value={translationMode}
                onChange={(e) => onTranslationModeChange(e.target.value as TranslationMode)}
                className="bg-transparent text-[11px] font-medium text-banana-700 dark:text-banana-300 focus:outline-none cursor-pointer"
                title="Bilingual Rookie Mode keeps FRC technical terms in English with translated tooltips"
              >
                <option
                  value="bilingual_rookie"
                  className="bg-cream-50 text-espresso-950 dark:bg-espresso-900 dark:text-cream-50"
                >
                  Bilingual Rookie Mode
                </option>
                <option
                  value="full_native"
                  className="bg-cream-50 text-espresso-950 dark:bg-espresso-900 dark:text-cream-50"
                >
                  Full Native Translation
                </option>
                <option
                  value="side_by_side"
                  className="bg-cream-50 text-espresso-950 dark:bg-espresso-900 dark:text-cream-50"
                >
                  Side-by-Side EN + {language.toUpperCase()}
                </option>
              </select>
            </div>
          )}
        </div>

        {/* Demo State Simulator (Live / Empty / Error) */}
        <div
          className="hidden lg:flex items-center p-0.5 rounded-xl theme-bg-elevated theme-border border text-[11px]"
          title="Test Live, Empty, and Network Error UI states"
        >
          <button
            type="button"
            onClick={() => onDemoScenarioChange('live')}
            className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
              demoScenario === 'live'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'theme-text-muted hover:theme-text-primary'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Live
          </button>
          <button
            type="button"
            onClick={() => onDemoScenarioChange('empty')}
            className={`px-2 py-1 rounded-lg font-medium transition-colors ${
              demoScenario === 'empty'
                ? 'bg-banana-400/25 text-banana-700 dark:text-banana-300'
                : 'theme-text-muted hover:theme-text-primary'
            }`}
          >
            Empty State
          </button>
          <button
            type="button"
            onClick={() => onDemoScenarioChange('error')}
            className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
              demoScenario === 'error'
                ? 'bg-red-500/20 text-red-700 dark:text-red-300'
                : 'theme-text-muted hover:theme-text-primary'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Sim Error
          </button>
        </div>

        {/* Theme Toggle: Espresso Dark / Banana Cream Light */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl theme-bg-elevated theme-bg-hover theme-border border text-xs font-semibold transition-colors"
          title={
            theme === 'dark'
              ? 'Switch to Banana Cream (Light Mode)'
              : 'Switch to Espresso Pit (Dark Mode)'
          }
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-banana-400" />
              <span className="hidden sm:inline theme-text-primary">Banana Cream</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-espresso-700" />
              <span className="hidden sm:inline theme-text-primary">Espresso Pit</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
