import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  ACCENT_PALETTES, 
  FONT_PRESETS, 
  BACKGROUND_PRESETS, 
  FontFamilyOption, 
  BackgroundPatternOption,
  ThemeConfig
} from '../types';
import { 
  Palette, 
  Type, 
  Layout, 
  Moon, 
  Sun, 
  Check, 
  X, 
  Sparkles, 
  RotateCcw,
  Sliders,
  Eye
} from 'lucide-react';

interface CustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({ isOpen, onClose }) => {
  const { theme, updateTheme, activeAccent, resetToDefaults } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Customize Theme & Appearance
              </h2>
              <p className="text-xs text-slate-400">
                Personalize colors, typography fonts, background styles, and dark mode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={resetToDefaults}
              title="Reset to defaults"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-7 flex-1">
          {/* Live Preview Box */}
          <div 
            className={`p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition-all ${
              BACKGROUND_PRESETS.find((b) => b.id === theme.backgroundPattern)?.previewClass || 'bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Live Preview
              </span>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: activeAccent.light, color: activeAccent.text }}
              >
                {theme.fontFamily} · {activeAccent.name}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 shadow-xs border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: activeAccent.primary }}
                >
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">
                    Pick up groceries at Trader Joe's
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Scheduled for 3:30 PM · Produce & Bakery
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="px-2.5 py-1 text-[11px] font-bold text-white rounded-lg shadow-2xs"
                style={{ backgroundColor: activeAccent.primary }}
              >
                Today
              </button>
            </div>
          </div>

          {/* 1. Accent Colors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-emerald-500" />
                <span>Accent Color Palette</span>
              </label>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {activeAccent.name}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
              {ACCENT_PALETTES.map((pal) => {
                const isSelected = activeAccent.id === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => updateTheme({ accentColor: pal.primary, accentName: pal.id })}
                    className={`flex flex-col items-center p-2 rounded-2xl border transition group relative ${
                      isSelected 
                        ? 'border-slate-900 dark:border-white shadow-md bg-slate-50 dark:bg-slate-800' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full shadow-inner flex items-center justify-center text-white transition-transform group-hover:scale-105"
                      style={{ backgroundColor: pal.primary }}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-1.5 truncate max-w-[55px]">
                      {pal.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Typography / Font Families */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-indigo-500" />
                <span>Typography & Font Family</span>
              </label>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {theme.fontFamily}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FONT_PRESETS.map((f) => {
                const isSelected = theme.fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => updateTheme({ fontFamily: f.id })}
                    className={`text-left p-3 rounded-2xl border transition relative ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    style={{ fontFamily: f.id }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {f.name}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      {f.description}
                    </p>
                    <div className="mt-1.5 text-xs text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/80 px-2 py-1 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                      "{f.sample}"
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Background Pattern / Texture */}
          <div className="space-y-3">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layout className="w-4 h-4 text-amber-500" />
              <span>Canvas Background Pattern</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BACKGROUND_PRESETS.map((bg) => {
                const isSelected = theme.backgroundPattern === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => updateTheme({ backgroundPattern: bg.id })}
                    className={`text-left p-3 rounded-2xl border transition flex items-center gap-3 ${
                      isSelected 
                        ? 'border-slate-900 dark:border-white shadow-xs' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 ${bg.previewClass}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {bg.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 ml-1" />}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {bg.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Dark Mode & Display Density */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Dark Mode Switch */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {theme.isDarkMode ? (
                  <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">
                    Dark Mode
                  </div>
                  <div className="text-[10px] text-slate-400">
                    High contrast dark palette
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateTheme({ isDarkMode: !theme.isDarkMode })}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  theme.isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    theme.isDarkMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Density switch */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-teal-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">
                    Compact View
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Denser task lists
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateTheme({ compactDensity: !theme.compactDensity })}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  theme.compactDensity ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    theme.compactDensity ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition"
            style={{ backgroundColor: activeAccent.primary }}
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
