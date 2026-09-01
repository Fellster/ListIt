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

    // Apply Dark mode class and background pattern to body and html
    const allBgClasses = ['theme-bg-clean', 'theme-bg-mesh', 'theme-bg-dots', 'theme-bg-grid', 'theme-bg-warm'];
    document.body.classList.remove(...allBgClasses);
    root.classList.remove(...allBgClasses);

    const activeBgClass = `theme-bg-${theme.backgroundPattern || 'mesh'}`;
    document.body.classList.add(activeBgClass);
    root.classList.add(activeBgClass);

    root.setAttribute('data-theme-bg', theme.backgroundPattern || 'mesh');
    root.setAttribute('data-theme-dark', String(theme.isDarkMode));

    if (theme.isDarkMode) {
      document.body.classList.add('dark', 'text-slate-100');
      root.classList.add('dark');
      document.body.classList.remove('text-slate-900');
    } else {
      document.body.classList.remove('dark', 'text-slate-100');
      root.classList.remove('dark');
      document.body.classList.add('text-slate-900');
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
