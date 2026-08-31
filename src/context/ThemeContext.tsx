import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeConfig, ACCENT_PALETTES, FontFamilyOption, BackgroundPatternOption } from '../types';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  updateTheme: (partial: Partial<ThemeConfig>) => void;
  activeAccent: typeof ACCENT_PALETTES[0];
  resetToDefaults: () => void;
}

const DEFAULT_THEME: ThemeConfig = {
  accentColor: '#059669', // Emerald
  accentName: 'emerald',
  fontFamily: 'Plus Jakarta Sans',
  backgroundPattern: 'mesh',
  isDarkMode: false,
  cardRounding: 'rounded',
  compactDensity: false,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('listit_theme_config');
      if (saved) {
        return { ...DEFAULT_THEME, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load theme from storage:', e);
    }
    return DEFAULT_THEME;
  });

  const activeAccent = ACCENT_PALETTES.find((p) => p.id === theme.accentName || p.primary === theme.accentColor) || ACCENT_PALETTES[0];

  useEffect(() => {
    try {
      localStorage.setItem('listit_theme_config', JSON.stringify(theme));
    } catch (e) {
      console.warn('Failed to persist theme:', e);
    }

    // Apply font to root
    const root = document.documentElement;
    root.style.fontFamily = `"${theme.fontFamily}", system-ui, sans-serif`;

    // Apply CSS Custom Variables for dynamic primary colors & accents
    root.style.setProperty('--brand-primary', activeAccent.primary);
    root.style.setProperty('--brand-primary-hover', activeAccent.primaryHover);
    root.style.setProperty('--brand-light', activeAccent.light);
    root.style.setProperty('--brand-text', activeAccent.text);
    root.style.setProperty('--brand-border', activeAccent.border);
    root.style.setProperty('--accent-primary', activeAccent.primary);
    root.style.setProperty('--accent-hover', activeAccent.primaryHover);
    root.style.setProperty('--accent-light', activeAccent.light);
    root.style.setProperty('--accent-text', activeAccent.text);
    root.style.setProperty('--accent-border', activeAccent.border);

    // Apply Dark mode class if active
    if (theme.isDarkMode) {
      document.body.classList.add('dark', 'bg-slate-950', 'text-slate-100');
    } else {
      document.body.classList.remove('dark', 'bg-slate-950', 'text-slate-100');
    }
  }, [theme, activeAccent]);

  const setTheme = (newTheme: ThemeConfig) => {
    setThemeState(newTheme);
  };

  const updateTheme = (partial: Partial<ThemeConfig>) => {
    setThemeState((prev) => ({ ...prev, ...partial }));
  };

  const resetToDefaults = () => {
    setThemeState(DEFAULT_THEME);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, updateTheme, activeAccent, resetToDefaults }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
