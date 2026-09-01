import React, { createContext, useContext, useState, useEffect } from 'react';
import { CustomHeading } from '../types';

interface CustomHeadingsContextType {
  customHeadings: CustomHeading[];
  addCustomHeading: (name: string) => CustomHeading;
  removeCustomHeading: (id: string) => void;
  renameCustomHeading: (id: string, newName: string) => void;
}

const STORAGE_CUSTOM_HEADINGS_KEY = 'listit_custom_headings';

const DEFAULT_CUSTOM_HEADINGS: CustomHeading[] = [];

const CustomHeadingsContext = createContext<CustomHeadingsContextType | undefined>(undefined);

export const CustomHeadingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customHeadings, setCustomHeadings] = useState<CustomHeading[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_HEADINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error loading custom headings from localStorage:', e);
    }
    return DEFAULT_CUSTOM_HEADINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CUSTOM_HEADINGS_KEY, JSON.stringify(customHeadings));
    } catch (e) {
      console.warn('Error saving custom headings to localStorage:', e);
    }
  }, [customHeadings]);

  const addCustomHeading = (name: string): CustomHeading => {
    const cleanLabel = name.trim();
    if (!cleanLabel) {
      throw new Error('Heading name cannot be empty');
    }
    // Check if duplicate label or id already exists
    const safeId = cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30) || `custom_${Date.now()}`;
    const uniqueId = customHeadings.some((h) => h.id === safeId)
      ? `${safeId}_${Date.now().toString().slice(-4)}`
      : safeId;

    const newHeading: CustomHeading = {
      id: uniqueId,
      label: cleanLabel,
      icon: '📁',
      color: 'indigo',
      createdAt: new Date().toISOString()
    };

    setCustomHeadings((prev) => [...prev, newHeading]);
    return newHeading;
  };

  const removeCustomHeading = (id: string) => {
    setCustomHeadings((prev) => prev.filter((h) => h.id !== id));
  };

  const renameCustomHeading = (id: string, newName: string) => {
    const clean = newName.trim();
    if (!clean) return;
    setCustomHeadings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, label: clean } : h))
    );
  };

  return (
    <CustomHeadingsContext.Provider
      value={{
        customHeadings,
        addCustomHeading,
        removeCustomHeading,
        renameCustomHeading
      }}
    >
      {children}
    </CustomHeadingsContext.Provider>
  );
};

export const useCustomHeadings = (): CustomHeadingsContextType => {
  const context = useContext(CustomHeadingsContext);
  if (!context) {
    throw new Error('useCustomHeadings must be used within a CustomHeadingsProvider');
  }
  return context;
};
